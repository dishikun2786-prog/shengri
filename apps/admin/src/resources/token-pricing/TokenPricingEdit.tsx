import {
  Edit,
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
  required,
} from 'react-admin';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ mb: 2, width: '100%' }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>{title}</Typography>
    <Divider sx={{ mb: 2 }} />
    <Grid container spacing={2}>
      {children}
    </Grid>
  </Box>
);

const F = ({ children, xs = 12, sm = 6 }: { children: React.ReactNode; xs?: number; sm?: number }) => (
  <Grid item xs={xs} sm={sm}>{children}</Grid>
);

const TokenPricingForm = () => (
  <SimpleForm>
    <FormSection title="基本信息">
      <F>
        <TextInput source="provider" label="提供商" validate={required()} fullWidth
          helperText="如 deepseek / openai / minimax" />
      </F>
      <F>
        <TextInput source="modelName" label="模型名称" validate={required()} fullWidth
          helperText="如 deepseek-v4-flash / gpt-4o" />
      </F>
    </FormSection>

    <FormSection title="定价（每千 Token）">
      <F>
        <NumberInput source="pricePer1kInput" label="输入价格 (¥/1K tokens)" validate={required()} fullWidth
          helperText="例如 DeepSeek: 0.002 元/1K" />
      </F>
      <F>
        <NumberInput source="pricePer1kOutput" label="输出价格 (¥/1K tokens)" validate={required()} fullWidth
          helperText="通常输出价格高于输入价格" />
      </F>
    </FormSection>

    <FormSection title="状态">
      <F>
        <NumberInput source="sortOrder" label="排序" fullWidth />
      </F>
      <F>
        <BooleanInput source="isActive" label="启用" defaultValue={true} />
      </F>
    </FormSection>
  </SimpleForm>
);

export const TokenPricingEdit = () => (
  <Edit title="编辑 Token 定价">
    <TokenPricingForm />
  </Edit>
);

export const TokenPricingCreate = () => (
  <Create title="新建 Token 定价">
    <TokenPricingForm />
  </Create>
);
