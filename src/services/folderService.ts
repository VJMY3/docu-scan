import type { DocumentRecord } from '../types/document';
import { supabase } from './supabaseClient';

/**
 * Get all folders from Supabase by querying distinct folder values from documents
 */
export const getFolders = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_scans')
      .select('folder')
      .not('folder', 'is', null)
      .order('folder');

    if (error) {
      console.error('Error fetching folders from Supabase:', error);
      return [];
    }

    // Get unique folder names
    const uniqueFolders = [...new Set(data.map(item => item.folder).filter(Boolean))];
    return uniqueFolders as string[];
  } catch (error) {
    console.error('Error in getFolders:', error);
    return [];
  }
};

/**
 * Add a new folder (by creating a placeholder or just validating the name)
 * Note: Folders are implicitly created when a document is assigned to them
 */
export const addFolder = async (folderName: string): Promise<string[]> => {
  const clean = folderName.trim();
  if (!clean) {
    const folders = await getFolders();
    return folders;
  }

  const current = await getFolders();
  
  // Check if folder already exists (case-insensitive)
  if (current.some(f => f.toLowerCase() === clean.toLowerCase())) {
    throw new Error('Folder already exists');
  }

  // Folders are created implicitly when documents are assigned to them
  // So we just return the updated list including the new folder
  return [...current, clean];
};

/**
 * Delete a folder and unassign all documents from it
 */
export const deleteFolder = async (folderName: string): Promise<string[]> => {
  try {
    // Update all documents in this folder to have no folder
    const { error } = await supabase
      .from('inventory_scans')
      .update({ folder: null })
      .eq('folder', folderName);

    if (error) {
      console.error('Error deleting folder from Supabase:', error);
      throw new Error('Failed to delete folder');
    }

    // Return updated folder list
    return await getFolders();
  } catch (error) {
    console.error('Error in deleteFolder:', error);
    throw error;
  }
};

/**
 * Group documents by folder
 */
export const groupDocumentsByFolder = (documents: DocumentRecord[]): Map<string, DocumentRecord[]> => {
  const grouped = new Map<string, DocumentRecord[]>();
  
  // Initialize with "Uncategorized" for documents without folders
  grouped.set('Uncategorized', []);
  
  documents.forEach(doc => {
    const folder = doc.folder || 'Uncategorized';
    if (!grouped.has(folder)) {
      grouped.set(folder, []);
    }
    grouped.get(folder)!.push(doc);
  });
  
  // Keep empty folders in the view (don't remove them)
  
  return grouped;
};
