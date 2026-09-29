import React, { useState } from 'react';
import { X, Save, Calendar, Plus, Trash2 } from 'lucide-react';
import type { DocumentRecord, DocumentStatus } from '../../types/document';

interface DocumentEditFormProps {
  document: DocumentRecord;
  onSave: (updatedDoc: DocumentRecord) => Promise<void>;
  onClose: () => void;
}

export const DocumentEditForm = ({ document, onSave, onClose }: DocumentEditFormProps) => {
  const [formData, setFormData] = useState<DocumentRecord>({ 
    ...document,
    items: [...document.items] // clone array to safely edit
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleItemChange = (id: string, field: 'item_name' | 'quantity', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: crypto.randomUUID(), item_name: '', quantity: 1 }]
    }));
  };

  const handleRemoveItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Filter out completely empty items
    const validItems = formData.items.filter(i => i.item_name.trim() !== '');
    const finalData = { ...formData, items: validItems, status: 'verified' as DocumentStatus };
    await onSave(finalData);
    setIsSaving(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative', background: 'var(--bg-color)' }}>
        <button type="button" onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: '1.5rem' }}>Edit Inventory Scan</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Update the AI extracted items if there were any recognition errors.
        </p>

        <form onSubmit={handleSubmit}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Scan Title</label>
              <input 
                type="text" required
                className="input-field" 
                style={{ width: '100%' }} 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Date</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="date" required
                  className="input-field" 
                  style={{ width: '100%', paddingLeft: '2.5rem' }} 
                  value={formData.document_date}
                  onChange={e => setFormData({...formData, document_date: e.target.value})}
                />
                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>Inventory Items</h4>
              <button type="button" onClick={handleAddItem} className="btn" style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary-color)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                <Plus size={16} /> Add Item
              </button>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem' }}>
              {formData.items.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No items yet. Add one!</div>
              )}
              {formData.items.map((item, index) => (
                <div key={item.id} style={{ display: 'flex', gap: '1rem', marginBottom: index !== formData.items.length - 1 ? '1rem' : 0, alignItems: 'center' }}>
                  <div style={{ flex: 3 }}>
                    <input 
                      type="text" 
                      placeholder="Item Name"
                      className="input-field" 
                      style={{ width: '100%' }}
                      value={item.item_name}
                      onChange={e => handleItemChange(item.id, 'item_name', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="Qty"
                      className="input-field" 
                      style={{ width: '100%' }}
                      value={item.quantity === 0 && item.item_name === '' ? '' : item.quantity}
                      onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <button type="button" onClick={() => handleRemoveItem(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.5rem' }}>
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ flex: 1 }}>
              {isSaving ? 'Saving...' : <><Save size={18} /> Save & Verify List</>}
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
};
