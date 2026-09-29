import { X, Calendar, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import type { DocumentRecord } from '../../types/document';

interface DocumentDetailModalProps {
  document: DocumentRecord;
  onClose: () => void;
  onEdit: () => void;
}

export const DocumentDetailModal = ({ document, onClose, onEdit }: DocumentDetailModalProps) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '2rem'
    }}>
      <div className="glass-panel" style={{ 
        width: '100%', maxWidth: '1000px', maxHeight: '90vh', 
        display: 'flex', flexWrap: 'wrap', overflowY: 'auto', overflowX: 'hidden', position: 'relative',
        background: 'var(--bg-color)'
      }}>
        
        {/* Left Side: Original Image */}
        <div style={{ flex: 1, minWidth: '300px', borderRight: '1px solid var(--border-color)', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          {document.image_url ? (
            <img src={document.image_url} alt="Scanned Document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>No image available</div>
          )}
        </div>

        {/* Right Side: Extracted Data */}
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {document.status === 'verified' ? <CheckCircle color="var(--success-color)" /> : <AlertTriangle color="var(--warning-color)" />}
            <span style={{ color: document.status === 'verified' ? 'var(--success-color)' : 'var(--warning-color)', fontWeight: 600, textTransform: 'capitalize' }}>
              {document.status === 'pending' ? 'Pending Verification' : document.status}
            </span>
          </div>

          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.8rem' }}>{document.title}</h2>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              <Calendar size={18} /> {document.document_date}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              <Package size={18} /> {document.items.length} Unique Items
            </div>
          </div>

          <h4 style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Extracted Inventory Items</h4>
          
          {document.items.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              No items could be extracted from this image.
            </div>
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Item Name</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 500, width: '100px', textAlign: 'right' }}>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {document.items.map(item => (
                    <tr key={item.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{item.item_name}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Raw OCR Text</h4>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', maxHeight: '100px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
              {document.raw_text || 'No text extracted.'}
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', gap: '1rem' }}>
            <button onClick={onEdit} className="btn btn-primary" style={{ flex: 1 }}>
              Edit List
            </button>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
