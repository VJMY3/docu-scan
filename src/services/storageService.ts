import type { DocumentRecord } from '../types/document';
import { syncDocumentToSupabase, fetchDocumentsFromSupabase, deleteDocumentFromSupabase } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'docuscan_local_documents';
const SAVED_NAMES_KEY = 'docuscan_saved_document_names';

const DEFAULT_NAMES = [
  'Tax Invoice',
  'Cash Receipt',
  'General Bill',
  'Ledger Page',
  'Official Document',
  'ID Card / Aadhar',
  'Inventory Checklist'
];

// Helper to wrap promises with timeout so offline/paused networks never hang the app
const withTimeout = <T>(promise: Promise<T>, ms: number = 3500): Promise<T | null> => {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))
  ]);
};

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
  // Filter out exact case-insensitive matches to bring selected/new to the top
  const filtered = current.filter(n => n.toLowerCase() !== clean.toLowerCase());
  const updated = [clean, ...filtered].slice(0, 50);

  try {
    localStorage.setItem(SAVED_NAMES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to persist saved document names:", e);
  }
  return updated;
};

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

  // Also automatically register the document's title to saved names list
  if (docToSave.title) {
    addSavedDocumentName(docToSave.title);
  }

  // 1. Immediately store locally so it is instantly available without page refresh!
  const currentDocs = getLocalDocs();
  const existingIdx = currentDocs.findIndex(d => d.id === doc.id);
  if (existingIdx >= 0) {
    currentDocs[existingIdx] = docToSave;
  } else {
    currentDocs.unshift(docToSave);
  }
  setLocalDocs(currentDocs);

  // 2. Sync to Supabase in background with timeout (Never blocks UI/camera)
  withTimeout(syncDocumentToSupabase(docToSave), 4000)
    .then((success) => {
      if (success) {
        docToSave.synced_to_supabase = true;
        const updated = getLocalDocs().map(d => d.id === docToSave.id ? { ...d, synced_to_supabase: true } : d);
        setLocalDocs(updated);
      }
    })
    .catch((err) => {
      console.warn("Supabase sync skipped/failed (offline/paused). Document saved locally:", err);
    });

  return docToSave;
};

export const deleteDocument = async (id: string): Promise<boolean> => {
  // Delete from local immediately
  const currentDocs = getLocalDocs().filter(d => d.id !== id);
  setLocalDocs(currentDocs);

  // Try delete from Supabase in background
  withTimeout(deleteDocumentFromSupabase(id), 3000).catch((err) => {
    console.warn("Supabase delete failed:", err);
  });

  return true;
};

export const loadAllDocuments = async (): Promise<DocumentRecord[]> => {
  const localDocs = getLocalDocs();

  try {
    // Try fetching from Supabase with a 3.5s timeout so it never hangs if paused/offline
    const supabaseDocs = await withTimeout(fetchDocumentsFromSupabase(), 3500);

    if (supabaseDocs && supabaseDocs.length > 0) {
      // Merge: Include Supabase docs, plus any local docs that are not yet synced
      const supabaseIds = new Set(supabaseDocs.map(d => d.id));
      const unsyncedLocals = localDocs.filter(d => !supabaseIds.has(d.id));

      const merged = [...unsyncedLocals, ...supabaseDocs];
      setLocalDocs(merged);

      // Harvest distinct titles from loaded docs into saved names
      merged.forEach(d => {
        if (d.title && !d.title.startsWith('Auto Scan #') && !d.title.startsWith('Doc Scan #')) {
          addSavedDocumentName(d.title);
        }
      });

      return merged;
    }
  } catch (err) {
    console.warn("Supabase load skipped (network/offline):", err);
  }

  // Fallback immediately to localDocs
  return localDocs;
};
