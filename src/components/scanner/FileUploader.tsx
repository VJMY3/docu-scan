import React, { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  return (
    <div 
      className={`glass-panel`}
      style={{ 
        padding: '3rem', 
        textAlign: 'center', 
        transition: 'all 0.3s', 
        cursor: 'pointer', 
        borderStyle: 'dashed', 
        borderWidth: '2px', 
        borderColor: isDragging ? 'var(--primary-color)' : 'var(--border-color)',
        backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.05)' : 'var(--surface-color)'
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => document.getElementById('file-upload')?.click()}
    >
      <input 
        id="file-upload" 
        type="file" 
        accept="image/*,.pdf" 
        style={{ display: 'none' }}
        onChange={(e) => {
          if(e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
          }
        }}
      />
      <UploadCloud size={48} color={isDragging ? 'var(--primary-color)' : 'var(--text-muted)'} style={{ margin: '0 auto 1rem' }} />
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>Drag & Drop Document Here</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Supports PNG, JPG, WEBP up to 10MB
      </p>
      <button className="btn btn-secondary">
        Browse Files
      </button>
    </div>
  );
};
