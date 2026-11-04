import { useState, useMemo } from 'react';
import type { DocumentRecord } from '../../types/document';
import { 
  Search, Trash2, Download, FolderPlus, Folder, Calendar,
  CheckSquare, Square, X, Loader
} from 'lucide-react';
import { promptForPassword } from '../../services/securityService';
import { downloadSingleImage, downloadImagesAsZip, groupDocumentsByMonth, getMonthYearLabel } from '../../services/downloadService';
import { getFolders, addFolder, deleteFolder, groupDocumentsByFolder } from '../../services/folderService';

interface EnhancedDocumentGalleryProps {
  documents: DocumentRecord[];
  onView: (doc: DocumentRecord) => void;
  onEdit: (doc: DocumentRecord) => void;
  onDelete: (id: string, imageUrl?: string) => void;
  onUpdateFolder: (doc: DocumentRecord, folder: string) => void;
  onRefresh: () => void;
}

type ViewMode = 'all' | 'monthly' | 'folders';

export const EnhancedDocumentGallery = ({ 
  documents, 
  onView, 
  onDelete,
  onUpdateFolder,
  onRefresh
}: EnhancedDocumentGalleryProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [, setFoldersState] = useState<string[]>(() => getFolders());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  // Filter documents by search term
  const filteredDocs = useMemo(() => {
    return documents.filter(doc =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.folder?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  // Group documents by month
  const groupedByMonth = useMemo(() => groupDocumentsByMonth(filteredDocs), [filteredDocs]);

  // Group documents by folder
  const groupedByFolder = useMemo(() => {
    const grouped = groupDocumentsByFolder(filteredDocs);
    
    // Add all created folders even if empty
    const allFolders = getFolders();
    allFolders.forEach(folderName => {
      if (!grouped.has(folderName)) {
        grouped.set(folderName, []);
      }
    });
    
    return grouped;
  }, [filteredDocs]);

  // Select/Deselect handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredDocs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocs.map(d => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Download handlers
  const handleDownloadSingle = async (doc: DocumentRecord) => {
    try {
      const extension = doc.image_url.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${doc.title.replace(/[^a-z0-9]/gi, '_')}.${extension}`;
      await downloadSingleImage(doc.image_url, fileName);
    } catch (error) {
      alert('Failed to download image');
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      setIsDownloading(true);
      const selectedDocs = documents.filter(d => selectedIds.has(d.id));
      await downloadImagesAsZip(
        selectedDocs, 
        `Selected_Photos_${Date.now()}.zip`,
        (current, total) => setDownloadProgress({ current, total })
      );
      setSelectedIds(new Set());
      alert(`Successfully downloaded ${selectedDocs.length} photos!`);
    } catch (error) {
      alert('Failed to download photos');
    } finally {
      setIsDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  const handleDownloadMonth = async (monthKey: string, docs: DocumentRecord[]) => {
    try {
      setIsDownloading(true);
      const monthLabel = getMonthYearLabel(monthKey);
      await downloadImagesAsZip(
        docs,
        `Photos_${monthLabel.replace(' ', '_')}.zip`,
        (current, total) => setDownloadProgress({ current, total })
      );
      alert(`Successfully downloaded ${docs.length} photos from ${monthLabel}!`);
    } catch (error) {
      alert('Failed to download monthly photos');
    } finally {
      setIsDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  // Delete handlers
  const handleDeleteSingle = async (doc: DocumentRecord) => {
    const verified = await promptForPassword('delete this image');
    if (!verified) return;

    if (window.confirm(`Are you sure you want to delete "${doc.title}"?`)) {
      onDelete(doc.id, doc.image_url);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const verified = await promptForPassword('delete selected images');
    if (!verified) return;

    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} selected photos?`)) {
      const selectedDocs = documents.filter(d => selectedIds.has(d.id));
      for (const doc of selectedDocs) {
        await onDelete(doc.id, doc.image_url);
      }
      setSelectedIds(new Set());
      onRefresh();
    }
  };

  // Folder handlers
  const handleAddFolder = async () => {
    const verified = await promptForPassword('create a new folder');
    if (!verified) return;

    setShowAddFolderModal(true);
  };

  const handleCreateFolder = () => {
    try {
      const updated = addFolder(newFolderName);
      setFoldersState(updated);
      setNewFolderName('');
      setShowAddFolderModal(false);
      alert(`Folder "${newFolderName}" created successfully!`);
    } catch (error: any) {
      alert(error.message || 'Failed to create folder');
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    const verified = await promptForPassword('delete this folder');
    if (!verified) return;

    const docsInFolder = documents.filter(d => d.folder === folderName);
    const message = docsInFolder.length > 0
      ? `Delete folder "${folderName}"? ${docsInFolder.length} photos will be moved to Uncategorized.`
      : `Delete folder "${folderName}"?`;

    if (window.confirm(message)) {
      // Move documents to uncategorized
      for (const doc of docsInFolder) {
        await onUpdateFolder({ ...doc, folder: undefined }, '');
      }
      
      const updated = deleteFolder(folderName);
      setFoldersState(updated);
      onRefresh();
    }
  };

  // Render photo card
  const renderPhotoCard = (doc: DocumentRecord) => {
    const isSelected = selectedIds.has(doc.id);
    
    return (
      <div
        key={doc.id}
        style={{
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.05)',
          border: isSelected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
      >
        {/* Selection checkbox */}
        <div
          style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0.5rem',
            zIndex: 10,
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '6px',
            padding: '0.25rem'
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleSelect(doc.id);
          }}
        >
          {isSelected ? (
            <CheckSquare size={20} color="#6366f1" />
          ) : (
            <Square size={20} color="#fff" />
          )}
        </div>

        {/* Image */}
        <div
          onClick={() => onView(doc)}
          style={{
            width: '100%',
            height: '200px',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {doc.image_url && !doc.image_url.startsWith('blob:') ? (
            <img
              src={doc.image_url}
              alt={doc.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ color: '#666' }}>No Image</span>
          )}
        </div>

        {/* Info section */}
        <div style={{ padding: '0.75rem' }}>
          <div style={{ 
            fontWeight: 600, 
            color: '#fff', 
            fontSize: '0.9rem',
            marginBottom: '0.25rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {doc.title}
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-muted)',
            marginBottom: '0.5rem'
          }}>
            {new Date(doc.created_at).toLocaleDateString()}
          </div>
          
          {doc.folder && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              marginBottom: '0.5rem'
            }}>
              <Folder size={12} />
              {doc.folder}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadSingle(doc);
              }}
              style={{
                flex: 1,
                padding: '0.4rem',
                background: 'rgba(16, 185, 129, 0.15)',
                border: 'none',
                borderRadius: '6px',
                color: '#10b981',
                cursor: 'pointer',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}
            >
              <Download size={14} /> Download
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSingle(doc);
              }}
              style={{
                padding: '0.4rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: 'none',
                borderRadius: '6px',
                color: '#f87171',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', borderRadius: '16px' }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem' }}>
              Photo Gallery ({documents.length})
            </h3>
            {selectedIds.size > 0 && (
              <p style={{ margin: 0, color: '#6366f1', fontSize: '0.85rem' }}>
                {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* View mode toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setViewMode('all')}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode === 'all' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: viewMode === 'all' ? '#818cf8' : '#fff',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              All Photos
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode === 'monthly' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: viewMode === 'monthly' ? '#818cf8' : '#fff',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Calendar size={14} /> Monthly
            </button>
            <button
              onClick={() => setViewMode('folders')}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode === 'folders' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: viewMode === 'folders' ? '#818cf8' : '#fff',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Folder size={14} /> Folders
            </button>
          </div>
        </div>

        {/* Search and actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 250px' }}>
            <Search size={18} style={{ 
              position: 'absolute', 
              left: '10px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--text-muted)' 
            }} />
            <input
              type="text"
              placeholder="Search photos..."
              className="input-field"
              style={{ 
                width: '100%', 
                paddingLeft: '2.5rem', 
                margin: 0, 
                borderRadius: '8px',
                padding: '0.6rem 0.6rem 0.6rem 2.5rem'
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={handleSelectAll}
            style={{
              padding: '0.6rem 1rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            {selectedIds.size === filteredDocs.length && filteredDocs.length > 0 ? (
              <>
                <CheckSquare size={16} /> Deselect All
              </>
            ) : (
              <>
                <Square size={16} /> Select All
              </>
            )}
          </button>

          {selectedIds.size > 0 && (
            <>
              <button
                onClick={handleDownloadSelected}
                disabled={isDownloading}
                style={{
                  padding: '0.6rem 1rem',
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '8px',
                  color: '#10b981',
                  cursor: isDownloading ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {isDownloading ? <Loader size={16} className="animate-pulse" /> : <Download size={16} />}
                Download ({selectedIds.size})
              </button>
              <button
                onClick={handleDeleteSelected}
                style={{
                  padding: '0.6rem 1rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  color: '#f87171',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Trash2 size={16} /> Delete ({selectedIds.size})
              </button>
            </>
          )}

          <button
            onClick={handleAddFolder}
            style={{
              padding: '0.6rem 1rem',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '8px',
              color: '#818cf8',
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <FolderPlus size={16} /> New Folder
          </button>
        </div>
      </div>

      {/* Download progress */}
      {isDownloading && (
        <div style={{
          padding: '1rem 1.5rem',
          background: 'rgba(99, 102, 241, 0.1)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Loader size={18} className="animate-pulse" color="#818cf8" />
            <span style={{ color: '#818cf8', fontSize: '0.9rem' }}>
              Downloading... {downloadProgress.current} / {downloadProgress.total}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
        {viewMode === 'all' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1rem'
          }}>
            {filteredDocs.length === 0 ? (
              <div style={{ 
                gridColumn: '1 / -1', 
                textAlign: 'center', 
                padding: '3rem',
                color: 'var(--text-muted)' 
              }}>
                No photos found
              </div>
            ) : (
              filteredDocs.map(doc => renderPhotoCard(doc))
            )}
          </div>
        )}

        {viewMode === 'monthly' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {Array.from(groupedByMonth.entries())
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([monthKey, docs]) => (
                <div key={monthKey}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
                        {getMonthYearLabel(monthKey)}
                      </h4>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {docs.length} photo{docs.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadMonth(monthKey, docs)}
                      disabled={isDownloading}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '8px',
                        color: '#10b981',
                        cursor: isDownloading ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Download size={16} /> Download Month
                    </button>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '1rem'
                  }}>
                    {docs.map(doc => renderPhotoCard(doc))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {viewMode === 'folders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {Array.from(groupedByFolder.entries()).map(([folderName, docs]) => (
              <div key={folderName}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Folder size={20} color="#818cf8" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
                        {folderName}
                      </h4>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {docs.length} photo{docs.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {folderName !== 'Uncategorized' && (
                    <button
                      onClick={() => handleDeleteFolder(folderName)}
                      style={{
                        padding: '0.4rem',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#f87171',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1rem'
                }}>
                  {docs.map(doc => renderPhotoCard(doc))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Folder Modal */}
      {showAddFolderModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Create New Folder</h3>
              <button
                onClick={() => setShowAddFolderModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Enter folder name"
              className="input-field"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && newFolderName.trim() && handleCreateFolder()}
              style={{ width: '100%', marginBottom: '1rem' }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddFolderModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1.2rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.2rem' }}
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
