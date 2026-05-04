import {
  List,
  Datagrid,
  TextField,
  DateField,
  ReferenceField,
  SelectInput,
  NumberInput,
  TopToolbar,
  FilterButton,
  ExportButton,
  FunctionField,
} from 'react-admin';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

const SOURCE_LABELS: Record<string, { label: string; color: 'info' | 'success' | 'warning' | 'secondary' }> = {
  chat: { label: '聊天', color: 'info' },
  report: { label: '报告', color: 'success' },
  health: { label: '健康', color: 'warning' },
  crm: { label: 'CRM', color: 'secondary' },
};

const STATUS_LABELS: Record<string, { label: string; color: 'info' | 'success' | 'error' | 'warning' }> = {
  pending: { label: '处理中', color: 'warning' },
  settled: { label: '已结算', color: 'success' },
  voided: { label: '已退款', color: 'error' },
};

const filters = [
  <SelectInput
    source="source"
    label="来源"
    alwaysOn
    choices={[
      { id: 'chat', name: '聊天' },
      { id: 'report', name: '报告' },
      { id: 'health', name: '健康' },
      { id: 'crm', name: 'CRM' },
    ]}
  />,
  <SelectInput
    source="status"
    label="状态"
    choices={[
      { id: 'pending', name: '处理中' },
      { id: 'settled', name: '已结算' },
      { id: 'voided', name: '已退款' },
    ]}
  />,
  <NumberInput source="userId" label="用户 ID" />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

const TokenUsageList = () => (
  <List actions={<ListActions />} filters={filters} sort={{ field: 'createdAt', order: 'DESC' }}>
    <Datagrid bulkActionButtons={false}>
      <TextField source="id" label="ID" />
      <ReferenceField source="userId" reference="users" link="show" label="用户">
        <TextField source="nickname" />
      </ReferenceField>
      <FunctionField
        source="source"
        label="来源"
        render={(r: any) => {
          const t = SOURCE_LABELS[r.source] || { label: r.source, color: 'secondary' as const };
          return <Chip label={t.label} color={t.color} size="small" />;
        }}
      />
      <TextField source="provider" label="提供商" />
      <TextField source="model" label="模型" />
      <FunctionField
        source="inputTokens"
        label="输入/输出/总计"
        render={(r: any) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {r.inputTokens} / {r.outputTokens} / {r.totalTokens}
          </Typography>
        )}
      />
      <FunctionField
        source="estimatedTokens"
        label="预估/实际费用"
        render={(r: any) => {
          const est = Number(r.estimatedCost || 0);
          const act = Number(r.actualCost || 0);
          return (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              ¥{est.toFixed(4)} / ¥{act.toFixed(4)}
            </Typography>
          );
        }}
      />
      <FunctionField
        source="frozenAmount"
        label="冻结"
        render={(r: any) => {
          const v = Number(r.frozenAmount || 0);
          return v > 0 ? <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'warning.main' }}>¥{v.toFixed(2)}</Typography> : <Typography variant="body2" color="text.secondary">—</Typography>;
        }}
      />
      <FunctionField
        source="freeUsed"
        label="免费"
        render={(r: any) => {
          if (!r.freeUsed) return <Typography variant="body2" color="text.secondary">付费</Typography>;
          const label = r.freeSource === 'permanent' ? '永久免费' : r.freeSource === 'daily' ? '每日免费' : r.freeSource === 'product_paid' ? '产品已付' : '免费';
          return <Chip label={label} color="info" size="small" variant="outlined" />;
        }}
      />
      <FunctionField
        source="status"
        label="状态"
        render={(r: any) => {
          const t = STATUS_LABELS[r.status] || { label: r.status, color: 'warning' as const };
          return <Chip label={t.label} color={t.color} size="small" />;
        }}
      />
      <DateField source="createdAt" label="创建时间" showTime />
      <DateField source="settledAt" label="结算时间" showTime />
    </Datagrid>
  </List>
);

export default TokenUsageList;
