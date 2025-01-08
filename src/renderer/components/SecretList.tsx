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
  searchTerms?: string[];
}

export default function SecretList({
  secrets,
  onSelect,
  searchTerms = [],
}: Props) {
  const filteredSecrets = useMemo(() => {
    if (!searchTerms.length) return secrets;

    return secrets.filter((secret) => {
      const name = (secret.Name || '').toLowerCase();
      return searchTerms.every(term =>
        name.includes(term.toLowerCase())
      );
    });
  }, [secrets, searchTerms]);

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
    <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {filteredSecrets.map((secret) => (
        <ListItem
          key={secret.ARN}
          disablePadding
          onClick={() => onSelect(secret)}
          sx={{
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <ListItemButton>
            <ListItemText
              primary={secret.Name}
              primaryTypographyProps={{
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
