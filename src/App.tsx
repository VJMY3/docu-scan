import { useState, useEffect, useCallback } from 'react';
import { CameraView, type ScannerMode } from './components/scanner/CameraView';
import { ModeSelectModal, SHUTTER_SPEED_OPTIONS } from './components/scanner/ModeSelectModal';
import { FileUploader } from './components/scanner/FileUploader';
import { SettingsModal } from './components/settings/SettingsModal';
import { LockScreen } from './components/settings/LockScreen';
import { StatsOverview } from './components/dashboard/StatsOverview';
import { DocumentTable } from './components/dashboard/DocumentTable';
import { DocumentDetailModal } from './components/document/DocumentDetailModal';
import { DocumentEditForm } from './components/document/DocumentEditForm';
import {
  getLocalDocs,
  loadAllDocuments,
  saveDocument,
  deleteDocument,
  getSavedDocumentNames,
  addSavedDocumentName
} from './services/storageService';
import { uploadImageToSupabase } from './services/supabaseClient';
import type { DocumentRecord, DashboardStats } from './types/document';
import { Camera, ShieldCheck, Settings, Menu, RefreshCw, Lock, Zap, Edit3, Clock } from 'lucide-react';
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

  // Shutter Speed (persisted in localStorage, configured directly on Dashboard)
  const [shutterSpeed, setShutterSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('docuscan_shutter_speed');
      return saved ? Number(saved) : 5;
    } catch {
      return 5;
    }
  });

  // Saved document names for dropdown selection
  const [savedNames, setSavedNames] = useState<string[]>(() => getSavedDocumentNames());

  const [showCamera, setShowCamera] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);

  const [isSavingScan, setIsSavingScan] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load documents when unlocked - Optimistic zero-latency loading
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Immediately render from local storage (0ms - no waiting for network)
      const immediateLocalDocs = getLocalDocs();
      setDocuments(immediateLocalDocs);
      setSavedNames(getSavedDocumentNames());
      setStats({
        totalScans: immediateLocalDocs.length,
        pendingCount: immediateLocalDocs.filter(d => !d.synced_to_supabase).length
      });

      // 2. Load and merge any Supabase cloud docs in the background
      const docs = await loadAllDocuments();
      setDocuments(docs);
      setSavedNames(getSavedDocumentNames());
      setStats({
        totalScans: docs.length,
        pendingCount: docs.filter(d => !d.synced_to_supabase).length
      });
    } catch (e) {
      console.error("Failed to load documents:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isLocked) {
      refreshData();
    }
  }, [isLocked, refreshData]);

  // Handler for successful lock screen authentication
  const handleUnlock = () => {
    setIsLocked(false);
    // Show mode selection modal immediately before starting camera
    setShowModeModal(true);
  };

  // Speed change helper (configured directly on Dashboard before opening camera)
  const handleSpeedChange = (newSpeed: number) => {
    setShutterSpeed(newSpeed);
    try {
      localStorage.setItem('docuscan_shutter_speed', String(newSpeed));
    } catch (e) {
      console.warn("Could not save shutter speed to storage:", e);
    }
  };

  // Register newly entered name in saved names list
  const handleSaveNewName = (name: string) => {
    const updated = addSavedDocumentName(name);
    setSavedNames(updated);
  };

  // Handler for mode selection (Auto or Manual)
  const handleSelectMode = (mode: ScannerMode, speed: number = shutterSpeed) => {
    setCameraMode(mode);
    handleSpeedChange(speed);
    setShowModeModal(false);
    setShowCamera(true);
  };

  // Convert File to Base64 Data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(URL.createObjectURL(file));
      reader.readAsDataURL(file);
    });
  };

  // Direct save to Database with INSTANT Real-Time UI Reflection!
  const handleSaveCapturedSnapshot = async (file: File, title: string, mode: ScannerMode) => {
    setIsSavingScan(true);
    try {
      // 1. Save title to persistent names list
      handleSaveNewName(title);

      // 2. Immediately generate base64 URL so image is instantly viewable
      const base64Url = await fileToDataUrl(file);

      // 3. Build Document Record
      const newDoc: DocumentRecord = {
        id: crypto.randomUUID(),
        title: title,
        document_date: new Date().toISOString().split('T')[0],
        image_url: base64Url,
        status: 'verified',
        raw_text: mode === 'auto'
          ? `Automatic ${shutterSpeed}-Second Interval Capture`
          : `Manual Mode (${shutterSpeed}s) Capture`,
        items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced_to_supabase: false
      };

      // 4. ⚡ INSTANT OPTIMISTIC UI UPDATE:
      // Add immediately to React state so user sees it on the dashboard without refreshing!
      setDocuments(prevDocs => [newDoc, ...prevDocs.filter(d => d.id !== newDoc.id)]);
      setStats(prev => ({
        totalScans: prev.totalScans + 1,
        pendingCount: prev.pendingCount + 1
      }));

      // 5. Save to local storage right away
      await saveDocument(newDoc);

      // 6. In background, upload to Supabase Storage if reachable
      uploadImageToSupabase(file)
        .then(async (uploadedUrl) => {
          if (uploadedUrl) {
            newDoc.image_url = uploadedUrl;
            newDoc.synced_to_supabase = true;
            await saveDocument(newDoc);
            // Update in React state with cloud URL
            setDocuments(prev => prev.map(d => d.id === newDoc.id ? { ...d, image_url: uploadedUrl, synced_to_supabase: true } : d));
          }
        })
        .catch(() => {});

    } catch (err: any) {
      console.error("Failed to save snapshot to database:", err);
    } finally {
      setIsSavingScan(false);
    }
  };

  // Close Camera and refresh dashboard instantly
  const handleCloseCamera = () => {
    setShowCamera(false);
    refreshData();
  };

  // Quick file drop upload
  const handleProcessDroppedFile = async (file: File) => {
    const defaultTitle = `Uploaded Document - ${file.name.replace(/\.[^/.]+$/, "")}`;
    const userTitle = window.prompt("Enter document title:", defaultTitle);
    if (userTitle === null) return; // User cancelled
    
    await handleSaveCapturedSnapshot(file, userTitle.trim() || defaultTitle, 'manual');
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
  };

  const handleDelete = async (id: string) => {
    // Immediately remove from UI
    setDocuments(prev => prev.filter(d => d.id !== id));
    setStats(prev => ({
      ...prev,
      totalScans: Math.max(0, prev.totalScans - 1)
    }));

    await deleteDocument(id);
    await refreshData();
    if (viewingDoc?.id === id) setViewingDoc(null);
    if (editingDoc?.id === id) setEditingDoc(null);
  };

  const handleSaveEdit = async (updatedDoc: DocumentRecord) => {
    // Immediately update in UI
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    await saveDocument(updatedDoc);
    await refreshData();
    if (viewingDoc?.id === updatedDoc.id) {
      setViewingDoc(updatedDoc);
    }
  };

  // 1. Lock Screen (Displayed on app launch)
  if (isLocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  const syncedCount = documents.filter(d => d.synced_to_supabase).length;

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
            onClick={() => setShowModeModal(true)}
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

        {/* Shutter Speed Quick Indicator in Sidebar */}
        <div style={{
          padding: '0.85rem',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            <Clock size={14} /> Shutter Speed
          </div>
          <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 700 }}>
            {shutterSpeed} Seconds
          </div>
        </div>

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
              Automatic & Manual ({shutterSpeed}s interval) camera snapshots saved directly to database.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1rem' }}
              title="Refresh database records"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-pulse' : ''} />
            </button>
            <button
              onClick={() => setShowModeModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
            >
              <Camera size={18} /> Open Camera ({shutterSpeed}s)
            </button>
          </div>
        </header>

        {/* 🌟 Prominent Shutter Speed Control Bar on Dashboard (Configured BEFORE opening camera) */}
        <div className="glass-panel" style={{
          padding: '1.25rem 1.75rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(15, 23, 42, 0.85))',
          border: '1.5px solid rgba(99, 102, 241, 0.45)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              padding: '0.75rem',
              borderRadius: '14px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
            }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem', color: '#fff' }}>
                  షట్టర్ స్పీడ్ సెట్టింగ్ (Pre-Camera Shutter Speed)
                </strong>
                <span style={{
                  background: 'rgba(99, 102, 241, 0.25)',
                  color: '#a5b4fc',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  Active: {shutterSpeed}s
                </span>
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                కెమెరా ఓపెన్ చేయకముందే ఇక్కడ షట్టర్ స్పీడ్ మార్చుకోవచ్చు (2 సెకన్ల నుండి 1 నిమిషం వరకు)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>
              సమయం ఎంచుకోండి:
            </label>
            <select
              value={shutterSpeed}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              className="input-field"
              style={{
                width: 'auto',
                minWidth: '220px',
                padding: '0.65rem 1.1rem',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 700,
                background: '#1e293b',
                color: '#fff',
                border: '2px solid #6366f1',
                boxShadow: '0 0 16px rgba(99, 102, 241, 0.35)',
                cursor: 'pointer',
                margin: 0
              }}
            >
              {SHUTTER_SPEED_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  ⏱️ {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Launch Cards for Automatic and Manual Modes */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          <div
            onClick={() => handleSelectMode('auto', shutterSpeed)}
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
                Launch Automatic Mode ({shutterSpeed}s)
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                షట్టర్ అవసరం లేకుండా ప్రతి {shutterSpeed} సెకన్లకు ఆటోమేటిక్ స్నాప్
              </p>
            </div>
          </div>

          <div
            onClick={() => handleSelectMode('manual', shutterSpeed)}
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
                Launch Manual Mode ({shutterSpeed}s)
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                సేవ్ చేసిన పేర్ల డ్రాప్‌డౌన్ లేదా ప్రతి {shutterSpeed} సెకన్ల స్నాప్
              </p>
            </div>
          </div>
        </div>

        {/* Database & Scan Stats */}
        <StatsOverview stats={stats} syncedCount={syncedCount} />

        {/* Quick Upload from computer */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Quick File Upload</h2>
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

      {/* Mode Selection Modal (Shown right after PIN Unlock or on 'Start Camera') */}
      {showModeModal && (
        <ModeSelectModal
          initialSpeed={shutterSpeed}
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
              shutterSpeed={shutterSpeed}
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
