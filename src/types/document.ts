export type DocumentStatus = 'verified' | 'pending';

export interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
}

export interface DocumentRecord {
  id: string;
  title: string;
  document_date: string;
  image_url: string;
  status: DocumentStatus;
  raw_text: string;
  items: InventoryItem[];
  created_at: string;
  updated_at: string;
  synced_to_supabase: boolean;
}

export interface AppConfig {
  geminiKey: string;
  passcode: string; // 4-digit PIN
  
  // Kept for backward compatibility parsing but not user-editable
  supabaseUrl?: string; 
  supabaseAnonKey?: string;
  autoSync?: boolean;
}

export interface DashboardStats {
  totalScans: number;
  pendingCount: number;
}
