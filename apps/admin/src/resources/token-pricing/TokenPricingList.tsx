import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  BooleanInput,
  SearchInput,
  EditButton,
  CreateButton,
  FilterButton,
  TopToolbar,
  SimpleList,
} from 'react-admin';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const filters = [
  <SearchInput source="q" alwaysOn placeholder="搜索提供商/模型" />,
  <BooleanInput source="isActive" label="仅启用" />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
  </TopToolbar>
);

const TokenPricingList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List filters={filters} actions={<ListActions />} sort={{ field: 'sortOrder', order: 'ASC' }}>
      {isSmall ? (
        <SimpleList
          primaryText={(r) => `${r.provider} / ${r.modelName}`}
          secondaryText={(r) => `输入 ¥${Number(r.pricePer1kInput || 0).toFixed(4)}/1K 输出 ¥${Number(r.pricePer1kOutput || 0).toFixed(4)}/1K`}
          tertiaryText={(r) => r.isActive ? '启用' : '停用'}
          linkType="edit"
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid rowClick="edit" bulkActionButtons={false}>
          <TextField source="id" label="ID" />
          <TextField source="provider" label="提供商" />
          <TextField source="modelName" label="模型名称" />
          <TextField source="pricePer1kInput" label="输入价格/1K" />
          <TextField source="pricePer1kOutput" label="输出价格/1K" />
          <TextField source="sortOrder" label="排序" />
          <BooleanField source="isActive" label="启用" />
          <EditButton />
        </Datagrid>
      )}
    </List>
  );
};

export default TokenPricingList;
