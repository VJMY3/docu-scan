import type { DocumentRecord } from '../types/document';
import { getSupabaseClient } from './supabaseClient';

/**
 * Get all folders from Supabase folders table
 */
export const getFolders = async (): Promise<string[]> => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('Supabase client not available');
      return [];
    }

    const { data, error } = await supabase
      .from('folders')
      .select('name')
      .order('name');

    if (error) {
      console.error('Error fetching folders from Supabase:', error);
      return [];
    }

    return data.map((folder: any) => folder.name);
  } catch (error) {
    console.error('Error in getFolders:', error);
    return [];
  }
};

/**
 * Add a new folder to Supabase folders table
 */
export const addFolder = async (folderName: string): Promise<string[]> => {
  const clean = folderName.trim();
  if (!clean) {
    const folders = await getFolders();
    return folders;
  }

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    // Check if folder already exists (case-insensitive)
    const current = await getFolders();
    if (current.some(f => f.toLowerCase() === clean.toLowerCase())) {
      throw new Error('Folder already exists');
    }

    // Insert the new folder
    const { error } = await supabase
      .from('folders')
      .insert({ name: clean });

    if (error) {
      console.error('Error creating folder in Supabase:', error);
      throw new Error('Failed to create folder');
    }

    // Return updated folder list
    return await getFolders();
  } catch (error) {
    console.error('Error in addFolder:', error);
    throw error;
  }
};

/**
 * Delete a folder from Supabase and unassign all documents from it
 */
export const deleteFolder = async (folderName: string): Promise<string[]> => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    // First, update all documents in this folder to have no folder
    const { error: updateError } = await supabase
      .from('inventory_scans')
      .update({ folder: null })
      .eq('folder', folderName);

    if (updateError) {
      console.error('Error updating documents:', updateError);
      throw new Error('Failed to update documents');
    }

    // Then delete the folder from the folders table
    const { error: deleteError } = await supabase
      .from('folders')
      .delete()
      .eq('name', folderName);

    if (deleteError) {
      console.error('Error deleting folder from Supabase:', deleteError);
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
