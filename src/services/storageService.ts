import type { DocumentRecord } from '../types/document';
import {
  saveDocumentToSupabase,
  fetchDocumentsFromSupabase,
  deleteDocumentFromSupabase,
  updateDocumentInSupabase
} from './supabaseClient';

const SAVED_NAMES_KEY = 'docuscan_saved_document_names';

// Purge any legacy local storage documents immediately so no photos are ever stored locally
try {
  localStorage.removeItem('docuscan_local_documents');
} catch {}

const DEFAULT_NAMES = [
  'Tax Invoice',
  'Cash Receipt',
  'General Bill',
  'Ledger Page',
  'Official Document',
  'ID Card / Aadhar',
  'Inventory Checklist'
];

export const getSavedDocumentNames = (): string[] => {
  try {
    const raw = localStorage.getItem(SAVED_NAMES_KEY);
    if (!raw) return DEFAULT_NAMES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_NAMES;
  } catch {
    return DEFAULT_NAMES;
  }
};

export const addSavedDocumentName = (name: string): string[] => {
  const clean = name.trim();
  if (!clean) return getSavedDocumentNames();

  const current = getSavedDocumentNames();
  const filtered = current.filter(n => n.toLowerCase() !== clean.toLowerCase());
  const updated = [clean, ...filtered].slice(0, 50);

  try {
    localStorage.setItem(SAVED_NAMES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to persist saved document names:", e);
  }
  return updated;
};

/**
 * Saves document record directly to Supabase Database.
 * No localStorage is used for photo or document data.
 */
export const saveDocument = async (doc: DocumentRecord): Promise<DocumentRecord> => {
  if (doc.title) {
    addSavedDocumentName(doc.title);
  }
  return await saveDocumentToSupabase(doc);
};

/**
 * Updates document record directly in Supabase Database.
 */
export const updateDocument = async (doc: DocumentRecord): Promise<boolean> => {
  if (doc.title) {
    addSavedDocumentName(doc.title);
  }
  return await updateDocumentInSupabase(doc);
};

/**
 * Deletes document record directly from Supabase Database and removes image from storage.
 */
export const deleteDocument = async (id: string, imageUrl?: string): Promise<boolean> => {
  return await deleteDocumentFromSupabase(id, imageUrl);
};

/**
 * Loads all document records directly from Supabase Database.
 */
export const loadAllDocuments = async (): Promise<DocumentRecord[]> => {
  const docs = await fetchDocumentsFromSupabase();
  
  // Collect unique titles into dropdown list
  docs.forEach(d => {
    if (d.title && !d.title.startsWith('Auto Scan #') && !d.title.startsWith('Doc Scan #')) {
      addSavedDocumentName(d.title);
    }
  });

  return docs;
};
