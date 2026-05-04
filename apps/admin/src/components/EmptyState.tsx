import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import InboxIcon from '@mui/icons-material/Inbox';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = ({
  icon,
  title = '暂无数据',
  description = '当前列表为空，请添加新的记录。',
  actionLabel,
  onAction,
}: EmptyStateProps) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: 8,
      px: 3,
      textAlign: 'center',
    }}
  >
    <Box sx={{ color: 'text.disabled', mb: 2 }}>
      {icon || <InboxIcon sx={{ fontSize: 64 }} />}
    </Box>
    <Typography variant="h6" color="text.secondary" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 360, mb: 3 }}>
      {description}
    </Typography>
    {actionLabel && onAction && (
      <Button variant="contained" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </Box>
);

export default EmptyState;
