import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  SearchInput,
  SelectInput,
  EditButton,
  TopToolbar,
  CreateButton,
  FilterButton,
  SimpleList,
} from 'react-admin';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { RULE_MODULES } from '../../constants';

const ruleFilters = [
  <SearchInput source="q" alwaysOn placeholder="搜索规则名/ID" />,
  <SelectInput source="module" label="模块" choices={RULE_MODULES} />,
  <SelectInput
    source="isActive"
    label="状态"
    choices={[
      { id: true, name: '启用' },
      { id: false, name: '禁用' },
    ]}
  />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
  </TopToolbar>
);

const RuleList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List filters={ruleFilters} actions={<ListActions />} sort={{ field: 'priority', order: 'DESC' }}>
      {isSmall ? (
        <SimpleList
          primaryText={(r) => `${r.name || '-'} · ${r.module || ''}`}
          secondaryText={(r) => `优先级 ${r.priority ?? '-'} · 命中 ${r.hitCount ?? 0}`}
          tertiaryText={(r) => r.isActive ? '启用' : '禁用'}
          linkType="edit"
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid rowClick="edit" bulkActionButtons={false}>
          <TextField source="id" label="ID" />
          <TextField source="ruleId" label="规则ID" />
          <TextField source="name" label="名称" />
          <TextField source="module" label="模块" />
          <TextField source="version" label="版本" />
          <NumberField source="priority" label="优先级" />
          <NumberField source="hitCount" label="命中次数" />
          <TextField source="abGroup" label="AB组" />
          <BooleanField source="isActive" label="启用" />
          <DateField source="updatedAt" label="更新时间" showTime />
          <EditButton />
        </Datagrid>
      )}
    </List>
  );
};

export default RuleList;
