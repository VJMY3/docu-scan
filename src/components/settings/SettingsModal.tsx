import React, { useState, useEffect } from 'react';
import { X, Check, Lock, Database, RefreshCw, Eye, EyeOff, Copy, FileCode } from 'lucide-react';
import { getStoredConfig, saveConfig, testSupabaseConnection, DEFAULT_SUPABASE_SQL, normalizeSupabaseUrl, normalizeSupabaseKey } from '../../services/supabaseClient';
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
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string; tableReady?: boolean } | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    setConfig(getStoredConfig());
  }, []);

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestResult(null);
    const cleanUrl = normalizeSupabaseUrl(config.supabaseUrl || '');
    const cleanKey = normalizeSupabaseKey(config.supabaseAnonKey || '');
    setConfig(prev => ({ ...prev, supabaseUrl: cleanUrl, supabaseAnonKey: cleanKey }));

    try {
      const res = await testSupabaseConnection(cleanUrl, cleanKey);
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

  const handleResetToEnv = () => {
    const envUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
    const envKey = normalizeSupabaseKey(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
    setConfig(prev => ({
      ...prev,
      supabaseUrl: envUrl,
      supabaseAnonKey: envKey
    }));
    setStatus({ type: 'success', msg: 'Loaded values from .env file successfully!' });
    setTimeout(() => setStatus({ type: 'idle', msg: '' }), 2000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(DEFAULT_SUPABASE_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (config.passcode && !/^\d{4}$/.test(config.passcode)) {
      setStatus({ type: 'error', msg: 'Security Passcode must be exactly 4 digits (e.g. 1234).' });
      return;
    }

    const cleanConfig: AppConfig = {
      ...config,
      supabaseUrl: normalizeSupabaseUrl(config.supabaseUrl || ''),
      supabaseAnonKey: normalizeSupabaseKey(config.supabaseAnonKey || '')
    };

    saveConfig(cleanConfig);
    setConfig(cleanConfig);
    setStatus({ type: 'success', msg: 'Settings saved successfully! Ready to use.' });
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
        width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
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
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#fff' }}>Supabase Database Settings</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Connect directly to your Supabase Cloud Database & Storage
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#f8fafc' }}>
                <Database size={18} color="#6366f1" /> Supabase Credentials
              </h4>
              <button
                type="button"
                onClick={handleResetToEnv}
                className="btn btn-secondary"
                style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                title="Populate from .env file"
              >
                Reload from .env
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Project URL:
              </label>
              <input
                type="text"
                className="input-field"
                value={config.supabaseUrl || ''}
                onChange={e => setConfig({ ...config, supabaseUrl: e.target.value })}
                onBlur={e => setConfig({ ...config, supabaseUrl: normalizeSupabaseUrl(e.target.value) })}
                placeholder="https://xyzcompany.supabase.co"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.9rem' }}
              />
              <span style={{ display: 'block', marginTop: '0.3rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Format: <code>https://&lt;project-ref&gt;.supabase.co</code> (do not append <code>/rest/v1</code>)
              </span>
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
                  onBlur={e => setConfig({ ...config, supabaseAnonKey: normalizeSupabaseKey(e.target.value) })}
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
              <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                📍 Find in: Supabase Dashboard → <strong>Project Settings → API → Project API keys → anon (public)</strong>
              </span>
            </div>

            {/* Test Connection Button & Result */}
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleTestSupabase}
                  disabled={isTestingSupabase || !config.supabaseUrl || !config.supabaseAnonKey}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  <RefreshCw size={14} className={isTestingSupabase ? 'animate-pulse' : ''} />
                  {isTestingSupabase ? 'Testing Connection...' : 'Test Connection'}
                </button>
              </div>

              {supabaseTestResult && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  marginTop: '0.5rem',
                  background: supabaseTestResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${supabaseTestResult.success ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                  color: supabaseTestResult.success ? '#34d399' : '#f87171',
                  fontSize: '0.85rem',
                  lineHeight: '1.4'
                }}>
                  {supabaseTestResult.message}
                </div>
              )}
            </div>
          </div>

          {/* SQL Setup Helper */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '16px',
            padding: '1.1rem 1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#f8fafc', fontSize: '0.92rem' }}>
                <FileCode size={16} color="#818cf8" /> Supabase SQL Setup Script
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {copiedSql ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                {copiedSql ? 'Copied SQL!' : 'Copy SQL Script'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Paste and run this SQL script in your <strong>Supabase SQL Editor</strong>. This sets up the <code>inventory_scans</code> table and the <code>scans</code> storage bucket with proper RLS policies.
            </p>
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
