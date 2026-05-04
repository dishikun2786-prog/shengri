import { ReactNode } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  subtitle?: string;
}

const StatCard = ({ title, value, icon, color = '#c44520', subtitle }: StatCardProps) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: isSmall ? 1.5 : 2, '&:last-child': { pb: isSmall ? 1.5 : 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: isSmall ? '0.68rem' : '0.75rem' }}
            >
              {title}
            </Typography>
            <Typography
              noWrap
              sx={{
                fontWeight: 700,
                color,
                fontSize: isSmall ? '1.25rem' : '1.75rem',
                lineHeight: 1.3,
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: isSmall ? '0.6rem' : '0.7rem' }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}15`,
              borderRadius: isSmall ? 1 : 2,
              p: isSmall ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
              flexShrink: 0,
              ml: 1,
              '& .MuiSvgIcon-root': { fontSize: isSmall ? '1.25rem' : '1.75rem' },
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
