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
  onDelete: () => void;
  searchTerms?: string[];
}

export default function SecretList({
  secrets,
  onSelect,
  onBulkSelect,
  onDelete,
  searchTerms = [],
}: Props) {
  const selectedSecrets = useMemo(() => new Set<string>(), []);

  const filteredSecrets = useMemo(() => {
    if (!searchTerms.length) return secrets;

    return secrets.filter((secret) => {
      const searchTarget = [
        secret.Name,
        secret.Description,
      ].filter(Boolean).join(' ').toLowerCase();

      // 모든 검색어가 포함되어 있어야 함 (AND 조건)
      return searchTerms.every(term =>
        searchTarget.includes(term.toLowerCase())
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
    <List dense disablePadding>
      {filteredSecrets.map((secret) => (
        <ListItem
          key={secret.ARN}
          disablePadding
          secondaryAction={
            selectedSecrets.size > 0 && (
              <IconButton
                edge="end"
                size="small"
                onClick={() =>
                  handleToggleSelect(secret, !selectedSecrets.has(secret.ARN!))
                }
              >
                <DeleteIcon />
              </IconButton>
            )
          }
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
  );
}
