import {
  Edit,
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  DateTimeInput,
  required,
} from 'react-admin';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import { CUSTOMER_LEVELS, CUSTOMER_STAGES, CUSTOMER_TYPES } from '../../constants';

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

const CustomerForm = () => (
  <SimpleForm>
    <Section title="基本信息">
      <F><TextInput source="name" label="姓名" validate={required()} fullWidth /></F>
      <F><TextInput source="phone" label="手机号" fullWidth /></F>
      <F><TextInput source="wechatId" label="微信号" fullWidth /></F>
      <F><TextInput source="company" label="公司" fullWidth /></F>
      <F><TextInput source="position" label="职位" fullWidth /></F>
    </Section>
    <Section title="分类与阶段">
      <F><SelectInput source="customerLevel" label="客户等级" choices={CUSTOMER_LEVELS} fullWidth /></F>
      <F><SelectInput source="customerType" label="客户类型" choices={CUSTOMER_TYPES} fullWidth /></F>
      <F><SelectInput source="customerStage" label="客户阶段" choices={CUSTOMER_STAGES} fullWidth /></F>
    </Section>
    <Section title="来源与跟进">
      <F><TextInput source="source" label="来源" fullWidth /></F>
      <F><TextInput source="sourceDetail" label="来源详情" fullWidth /></F>
      <F><DateTimeInput source="nextFollowAt" label="下次跟进时间" fullWidth /></F>
      <F sm={12}><TextInput source="notes" label="备注" multiline fullWidth rows={4} /></F>
    </Section>
  </SimpleForm>
);

export const CustomerEdit = () => (
  <Edit title="编辑CRM客户">
    <CustomerForm />
  </Edit>
);

export const CustomerCreate = () => (
  <Create title="新建CRM客户">
    <CustomerForm />
  </Create>
);

export default CustomerEdit;
