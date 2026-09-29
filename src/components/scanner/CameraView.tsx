import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RefreshCw, X, Zap, ZapOff } from 'lucide-react';

interface CameraViewProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashSupported, setFlashSupported] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  const initCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
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
    } catch (err) {
      console.error("Camera error:", err);
    }
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [initCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFlash = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashOn } as any]
      });
      setFlashOn(!flashOn);
    } catch (e) {
      console.error(e);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '500px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden' }}>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* Frame overlay for document alignment */}
      <div style={{
        position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%',
        border: '2px solid rgba(255,255,255,0.3)',
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
        borderRadius: '8px',
        pointerEvents: 'none',
        transition: 'all 0.3s'
      }}>
        <div style={{ position:'absolute', top:'-2px', left:'-2px', width:'20px', height:'20px', borderTop:'4px solid var(--primary-color)', borderLeft:'4px solid var(--primary-color)'}}></div>
        <div style={{ position:'absolute', top:'-2px', right:'-2px', width:'20px', height:'20px', borderTop:'4px solid var(--primary-color)', borderRight:'4px solid var(--primary-color)'}}></div>
        <div style={{ position:'absolute', bottom:'-2px', left:'-2px', width:'20px', height:'20px', borderBottom:'4px solid var(--primary-color)', borderLeft:'4px solid var(--primary-color)'}}></div>
        <div style={{ position:'absolute', bottom:'-2px', right:'-2px', width:'20px', height:'20px', borderBottom:'4px solid var(--primary-color)', borderRight:'4px solid var(--primary-color)'}}></div>
      </div>
      
      {/* Controls */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
        {flashSupported && (
          <button onClick={toggleFlash} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: 'white', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {flashOn ? <Zap size={20} color="var(--warning-color)"/> : <ZapOff size={20} />}
          </button>
        )}
        <button onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: 'white', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <RefreshCw size={20} />
        </button>
        <button onClick={onCancel} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: 'white', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: '2rem', left: '0', right: '0', display: 'flex', justifyContent: 'center' }}>
        <button onClick={captureFrame} style={{
          width: '70px', height: '70px', borderRadius: '50%', 
          background: 'rgba(255,255,255,0.3)', border: '4px solid white',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
          transition: 'transform 0.1s'
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'white' }}></div>
        </button>
      </div>
    </div>
  );
};
