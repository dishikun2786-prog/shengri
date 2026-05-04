import Typography from '@mui/material/Typography';
import { useRecordContext } from 'react-admin';

interface MoneyFieldProps {
  source: string;
  prefix?: string;
  label?: string;
  compact?: boolean;
}

const MoneyField = ({ source, prefix = '¥', compact = false }: MoneyFieldProps) => {
  const record = useRecordContext();
  if (!record) return null;

  const value = Number(record[source] || 0);
  const display = compact && value >= 10000
    ? `${prefix}${(value / 10000).toFixed(1)}万`
    : `${prefix}${value.toFixed(2)}`;

  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 500,
        color: value > 0 ? 'primary.main' : 'text.secondary',
        fontSize: compact ? '0.8rem' : '0.875rem',
      }}
    >
      {display}
    </Typography>
  );
};

export default MoneyField;
