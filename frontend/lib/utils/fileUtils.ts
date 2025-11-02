// File utility functions for handling uploads and conversions

export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (type: string): string => {
  if (type.includes('image')) return '🖼️';
  if (type.includes('pdf')) return '📄';
  if (type.includes('word') || type.includes('doc')) return '📝';
  if (type.includes('excel') || type.includes('sheet')) return '📊';
  if (type.includes('powerpoint') || type.includes('presentation')) return '📈';
  if (type.includes('text')) return '📝';
  if (type.includes('video')) return '🎥';
  if (type.includes('audio')) return '🎵';
  return '📁';
};

export const downloadFile = async (url: string, filename: string): Promise<void> => {
  // Import resolveMediaUrl dynamically to avoid circular dependencies
  const { resolveMediaUrl } = await import('@/lib/api/auth');
  
  try {
    const resolvedUrl = resolveMediaUrl(url);
    
    // If it's a data URL (base64), download directly
    if (resolvedUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = resolvedUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    // For remote URLs, fetch as blob to handle CORS and authentication
    const response = await fetch(resolvedUrl, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch file');
    
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    // Fallback to direct link download
    const link = document.createElement('a');
    link.href = resolveMediaUrl(url);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};