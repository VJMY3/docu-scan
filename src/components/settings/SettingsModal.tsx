import React, { useState, useEffect } from 'react';
import { X, Check, Lock, Sparkles, Key, Eye, EyeOff, ExternalLink, Cpu } from 'lucide-react';
import { getStoredConfig, saveConfig, DEFAULT_GEMINI_MODEL } from '../../services/supabaseClient';
import type { AppConfig } from '../../types/document';

interface SettingsModalProps {
  onClose: () => void;
}

const MODEL_OPTIONS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash (Recommended)',
    badge: 'Fastest & High Precision',
    desc: 'Google’s flagship speed-and-intelligence model. Highly optimized for handwritten cursive lists, tabular extraction, and instant response.'
  },
  {
    id: 'gemini-3.8-pro',
    name: 'Gemini 3.8 Pro',
    badge: 'Maximum Reasoning',
    desc: 'Advanced reasoning model ideal for complex, noisy, or difficult-to-read handwritten documents.'
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    badge: 'High Speed',
    desc: 'High-speed multimodal vision for rapid document processing.'
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    badge: 'Deep Vision',
    desc: 'Comprehensive multimodal understanding with strong tabular layout comprehension.'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    badge: 'Lightweight & Stable',
    desc: 'Dependable and lightweight multimodal model with high quota availability.'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    badge: 'Balanced Pro',
    desc: 'Previous generation deep reasoning model for structured data.'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    badge: 'Legacy Fast',
    desc: 'Legacy fast model for general document processing.'
  }
];

export const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const [config, setConfig] = useState<AppConfig>({
    geminiKey: '',
    geminiModel: DEFAULT_GEMINI_MODEL,
    passcode: '1234'
  });
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });

  useEffect(() => {
    setConfig(getStoredConfig());
  }, []);

  const selectedModelInfo = MODEL_OPTIONS.find(m => m.id === (config.geminiModel || DEFAULT_GEMINI_MODEL)) || MODEL_OPTIONS[0];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (config.passcode && config.passcode.length !== 4) {
      setStatus({ type: 'error', msg: 'Security PIN must be exactly 4 digits.' });
      return;
    }

    saveConfig(config);
    setStatus({ type: 'success', msg: 'Settings saved successfully! The app will now use your key and model.' });

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          App Settings
        </h2>
        
        <form onSubmit={handleSave}>
          
          {/* Gemini API Key Section */}
          <div style={{ marginBottom: '1.75rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary-color)', fontSize: '1.1rem' }}>
              <Sparkles size={18} /> Gemini AI Configuration
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
              Provide your own Gemini API key. All handwriting extraction and inventory scans will run securely using your key.
            </p>

            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Key size={14} /> Gemini API Key
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showKey ? 'text' : 'password'}
                  className="input-field" 
                  placeholder="AIzaSy..."
                  value={config.geminiKey}
                  onChange={e => setConfig({ ...config, geminiKey: e.target.value.trim() })}
                  style={{ width: '100%', paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute', right: '0.75rem', background: 'transparent',
                    border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center'
                  }}
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary-color)', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  Get a free key from Google AI Studio <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Model Selection Dropdown */}
            <div className="input-group" style={{ marginTop: '1.25rem' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Cpu size={14} /> Preferred Gemini Model
              </label>
              <select
                className="input-field"
                value={config.geminiModel || DEFAULT_GEMINI_MODEL}
                onChange={e => setConfig({ ...config, geminiModel: e.target.value })}
                style={{
                  cursor: 'pointer',
                  backgroundColor: 'rgba(20, 24, 38, 0.95)',
                  color: 'var(--text-main)'
                }}
              >
                {MODEL_OPTIONS.map(opt => (
                  <option 
                    key={opt.id} 
                    value={opt.id} 
                    style={{ backgroundColor: '#131726', color: '#ffffff' }}
                  >
                    {opt.name}
                  </option>
                ))}
              </select>
              
              {/* Selected Model Description Pill */}
              <div style={{
                marginTop: '0.6rem',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                lineHeight: '1.4'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{selectedModelInfo.id}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(99, 102, 241, 0.25)',
                    color: '#c7d2fe'
                  }}>
                    {selectedModelInfo.badge}
                  </span>
                </div>
                {selectedModelInfo.desc}
              </div>
            </div>
          </div>

          {/* Authentication / PIN Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--success-color)', fontSize: '1.1rem' }}>
              <Lock size={18} /> App Security PIN
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Set a 4-digit passcode to lock the application.
            </p>

            <div className="input-group">
              <label className="input-label">Security PIN (4 digits)</label>
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
          </div>

          {/* Status Message */}
          {status.msg && (
            <div style={{ 
              padding: '0.9rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: status.type === 'error' ? 'var(--danger-color)' : 'var(--success-color)',
              border: status.type === 'error' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              {status.type === 'success' && <Check size={18} />}
              <span style={{ fontSize: '0.9rem' }}>{status.msg}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
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
