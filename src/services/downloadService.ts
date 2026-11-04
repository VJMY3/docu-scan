import JSZip from 'jszip';
import type { DocumentRecord } from '../types/document';

/**
 * Download a single image to the user's device
 */
export const downloadSingleImage = async (imageUrl: string, fileName: string): Promise<void> => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download error:', error);
    throw new Error('Failed to download image');
  }
};

/**
 * Download multiple images as a ZIP file
 */
export const downloadImagesAsZip = async (
  documents: DocumentRecord[],
  zipFileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> => {
  if (documents.length === 0) {
    throw new Error('No documents to download');
  }

  const zip = new JSZip();
  const total = documents.length;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    
    if (onProgress) {
      onProgress(i + 1, total);
    }

    if (!doc.image_url || doc.image_url.startsWith('blob:')) {
      continue;
    }

    try {
      const response = await fetch(doc.image_url);
      const blob = await response.blob();
      
      // Create a clean filename
      const extension = doc.image_url.split('.').pop()?.split('?')[0] || 'jpg';
      const cleanTitle = doc.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const fileName = `${cleanTitle}_${doc.id.substring(0, 8)}.${extension}`;
      
      zip.file(fileName, blob);
    } catch (error) {
      console.error(`Failed to add ${doc.title} to ZIP:`, error);
    }
  }

  // Generate ZIP file
  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // Download ZIP file
  const url = window.URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Group documents by month and year
 */
export const groupDocumentsByMonth = (documents: DocumentRecord[]): Map<string, DocumentRecord[]> => {
  const grouped = new Map<string, DocumentRecord[]>();

  documents.forEach(doc => {
    const date = new Date(doc.created_at);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!grouped.has(monthYear)) {
      grouped.set(monthYear, []);
    }
    grouped.get(monthYear)!.push(doc);
  });

  return grouped;
};

/**
 * Get formatted month name for display
 */
export const getMonthYearLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * Download all photos from a specific month
 */
export const downloadMonthlyPhotos = async (
  monthKey: string,
  documents: DocumentRecord[],
  onProgress?: (current: number, total: number) => void
): Promise<void> => {
  const monthLabel = getMonthYearLabel(monthKey);
  const zipFileName = `Photos_${monthLabel.replace(' ', '_')}.zip`;
  
  await downloadImagesAsZip(documents, zipFileName, onProgress);
};
