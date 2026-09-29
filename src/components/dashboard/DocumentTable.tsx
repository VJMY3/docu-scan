import { useState } from 'react';
import type { DocumentRecord } from '../../types/document';
import { Search, Eye, Trash2, Cloud, HardDrive, Edit2 } from 'lucide-react';

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
    <div className="glass-panel" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Recent Inventory Scans</h3>
        <div style={{ position: 'relative', width: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search scans..." 
            className="input-field"
            style={{ width: '100%', paddingLeft: '2.5rem', margin: 0 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 500 }}>Scan Title</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 500 }}>Date</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Items Extracted</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 500 }}>Sync</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No inventory scans found. Upload a handwritten list!
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="table-row-hover">
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{doc.title}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>{doc.document_date}</td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {doc.items.length} Unique Items
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ 
                      background: doc.status === 'verified' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', 
                      color: doc.status === 'verified' ? 'var(--success-color)' : 'var(--warning-color)', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '99px', 
                      fontSize: '0.85rem',
                      textTransform: 'capitalize'
                    }}>
                      {doc.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    {doc.synced_to_supabase ? 
                      <span title="Synced to Supabase"><Cloud size={18} color="var(--success-color)" /></span> : 
                      <span title="Local Only"><HardDrive size={18} color="var(--warning-color)" /></span>
                    }
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => onView(doc)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary-color)' }}>
                        <Eye size={18} />
                      </button>
                      <button onClick={() => onEdit(doc)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => {
                        if (window.confirm('Are you sure you want to delete this scan?')) onDelete(doc.id);
                      }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger-color)' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <style>{`
        .table-row-hover:hover {
          background: rgba(255, 255, 255, 0.02);
        }
      `}</style>
    </div>
  );
};
