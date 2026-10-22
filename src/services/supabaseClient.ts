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

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export const getStoredConfig = (): AppConfig => {
  const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
  let config: AppConfig = {
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    geminiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    geminiModel: DEFAULT_GEMINI_MODEL,
    autoSync: true,
    passcode: '1234'
  };

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      config = {
        ...config,
        ...parsed,
        supabaseUrl: parsed.supabaseUrl !== undefined && parsed.supabaseUrl !== '' ? parsed.supabaseUrl : SUPABASE_URL,
        supabaseAnonKey: parsed.supabaseAnonKey !== undefined && parsed.supabaseAnonKey !== '' ? parsed.supabaseAnonKey : SUPABASE_ANON_KEY,
        geminiKey: parsed.geminiKey !== undefined && parsed.geminiKey !== '' ? parsed.geminiKey : (import.meta.env.VITE_GEMINI_API_KEY || ''),
        geminiModel: parsed.geminiModel || DEFAULT_GEMINI_MODEL,
      };
    } catch {
      // Fallback to default config
    }
  }

  return config;
};

export const saveConfig = (config: AppConfig) => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
};

let cachedClient: any = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export const getSupabaseClient = (): any => {
  const config = getStoredConfig();
  const url = (config.supabaseUrl || SUPABASE_URL || '').trim();
  const key = (config.supabaseAnonKey || SUPABASE_ANON_KEY || '').trim();

  if (!url || !key) {
    return null;
  }

  if (!cachedClient || lastUsedUrl !== url || lastUsedKey !== key) {
    lastUsedUrl = url;
    lastUsedKey = key;
    try {
      cachedClient = createClient(url, key);
    } catch (e) {
      console.error("Failed to initialize Supabase client:", e);
      return null;
    }
  }

  return cachedClient;
};

// Dynamic proxy so existing code calling `supabase` uses the active credentials
export const supabase = new Proxy({} as any, {
  get: (_target, prop) => {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error("Supabase is not configured. Please enter your Supabase URL and Anon Key in Settings.");
    }
    return (client as any)[prop];
  }
});

export const testSupabaseConnection = async (
  url: string, 
  key: string
): Promise<{ success: boolean; message: string }> => {
  const cleanUrl = url.trim().replace(/\/$/, '');
  const cleanKey = key.trim();

  if (!cleanUrl || !cleanKey) {
    return { success: false, message: "Both Supabase Project URL and Anon Key are required." };
  }

  try {
    const res = await fetch(`${cleanUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: cleanKey,
        Authorization: `Bearer ${cleanKey}`
      }
    });

    if (res.ok) {
      return { success: true, message: "Connected to Supabase successfully!" };
    }

    return {
      success: false,
      message: `Supabase responded with HTTP ${res.status} (${res.statusText}). Check your Anon Key.`
    };
  } catch (err: any) {
    console.error("Supabase connection test failed:", err);
    return {
      success: false,
      message: "ERR_NAME_NOT_RESOLVED: Domain not found. Your Supabase project is likely PAUSED due to inactivity, or the URL has a typo. Unpause it at supabase.com/dashboard."
    };
  }
};

export const uploadImageToSupabase = async (file: File): Promise<string | null> => {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { error } = await client.storage.from('scans').upload(filePath, file);
    
    if (error) {
      console.warn('Supabase storage upload failed:', error.message || error);
      return null;
    }
    
    const { data: publicUrlData } = client.storage.from('scans').getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.warn('Supabase storage upload exception:', err.message || err);
    return null;
  }
};

export const syncDocumentToSupabase = async (doc: DocumentRecord): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  // 1. Upsert Scan Record
  const { error: scanError } = await client
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
    throw new Error(scanError.message);
  }

  // 2. Delete existing items for this scan to replace them
  await client.from('inventory_items').delete().eq('scan_id', doc.id);

  // 3. Insert new items
  if (doc.items.length > 0) {
    const itemsToInsert = doc.items.map(item => ({
      id: item.id,
      scan_id: doc.id,
      item_name: item.item_name,
      quantity: item.quantity
    }));

    const { error: itemsError } = await client
      .from('inventory_items')
      .insert(itemsToInsert);
      
    if (itemsError) {
      console.error('Supabase Sync Error (Items):', itemsError);
      throw new Error(itemsError.message);
    }
  }

  return true;
};

export const fetchDocumentsFromSupabase = async (): Promise<DocumentRecord[] | null> => {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data: scans, error: scansError } = await client
      .from('inventory_scans')
      .select('*')
      .order('created_at', { ascending: false });

    if (scansError) {
      console.warn('Supabase Fetch Error (Scans):', scansError.message || scansError);
      return null;
    }

    const { data: items, error: itemsError } = await client
      .from('inventory_items')
      .select('*');

    if (itemsError) {
      console.warn('Supabase Fetch Error (Items):', itemsError.message || itemsError);
      return null;
    }

    const completeDocs: DocumentRecord[] = (scans || []).map((scan: any) => {
      const scanItems = (items || []).filter((i: any) => i.scan_id === scan.id).map((i: any) => ({
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
  } catch (err: any) {
    console.warn('Supabase fetch exception (network/paused/DNS):', err.message || err);
    return null;
  }
};

export const deleteDocumentFromSupabase = async (id: string): Promise<boolean> => {
  try {
    const client = getSupabaseClient();
    if (!client) return false;

    const { error } = await client.from('inventory_scans').delete().eq('id', id);
    if (error) {
      console.error('Supabase Delete Error:', error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('Supabase delete exception:', err.message || err);
    return false;
  }
};
