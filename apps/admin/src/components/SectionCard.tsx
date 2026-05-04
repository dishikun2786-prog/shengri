import { ReactNode } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}

const SectionCard = ({ title, icon, children, action }: SectionCardProps) => (
  <Card sx={{ mb: 2 }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, sm: 3 },
        pt: { xs: 1.5, sm: 2 },
        pb: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon && (
          <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </Box>
      {action}
    </Box>
    <Divider />
    <CardContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
      {children}
    </CardContent>
  </Card>
);

export default SectionCard;
