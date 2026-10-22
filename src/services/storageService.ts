import type { DocumentRecord } from '../types/document';
import { syncDocumentToSupabase, fetchDocumentsFromSupabase, deleteDocumentFromSupabase } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'docuscan_local_documents';

export const getLocalDocs = (): DocumentRecord[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const setLocalDocs = (docs: DocumentRecord[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.warn("Failed to save to localStorage:", e);
  }
};

export const saveDocument = async (doc: DocumentRecord): Promise<DocumentRecord> => {
  const docToSave: DocumentRecord = { ...doc };

  // 1. Always store locally first so user never loses their scanned data!
  const currentDocs = getLocalDocs();
  const existingIdx = currentDocs.findIndex(d => d.id === doc.id);
  if (existingIdx >= 0) {
    currentDocs[existingIdx] = docToSave;
  } else {
    currentDocs.unshift(docToSave);
  }
  setLocalDocs(currentDocs);

  // 2. Try syncing to Supabase
  try {
    await syncDocumentToSupabase(docToSave);
    docToSave.synced_to_supabase = true;
    
    // Update local record to synced
    const updated = getLocalDocs().map(d => d.id === docToSave.id ? { ...d, synced_to_supabase: true } : d);
    setLocalDocs(updated);
  } catch (err: any) {
    console.warn("Supabase sync failed (offline/paused). Document saved locally:", err);
    docToSave.synced_to_supabase = false;
  }

  return docToSave;
};

export const deleteDocument = async (id: string): Promise<boolean> => {
  // Delete from local
  const currentDocs = getLocalDocs().filter(d => d.id !== id);
  setLocalDocs(currentDocs);

  // Try delete from Supabase
  try {
    await deleteDocumentFromSupabase(id);
  } catch (err) {
    console.warn("Supabase delete failed:", err);
  }

  return true;
};

export const loadAllDocuments = async (): Promise<DocumentRecord[]> => {
  const localDocs = getLocalDocs();

  // Try fetching from Supabase
  const supabaseDocs = await fetchDocumentsFromSupabase();

  if (supabaseDocs && supabaseDocs.length > 0) {
    // Merge: Include Supabase docs, plus any local docs that are not yet synced
    const supabaseIds = new Set(supabaseDocs.map(d => d.id));
    const unsyncedLocals = localDocs.filter(d => !supabaseIds.has(d.id));

    // Try auto-syncing unsynced local documents in the background
    for (const unsynced of unsyncedLocals) {
      syncDocumentToSupabase(unsynced)
        .then(() => {
          const updated = getLocalDocs().map(d => d.id === unsynced.id ? { ...d, synced_to_supabase: true } : d);
          setLocalDocs(updated);
        })
        .catch(() => {});
    }

    const merged = [...unsyncedLocals, ...supabaseDocs];
    setLocalDocs(merged);
    return merged;
  }

  // If Supabase returned null or failed (e.g. paused / ERR_NAME_NOT_RESOLVED), fall back to localDocs
  return localDocs;
};
