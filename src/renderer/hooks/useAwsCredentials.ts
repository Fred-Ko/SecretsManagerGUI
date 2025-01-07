import { useCallback, useState } from 'react';
import { AwsCredentials } from '../utils/aws';

interface UseAwsCredentialsReturn {
  awsCredentials: AwsCredentials | null;
  isAwsSettingsOpen: boolean;
  openAwsSettings: () => void;
  closeAwsSettings: () => void;
  saveAwsCredentials: (credentials: AwsCredentials, onSaved?: () => void) => Promise<void>;
}

export function useAwsCredentials(): UseAwsCredentialsReturn {
  const [awsCredentials, setAwsCredentials] = useState<AwsCredentials | null>(null);
  const [isAwsSettingsOpen, setIsAwsSettingsOpen] = useState(false);

  const saveAwsCredentials = useCallback(
    async (credentials: AwsCredentials, onSaved?: () => void) => {
      try {
        setAwsCredentials(credentials);
        setIsAwsSettingsOpen(false);
        if (onSaved) onSaved();
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
