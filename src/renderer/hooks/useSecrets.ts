import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  UpdateSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import { useCallback, useState } from 'react';
import { Secret } from '../../main/interfaces/SecretManager';
import {
  AwsCredentials,
  createSecretsManagerClient,
  handleAwsError,
} from '../utils/aws';

interface UseSecretsReturn {
  secrets: Secret[];
  selectedSecret: Secret | null;
  selectedSecrets: Secret[];
  isLoading: boolean;
  isDetailOpen: boolean;
  isEditing: boolean;
  isCreating: boolean;
  isDeleteDialogOpen: boolean;
  loadSecrets: () => Promise<void>;
  selectSecret: (secret: Secret) => void;
  bulkSelectSecrets: (secrets: Secret[]) => void;
  updateSecret: (secret: Secret) => Promise<void>;
  createSecret: (secret: Secret) => Promise<void>;
  deleteSecrets: (forceDelete: boolean) => Promise<void>;
  batchUpdateSecrets: (
    updates: Array<{ secret: Secret; key: string; newValue: string }>,
  ) => Promise<void>;
  closeDetail: () => void;
  startEditing: () => void;
  stopEditing: () => void;
  startCreating: () => void;
  stopCreating: () => void;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
}

interface UseSecretsProps {
  awsCredentials: AwsCredentials | null;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export function useSecrets({
  awsCredentials,
  onError,
  onSuccess,
}: UseSecretsProps): UseSecretsReturn {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [selectedSecret, setSelectedSecret] = useState<Secret | null>(null);
  const [selectedSecrets, setSelectedSecrets] = useState<Secret[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadSecrets = useCallback(async () => {
    if (!awsCredentials) {
      onError(
        'AWS 자격 증명이 설정되어 있지 않습니다. 설정 화면으로 이동합니다.',
      );
      return;
    }

    setIsLoading(true);
    try {
      const client = createSecretsManagerClient(awsCredentials);
      let nextToken: string | undefined;
      let allSecrets: Secret[] = [];

      do {
        const listCommand = new ListSecretsCommand({
          NextToken: nextToken,
          MaxResults: 100,
        });
        const listResponse = await client.send(listCommand);

        if (listResponse.SecretList) {
          const secretsWithValues = await Promise.all(
            listResponse.SecretList.map(async (secret) => {
              try {
                const valueCommand = new GetSecretValueCommand({
                  SecretId: secret.ARN,
                });
                const valueResponse = await client.send(valueCommand);
                return {
                  ...secret,
                  SecretString: valueResponse.SecretString,
                } as Secret;
              } catch (error) {
                console.error(
                  `Failed to load secret value for ${secret.Name}:`,
                  error,
                );
                return secret as Secret;
              }
            }),
          );
          allSecrets = [...allSecrets, ...secretsWithValues];
        }
        nextToken = listResponse.NextToken;
      } while (nextToken);

      setSecrets(allSecrets);
    } catch (error) {
      onError(handleAwsError(error));
    } finally {
      setIsLoading(false);
    }
  }, [awsCredentials, onError]);

  const updateSecret = useCallback(
    async (updatedSecret: Secret) => {
      if (!awsCredentials) return;

      try {
        const client = createSecretsManagerClient(awsCredentials);
        const command = new UpdateSecretCommand({
          SecretId: updatedSecret.ARN,
          Description: updatedSecret.Description,
          SecretString: updatedSecret.SecretString,
        });

        await client.send(command);
        await loadSecrets();

        const valueCommand = new GetSecretValueCommand({
          SecretId: updatedSecret.ARN,
        });
        const valueResponse = await client.send(valueCommand);

        setSelectedSecret({
          ...updatedSecret,
          SecretString: valueResponse.SecretString,
          LastChangedDate: new Date(),
        });

        setIsEditing(false);
        onSuccess('시크릿이 업데이트되었습니다.');
      } catch (error) {
        onError(handleAwsError(error));
      }
    },
    [awsCredentials, loadSecrets, onError, onSuccess],
  );

  const createSecret = useCallback(
    async (newSecret: Secret) => {
      if (!awsCredentials) return;

      try {
        const client = createSecretsManagerClient(awsCredentials);
        const command = new CreateSecretCommand({
          Name: newSecret.Name,
          Description: newSecret.Description,
          SecretString: newSecret.SecretString,
        });

        const response = await client.send(command);
        await loadSecrets();

        const createdSecret = {
          ...newSecret,
          ARN: response.ARN,
          LastChangedDate: new Date(),
        };
        setSelectedSecret(createdSecret);
        setIsDetailOpen(true);
        setIsCreating(false);
        onSuccess('새 시크릿이 생성되었습니다.');
      } catch (error) {
        onError(handleAwsError(error));
      }
    },
    [awsCredentials, loadSecrets, onError, onSuccess],
  );

  const deleteSecrets = useCallback(
    async (forceDelete: boolean) => {
      if (!awsCredentials || selectedSecrets.length === 0) return;

      try {
        const client = createSecretsManagerClient(awsCredentials);
        await Promise.all(
          selectedSecrets.map((secret) =>
            client.send(
              new DeleteSecretCommand({
                SecretId: secret.ARN,
                ForceDeleteWithoutRecovery: forceDelete,
              }),
            ),
          ),
        );

        loadSecrets();
        setSelectedSecrets([]);
        onSuccess('선택한 시크릿이 삭제되었습니다.');
      } catch (error) {
        onError(handleAwsError(error));
      } finally {
        setIsDeleteDialogOpen(false);
      }
    },
    [awsCredentials, selectedSecrets, loadSecrets, onError, onSuccess],
  );

  const batchUpdateSecrets = async (
    updates: Array<{ secret: Secret; key: string; newValue: string }>,
  ) => {
    if (!awsCredentials) {
      onError('AWS 자격 증명이 설정되어 있지 않습니다.');
      return;
    }

    const client = createSecretsManagerClient(awsCredentials);

    try {
      // 각 업데이트에 대해 처리
      for (const { secret, key, newValue } of updates) {
        const command = new GetSecretValueCommand({
          SecretId: secret.ARN,
        });

        const response = await client.send(command);
        if (!response.SecretString) continue;

        try {
          const value = JSON.parse(response.SecretString);
          if (typeof value === 'object' && value !== null) {
            const updatedValue = { ...value, [key]: newValue };

            const updateCommand = new UpdateSecretCommand({
              SecretId: secret.ARN,
              SecretString: JSON.stringify(updatedValue),
            });
            await client.send(updateCommand);
          }
        } catch (err) {
          console.error('Failed to parse or update secret:', err);
        }
      }

      await loadSecrets();
      onSuccess('시크릿이 성공적으로 업데이트되었습니다.');
    } catch (err) {
      onError(handleAwsError(err));
    }
  };

  const selectSecret = useCallback((secret: Secret) => {
    setSelectedSecret(secret);
    setIsDetailOpen(true);
  }, []);

  const bulkSelectSecrets = useCallback((secrets: Secret[]) => {
    setSelectedSecrets(secrets);
  }, []);

  const closeDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedSecret(null);
  }, []);

  const startEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  const stopEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const startCreating = useCallback(() => {
    setIsCreating(true);
  }, []);

  const stopCreating = useCallback(() => {
    setIsCreating(false);
  }, []);

  const openDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
  }, []);

  return {
    secrets,
    selectedSecret,
    selectedSecrets,
    isLoading,
    isDetailOpen,
    isEditing,
    isCreating,
    isDeleteDialogOpen,
    loadSecrets,
    selectSecret,
    bulkSelectSecrets,
    updateSecret,
    createSecret,
    deleteSecrets,
    batchUpdateSecrets,
    closeDetail,
    startEditing,
    stopEditing,
    startCreating,
    stopCreating,
    openDeleteDialog,
    closeDeleteDialog,
  };
}
