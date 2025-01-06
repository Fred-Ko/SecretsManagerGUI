import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  SelectChangeEvent,
} from '@mui/material';
import { Storage as StorageIcon, ImportExport as ImportIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { AwsCredentials } from '../utils/aws';

// AWS 리전 목록
const AWS_REGIONS = [
  { value: 'ap-northeast-2', label: '서울 (ap-northeast-2)' },
  { value: 'ap-northeast-1', label: '도쿄 (ap-northeast-1)' },
  { value: 'ap-southeast-1', label: '싱가포르 (ap-southeast-1)' },
  { value: 'ap-southeast-2', label: '시드니 (ap-southeast-2)' },
  { value: 'us-east-1', label: '버지니아 북부 (us-east-1)' },
  { value: 'us-east-2', label: '오하이오 (us-east-2)' },
  { value: 'us-west-1', label: '캘리포니아 (us-west-1)' },
  { value: 'us-west-2', label: '오레곤 (us-west-2)' },
  { value: 'eu-west-1', label: '아일랜드 (eu-west-1)' },
  { value: 'eu-central-1', label: '프랑크푸르트 (eu-central-1)' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (credentials: AwsCredentials) => void;
  initialCredentials?: AwsCredentials;
  onLoadFromFile?: () => Promise<AwsCredentials | null>;
}

const DEFAULT_CREDENTIALS: AwsCredentials = {
  accessKeyId: '',
  secretAccessKey: '',
  region: 'ap-northeast-2',
  endpoint: '',
};

const LOCALSTACK_DEFAULTS: AwsCredentials = {
  accessKeyId: 'test',
  secretAccessKey: 'test',
  region: 'ap-northeast-2',
  endpoint: 'http://127.0.0.1:4566',
};

export default function AwsCredentialsDialog({
  open,
  onClose,
  onSave,
  initialCredentials = DEFAULT_CREDENTIALS,
  onLoadFromFile,
}: Props) {
  const [credentials, setCredentials] = useState<AwsCredentials>({
    accessKeyId: initialCredentials?.accessKeyId || '',
    secretAccessKey: initialCredentials?.secretAccessKey || '',
    region: initialCredentials?.region || 'ap-northeast-2',
    endpoint: initialCredentials?.endpoint || '',
  });

  useEffect(() => {
    if (initialCredentials) {
      setCredentials({
        accessKeyId: initialCredentials.accessKeyId || '',
        secretAccessKey: initialCredentials.secretAccessKey || '',
        region: initialCredentials.region || 'ap-northeast-2',
        endpoint: initialCredentials.endpoint || '',
      });
    }
  }, [initialCredentials]);

  const handleTextChange =
    (field: keyof AwsCredentials) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleSelectChange =
    (field: keyof AwsCredentials) =>
    (event: SelectChangeEvent) => {
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

  const handleLoadFromFile = async () => {
    console.log('handleLoadFromFile called');
    if (onLoadFromFile) {
      console.log('Calling onLoadFromFile');
      const loadedCredentials = await onLoadFromFile();
      console.log('Loaded credentials:', loadedCredentials);
      if (loadedCredentials) {
        console.log('Setting credentials:', {
          accessKeyId: loadedCredentials.accessKeyId || '',
          secretAccessKey: loadedCredentials.secretAccessKey || '',
          region: loadedCredentials.region || 'ap-northeast-2',
          endpoint: loadedCredentials.endpoint || '',
        });
        setCredentials({
          accessKeyId: loadedCredentials.accessKeyId || '',
          secretAccessKey: loadedCredentials.secretAccessKey || '',
          region: loadedCredentials.region || 'ap-northeast-2',
          endpoint: loadedCredentials.endpoint || '',
        });
      } else {
        console.log('No credentials loaded');
      }
    } else {
      console.log('onLoadFromFile is not provided');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          AWS 자격 증명 설정
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="~/.aws/credentials에서 불러오기">
            <IconButton onClick={handleLoadFromFile} size="small">
              <ImportIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="LocalStack 설정 적용">
            <IconButton onClick={handleSetLocalstack} size="small">
              <StorageIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Access Key ID"
          type="text"
          fullWidth
          value={credentials.accessKeyId}
          onChange={handleTextChange('accessKeyId')}
        />
        <TextField
          margin="dense"
          label="Secret Access Key"
          type="password"
          fullWidth
          value={credentials.secretAccessKey}
          onChange={handleTextChange('secretAccessKey')}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>리전</InputLabel>
          <Select
            value={credentials.region}
            label="리전"
            onChange={handleSelectChange('region')}
          >
            {AWS_REGIONS.map((region) => (
              <MenuItem key={region.value} value={region.value}>
                {region.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          margin="dense"
          label="Endpoint URL (선택사항)"
          type="text"
          fullWidth
          value={credentials.endpoint}
          onChange={handleTextChange('endpoint')}
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
