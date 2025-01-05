import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint?: string;
}

export function createSecretsManagerClient(credentials: AwsCredentials) {
  return new SecretsManagerClient({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
    ...(credentials.endpoint
      ? {
          endpoint: credentials.endpoint,
          tls: false,
          forcePathStyle: true,
        }
      : {}),
  });
}

export function handleAwsError(error: any): string {
  console.error('AWS operation failed:', error);

  if (error.name === 'ResourceConflictException') {
    return '동일한 이름의 시크릿이 존재합니다. 다른 이름을 사용해주세요.';
  }

  if (error.name === 'InvalidRequestException') {
    return '잘못된 요청입니다. 입력값을 확인해주세요.';
  }

  if (error.name === 'ResourceNotFoundException') {
    return '요청한 리소스를 찾을 수 없습니다.';
  }

  if (error.name === 'ValidationException') {
    return '입력값이 올바르지 않습니다.';
  }

  return 'AWS 작업 중 오류가 발생했습니다.';
}
