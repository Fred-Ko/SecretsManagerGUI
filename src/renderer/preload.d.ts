declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: {
      getAwsCredentials: () => Promise<{
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        endpoint?: string;
      }>;
      saveAwsCredentials: (credentials: {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        endpoint?: string;
      }) => Promise<void>;
    };
    versions: {
      node: () => string;
      chrome: () => string;
      electron: () => string;
    };
  }
}

export {};
