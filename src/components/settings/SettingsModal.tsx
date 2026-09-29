import React, { useState, useEffect } from 'react';
import { X, Check, Lock } from 'lucide-react';
import { getStoredConfig, saveConfig } from '../../services/supabaseClient';
import type { AppConfig } from '../../types/document';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const [config, setConfig] = useState<AppConfig>({ geminiKey: '', passcode: '1234' });
  const [status, setStatus] = useState<{ type: 'idle'|'success', msg: string }>({ type: 'idle', msg: '' });

  useEffect(() => {
    setConfig(getStoredConfig());
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save locally
    saveConfig(config);
    setStatus({ type: 'success', msg: 'Settings saved locally.' });
    
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          App Settings
        </h2>
        
        <form onSubmit={handleSave}>
          
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--success-color)' }}>
            <Lock size={18} /> Authentication
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Set a 4-digit passcode to lock the application.
          </p>

          <div className="input-group">
            <label className="input-label">Security PIN</label>
            <input 
              type="text"
              maxLength={4}
              pattern="\d{4}"
              className="input-field" 
              placeholder="1234"
              value={config.passcode}
              onChange={e => setConfig({...config, passcode: e.target.value.replace(/\D/g, '')})}
            />
          </div>

          {status.msg && (
            <div style={{ 
              padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--success-color)'
            }}>
              <Check size={18} />
              <span style={{ fontSize: '0.9rem' }}>{status.msg}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Save Settings
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
};
