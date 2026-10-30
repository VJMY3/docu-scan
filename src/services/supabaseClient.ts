import { createClient } from '@supabase/supabase-js';
import type { AppConfig, DocumentRecord } from '../types/document';

/**
 * Normalizes Supabase Project URL to ensure NO duplicate /rest/v1 or subpaths exist.
 * e.g. "https://xyz.supabase.co/rest/v1" -> "https://xyz.supabase.co"
 */
export const normalizeSupabaseUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  let url = rawUrl.replace(/[\r\n\t "']/g, '').trim();
  url = url.replace(/\/+$/, '');
  // Strip out /rest/v1, /rest, /storage/v1, /auth/v1 if inadvertently pasted by user
  url = url.replace(/\/(rest|auth|storage)(\/v\d+)?(\/.*)?$/i, '');
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
};

export const normalizeSupabaseKey = (rawKey: string): string => {
  if (!rawKey) return '';
  return rawKey.replace(/[\r\n\t "']/g, '').trim();
};

const RAW_ENV_URL = import.meta.env.VITE_SUPABASE_URL || '';
const RAW_ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const SUPABASE_URL = normalizeSupabaseUrl(RAW_ENV_URL);
const SUPABASE_ANON_KEY = normalizeSupabaseKey(RAW_ENV_KEY);

const CONFIG_STORAGE_KEY = 'docuscan_app_config';

export const DEFAULT_SUPABASE_SQL = `-- Run this in your Supabase SQL Editor:

-- 1. Create Inventory Scans Table
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

-- 2. Enable Row Level Security (RLS) on Table
ALTER TABLE public.inventory_scans ENABLE ROW LEVEL SECURITY;

-- 3. Allow Public Full Access (read, insert, update, delete) on table
DROP POLICY IF EXISTS "Allow public all scans" ON public.inventory_scans;
CREATE POLICY "Allow public all scans" 
ON public.inventory_scans 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 4. Create Public Storage Bucket for Images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('scans', 'scans', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. Storage Policies on storage.objects (Fixes "new row violates row-level security policy")
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to scans" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from scans" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update to scans" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from scans" ON storage.objects;

-- Allow public uploads (INSERT)
CREATE POLICY "Allow public upload to scans" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'scans');

-- Allow public viewing/downloading (SELECT)
CREATE POLICY "Allow public read from scans" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'scans');

-- Allow public updates (UPDATE)
CREATE POLICY "Allow public update to scans" 
ON storage.objects 
FOR UPDATE 
TO public 
USING (bucket_id = 'scans');

-- Allow public deletion (DELETE)
CREATE POLICY "Allow public delete from scans" 
ON storage.objects 
FOR DELETE 
TO public 
USING (bucket_id = 'scans');
`;

export const getStoredConfig = (): AppConfig => {
  const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
  let config: AppConfig = {
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    geminiKey: '',
    passcode: '1234'
  };

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const rawUrl = parsed.supabaseUrl !== undefined && parsed.supabaseUrl !== '' ? parsed.supabaseUrl : SUPABASE_URL;
      const rawKey = parsed.supabaseAnonKey !== undefined && parsed.supabaseAnonKey !== '' ? parsed.supabaseAnonKey : SUPABASE_ANON_KEY;

      config = {
        ...config,
        ...parsed,
        supabaseUrl: normalizeSupabaseUrl(rawUrl),
        supabaseAnonKey: normalizeSupabaseKey(rawKey)
      };
      
      // Auto-correct in storage if it had /rest/v1 appended
      if (parsed.supabaseUrl !== config.supabaseUrl) {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      }
    } catch {
      // fallback
    }
  }

  return config;
};

export const saveConfig = (config: AppConfig) => {
  const sanitized: AppConfig = {
    ...config,
    supabaseUrl: normalizeSupabaseUrl(config.supabaseUrl || ''),
    supabaseAnonKey: normalizeSupabaseKey(config.supabaseAnonKey || '')
  };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
  // Invalidate cache so new credentials immediately take effect
  cachedClient = null;
  lastUsedUrl = '';
  lastUsedKey = '';
};

let cachedClient: any = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export const getSupabaseClient = (): any => {
  const config = getStoredConfig();
  const url = normalizeSupabaseUrl(config.supabaseUrl || SUPABASE_URL || '');
  const key = normalizeSupabaseKey(config.supabaseAnonKey || SUPABASE_ANON_KEY || '');

  if (!url || !key) {
    return null;
  }

  if (!cachedClient || lastUsedUrl !== url || lastUsedKey !== key) {
    lastUsedUrl = url;
    lastUsedKey = key;
    try {
      cachedClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
    } catch (e) {
      console.error("Failed to initialize Supabase client:", e);
      return null;
    }
  }

  return cachedClient;
};

/**
 * Robust test for Supabase connection.
 * Strips any accidental /rest/v1 suffix before testing.
 */
export const testSupabaseConnection = async (
  rawUrl: string, 
  rawKey: string
): Promise<{ success: boolean; message: string; tableReady?: boolean }> => {
  const cleanUrl = normalizeSupabaseUrl(rawUrl);
  const cleanKey = normalizeSupabaseKey(rawKey);

  if (!cleanUrl || !cleanKey) {
    return { success: false, message: "Both Supabase Project URL and Anon Key are required." };
  }

  // 1. Verify Gateway & API Key against Auth Settings endpoint
  try {
    const authRes = await fetch(`${cleanUrl}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: cleanKey
      }
    });

    if (authRes.status === 401) {
      return {
        success: false,
        message: "HTTP 401 Unauthorized: The Anon Key is invalid or expired. Check Supabase Dashboard -> Project Settings -> API -> anon (public) key."
      };
    }
  } catch (err: any) {
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.name === 'TypeError') {
      return {
        success: false,
        message: "Network Error: Could not reach Supabase domain. Your project may be PAUSED. Check supabase.com/dashboard."
      };
    }
  }

  // 2. Test PostgREST table access using the official Supabase Client
  try {
    const client = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });

    const { error } = await client.from('inventory_scans').select('id').limit(1);

    if (error) {
      // Code 42P01 / PGRST205 means table doesn't exist yet, but credentials ARE 100% valid!
      if (
        error.code === '42P01' || 
        error.code === 'PGRST205' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('relation "public.inventory_scans"')
      ) {
        return {
          success: true,
          tableReady: false,
          message: "✓ Credentials Valid & Connected! But table 'inventory_scans' is missing. Please run the SQL Script in your Supabase SQL Editor."
        };
      }

      if (error.code === 'PGRST301' || (error as any).status === 401 || error.message?.includes('JWT')) {
        return {
          success: false,
          message: `HTTP 401 (${error.message || 'Invalid API Key'}). Please ensure you copied the 'anon' key, not the service_role key.`
        };
      }

      return {
        success: false,
        message: `Supabase Error: ${error.message} (Code: ${error.code})`
      };
    }

    // 3. Test Storage 'scans' bucket
    let storageStatus = '';
    try {
      const { error: storageErr } = await client.storage.from('scans').list('', { limit: 1 });
      if (storageErr) {
        if (storageErr.message?.toLowerCase().includes('not found') || (storageErr as any).status === 404) {
          storageStatus = " (Storage bucket 'scans' missing. Run SQL script.)";
        } else if (storageErr.message?.toLowerCase().includes('row-level security') || storageErr.message?.toLowerCase().includes('policy')) {
          storageStatus = " (Storage bucket 'scans' needs RLS policy. Run SQL script.)";
        }
      }
    } catch {}

    return {
      success: true,
      tableReady: true,
      message: `✓ Connected to Supabase Database & 'inventory_scans' table successfully!${storageStatus}`
    };
  } catch (err: any) {
    console.error("Supabase test exception:", err);
    return {
      success: false,
      message: err.message || "Failed to connect to Supabase."
    };
  }
};

/**
 * Uploads captured photo directly into Supabase Storage 'scans' bucket.
 * Returns public URL of the uploaded image.
 */
export const uploadImageToSupabase = async (file: File): Promise<string> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured. Please enter your Supabase URL & Key in Settings.");
  }

  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  // Upload to Supabase Storage 'scans' bucket
  let { error: uploadError } = await client.storage
    .from('scans')
    .upload(fileName, file, {
      contentType: file.type || 'image/jpeg',
      upsert: true
    });

  // If bucket does not exist, attempt to auto-create and retry
  if (uploadError && (uploadError.message?.toLowerCase().includes('bucket not found') || (uploadError as any).status === 404)) {
    try {
      await client.storage.createBucket('scans', { public: true });
      const retry = await client.storage.from('scans').upload(fileName, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true
      });
      uploadError = retry.error;
    } catch {}
  }

  if (uploadError) {
    console.error('Supabase storage upload error:', uploadError);
    const msg = uploadError.message || '';
    if (msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('policy')) {
      throw new Error(`Storage RLS Policy Error: Supabase blocked the upload. Please copy the SQL script from Settings and run it in your Supabase SQL Editor.`);
    }
    throw new Error(`Supabase Storage Error: ${msg || 'Upload failed'}`);
  }

  const { data: publicUrlData } = client.storage.from('scans').getPublicUrl(fileName);
  return publicUrlData.publicUrl;
};

/**
 * Saves a document record directly to the Supabase Database 'inventory_scans' table.
 */
export const saveDocumentToSupabase = async (doc: DocumentRecord): Promise<DocumentRecord> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured. Please enter your Supabase credentials in Settings.");
  }

  const { error } = await client
    .from('inventory_scans')
    .upsert({
      id: doc.id,
      title: doc.title,
      document_date: doc.document_date,
      image_url: doc.image_url,
      status: doc.status || 'verified',
      raw_text: doc.raw_text,
      created_at: doc.created_at,
      updated_at: doc.updated_at
    });

  if (error) {
    console.error('Supabase Database Sync Error:', error);
    throw new Error(`Supabase DB Error: ${error.message}`);
  }

  return { ...doc, synced_to_supabase: true };
};

/**
 * Loads all scans directly from Supabase Database.
 */
export const fetchDocumentsFromSupabase = async (): Promise<DocumentRecord[]> => {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: scans, error } = await client
    .from('inventory_scans')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase Fetch Error:', error);
    throw new Error(`Supabase Fetch Error: ${error.message}`);
  }

  return (scans || []).map((scan: any) => {
    let imgUrl = scan.image_url || '';
    // Strip expired cross-origin blob URLs from previous test runs
    if (imgUrl.startsWith('blob:')) {
      imgUrl = '';
    }
    return {
      id: scan.id,
      title: scan.title || 'Untitled Document',
      document_date: scan.document_date || new Date(scan.created_at || Date.now()).toISOString().split('T')[0],
      image_url: imgUrl,
      status: scan.status || 'verified',
      raw_text: scan.raw_text || '',
      items: [],
      created_at: scan.created_at || new Date().toISOString(),
      updated_at: scan.updated_at || new Date().toISOString(),
      synced_to_supabase: true
    };
  });
};

/**
 * Deletes document directly from Supabase database and removes image from storage.
 */
export const deleteDocumentFromSupabase = async (id: string, imageUrl?: string): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from('inventory_scans').delete().eq('id', id);
  if (error) {
    console.error('Supabase Delete Error:', error);
    throw new Error(`Failed to delete scan: ${error.message}`);
  }

  // Remove image file from storage bucket if it exists and is a valid cloud storage URL
  if (imageUrl && !imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')) {
    try {
      const parts = imageUrl.split('/');
      const fileName = parts[parts.length - 1]?.split('?')[0];
      if (fileName) {
        await client.storage.from('scans').remove([fileName]);
      }
    } catch {}
  }

  return true;
};

/**
 * Updates document details directly in Supabase.
 */
export const updateDocumentInSupabase = async (doc: DocumentRecord): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('inventory_scans')
    .update({
      title: doc.title,
      document_date: doc.document_date,
      raw_text: doc.raw_text,
      updated_at: new Date().toISOString()
    })
    .eq('id', doc.id);

  if (error) {
    console.error('Supabase Update Error:', error);
    throw new Error(`Failed to update scan: ${error.message}`);
  }

  return true;
};
