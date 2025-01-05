import { useCallback, useState } from 'react';

type AlertSeverity = 'success' | 'error';

interface UseAlertReturn {
  alertMessage: string;
  alertSeverity: AlertSeverity;
  isAlertOpen: boolean;
  showAlert: (message: string, severity: AlertSeverity) => void;
  hideAlert: () => void;
}

export function useAlert(): UseAlertReturn {
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<AlertSeverity>('error');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const showAlert = useCallback((message: string, severity: AlertSeverity) => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setIsAlertOpen(true);
  }, []);

  const hideAlert = useCallback(() => {
    setIsAlertOpen(false);
  }, []);

  return {
    alertMessage,
    alertSeverity,
    isAlertOpen,
    showAlert,
    hideAlert,
  };
}
