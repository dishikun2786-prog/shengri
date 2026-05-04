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
import { REPORT_TYPES, AI_PROVIDERS } from '../../constants';

const promptFilters = [
  <SearchInput source="q" alwaysOn placeholder="搜索Prompt名/ID" />,
  <SelectInput source="module" label="模块" choices={REPORT_TYPES} />,
  <SelectInput source="modelProvider" label="AI提供商" choices={AI_PROVIDERS} />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
  </TopToolbar>
);

const PromptList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List filters={promptFilters} actions={<ListActions />} sort={{ field: 'id', order: 'DESC' }}>
      {isSmall ? (
        <SimpleList
          primaryText={(r) => `${r.name || '-'} · ${r.module || ''}`}
          secondaryText={(r) => `${r.modelProvider || ''} / ${r.modelName || ''}`}
          tertiaryText={(r) => r.isActive ? '启用' : '禁用'}
          linkType="edit"
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid rowClick="edit" bulkActionButtons={false}>
          <TextField source="id" label="ID" />
          <TextField source="promptId" label="Prompt ID" />
          <TextField source="module" label="模块" />
          <TextField source="name" label="名称" />
          <TextField source="version" label="版本" />
          <TextField source="modelProvider" label="AI提供商" />
          <TextField source="modelName" label="模型" />
          <NumberField source="temperature" label="温度" />
          <NumberField source="conversionRate" label="转化率" />
          <TextField source="abGroup" label="AB组" />
          <BooleanField source="isActive" label="启用" />
          <DateField source="updatedAt" label="更新时间" showTime />
          <EditButton />
        </Datagrid>
      )}
    </List>
  );
};

export default PromptList;
