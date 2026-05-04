import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
  SelectInput,
} from 'react-admin';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import { MASTER_STATUS } from '../../constants';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ mb: 2, width: '100%' }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>{title}</Typography>
    <Divider sx={{ mb: 2 }} />
    <Grid container spacing={2}>{children}</Grid>
  </Box>
);

const F = ({ children, xs = 12, sm = 6 }: { children: React.ReactNode; xs?: number; sm?: number }) => (
  <Grid item xs={xs} sm={sm}>{children}</Grid>
);

const MasterEdit = () => (
  <Edit title="编辑命理师">
    <SimpleForm>
      <Section title="基本信息">
        <F><TextInput source="id" disabled label="ID" fullWidth /></F>
        <F><TextInput source="userId" disabled label="用户ID" fullWidth /></F>
        <F><TextInput source="displayName" label="显示名称" fullWidth /></F>
        <F><TextInput source="title" label="头衔" fullWidth /></F>
        <F sm={12}><TextInput source="bio" label="简介" multiline fullWidth rows={4} /></F>
        <F><NumberInput source="experienceYears" label="经验年数" fullWidth /></F>
      </Section>
      <Section title="定价">
        <F sm={4}><NumberInput source="textPrice" label="文字咨询价格" fullWidth /></F>
        <F sm={4}><NumberInput source="voicePrice" label="语音咨询价格" fullWidth /></F>
        <F sm={4}><NumberInput source="videoPrice" label="视频咨询价格" fullWidth /></F>
        <F><NumberInput source="commissionRate" label="分成比例" step={0.01} min={0} max={1} fullWidth /></F>
      </Section>
      <Section title="状态">
        <F><NumberInput source="sortOrder" label="排序" fullWidth /></F>
        <F><BooleanInput source="isFeatured" label="推荐" /></F>
        <F><SelectInput source="status" label="状态" choices={MASTER_STATUS} fullWidth /></F>
      </Section>
    </SimpleForm>
  </Edit>
);

export default MasterEdit;
