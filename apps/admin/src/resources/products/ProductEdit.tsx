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

const ProductForm = () => (
  <SimpleForm>
    <FormSection title="基本信息">
      <F><TextInput source="productCode" label="产品编码" validate={required()} fullWidth /></F>
      <F sm={12}><TextInput source="name" label="产品名称" validate={required()} fullWidth /></F>
      <F sm={12}><TextInput source="subtitle" label="副标题" fullWidth /></F>
      <F sm={12}><TextInput source="description" label="描述" multiline fullWidth rows={3} /></F>
      <F>
        <SelectInput
          source="category"
          label="分类"
          validate={required()}
          fullWidth
          choices={[
            { id: 'free', name: '免费' },
            { id: 'lead', name: '引流' },
            { id: 'standard', name: '标准' },
            { id: 'premium', name: '高端' },
            { id: 'enterprise', name: '企业' },
            { id: 'vip', name: 'VIP' },
          ]}
        />
      </F>
      <F><TextInput source="reportType" label="报告类型" fullWidth /></F>
    </FormSection>

    <FormSection title="价格与佣金">
      <F sm={4}><NumberInput source="originalPrice" label="原价" validate={required()} fullWidth /></F>
      <F sm={4}><NumberInput source="currentPrice" label="现价" validate={required()} fullWidth /></F>
      <F sm={4}><NumberInput source="agentPrice" label="代理价" fullWidth /></F>
      <F><NumberInput source="commissionRateL1" label="一级佣金率" step={0.01} max={1} min={0} fullWidth /></F>
      <F><NumberInput source="commissionRateL2" label="二级佣金率" step={0.01} max={1} min={0} fullWidth /></F>
    </FormSection>

    <FormSection title="状态">
      <F><NumberInput source="sortOrder" label="排序" fullWidth /></F>
      <F><BooleanInput source="isActive" label="启用" defaultValue={true} /></F>
    </FormSection>
  </SimpleForm>
);

export const ProductEdit = () => (
  <Edit title="编辑产品">
    <ProductForm />
  </Edit>
);

export const ProductCreate = () => (
  <Create title="新建产品">
    <ProductForm />
  </Create>
);

export default ProductEdit;
