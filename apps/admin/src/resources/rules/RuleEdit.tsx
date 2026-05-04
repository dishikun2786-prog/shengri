import {
  Edit,
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  BooleanInput,
  required,
} from 'react-admin';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import JsonEditor from '../../components/JsonEditor';
import { RULE_MODULES, AB_GROUPS } from '../../constants';

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

const RuleForm = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <SimpleForm>
      <Section title="基本信息">
        <F><TextInput source="ruleId" label="规则ID" validate={required()} fullWidth /></F>
        <F><TextInput source="version" label="版本" validate={required()} fullWidth /></F>
        <F sm={12}><TextInput source="name" label="规则名称" validate={required()} fullWidth /></F>
        <F sm={12}><TextInput source="description" label="描述" multiline fullWidth rows={2} /></F>
        <F><SelectInput source="module" label="模块" validate={required()} choices={RULE_MODULES} fullWidth /></F>
        <F><NumberInput source="priority" label="优先级" defaultValue={100} fullWidth /></F>
      </Section>

      <Section title="规则逻辑">
        <F sm={12}><JsonEditor source="conditions" label="条件 (JSON)" /></F>
        <F sm={12}><JsonEditor source="actions" label="动作 (JSON)" /></F>
      </Section>

      <Section title="状态">
        <F><SelectInput source="abGroup" label="AB组" defaultValue="ALL" choices={AB_GROUPS} fullWidth /></F>
        <F><TextInput source="author" label="作者" fullWidth /></F>
        <F><BooleanInput source="isActive" label="启用" defaultValue={true} /></F>
      </Section>
    </SimpleForm>
  );
};

export const RuleEdit = () => (
  <Edit title="编辑规则">
    <RuleForm />
  </Edit>
);

export const RuleCreate = () => (
  <Create title="新建规则">
    <RuleForm />
  </Create>
);

export default RuleEdit;
