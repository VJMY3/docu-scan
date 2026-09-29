import { createClient } from '@supabase/supabase-js';
import type { AppConfig, DocumentRecord } from '../types/document';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const CONFIG_STORAGE_KEY = 'docuscan_app_config';

export const DEFAULT_SUPABASE_SQL = `-- Run this script in your Supabase SQL Editor!

CREATE TABLE IF NOT EXISTS public.inventory_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    document_date DATE DEFAULT CURRENT_DATE,
    image_url TEXT,
    status TEXT DEFAULT 'verified',
    raw_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES public.inventory_scans(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.inventory_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all scans" ON public.inventory_scans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all items" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);

-- Create Storage Bucket for Images
insert into storage.buckets (id, name, public) values ('scans', 'scans', true) on conflict do nothing;
create policy "Public Access" on storage.objects for all using ( bucket_id = 'scans' );
`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getStoredConfig = (): AppConfig => {
  const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
  let config: AppConfig = { supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY, geminiKey: '', autoSync: true, passcode: '1234' };
  if (saved) {
    try {
      config = { ...config, ...JSON.parse(saved) };
    } catch {
      // Fallback
    }
  }

  // Override with env variables if they exist
  if (import.meta.env.VITE_GEMINI_API_KEY) {
    config.geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  }
  
  return config;
};

export const saveConfig = (config: AppConfig) => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
};

export const uploadImageToSupabase = async (file: File): Promise<string | null> => {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `public/${fileName}`;

  const { error } = await supabase.storage.from('scans').upload(filePath, file);
  
  if (error) {
    console.error('Upload Error:', error);
    return null;
  }
  
  const { data: publicUrlData } = supabase.storage.from('scans').getPublicUrl(filePath);
  return publicUrlData.publicUrl;
};

export const syncDocumentToSupabase = async (doc: DocumentRecord): Promise<boolean> => {
  // 1. Upsert Scan Record
  const { error: scanError } = await supabase
    .from('inventory_scans')
    .upsert({
      id: doc.id,
      title: doc.title,
      document_date: doc.document_date,
      image_url: doc.image_url,
      status: doc.status,
      raw_text: doc.raw_text,
      created_at: doc.created_at,
      updated_at: doc.updated_at
    });

  if (scanError) {
    console.error('Supabase Sync Error (Scans):', scanError);
    throw new Error(`Database Error: ${scanError.message}`);
  }

  // 2. Delete existing items for this scan to replace them
  await supabase.from('inventory_items').delete().eq('scan_id', doc.id);

  // 3. Insert new items
  if (doc.items.length > 0) {
    const itemsToInsert = doc.items.map(item => ({
      id: item.id,
      scan_id: doc.id,
      item_name: item.item_name,
      quantity: item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('inventory_items')
      .insert(itemsToInsert);
      
    if (itemsError) {
      console.error('Supabase Sync Error (Items):', itemsError);
      throw new Error(`Database Error: ${itemsError.message}`);
    }
  }

  return true;
};

export const fetchDocumentsFromSupabase = async (): Promise<DocumentRecord[] | null> => {
  const { data: scans, error: scansError } = await supabase
    .from('inventory_scans')
    .select('*')
    .order('created_at', { ascending: false });

  if (scansError) {
    console.error('Supabase Fetch Error (Scans):', scansError);
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from('inventory_items')
    .select('*');

  if (itemsError) {
    console.error('Supabase Fetch Error (Items):', itemsError);
    return null;
  }

  // Combine
  const completeDocs: DocumentRecord[] = scans.map(scan => {
    const scanItems = items.filter(i => i.scan_id === scan.id).map(i => ({
      id: i.id,
      item_name: i.item_name,
      quantity: i.quantity
    }));

    return {
      id: scan.id,
      title: scan.title,
      document_date: scan.document_date,
      image_url: scan.image_url,
      status: scan.status as any,
      raw_text: scan.raw_text,
      items: scanItems,
      created_at: scan.created_at,
      updated_at: scan.updated_at,
      synced_to_supabase: true
    };
  });

  return completeDocs;
};

export const deleteDocumentFromSupabase = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('inventory_scans').delete().eq('id', id);
  if (error) {
    console.error('Supabase Delete Error:', error);
    return false;
  }
  return true;
};
