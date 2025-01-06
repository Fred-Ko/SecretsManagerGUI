import { Delete as DeleteIcon } from '@mui/icons-material';
import {
  Box,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { Secret } from '../../main/interfaces/SecretManager';

interface Props {
  secrets: Secret[];
  onSelect: (secret: Secret) => void;
  onAdd: () => void;
  onBulkSelect: (secrets: Secret[]) => void;
  searchTerms?: string[];
}

export default function SecretList({
  secrets,
  onSelect,
  onBulkSelect,
  searchTerms = [],
}: Props) {
  const selectedSecrets = useMemo(() => new Set<string>(), []);

  const filteredSecrets = useMemo(() => {
    if (!searchTerms.length) return secrets;

    return secrets.filter((secret) => {
      const name = (secret.Name || '').toLowerCase();
      return searchTerms.every(term =>
        name.includes(term.toLowerCase())
      );
    });
  }, [secrets, searchTerms]);

  const handleToggleSelect = (secret: Secret, checked: boolean) => {
    if (checked) {
      selectedSecrets.add(secret.ARN!);
    } else {
      selectedSecrets.delete(secret.ARN!);
    }
    onBulkSelect(secrets.filter((s) => s.ARN && selectedSecrets.has(s.ARN)));
  };

  if (filteredSecrets.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {searchTerms.length > 0 ? '검색 결과가 없습니다.' : '시크릿이 없습니다.'}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        p: 1,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Checkbox
          edge="start"
          checked={filteredSecrets.length > 0 && filteredSecrets.every(secret => selectedSecrets.has(secret.ARN!))}
          indeterminate={
            filteredSecrets.some(secret => selectedSecrets.has(secret.ARN!)) &&
            !filteredSecrets.every(secret => selectedSecrets.has(secret.ARN!))
          }
          onChange={(e) => {
            if (e.target.checked) {
              filteredSecrets.forEach(secret => selectedSecrets.add(secret.ARN!));
            } else {
              filteredSecrets.forEach(secret => selectedSecrets.delete(secret.ARN!));
            }
            onBulkSelect(secrets.filter((s) => s.ARN && selectedSecrets.has(s.ARN)));
          }}
        />
        <Typography variant="body2" sx={{ ml: 1 }}>전체 선택</Typography>
      </Box>
      <List dense disablePadding>
        {filteredSecrets.map((secret) => (
          <ListItem
            key={secret.ARN}
            disablePadding
          >
            <ListItemButton
              selected={selectedSecrets.has(secret.ARN!)}
              onClick={() => onSelect(secret)}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  edge="start"
                  checked={selectedSecrets.has(secret.ARN!)}
                  onChange={(e) => handleToggleSelect(secret, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </ListItemIcon>
              <ListItemText
                primary={secret.Name}
                secondary={secret.Description}
                primaryTypographyProps={{
                  variant: 'body2',
                  sx: {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                }}
                secondaryTypographyProps={{
                  variant: 'caption',
                  sx: {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );
}
