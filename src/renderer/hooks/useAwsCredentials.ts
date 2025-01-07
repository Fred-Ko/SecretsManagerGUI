import { useCallback, useState } from 'react';
import { AwsCredentials } from '../utils/aws';

interface UseAwsCredentialsReturn {
  awsCredentials: AwsCredentials | null;
  isAwsSettingsOpen: boolean;
  openAwsSettings: () => void;
  closeAwsSettings: () => void;
  setCredentials: (credentials: AwsCredentials) => void;
}

export function useAwsCredentials(): UseAwsCredentialsReturn {
  const [awsCredentials, setAwsCredentials] = useState<AwsCredentials | null>(null);
  const [isAwsSettingsOpen, setIsAwsSettingsOpen] = useState(false);

  const setCredentials = useCallback((credentials: AwsCredentials) => {
    setAwsCredentials(credentials);
    setIsAwsSettingsOpen(false);
  }, []);

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
    setCredentials,
  };
}
