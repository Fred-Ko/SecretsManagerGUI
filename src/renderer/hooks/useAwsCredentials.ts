import { useCallback, useEffect, useState } from 'react';
import { AwsCredentials } from '../utils/aws';

interface UseAwsCredentialsReturn {
  awsCredentials: AwsCredentials | null;
  isAwsSettingsOpen: boolean;
  openAwsSettings: () => void;
  closeAwsSettings: () => void;
  saveAwsCredentials: (credentials: AwsCredentials) => Promise<void>;
}

export function useAwsCredentials(): UseAwsCredentialsReturn {
  const [awsCredentials, setAwsCredentials] = useState<AwsCredentials | null>(
    null,
  );
  const [isAwsSettingsOpen, setIsAwsSettingsOpen] = useState(false);

  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedCredentials = await window.electron.getAwsCredentials();
        if (savedCredentials && savedCredentials.region) {
          setAwsCredentials(savedCredentials as AwsCredentials);
        }
      } catch (error) {
        console.error('Failed to load saved credentials:', error);
      }
    };

    loadSavedCredentials();
  }, []);

  const saveAwsCredentials = useCallback(
    async (credentials: AwsCredentials) => {
      try {
        await window.electron.saveAwsCredentials(credentials);
        setAwsCredentials(credentials);
        setIsAwsSettingsOpen(false);
        return Promise.resolve();
      } catch (error) {
        console.error('Failed to save credentials:', error);
        return Promise.reject(error);
      }
    },
    [],
  );

  const openAwsSettings = useCallback(() => {
    setIsAwsSettingsOpen(true);
  }, []);

  const closeAwsSettings = useCallback(() => {
    setIsAwsSettingsOpen(false);
  }, []);

  return {
    awsCredentials,
    isAwsSettingsOpen,
    openAwsSettings,
    closeAwsSettings,
    saveAwsCredentials,
  };
}
