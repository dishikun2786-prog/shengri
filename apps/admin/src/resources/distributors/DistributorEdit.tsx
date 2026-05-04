import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
} from 'react-admin';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import { DISTRIBUTOR_LEVELS, DISTRIBUTOR_STATUS } from '../../constants';
import StatusField from '../../components/StatusField';

const F = ({ children, xs = 12, sm = 6 }: { children: React.ReactNode; xs?: number; sm?: number }) => (
  <Grid item xs={xs} sm={sm}>{children}</Grid>
);

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <Card variant="outlined" sx={{ flex: 1 }}>
    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={700} color="primary.main">{value}</Typography>
    </CardContent>
  </Card>
);

const DistributorEdit = () => (
  <Edit title="编辑分销商">
    <SimpleForm>
      <Grid container spacing={2}>
        <F><TextInput source="id" disabled label="ID" fullWidth /></F>
        <F><TextInput source="userId" disabled label="用户ID" fullWidth /></F>
        <F>
          <SelectInput source="level" label="等级" choices={DISTRIBUTOR_LEVELS} fullWidth
            helperText="修改等级不会自动触发佣金率调整"
          />
        </F>
        <F>
          <NumberInput source="commissionRate" label="佣金率" step={0.01} min={0} max={1} fullWidth
            helperText="例：0.15 = 15%。此值覆盖默认佣金率配置"
          />
        </F>
        <F><SelectInput source="status" label="状态" choices={DISTRIBUTOR_STATUS} fullWidth /></F>
      </Grid>
    </SimpleForm>
  </Edit>
);

export default DistributorEdit;
