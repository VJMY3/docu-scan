import React, { useState } from 'react';
import { X, Save, Calendar, Type } from 'lucide-react';
import type { DocumentRecord } from '../../types/document';

interface DocumentEditFormProps {
  document: DocumentRecord;
  onSave: (updatedDoc: DocumentRecord) => Promise<void>;
  onClose: () => void;
}

export const DocumentEditForm = ({ document, onSave, onClose }: DocumentEditFormProps) => {
  const [title, setTitle] = useState(document.title);
  const [date, setDate] = useState(document.document_date);
  const [notes, setNotes] = useState(document.raw_text || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const finalData: DocumentRecord = {
      ...document,
      title: title.trim() || document.title,
      document_date: date,
      raw_text: notes,
      updated_at: new Date().toISOString()
    };
    await onSave(finalData);
    setIsSaving(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2300,
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '520px', padding: '2rem',
        borderRadius: '20px', background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        position: 'relative'
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.25rem', right: '1.25rem',
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={22} />
        </button>

        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.3rem', color: '#fff' }}>
          Edit Document Details
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <Type size={16} /> Document Title (పేరు):
            </label>
            <input
              type="text"
              className="input-field"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter document title"
              required
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <Calendar size={16} /> Document Date:
            </label>
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px' }}
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Notes / Description:
            </label>
            <textarea
              className="input-field"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes or description"
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1.25rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
