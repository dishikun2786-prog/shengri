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
import { REPORT_TYPES, AI_PROVIDERS, AB_GROUPS } from '../../constants';

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

const PromptForm = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <SimpleForm>
      <Section title="基本信息">
        <F><TextInput source="promptId" label="Prompt ID" validate={required()} fullWidth /></F>
        <F><TextInput source="version" label="版本" validate={required()} fullWidth /></F>
        <F sm={12}><TextInput source="name" label="名称" validate={required()} fullWidth /></F>
        <F><SelectInput source="module" label="模块" validate={required()} choices={REPORT_TYPES} fullWidth /></F>
      </Section>

      <Section title="提示词内容">
        <F sm={12}>
          <TextInput
            source="systemPrompt"
            label="系统提示词"
            multiline
            fullWidth
            rows={isSmall ? 3 : 6}
            sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
          />
        </F>
        <F sm={12}>
          <TextInput
            source="content"
            label="用户提示词模板"
            multiline
            fullWidth
            rows={isSmall ? 5 : 10}
            validate={required()}
            sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
          />
        </F>
      </Section>

      <Section title="模型配置">
        <F><SelectInput source="modelProvider" label="AI提供商" validate={required()} defaultValue="minimax" choices={AI_PROVIDERS} fullWidth /></F>
        <F><TextInput source="modelName" label="模型名" defaultValue="MiniMax-M2.5" fullWidth /></F>
        <F><NumberInput source="temperature" label="温度" defaultValue={0.7} step={0.1} min={0} max={2} fullWidth /></F>
        <F><NumberInput source="maxTokens" label="最大Token" defaultValue={4000} fullWidth /></F>
      </Section>

      <Section title="状态">
        <F><SelectInput source="abGroup" label="AB组" defaultValue="ALL" choices={AB_GROUPS} fullWidth /></F>
        <F><BooleanInput source="isActive" label="启用" defaultValue={true} /></F>
      </Section>
    </SimpleForm>
  );
};

export const PromptEdit = () => (
  <Edit title="编辑Prompt">
    <PromptForm />
  </Edit>
);

export const PromptCreate = () => (
  <Create title="新建Prompt">
    <PromptForm />
  </Create>
);

export default PromptEdit;
