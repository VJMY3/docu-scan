import { useState } from 'react';
import type { DocumentRecord } from '../../types/document';
import { Search, Eye, Trash2, Cloud, HardDrive, Edit2, Image as ImageIcon } from 'lucide-react';

interface DocumentTableProps {
  documents: DocumentRecord[];
  onView: (doc: DocumentRecord) => void;
  onEdit: (doc: DocumentRecord) => void;
  onDelete: (id: string) => void;
}

export const DocumentTable = ({ documents, onView, onEdit, onDelete }: DocumentTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', borderRadius: '16px' }}>
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem' }}>Captured Scans Database</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            డేటాబేస్ లో సేవ్ అయిన అన్ని స్నాప్‌షాట్‌లు మరియు డాక్యుమెంట్లు ({documents.length})
          </p>
        </div>
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by title..."
            className="input-field"
            style={{ width: '100%', paddingLeft: '2.5rem', margin: 0, borderRadius: '8px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontWeight: 500, width: '70px' }}>Photo</th>
              <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontWeight: 500 }}>Document Title</th>
              <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontWeight: 500 }}>Date & Time</th>
              <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontWeight: 500 }}>Database Status</th>
              <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <ImageIcon size={40} style={{ opacity: 0.3, marginBottom: '0.75rem', display: 'block', margin: '0 auto' }} />
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>No scans captured yet.</p>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Start the camera to take automatic or manual 5-second snapshots!
                  </span>
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="table-row-hover">
                  {/* Photo Thumbnail */}
                  <td style={{ padding: '0.75rem 1.25rem' }}>
                    <div
                      onClick={() => onView(doc)}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: '#000',
                        border: '1px solid rgba(255,255,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {doc.image_url ? (
                        <img
                          src={doc.image_url}
                          alt={doc.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <ImageIcon size={20} color="var(--text-muted)" />
                      )}
                    </div>
                  </td>

                  {/* Document Title */}
                  <td style={{ padding: '0.75rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {doc.raw_text || 'Live Snapshot'}
                    </div>
                  </td>

                  {/* Date & Time */}
                  <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <div>{doc.document_date}</div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>
                      {new Date(doc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </td>

                  {/* Sync Status */}
                  <td style={{ padding: '0.75rem 1.25rem' }}>
                    {doc.synced_to_supabase ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--success-color)',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 500
                      }}>
                        <Cloud size={14} /> Cloud DB Synced
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: 'var(--warning-color)',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 500
                      }}>
                        <HardDrive size={14} /> Local Storage
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => onView(doc)}
                        title="View photo"
                        style={{
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.45rem',
                          cursor: 'pointer',
                          color: '#818cf8',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => onEdit(doc)}
                        title="Rename"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.45rem',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                            onDelete(doc.id);
                          }
                        }}
                        title="Delete"
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.45rem',
                          cursor: 'pointer',
                          color: '#f87171',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
