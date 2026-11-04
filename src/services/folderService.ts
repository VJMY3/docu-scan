import type { DocumentRecord } from '../types/document';

const FOLDERS_KEY = 'docuscan_folders';

/**
 * Get all folders
 */
export const getFolders = (): string[] => {
  try {
    const stored = localStorage.getItem(FOLDERS_KEY);
    if (!stored) return []; // Start with no folders - user creates them
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Add a new folder
 */
export const addFolder = (folderName: string): string[] => {
  const clean = folderName.trim();
  if (!clean) return getFolders();

  const current = getFolders();
  
  // Check if folder already exists (case-insensitive)
  if (current.some(f => f.toLowerCase() === clean.toLowerCase())) {
    throw new Error('Folder already exists');
  }

  const updated = [...current, clean];
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
  return updated;
};

/**
 * Delete a folder
 */
export const deleteFolder = (folderName: string): string[] => {
  const current = getFolders();
  const updated = current.filter(f => f !== folderName);
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
  return updated;
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
