import React, { useState, useEffect } from 'react';
import { X, Check, Lock, Database, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { getStoredConfig, saveConfig, testSupabaseConnection } from '../../services/supabaseClient';
import type { AppConfig } from '../../types/document';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const [config, setConfig] = useState<AppConfig>({
    geminiKey: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    passcode: '1234'
  });
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });

  useEffect(() => {
    setConfig(getStoredConfig());
  }, []);

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestResult(null);
    try {
      const res = await testSupabaseConnection(config.supabaseUrl || '', config.supabaseAnonKey || '');
      setSupabaseTestResult(res);
    } catch (e: any) {
      setSupabaseTestResult({
        success: false,
        message: e.message || 'Connection failed.'
      });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (config.passcode && !/^\d{4}$/.test(config.passcode)) {
      setStatus({ type: 'error', msg: 'Security Passcode must be exactly 4 digits (e.g. 1234).' });
      return;
    }

    saveConfig(config);
    setStatus({ type: 'success', msg: 'Settings saved successfully!' });
    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000,
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto',
        padding: '2.25rem', borderRadius: '24px', background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.25rem', right: '1.25rem',
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '0.6rem', borderRadius: '12px' }}>
            <Database size={24} color="var(--primary-color)" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#fff' }}>Database & App Settings</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Configure your Supabase Cloud Database and Security PIN
            </p>
          </div>
        </div>

        {status.msg && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            background: status.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: status.type === 'success' ? '#34d399' : '#f87171',
            border: `1px solid ${status.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            fontSize: '0.9rem'
          }}>
            {status.msg}
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Supabase Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            border: '1px solid var(--border-color)'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#f8fafc' }}>
              <Database size={18} color="#6366f1" /> Supabase Database & Storage
            </h4>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Project URL:
              </label>
              <input
                type="text"
                className="input-field"
                value={config.supabaseUrl || ''}
                onChange={e => setConfig({ ...config, supabaseUrl: e.target.value })}
                placeholder="https://xyzcompany.supabase.co"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Anon Public Key:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showAnonKey ? 'text' : 'password'}
                  className="input-field"
                  value={config.supabaseAnonKey || ''}
                  onChange={e => setConfig({ ...config, supabaseAnonKey: e.target.value })}
                  placeholder="eyJhbGciOi..."
                  style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.9rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowAnonKey(!showAnonKey)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                  }}
                >
                  {showAnonKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={isTestingSupabase || !config.supabaseUrl}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                <RefreshCw size={14} className={isTestingSupabase ? 'animate-pulse' : ''} />
                {isTestingSupabase ? 'Testing Connection...' : 'Test Connection'}
              </button>

              {supabaseTestResult && (
                <span style={{
                  fontSize: '0.82rem',
                  color: supabaseTestResult.success ? 'var(--success-color)' : 'var(--danger-color)'
                }}>
                  {supabaseTestResult.message}
                </span>
              )}
            </div>
          </div>

          {/* Passcode Security */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            padding: '1.25rem',
            marginBottom: '1.75rem',
            border: '1px solid var(--border-color)'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#f8fafc' }}>
              <Lock size={18} color="#10b981" /> 4-Digit Security Passcode
            </h4>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                App Lock Passcode (PIN):
              </label>
              <input
                type="password"
                maxLength={4}
                pattern="\d{4}"
                className="input-field"
                value={config.passcode || '1234'}
                onChange={e => setConfig({ ...config, passcode: e.target.value.replace(/\D/g, '') })}
                placeholder="1234"
                style={{ width: '120px', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '1.1rem', letterSpacing: '4px', textAlign: 'center' }}
              />
              <span style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Default is 1234. Used to unlock the camera on startup.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1.25rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Check size={18} /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
