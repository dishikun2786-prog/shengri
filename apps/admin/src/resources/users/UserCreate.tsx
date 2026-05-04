import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  required,
} from 'react-admin';
import Grid from '@mui/material/Grid';
import { GENDER_CHOICES, VIP_LEVELS, IDENTITY_TYPES, USER_STATUS, USER_ROLES } from '../../constants';

const FormField = ({ children, xs = 12, sm = 6 }: { children: React.ReactNode; xs?: number; sm?: number }) => (
  <Grid item xs={xs} sm={sm}>{children}</Grid>
);

const UserCreate = () => (
  <Create title="新建用户">
    <SimpleForm>
      <Grid container spacing={2}>
        <FormField><TextInput source="phone" label="手机号" validate={required()} fullWidth /></FormField>
        <FormField><TextInput source="password" label="密码" type="password" validate={required()} fullWidth /></FormField>
        <FormField><TextInput source="nickname" label="昵称" fullWidth /></FormField>
        <FormField><TextInput source="email" label="邮箱" fullWidth /></FormField>
        <FormField><SelectInput source="gender" label="性别" defaultValue={0} choices={GENDER_CHOICES} fullWidth /></FormField>
        <FormField><SelectInput source="role" label="角色" defaultValue="user" choices={USER_ROLES} fullWidth /></FormField>
        <FormField><SelectInput source="vipLevel" label="VIP等级" defaultValue={0} choices={VIP_LEVELS} fullWidth /></FormField>
        <FormField><SelectInput source="identityType" label="身份类型" defaultValue={0} choices={IDENTITY_TYPES} fullWidth /></FormField>
        <FormField><SelectInput source="status" label="状态" defaultValue={1} choices={USER_STATUS} fullWidth /></FormField>
      </Grid>
    </SimpleForm>
  </Create>
);

export default UserCreate;
