export interface IElectronAPI {
  onNavigateBack: (callback: () => void) => () => void;
  getAwsCredentials: () => Promise<any>;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
