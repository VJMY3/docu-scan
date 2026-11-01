import React from 'react';
import { Zap, Edit3, Camera, LayoutDashboard, ArrowRight } from 'lucide-react';

interface ModeSelectModalProps {
  onSelectMode: (mode: 'auto' | 'manual') => void;
  onGoToDashboard: () => void;
}

export const ModeSelectModal: React.FC<ModeSelectModalProps> = ({
  onSelectMode,
  onGoToDashboard
}) => {
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
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
            Choose Camera Mode
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            కెమెరా మోడ్ ఎంచుకోండి — Space, Enter లేదా బటన్ క్లిక్ తో ఫోటోలు సేవ్ చేసుకోండి
          </p>
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
            onClick={() => onSelectMode('auto')}
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
                <Zap size={14} /> Direct Instant Save
              </div>

              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', color: '#fff' }}>
                ఆటోమేటిక్ (Automatic)
              </h3>

              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Space, Enter లేదా బటన్ క్లిక్ చేసిన వెంటనే ఎటువంటి పాప్-అప్స్ లేకుండా నేరుగా <strong>సుపబాస్ డేటాబేస్ లో సేవ్</strong> అవుతుంది.
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
              <span>Launch Automatic Mode</span>
              <ArrowRight size={18} />
            </div>
          </div>

          {/* Manual Mode Card */}
          <div
            onClick={() => onSelectMode('manual')}
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
                <Edit3 size={14} /> Name & Save
              </div>

              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', color: '#fff' }}>
                మాన్యువల్ (Manual)
              </h3>

              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Space, Enter లేదా బటన్ క్లిక్ చేసి డాక్యుమెంట్ పేరు లేదా మునుపటి సేవ్ చేసిన పేర్ల డ్రాప్‌డౌన్ తో సేవ్ చేసుకోండి.
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
              <span>Launch Manual Mode</span>
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
              padding: '0.65rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '12px',
              fontSize: '0.95rem'
            }}
          >
            <LayoutDashboard size={18} /> Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
