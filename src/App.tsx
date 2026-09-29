import { useState, useEffect } from 'react';
import { CameraView } from './components/scanner/CameraView';
import { FileUploader } from './components/scanner/FileUploader';
import { SettingsModal } from './components/settings/SettingsModal';
import { LockScreen } from './components/settings/LockScreen';
import { StatsOverview } from './components/dashboard/StatsOverview';
import { DocumentTable } from './components/dashboard/DocumentTable';
import { DocumentDetailModal } from './components/document/DocumentDetailModal';
import { DocumentEditForm } from './components/document/DocumentEditForm';
import { extractTextFromImage } from './services/ocrService';
import { loadAllDocuments, saveDocument, deleteDocument } from './services/storageService';
import { getStoredConfig, uploadImageToSupabase } from './services/supabaseClient';
import type { DocumentRecord, DashboardStats } from './types/document';
import { Camera, ShieldCheck, Settings, Menu, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

function App() {
  const [isLocked, setIsLocked] = useState(true);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalScans: 0, pendingCount: 0
  });
  
  const [showConfig, setShowConfig] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isLocked) {
      refreshData();
    }
  }, [isLocked]);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const docs = await loadAllDocuments();
      setDocuments(docs);
      calculateStats(docs);
    } catch (e) {
      console.error("Failed to load documents:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const calculateStats = (docs: DocumentRecord[]) => {
    let verified = 0;
    docs.forEach(d => {
      if (d.status === 'verified') verified++;
    });
    setStats({
      totalScans: docs.length,
      pendingCount: docs.length - verified
    });
  };

  const handleProcessImage = async (file: File) => {
    const config = getStoredConfig();
    if (!config.geminiKey) {
      alert("Please configure your VITE_GEMINI_API_KEY in the .env file and restart the server.");
      return;
    }

    setShowCamera(false);
    setIsProcessing(true);
    
    try {
      // 1. Upload to Supabase Storage
      let finalImageUrl = URL.createObjectURL(file); // fallback
      const uploadedUrl = await uploadImageToSupabase(file);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      }
      
      // 2. Extract Data via Gemini
      const parsedData = await extractTextFromImage(file);
      
      const newDoc: DocumentRecord = {
        id: crypto.randomUUID(),
        title: parsedData.title,
        document_date: parsedData.date,
        image_url: finalImageUrl,
        status: parsedData.status,
        raw_text: "Parsed directly via Gemini Vision API",
        items: parsedData.items,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced_to_supabase: false
      };
      
      await saveDocument(newDoc);
      await refreshData();
      
      if (parsedData.items.length > 0) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      alert("Failed to process document: " + (err.message || String(err)));
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    await refreshData();
    if (viewingDoc?.id === id) setViewingDoc(null);
    if (editingDoc?.id === id) setEditingDoc(null);
  };

  const handleSaveEdit = async (updatedDoc: DocumentRecord) => {
    await saveDocument(updatedDoc);
    await refreshData();
    if (viewingDoc?.id === updatedDoc.id) {
      setViewingDoc(updatedDoc);
    }
  };

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
          <div style={{ background: 'var(--primary-color)', padding: '0.5rem', borderRadius: '8px' }}>
            <ShieldCheck size={24} color="white" />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '-0.5px' }}>DocuScan<span style={{color: 'var(--primary-color)'}}>.</span></h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <button className="btn" style={{ justifyContent: 'flex-start', background: 'rgba(255,255,255,0.1)', color: 'white' }}>
            <Menu size={18} /> Dashboard
          </button>
          <button onClick={() => setShowCamera(true)} className="btn" style={{ justifyContent: 'flex-start', background: 'transparent', color: 'var(--text-muted)' }}>
            <Camera size={18} /> Scan Document
          </button>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <button onClick={() => setShowConfig(true)} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            <Settings size={18} /> App Settings
          </button>
        </div>
      </div>

      <div className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>Overview</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Extract tabular inventory lists using Gemini Vision.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={refreshData} disabled={isRefreshing} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              <RefreshCw size={18} className={isRefreshing ? 'animate-pulse' : ''} />
            </button>
            <button onClick={() => setShowCamera(true)} className="btn btn-primary">
              <Camera size={18} /> Scan List
            </button>
          </div>
        </header>

        {isProcessing && (
          <div className="glass-panel animate-pulse" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center', border: '1px solid var(--primary-color)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Gemini AI is analyzing handwriting...</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Uploading image to Supabase and parsing tabular data...</p>
          </div>
        )}

        <StatsOverview stats={stats} />
        
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Quick Upload</h2>
          <FileUploader onFileSelect={handleProcessImage} />
        </div>

        <DocumentTable 
          documents={documents} 
          onView={(doc) => setViewingDoc(doc)} 
          onEdit={(doc) => setEditingDoc(doc)} 
          onDelete={handleDelete} 
        />
      </div>

      {showConfig && <SettingsModal onClose={() => setShowConfig(false)} />}
      
      {viewingDoc && (
        <DocumentDetailModal 
          document={viewingDoc} 
          onClose={() => setViewingDoc(null)} 
          onEdit={() => { setViewingDoc(null); setEditingDoc(viewingDoc); }}
        />
      )}

      {editingDoc && (
        <DocumentEditForm 
          document={editingDoc} 
          onSave={handleSaveEdit}
          onClose={() => setEditingDoc(null)} 
        />
      )}

      {showCamera && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.9)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
        }}>
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <CameraView 
              onCapture={handleProcessImage} 
              onCancel={() => setShowCamera(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
