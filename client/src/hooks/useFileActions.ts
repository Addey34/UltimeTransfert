import { FileError, IFile } from '@/types/app.types';
import { useCallback, useState } from 'react';
import {
  deleteFile as apiDeleteFile,
  uploadFile as apiUploadFile,
  getFileUrl,
} from '../components/services/api/fileService';
import { useAuth } from '../hooks/useAuth';
import { useFile } from './useFile';

export const useFileActions = () => {
  const [error, setError] = useState<FileError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedFiles, setCopiedFiles] = useState<string[]>([]);
  const { isAuthenticated } = useAuth();
  const { files, setFiles } = useFile();

  const uploadFile = useCallback(
    async (file: File) => {
      if (!isAuthenticated) {
        setError({ code: 'AUTH_ERROR', message: 'Please login first' });
        return;
      }

      setIsLoading(true);
      const tempId = 'temp-' + Date.now();

      setFiles((prev) => [...prev]);

      try {
        const uploadedFile = await apiUploadFile(file, (progress) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id.toString() === tempId ? { ...f, progress } : f
            )
          );
        });

        setFiles((prev) => [
          ...prev.filter((f) => f.id.toString() !== tempId),
          { ...uploadedFile, status: 'completed' },
        ]);
      } catch (err) {
        setError({
          code: 'UPLOAD_ERROR',
          message: err instanceof Error ? err.message : 'Upload failed',
        });
        setFiles((prev) => prev.filter((f) => f.id.toString() !== tempId));
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, setFiles]
  );

  const removeFile = async (fileId: string) => {
    if (!fileId) return;
    setIsLoading(true);
    setFiles((prev) =>
      prev.map((f) =>
        f.id.toString() === fileId ? { ...f, status: 'deleting' } : f
      )
    );

    try {
      await apiDeleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id.toString() !== fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async (file: IFile) => {
    try {
      if (file.shareLink) {
        const downloadUrl = getFileUrl(file.shareLink);
        await navigator.clipboard.writeText(downloadUrl);
        setCopiedFiles((prev) => [...prev, file.id.toString()]);
        setTimeout(() => {
          setCopiedFiles((prev) =>
            prev.filter((id) => id !== file.id.toString())
          );
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  return {
    files,
    error,
    isLoading,
    uploadFile,
    copiedFiles,
    removeFile,
    handleCopyLink,
  };
};
