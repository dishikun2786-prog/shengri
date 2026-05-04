import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
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

const TYPE_MAP: Record<string, { label: string; color: 'info' | 'error' | 'warning' | 'secondary' | 'success' }> = {
  recharge: { label: '充值', color: 'info' },
  payment: { label: '消费', color: 'error' },
  refund: { label: '退款', color: 'warning' },
  admin_adjust: { label: '后台调整', color: 'secondary' },
  token_freeze: { label: 'Token冻结', color: 'info' },
  token_settle: { label: 'Token结算', color: 'secondary' },
  agent_recharge: { label: '代理充值', color: 'success' },
  agent_card_cost: { label: '代理制卡', color: 'error' },
  agent_card_void: { label: '制卡退款', color: 'warning' },
};

const filters = [
  <SelectInput
    source="type"
    label="类型"
    alwaysOn
    choices={[
      { id: 'recharge', name: '充值' },
      { id: 'payment', name: '消费' },
      { id: 'refund', name: '退款' },
      { id: 'admin_adjust', name: '后台调整' },
      { id: 'token_freeze', name: 'Token冻结' },
      { id: 'token_settle', name: 'Token结算' },
      { id: 'agent_recharge', name: '代理充值' },
      { id: 'agent_card_cost', name: '代理制卡' },
      { id: 'agent_card_void', name: '制卡退款' },
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

const BalanceTransactionList = () => (
  <List actions={<ListActions />} filters={filters} sort={{ field: 'createdAt', order: 'DESC' }}>
    <Datagrid bulkActionButtons={false}>
      <TextField source="id" />
      <ReferenceField source="userId" reference="users" link="show" label="用户">
        <TextField source="nickname" />
      </ReferenceField>
      <FunctionField
        source="type"
        label="类型"
        render={(record: { type?: string }) => {
          const t = TYPE_MAP[record?.type || ''] || { label: record?.type, color: 'secondary' as const };
          return <Chip label={t.label} color={t.color} size="small" />;
        }}
      />
      <FunctionField
        source="amount"
        label="金额"
        render={(record: { amount?: number }) => {
          const v = Number(record?.amount ?? 0);
          return (
            <Typography
              variant="body2"
              sx={{ color: v >= 0 ? 'success.main' : 'error.main', fontWeight: 700, fontFamily: 'monospace' }}
            >
              {v >= 0 ? '+' : ''}{v.toFixed(2)}
            </Typography>
          );
        }}
      />
      <NumberField source="balanceAfter" label="变动后余额" options={{ style: 'currency', currency: 'CNY' }} />
      <TextField source="refId" label="关联单号" emptyText="—" />
      <TextField source="refType" label="关联类型" emptyText="—" />
      <TextField source="remark" label="备注" emptyText="—" />
      <DateField source="createdAt" label="时间" showTime />
    </Datagrid>
  </List>
);

export default BalanceTransactionList;
