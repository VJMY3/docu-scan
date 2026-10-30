import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, X, Zap, ZapOff, Play, Pause, Camera as CameraIcon,
  Check, Trash2, Edit3, ShieldAlert, Tag, RotateCcw
} from 'lucide-react';

export type ScannerMode = 'auto' | 'manual';

interface CameraViewProps {
  initialMode?: ScannerMode;
  shutterSpeed?: number;
  savedNames?: string[];
  onSaveNewName?: (name: string) => void;
  onCapture: (file: File, title: string, mode: ScannerMode) => Promise<boolean | void>;
  onCancel: () => void;
  isSaving?: boolean;
}

interface PendingManualCapture {
  file: File;
  previewUrl: string;
  defaultTitle: string;
}

export const CameraView: React.FC<CameraViewProps> = ({
  initialMode = 'auto',
  shutterSpeed = 5,
  savedNames = [],
  onSaveNewName,
  onCapture,
  onCancel,
  isSaving = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashSupported, setFlashSupported] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  // Mode and Timer state
  const [mode, setMode] = useState<ScannerMode>(initialMode);
  const [intervalSeconds] = useState<number>(shutterSpeed);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [countdown, setCountdown] = useState<number>(shutterSpeed);
  const [sessionCount, setSessionCount] = useState<number>(1);
  const [recentThumbnails, setRecentThumbnails] = useState<string[]>([]);
  const [showFlash, setShowFlash] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Continuous auto-apply name in Manual mode
  const [activeContinuousName, setActiveContinuousName] = useState<string | null>(null);
  const [continuousCount, setContinuousCount] = useState<number>(1);

  // Manual naming popup state
  const [pendingCapture, setPendingCapture] = useState<PendingManualCapture | null>(null);
  const [selectedDropdownName, setSelectedDropdownName] = useState<string>('');
  const [manualTitleInput, setManualTitleInput] = useState('');
  const [autoApplyForFuture, setAutoApplyForFuture] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);

  // Camera permissions error
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize camera stream
  const initCamera = useCallback(async () => {
    setCameraError(null);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      const track = newStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() || {};
      if ('torch' in capabilities) {
        setFlashSupported(true);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError(err.message || "Unable to access camera. Please check browser permissions.");
    }
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [initCamera]);

  // Audio shutter sound synthesis
  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio context may be restricted by browser gesture policy
    }
  }, []);

  const triggerFlashVisual = () => {
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);
  };

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast(null);
    }, 2500);
  };

  // Capture current video frame to File
  const captureFrame = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        resolve(null);
        return;
      }
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = Date.now();
          const file = new File([blob], `scan_${timestamp}.jpg`, { type: 'image/jpeg' });
          resolve(file);
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.92);
    });
  }, []);

  // Handle triggered snapshot
  const triggerSnapshot = useCallback(async () => {
    const file = await captureFrame();
    if (!file) return;

    triggerFlashVisual();
    playShutterSound();

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const previewUrl = URL.createObjectURL(file);

    // Update thumbnail reel
    setRecentThumbnails(prev => [previewUrl, ...prev.slice(0, 4)]);

    if (mode === 'auto') {
      // Automatic Mode: Save directly to database
      const title = `Auto Scan #${sessionCount} (${timeStr})`;
      setSessionCount(c => c + 1);
      showToast(`⚡ ${title} సేవ్ అవుతోంది...`);
      await onCapture(file, title, 'auto');
      showToast(`✓ ${title} డేటాబేస్ లో సేవ్ అయింది!`);
    } else {
      // Manual Mode:
      // If user previously selected an existing name and locked it for continuous auto-save:
      if (activeContinuousName) {
        const nextCount = continuousCount + 1;
        setContinuousCount(nextCount);
        const title = `${activeContinuousName} (${nextCount})`;
        setSessionCount(c => c + 1);
        showToast(`⚡ "${title}" డైరెక్ట్ గా సేవ్ అవుతోంది...`);
        await onCapture(file, title, 'manual');
        showToast(`✓ "${title}" డేటాబేస్ లో సేవ్ అయింది!`);
      } else {
        // Otherwise, pause timer and open popup to choose/type name
        const defaultTitle = `Doc Scan #${sessionCount} (${timeStr})`;
        setSelectedDropdownName('');
        setManualTitleInput(defaultTitle);
        setAutoApplyForFuture(false);
        setPendingCapture({
          file,
          previewUrl,
          defaultTitle
        });
      }
    }
  }, [activeContinuousName, captureFrame, continuousCount, mode, onCapture, playShutterSound, sessionCount]);

  // Countdown timer loop dynamically based on intervalSeconds
  useEffect(() => {
    // If modal is open (manual naming popup) or timer is paused or error, don't count down
    if (pendingCapture !== null || isTimerPaused || cameraError) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerSnapshot();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingCapture, isTimerPaused, triggerSnapshot, cameraError, intervalSeconds]);

  // Handle dropdown selection in popup
  const handleDropdownSelect = (name: string) => {
    setSelectedDropdownName(name);
    if (name) {
      setManualTitleInput(name);
      // Automatically recommend locking this name so user isn't asked repeatedly
      setAutoApplyForFuture(true);
    }
  };

  // Handle saving from manual naming popup
  const handleConfirmManualSave = async (lockNameForUpcoming: boolean = autoApplyForFuture) => {
    if (!pendingCapture) return;
    setManualSaving(true);
    const finalTitle = manualTitleInput.trim() || pendingCapture.defaultTitle;

    try {
      // Save name into persistent list
      if (onSaveNewName) {
        onSaveNewName(finalTitle);
      }

      await onCapture(pendingCapture.file, finalTitle, 'manual');
      setSessionCount(c => c + 1);

      // If user selected to lock this name, future scans in this session will auto-save without popup
      if (lockNameForUpcoming) {
        setActiveContinuousName(finalTitle);
        setContinuousCount(1);
        showToast(`✓ "${finalTitle}" సేవ్ అయింది. ఇకపై ఇదే పేరుతో ఆటోమేటిక్ గా సేవ్ అవుతుంది!`);
      } else {
        showToast(`✓ "${finalTitle}" డేటాబేస్ లో సేవ్ అయింది!`);
      }
    } finally {
      URL.revokeObjectURL(pendingCapture.previewUrl);
      setPendingCapture(null);
      setManualSaving(false);
      setCountdown(intervalSeconds); // Reset countdown
    }
  };

  // Handle discarding from manual naming popup
  const handleDiscardManualCapture = () => {
    if (pendingCapture) {
      URL.revokeObjectURL(pendingCapture.previewUrl);
    }
    setPendingCapture(null);
    setCountdown(intervalSeconds); // Reset countdown
    showToast(`స్నాప్‌షాట్ రద్దు చేయబడింది`);
  };

  // Reset active continuous name so it starts asking popup again
  const handleResetContinuousName = () => {
    setActiveContinuousName(null);
    setContinuousCount(1);
    showToast(`పేరు లాక్ తొలగించబడింది. తదుపరి ఫోటోకి పాప్-అప్ వస్తుంది.`);
  };

  const toggleFlash = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      await (track as any).applyConstraints({
        advanced: [{ torch: !flashOn }]
      });
      setFlashOn(!flashOn);
    } catch (e) {
      console.error("Torch error:", e);
    }
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '85vh',
      maxHeight: '750px',
      backgroundColor: '#05070f',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
      border: '1px solid rgba(255,255,255,0.15)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Video Stream Container */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', backgroundColor: '#000' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />

        {/* White Flash Effect when photo is taken */}
        {showFlash && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.85)',
            pointerEvents: 'none',
            zIndex: 100,
            transition: 'opacity 0.2s ease-out'
          }} />
        )}

        {/* Camera Permission / Error Fallback */}
        {cameraError && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            zIndex: 90
          }}>
            <ShieldAlert size={54} color="var(--danger-color)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Camera Access Required</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '1.5rem' }}>
              {cameraError}
            </p>
            <button onClick={initCamera} className="btn btn-primary">
              <RefreshCw size={16} /> Retry Access
            </button>
          </div>
        )}

        {/* Frame Overlay */}
        <div style={{
          position: 'absolute',
          top: '8%',
          left: '8%',
          right: '8%',
          bottom: '15%',
          border: '2px solid rgba(255,255,255,0.2)',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
          borderRadius: '12px',
          pointerEvents: 'none',
          transition: 'all 0.3s'
        }}>
          {/* Target Corners */}
          <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '28px', height: '28px', borderTop: '4px solid #6366f1', borderLeft: '4px solid #6366f1', borderRadius: '4px 0 0 0' }} />
          <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '28px', height: '28px', borderTop: '4px solid #6366f1', borderRight: '4px solid #6366f1', borderRadius: '0 4px 0 0' }} />
          <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '28px', height: '28px', borderBottom: '4px solid #6366f1', borderLeft: '4px solid #6366f1', borderRadius: '0 0 0 4px' }} />
          <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '28px', height: '28px', borderBottom: '4px solid #6366f1', borderRight: '4px solid #6366f1', borderRadius: '0 0 4px 0' }} />

          {/* Center scan line aesthetic */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '10%',
            right: '10%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent)',
            boxShadow: '0 0 8px rgba(99, 102, 241, 0.8)'
          }} />
        </div>

        {/* Top Header Bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
          zIndex: 40,
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          {/* Left: Mode Switcher Pills */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(10px)',
            padding: '3px',
            borderRadius: '30px',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <button
              onClick={() => {
                setMode('auto');
                setCountdown(intervalSeconds);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                transition: 'all 0.2s',
                background: mode === 'auto' ? '#6366f1' : 'transparent',
                color: mode === 'auto' ? '#ffffff' : 'rgba(255,255,255,0.65)'
              }}
            >
              <Zap size={14} /> Auto
            </button>
            <button
              onClick={() => {
                setMode('manual');
                setCountdown(intervalSeconds);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                transition: 'all 0.2s',
                background: mode === 'manual' ? '#10b981' : 'transparent',
                color: mode === 'manual' ? '#ffffff' : 'rgba(255,255,255,0.65)'
              }}
            >
              <Edit3 size={14} /> Manual + Name
            </button>
          </div>

          {/* Center: Fixed Speed Indicator (set on dashboard) & Active Continuous Name badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(10px)',
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#cbd5e1',
              fontSize: '0.82rem',
              fontWeight: 600
            }}>
              <span style={{ color: '#818cf8' }}>⏱️ {intervalSeconds}s Interval</span>
            </div>

            {/* Active Continuous Name Tag (if locked in manual mode) */}
            {mode === 'manual' && activeContinuousName && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(16, 185, 129, 0.25)',
                border: '1.5px solid #10b981',
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600
              }}>
                <Tag size={13} color="#34d399" />
                <span>పేరు: "{activeContinuousName}"</span>
                <button
                  onClick={handleResetContinuousName}
                  title="Unlock name / ask name on next snap"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    padding: '2px 6px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <RotateCcw size={11} /> మార్చు
                </button>
              </div>
            )}
          </div>

          {/* Right: Quick controls (Torch, Flip, Exit) */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {flashSupported && (
              <button
                onClick={toggleFlash}
                title="Toggle Torch"
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {flashOn ? <Zap size={18} color="#eab308" /> : <ZapOff size={18} />}
              </button>
            )}

            <button
              onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
              title="Flip Camera"
              style={{
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RefreshCw size={18} />
            </button>

            <button
              onClick={onCancel}
              title="Close Scanner"
              style={{
                background: 'rgba(239, 68, 68, 0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Dynamic Countdown & Status Badge */}
        <div style={{
          position: 'absolute',
          top: '4.75rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.4rem',
          zIndex: 40,
          pointerEvents: 'none'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 1.1rem',
            borderRadius: '30px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(10px)',
            border: `1.5px solid ${mode === 'auto' ? '#6366f1' : '#10b981'}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
          }}>
            {/* Visual timer countdown number */}
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: mode === 'auto' ? '#6366f1' : '#10b981',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.9rem',
              animation: countdown <= 2 ? 'pulse 0.5s infinite' : 'none'
            }}>
              {countdown}s
            </div>

            <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>
              {isTimerPaused
                ? 'PAUSED'
                : mode === 'auto'
                  ? `Auto-capturing every ${intervalSeconds}s`
                  : activeContinuousName
                    ? `Auto-saving as "${activeContinuousName}" in ${countdown}s`
                    : `Manual snap in ${countdown}s`}
            </span>
          </div>
        </div>

        {/* Toast / Notification Banner */}
        {statusToast && (
          <div style={{
            position: 'absolute',
            bottom: '6rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#fff',
            padding: '0.6rem 1.4rem',
            borderRadius: '30px',
            border: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
            fontSize: '0.88rem',
            fontWeight: 600,
            zIndex: 50,
            whiteSpace: 'nowrap',
            animation: 'fadeIn 0.2s ease-in'
          }}>
            {statusToast}
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div style={{
        padding: '1rem 1.5rem',
        background: 'rgba(10, 15, 30, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        zIndex: 40
      }}>
        {/* Left: Thumbnail Reel & Captured count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '160px' }}>
          {recentThumbnails.length > 0 ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {recentThumbnails.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="Recent capture"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: i === 0 ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.2)',
                    opacity: i === 0 ? 1 : 0.6
                  }}
                />
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No scans yet
            </span>
          )}
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
            #{sessionCount - 1} Saved
          </span>
        </div>

        {/* Center: Instant Shutter & Pause/Play */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button
            onClick={() => setIsTimerPaused(!isTimerPaused)}
            title={isTimerPaused ? 'Resume Timer' : 'Pause Timer'}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '42px',
              height: '42px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            {isTimerPaused ? <Play size={20} color="#10b981" /> : <Pause size={20} />}
          </button>

          {/* Shutter Button (Allows instant snap anytime) */}
          <button
            onClick={triggerSnapshot}
            disabled={isSaving}
            title="Snap immediately"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '4px solid white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              transition: 'transform 0.1s ease',
              padding: 0
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: mode === 'auto' ? '#6366f1' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <CameraIcon size={22} />
            </div>
          </button>
        </div>

        {/* Right: Done / Finish Button */}
        <div style={{ minWidth: '160px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            className="btn btn-secondary"
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.85rem',
              borderRadius: '10px'
            }}
          >
            Done & View Scans
          </button>
        </div>
      </div>

      {/* Manual Mode Popup: Choose Existing Name OR Type New Name */}
      {pendingCapture && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1.25rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '480px',
            padding: '1.85rem',
            borderRadius: '20px',
            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.2)',
                padding: '0.5rem',
                borderRadius: '10px',
                color: '#34d399'
              }}>
                <Edit3 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>
                  ఫోటో పేరు ఎంటర్ చేయండి
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  గతంలో వాడిన పేరు ఎంచుకోండి లేదా క్రొత్త పేరు టైప్ చేయండి
                </span>
              </div>
            </div>

            {/* Captured image preview */}
            <div style={{
              width: '100%',
              height: '140px',
              borderRadius: '10px',
              overflow: 'hidden',
              marginBottom: '1.25rem',
              background: '#000',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <img
                src={pendingCapture.previewUrl}
                alt="Captured Snapshot"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            {/* Dropdown for previously saved names */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 600 }}>
                <Tag size={14} color="#818cf8" /> గతంలో వాడిన పేర్లు (Previous Names):
              </label>
              <select
                value={selectedDropdownName}
                onChange={e => handleDropdownSelect(e.target.value)}
                className="input-field"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.92rem',
                  borderRadius: '10px',
                  background: '#0f172a',
                  color: '#fff',
                  border: '1.5px solid rgba(99, 102, 241, 0.4)',
                  cursor: 'pointer'
                }}
              >
                <option value="">-- క్రొత్త పేరు టైప్ చేయండి (Type a New Name) --</option>
                {savedNames.map((name, idx) => (
                  <option key={idx} value={name}>
                    📂 {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Input field for document name */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 600 }}>
                డాక్యుమెంట్ పేరు (Document Name):
              </label>
              <input
                type="text"
                className="input-field"
                value={manualTitleInput}
                onChange={e => setManualTitleInput(e.target.value)}
                placeholder="e.g. Tax Invoice, Bill #104, Ledger Page..."
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleConfirmManualSave();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.92rem',
                  borderRadius: '10px'
                }}
              />
            </div>

            {/* Continuous Auto-Apply Checkbox */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '10px',
              padding: '0.75rem 0.9rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              cursor: 'pointer'
            }}
            onClick={() => setAutoApplyForFuture(!autoApplyForFuture)}
            >
              <input
                type="checkbox"
                id="autoApplyCheckbox"
                checked={autoApplyForFuture}
                onChange={e => setAutoApplyForFuture(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label htmlFor="autoApplyCheckbox" style={{ fontSize: '0.82rem', color: '#e2e8f0', cursor: 'pointer', lineHeight: '1.4' }}>
                <strong style={{ display: 'block', color: '#a5b4fc', marginBottom: '2px' }}>
                  ⚡ అస్తమానం పేరు అడగకుండా డైరెక్ట్ గా సేవ్ చేయి
                </strong>
                తదుపరి ఫోటోలకి కూడా ఇదే పేరుతో ఆటోమేటిక్ గా కంటిన్యూగా సేవ్ చేయబడుతుంది.
              </label>
            </div>

            {/* Actions: Save / Discard */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleDiscardManualCapture}
                disabled={manualSaving}
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  padding: '0.65rem'
                }}
              >
                <Trash2 size={16} /> Discard
              </button>

              <button
                onClick={() => handleConfirmManualSave(autoApplyForFuture)}
                disabled={manualSaving}
                className="btn btn-primary"
                style={{
                  flex: 2,
                  justifyContent: 'center',
                  padding: '0.65rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  fontSize: '0.9rem'
                }}
              >
                {manualSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check size={18} /> {autoApplyForFuture ? 'సేవ్ చేసి లాక్ చేయి' : 'సేవ్ చేయండి'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
