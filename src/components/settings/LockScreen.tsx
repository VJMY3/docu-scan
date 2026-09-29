import React, { useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { getStoredConfig } from '../../services/supabaseClient';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen = ({ onUnlock }: LockScreenProps) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config = getStoredConfig();
    const validPin = config.passcode || '1234';
    
    if (pin === validPin) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleInput = (val: string) => {
    const newPin = val.replace(/\D/g, '');
    setPin(newPin);
    if (newPin.length === 4) {
      // Auto-submit when 4 digits are entered
      const config = getStoredConfig();
      const validPin = config.passcode || '1234';
      if (newPin === validPin) {
        onUnlock();
      } else {
        setError(true);
        setPin('');
        setTimeout(() => setError(false), 2000);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--bg-color)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      backgroundImage: `radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.1) 0px, transparent 50%)`
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
          <Lock size={40} color="var(--primary-color)" />
        </div>
        
        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.75rem' }}>Secure Access</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Enter your 4-digit passcode to continue.</p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: '15px', height: '15px', borderRadius: '50%',
                background: pin.length > i ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.2s'
              }} />
            ))}
          </div>

          <input
            type="password"
            maxLength={4}
            pattern="\d{4}"
            value={pin}
            onChange={e => handleInput(e.target.value)}
            style={{
              opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, cursor: 'text'
            }}
            autoFocus
          />

          {error && (
            <div style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', animation: 'pulse 0.5s infinite' }}>
              <AlertCircle size={18} /> Incorrect Passcode
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
