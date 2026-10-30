import React, { useState } from 'react';
import { Zap, Edit3, Camera, LayoutDashboard, ArrowRight, Clock } from 'lucide-react';

export const SHUTTER_SPEED_OPTIONS = [
  { value: 2, label: '2 Seconds (Ultra Fast)' },
  { value: 3, label: '3 Seconds (Fast)' },
  { value: 5, label: '5 Seconds (Default)' },
  { value: 10, label: '10 Seconds' },
  { value: 15, label: '15 Seconds' },
  { value: 20, label: '20 Seconds' },
  { value: 30, label: '30 Seconds (Half Min)' },
  { value: 45, label: '45 Seconds' },
  { value: 60, label: '60 Seconds (1 Minute)' },
];

interface ModeSelectModalProps {
  initialSpeed?: number;
  onSelectMode: (mode: 'auto' | 'manual', speed: number) => void;
  onGoToDashboard: () => void;
}

export const ModeSelectModal: React.FC<ModeSelectModalProps> = ({
  initialSpeed = 5,
  onSelectMode,
  onGoToDashboard
}) => {
  const [selectedSpeed, setSelectedSpeed] = useState<number>(initialSpeed);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(10, 15, 30, 0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2500,
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '700px',
        padding: '2.5rem',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            marginBottom: '1rem',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)'
          }}>
            <Camera size={28} color="white" />
          </div>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc' }}>
            Choose Camera Mode & Shutter Speed
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            షట్టర్ స్పీడ్ మరియు మోడ్ ఎంచుకోండి — కెమెరా వెంటనే ఆన్ అవుతుంది
          </p>
        </div>

        {/* Shutter Speed Dropdown Selector */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '1.1rem 1.4rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              background: 'rgba(99, 102, 241, 0.2)',
              padding: '0.6rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={22} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '1rem' }}>
                షట్టర్ స్పీడ్ టైమర్ (Shutter Speed Interval)
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                ప్రతి ఎన్ని సెకన్లకు ఫోటో క్యాప్చర్ అవ్వాలి? (2 సెకన్ల నుండి 1 నిమిషం వరకు)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              value={selectedSpeed}
              onChange={(e) => setSelectedSpeed(Number(e.target.value))}
              className="input-field"
              style={{
                width: 'auto',
                minWidth: '200px',
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 600,
                background: '#1e293b',
                color: '#fff',
                border: '1.5px solid #6366f1',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.25)',
                cursor: 'pointer',
                margin: 0
              }}
            >
              {SHUTTER_SPEED_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  ⏱️ {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Options Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          {/* Automatic Mode Card */}
          <div
            onClick={() => onSelectMode('auto', selectedSpeed)}
            style={{
              padding: '1.5rem',
              borderRadius: '16px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '2px solid rgba(99, 102, 241, 0.4)',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = '#818cf8';
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.18)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
            }}
          >
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginBottom: '1rem'
              }}>
                <Zap size={14} /> {selectedSpeed}s Auto Interval
              </div>

              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', color: '#fff' }}>
                ఆటోమేటిక్ (Automatic)
              </h3>

              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                షట్టర్ బటన్ నొక్కాల్సిన పని లేకుండా ప్రతి <strong>{selectedSpeed} సెకన్లకు</strong> ఆటోమేటిక్ గా స్నాప్‌షాట్ తీసి నేరుగా <strong>డేటాబేస్ లో సేవ్</strong> చేస్తుంది.
              </p>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1.5rem',
              color: '#818cf8',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>
              <span>Start Auto Scan ({selectedSpeed}s)</span>
              <ArrowRight size={18} />
            </div>
          </div>

          {/* Manual Mode Card */}
          <div
            onClick={() => onSelectMode('manual', selectedSpeed)}
            style={{
              padding: '1.5rem',
              borderRadius: '16px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = '#34d399';
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.18)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
            }}
          >
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#6ee7b7',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginBottom: '1rem'
              }}>
                <Edit3 size={14} /> {selectedSpeed}s Snap + Name
              </div>

              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', color: '#fff' }}>
                మాన్యువల్ (Manual)
              </h3>

              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                లైవ్ రికార్డ్ అవుతూ ప్రతి <strong>{selectedSpeed} సెకన్లకు</strong> ఫోటో క్యాప్చర్ అవుతుంది. వెంటనే ఫోటో పేరు (Name) ఎంటర్ చేయడానికి <strong>పాప్-అప్</strong> వస్తుంది.
              </p>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1.5rem',
              color: '#34d399',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>
              <span>Start Manual Scan ({selectedSpeed}s)</span>
              <ArrowRight size={18} />
            </div>
          </div>
        </div>

        {/* Footer / Skip to Dashboard */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onGoToDashboard}
            className="btn btn-secondary"
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <LayoutDashboard size={16} /> View Saved Scans Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
