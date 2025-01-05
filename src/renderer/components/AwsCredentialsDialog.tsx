import { Storage as StorageIcon } from '@mui/icons-material';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
} from '@mui/material';
import React, { useState } from 'react';

interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (credentials: AwsCredentials) => void;
  initialCredentials?: AwsCredentials;
}

const LOCALSTACK_DEFAULTS = {
  accessKeyId: 'test',
  secretAccessKey: 'test',
  region: 'us-east-1',
  endpoint: 'http://127.0.0.1:4566',
};

const DEFAULT_CREDENTIALS: AwsCredentials = {
  //   accessKeyId: '',
  //   secretAccessKey: '',
  //   region: 'ap-northeast-2',
  //   endpoint: '',
  accessKeyId: 'test',
  secretAccessKey: 'test',
  region: 'us-east-1',
  endpoint: 'http://127.0.0.1:4566',
};

export default function AwsCredentialsDialog({
  open,
  onClose,
  onSave,
  initialCredentials = DEFAULT_CREDENTIALS,
}: Props) {
  const [credentials, setCredentials] =
    useState<AwsCredentials>(initialCredentials);

  const handleChange =
    (field: keyof AwsCredentials) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleSave = () => {
    onSave(credentials);
    onClose();
  };

  const handleSetLocalstack = () => {
    setCredentials(LOCALSTACK_DEFAULTS);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        AWS 자격 증명 설정
        <Tooltip title="LocalStack 설정 적용">
          <IconButton onClick={handleSetLocalstack} size="small" sx={{ ml: 1 }}>
            <StorageIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Access Key ID"
          type="text"
          fullWidth
          value={credentials.accessKeyId}
          onChange={handleChange('accessKeyId')}
        />
        <TextField
          margin="dense"
          label="Secret Access Key"
          type="password"
          fullWidth
          value={credentials.secretAccessKey}
          onChange={handleChange('secretAccessKey')}
        />
        <TextField
          margin="dense"
          label="Region"
          type="text"
          fullWidth
          value={credentials.region}
          onChange={handleChange('region')}
        />
        <TextField
          margin="dense"
          label="Endpoint URL (선택사항)"
          type="text"
          fullWidth
          value={credentials.endpoint}
          onChange={handleChange('endpoint')}
          helperText="LocalStack 사용 시: http://127.0.0.1:4566"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleSave} variant="contained">
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
}
