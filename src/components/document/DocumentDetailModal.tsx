import { X, Calendar, Download, Edit2, Cloud, HardDrive } from 'lucide-react';
import type { DocumentRecord } from '../../types/document';

interface DocumentDetailModalProps {
  document: DocumentRecord;
  onClose: () => void;
  onEdit: () => void;
}

export const DocumentDetailModal = ({ document, onClose, onEdit }: DocumentDetailModalProps) => {
  const handleDownload = async () => {
    if (!document.image_url) return;
    
    try {
      // Fetch the image as a blob
      const response = await fetch(document.image_url);
      const blob = await response.blob();
      
      // Create a blob URL
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create download link
      const a = window.document.createElement('a');
      a.href = blobUrl;
      a.download = `${document.title.replace(/[^a-z0-9]/gi, '_')}.jpg`;
      window.document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200,
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '850px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
        background: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.15)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', color: '#fff' }}>
              {document.title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} /> {document.document_date}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {document.synced_to_supabase ? (
                  <span style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Cloud size={14} /> Cloud Synced
                  </span>
                ) : (
                  <span style={{ color: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <HardDrive size={14} /> Local
                  </span>
                )}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={onEdit}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              title="Rename Document"
            >
              <Edit2 size={16} /> Edit Title
            </button>
            {document.image_url && (
              <button
                onClick={handleDownload}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                title="Download Photo"
              >
                <Download size={16} /> Download
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Image Preview Container */}
        <div style={{
          flex: 1,
          minHeight: '350px',
          background: '#05070f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          overflow: 'auto'
        }}>
          {document.image_url && !document.image_url.startsWith('blob:') ? (
            <img
              src={document.image_url}
              alt={document.title}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
              style={{
                maxWidth: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.7)'
              }}
            />
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>No image file found or expired preview.</div>
          )}
        </div>

        {/* Footer Notes */}
        <div style={{
          padding: '0.9rem 1.5rem',
          background: 'rgba(0,0,0,0.4)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.82rem',
          color: 'var(--text-muted)'
        }}>
          <span>Capture source: {document.raw_text || 'Camera snapshot'}</span>
          <span>Created: {new Date(document.created_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
