import { useState, useEffect, useCallback } from 'react';
import { CameraView, type ScannerMode } from './components/scanner/CameraView';
import { ModeSelectModal } from './components/scanner/ModeSelectModal';
import { FileUploader } from './components/scanner/FileUploader';
import { SettingsModal } from './components/settings/SettingsModal';
import { LockScreen } from './components/settings/LockScreen';
import { StatsOverview } from './components/dashboard/StatsOverview';
import { DocumentTable } from './components/dashboard/DocumentTable';
import { DocumentDetailModal } from './components/document/DocumentDetailModal';
import { DocumentEditForm } from './components/document/DocumentEditForm';
import {
  loadAllDocuments,
  saveDocument,
  updateDocument,
  deleteDocument,
  getSavedDocumentNames,
  addSavedDocumentName
} from './services/storageService';
import { uploadImageToSupabase } from './services/supabaseClient';
import type { DocumentRecord, DashboardStats } from './types/document';
import { Camera, ShieldCheck, Settings, Menu, RefreshCw, Lock, Zap, Edit3, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

function App() {
  const [isLocked, setIsLocked] = useState(true);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalScans: 0,
    pendingCount: 0
  });

  // Modal and View states
  const [showModeModal, setShowModeModal] = useState(false);
  const [cameraMode, setCameraMode] = useState<ScannerMode>('auto');

  // Saved document names for dropdown selection
  const [savedNames, setSavedNames] = useState<string[]>(() => getSavedDocumentNames());

  const [showCamera, setShowCamera] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);

  const [isSavingScan, setIsSavingScan] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Load documents directly from Supabase Cloud Database (No localStorage used!)
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    setDbError(null);
    try {
      const docs = await loadAllDocuments();
      setDocuments(docs);
      setSavedNames(getSavedDocumentNames());
      setStats({
        totalScans: docs.length,
        pendingCount: 0
      });
    } catch (e: any) {
      console.error("Failed to load documents from Supabase:", e);
      setDbError(e.message || "Failed to load documents from Supabase. Check your Supabase settings.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isLocked) {
      refreshData();
    }
  }, [isLocked, refreshData]);

  // Handler for successful lock screen authentication - Opens Dashboard directly!
  const handleUnlock = () => {
    setIsLocked(false);
    setShowModeModal(false);
  };

  // Register newly entered name in saved names list
  const handleSaveNewName = (name: string) => {
    const updated = addSavedDocumentName(name);
    setSavedNames(updated);
  };

  // Handler for mode selection (Auto or Manual)
  const handleSelectMode = (mode: ScannerMode) => {
    setCameraMode(mode);
    setShowModeModal(false);
    setShowCamera(true);
  };

  // Direct save to Supabase Database & Storage ONLY (No localStorage!)
  const handleSaveCapturedSnapshot = async (file: File, title: string, mode: ScannerMode): Promise<boolean> => {
    setIsSavingScan(true);
    try {
      // 1. Upload image DIRECTLY to Supabase Storage bucket 'scans'
      const uploadedUrl = await uploadImageToSupabase(file);

      // 2. Build Document Record with the Supabase public storage URL
      const newDoc: DocumentRecord = {
        id: crypto.randomUUID(),
        title: title,
        document_date: new Date().toISOString().split('T')[0],
        image_url: uploadedUrl,
        status: 'verified',
        raw_text: mode === 'auto'
          ? `Automatic Mode Capture`
          : `Manual Mode Capture`,
        items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced_to_supabase: true
      };

      // 3. Save DIRECTLY to Supabase Table 'inventory_scans'
      await saveDocument(newDoc);

      // 4. Update UI State in Real Time
      setDocuments(prevDocs => [newDoc, ...prevDocs.filter(d => d.id !== newDoc.id)]);
      setStats(prev => ({
        totalScans: prev.totalScans + 1,
        pendingCount: 0
      }));

      // Register name for future dropdowns
      handleSaveNewName(title);
      return true;

    } catch (err: any) {
      console.error("Supabase Save Error:", err);
      const isRls = err.message?.toLowerCase().includes('row-level security') || 
                    err.message?.toLowerCase().includes('policy');
      if (isRls) {
        alert(
          "⚠️ Supabase Storage Permission Error (RLS Policy)!\n\n" +
          "Your Supabase 'scans' storage bucket does not have upload permissions enabled.\n\n" +
          "Solution:\n1. Copy the 'Supabase SQL Setup Script' from Settings.\n2. Open 'SQL Editor' in your Supabase dashboard and click RUN."
        );
        setShowConfig(true);
      } else {
        alert(`Supabase Error: ${err.message || 'Failed to save photo to Supabase. Check your Supabase URL & Key in Settings.'}`);
      }
      return false;
    } finally {
      setIsSavingScan(false);
    }
  };

  // Close Camera and refresh dashboard directly from Supabase
  const handleCloseCamera = () => {
    setShowCamera(false);
    refreshData();
  };

  // Quick file drop upload directly to Supabase
  const handleProcessDroppedFile = async (file: File) => {
    const defaultTitle = `Uploaded Document - ${file.name.replace(/\.[^/.]+$/, "")}`;
    const userTitle = window.prompt("Enter document title for Supabase:", defaultTitle);
    if (userTitle === null) return; // User cancelled
    
    await handleSaveCapturedSnapshot(file, userTitle.trim() || defaultTitle, 'manual');
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
  };

  // Delete directly from Supabase
  const handleDelete = async (id: string, imageUrl?: string) => {
    try {
      await deleteDocument(id, imageUrl);
      setDocuments(prev => prev.filter(d => d.id !== id));
      setStats(prev => ({
        ...prev,
        totalScans: Math.max(0, prev.totalScans - 1)
      }));
      if (viewingDoc?.id === id) setViewingDoc(null);
      if (editingDoc?.id === id) setEditingDoc(null);
    } catch (err: any) {
      alert(`Failed to delete scan from Supabase: ${err.message}`);
    }
  };

  // Update/Rename directly in Supabase
  const handleSaveEdit = async (updatedDoc: DocumentRecord) => {
    try {
      await updateDocument(updatedDoc);
      setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
      if (viewingDoc?.id === updatedDoc.id) {
        setViewingDoc(updatedDoc);
      }
    } catch (err: any) {
      alert(`Failed to update document in Supabase: ${err.message}`);
    }
  };

  // 1. Lock Screen (Displayed on app launch)
  if (isLocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
          <div style={{ background: 'var(--primary-color)', padding: '0.5rem', borderRadius: '8px' }}>
            <ShieldCheck size={24} color="white" />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '-0.5px' }}>
            DocuScan<span style={{ color: 'var(--primary-color)' }}>.</span>
          </h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <button className="btn" style={{ justifyContent: 'flex-start', background: 'rgba(255,255,255,0.1)', color: 'white' }}>
            <Menu size={18} /> Dashboard
          </button>

          <button
            onClick={() => handleSelectMode('auto')}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(16, 185, 129, 0.15))',
              color: '#fff',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}
          >
            <Camera size={18} color="#818cf8" /> Start Camera
          </button>
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => setShowConfig(true)}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Settings size={18} /> Database Settings
          </button>
          <button
            onClick={() => setIsLocked(true)}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', opacity: 0.8 }}
          >
            <Lock size={16} /> Lock App
          </button>
        </div>
      </div>

      {/* Main Content Dashboard */}
      <div className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>Dashboard Overview</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              100% Supabase Cloud Database & Storage (No Local Storage) • Direct Cloud Capture
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1rem' }}
              title="Refresh Supabase records"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-pulse' : ''} />
            </button>
            <button
              onClick={() => handleSelectMode('auto')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.15rem' }}
            >
              <Zap size={18} /> Launch Automatic Mode
            </button>
            <button
              onClick={() => handleSelectMode('manual')}
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#6ee7b7'
              }}
            >
              <Edit3 size={18} /> Launch Manual Mode
            </button>
          </div>
        </header>

        {/* Database Error Banner if Supabase connection fails */}
        {dbError && (
          <div className="glass-panel" style={{
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1.5px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={24} color="#f87171" />
              <div>
                <strong style={{ color: '#fca5a5', display: 'block', fontSize: '0.95rem' }}>
                  Supabase Connection Warning
                </strong>
                <span style={{ fontSize: '0.85rem', color: '#fecaca' }}>
                  {dbError} (Ensure your Supabase project is active and 'scans' storage bucket is created)
                </span>
              </div>
            </div>
            <button onClick={() => setShowConfig(true)} className="btn btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
              Check Supabase Settings
            </button>
          </div>
        )}

        {/* Quick Launch Cards for Automatic and Manual Modes */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          <div
            onClick={() => handleSelectMode('auto')}
            style={{
              padding: '1.5rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))',
              border: '1.5px solid rgba(99, 102, 241, 0.4)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{
              background: '#6366f1',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0
            }}>
              <Zap size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#fff' }}>
                Launch Automatic Mode
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Press Space, Enter, or click button to save instantly (no popups, no timer)
              </p>
            </div>
          </div>

          <div
            onClick={() => handleSelectMode('manual')}
            style={{
              padding: '1.5rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
              border: '1.5px solid rgba(16, 185, 129, 0.4)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{
              background: '#10b981',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0
            }}>
              <Edit3 size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#fff' }}>
                Launch Manual Mode
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Press Space, Enter, or click button to save with document name or dropdown
              </p>
            </div>
          </div>
        </div>

        {/* Database & Scan Stats */}
        <StatsOverview stats={stats} />

        {/* Quick Upload from computer directly to Supabase */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Upload Photo Directly to Supabase</h2>
          <FileUploader onFileSelect={handleProcessDroppedFile} />
        </div>

        {/* Scans Database Table */}
        <DocumentTable
          documents={documents}
          onView={(doc) => setViewingDoc(doc)}
          onEdit={(doc) => setEditingDoc(doc)}
          onDelete={handleDelete}
        />
      </div>

      {/* Mode Selection Modal */}
      {showModeModal && (
        <ModeSelectModal
          onSelectMode={handleSelectMode}
          onGoToDashboard={() => setShowModeModal(false)}
        />
      )}

      {/* Camera Live View (Automatic or Manual) */}
      {showCamera && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
        }}>
          <div style={{ width: '100%', maxWidth: '900px' }}>
            <CameraView
              initialMode={cameraMode}
              savedNames={savedNames}
              onSaveNewName={handleSaveNewName}
              onCapture={handleSaveCapturedSnapshot}
              onCancel={handleCloseCamera}
              isSaving={isSavingScan}
            />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showConfig && <SettingsModal onClose={() => setShowConfig(false)} />}

      {/* View Document Modal */}
      {viewingDoc && (
        <DocumentDetailModal
          document={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onEdit={() => {
            const doc = viewingDoc;
            setViewingDoc(null);
            setEditingDoc(doc);
          }}
        />
      )}

      {/* Edit Document Modal */}
      {editingDoc && (
        <DocumentEditForm
          document={editingDoc}
          onSave={handleSaveEdit}
          onClose={() => setEditingDoc(null)}
        />
      )}
    </div>
  );
}

export default App;
