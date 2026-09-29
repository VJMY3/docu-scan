import type { DocumentRecord } from '../types/document';
import { syncDocumentToSupabase, fetchDocumentsFromSupabase, deleteDocumentFromSupabase } from './supabaseClient';

export const saveDocument = async (doc: DocumentRecord): Promise<DocumentRecord> => {
  await syncDocumentToSupabase(doc);
  return { ...doc, synced_to_supabase: true };
};

export const deleteDocument = async (id: string): Promise<boolean> => {
  return await deleteDocumentFromSupabase(id);
};

export const loadAllDocuments = async (): Promise<DocumentRecord[]> => {
  const supabaseDocs = await fetchDocumentsFromSupabase();
  return supabaseDocs || [];
};
