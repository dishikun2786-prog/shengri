import {
  Edit,
  SimpleForm,
  TextInput,
  PasswordInput,
  NumberInput,
  SelectInput,
  Toolbar,
  SaveButton,
} from 'react-admin';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import { GENDER_CHOICES, VIP_LEVELS, IDENTITY_TYPES, USER_STATUS, USER_ROLES } from '../../constants';

const EditToolbar = () => (
  <Toolbar sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 1, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
    <SaveButton />
  </Toolbar>
);

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>{title}</Typography>
    <Divider sx={{ mb: 2 }} />
    <Grid container spacing={2}>
      {children}
    </Grid>
  </Box>
);

const FormField = ({ children, xs = 12, sm = 6 }: { children: React.ReactNode; xs?: number; sm?: number }) => (
  <Grid item xs={xs} sm={sm}>{children}</Grid>
);

const UserEdit = () => (
  <Edit title="编辑用户">
    <SimpleForm toolbar={<EditToolbar />}>
      <FormSection title="基本信息">
        <FormField><TextInput source="id" disabled label="ID" fullWidth /></FormField>
        <FormField><TextInput source="username" label="用户名" fullWidth /></FormField>
        <FormField><TextInput source="phone" label="手机号" fullWidth /></FormField>
        <FormField><TextInput source="nickname" label="昵称" fullWidth /></FormField>
        <FormField><TextInput source="email" label="邮箱" fullWidth /></FormField>
        <FormField><SelectInput source="gender" label="性别" choices={GENDER_CHOICES} fullWidth /></FormField>
        <FormField><SelectInput source="role" label="角色" choices={USER_ROLES} fullWidth /></FormField>
      </FormSection>
      <FormSection title="会员与状态">
        <FormField><SelectInput source="vipLevel" label="VIP等级" choices={VIP_LEVELS} fullWidth /></FormField>
        <FormField><SelectInput source="identityType" label="身份类型" choices={IDENTITY_TYPES} fullWidth /></FormField>
        <FormField><SelectInput source="status" label="状态" choices={USER_STATUS} fullWidth /></FormField>
      </FormSection>
      <FormSection title="安全设置">
        <FormField>
          <PasswordInput source="password" label="新密码（留空不修改）" fullWidth helperText="留空则保持原密码不变" />
        </FormField>
      </FormSection>
      <FormSection title="账户余额">
        <FormField>
          <NumberInput source="balance" label="余额 (元)" fullWidth />
        </FormField>
      </FormSection>
      <FormSection title="其他">
        <FormField><TextInput source="language" label="语言" fullWidth /></FormField>
        <FormField><TextInput source="sourceChannel" label="来源渠道" fullWidth /></FormField>
      </FormSection>
    </SimpleForm>
  </Edit>
);

export default UserEdit;
