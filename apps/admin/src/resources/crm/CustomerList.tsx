import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  SearchInput,
  SelectInput,
  EditButton,
  TopToolbar,
  FilterButton,
  CreateButton,
  SimpleList,
} from 'react-admin';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MoneyField from '../../components/MoneyField';
import { CUSTOMER_LEVELS, CUSTOMER_STAGES, CUSTOMER_TYPES } from '../../constants';

const LEVEL_LABELS: Record<string, string> = { A: 'A级', B: 'B级', C: 'C级', D: 'D级' };
const STAGE_LABELS: Record<string, string> = {
  new: '新客户', contacted: '已联系', trial: '体验中',
  negotiation: '谈判中', converted: '已转化', lost: '已流失',
};

const crmFilters = [
  <SearchInput source="q" alwaysOn placeholder="搜索姓名/手机号/公司" />,
  <SelectInput source="customerLevel" label="客户等级" choices={CUSTOMER_LEVELS} />,
  <SelectInput source="customerStage" label="阶段" choices={CUSTOMER_STAGES} />,
  <SelectInput source="customerType" label="类型" choices={CUSTOMER_TYPES} />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
  </TopToolbar>
);

const CustomerList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List filters={crmFilters} actions={<ListActions />} sort={{ field: 'id', order: 'DESC' }}>
      {isSmall ? (
        <SimpleList
          primaryText={(r) => `${r.name || '-'} · ${r.phone || ''}`}
          secondaryText={(r) => `${LEVEL_LABELS[r.customerLevel] || r.customerLevel} · ${STAGE_LABELS[r.customerStage] || r.customerStage}`}
          tertiaryText={(r) => `¥${Number(r.totalSpent || 0).toFixed(2)}`}
          linkType="edit"
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid rowClick="edit" bulkActionButtons={false}>
          <TextField source="id" label="ID" />
          <TextField source="name" label="姓名" />
          <TextField source="phone" label="手机号" />
          <TextField source="company" label="公司" />
          <TextField source="customerLevel" label="等级" />
          <TextField source="customerStage" label="阶段" />
          <TextField source="customerType" label="类型" />
          <MoneyField source="totalSpent" label="累计消费" />
          <NumberField source="orderCount" label="订单数" />
          <NumberField source="followCount" label="跟进次数" />
          <DateField source="lastFollowAt" label="最后跟进" showTime />
          <DateField source="nextFollowAt" label="下次跟进" showTime />
          <EditButton />
        </Datagrid>
      )}
    </List>
  );
};

export default CustomerList;
