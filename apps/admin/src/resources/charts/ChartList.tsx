import {
  List,
  Datagrid,
  TextField,
  DateField,
  BooleanField,
  ReferenceField,
  SearchInput,
  SelectInput,
  TopToolbar,
  FilterButton,
  ExportButton,
  SimpleList,
} from 'react-admin';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const GENDER_MAP: Record<number, string> = { 0: '未知', 1: '男', 2: '女' };

const chartFilters = [
  <SearchInput source="q" alwaysOn placeholder="搜索UUID/名称" />,
  <SelectInput
    source="gender"
    label="性别"
    choices={[
      { id: 1, name: '男' },
      { id: 2, name: '女' },
    ]}
  />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

const ChartList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List filters={chartFilters} actions={<ListActions />} sort={{ field: 'id', order: 'DESC' }}>
      {isSmall ? (
        <SimpleList
          primaryText={(r) => `${r.name || '-'} · ${GENDER_MAP[r.gender] || ''}`}
          secondaryText={(r) => {
            const pillars = [
              `${r.yearGan || ''}${r.yearZhi || ''}`,
              `${r.monthGan || ''}${r.monthZhi || ''}`,
              `${r.dayGan || ''}${r.dayZhi || ''}`,
              `${r.hourGan || ''}${r.hourZhi || ''}`,
            ].filter(Boolean).join(' ');
            return pillars || '-';
          }}
          tertiaryText={(r) => r.patternType || ''}
          linkType="show"
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid bulkActionButtons={false} rowClick="show">
          <TextField source="id" label="ID" />
          <TextField source="uuid" label="UUID" />
          <ReferenceField source="userId" reference="users" label="用户" link="edit">
            <TextField source="nickname" />
          </ReferenceField>
          <TextField source="name" label="名称" />
          <TextField source="gender" label="性别" />
          <DateField source="solarDate" label="阳历日期" />
          <TextField source="solarTime" label="时辰" />
          <TextField source="yearGan" label="年干" />
          <TextField source="yearZhi" label="年支" />
          <TextField source="monthGan" label="月干" />
          <TextField source="monthZhi" label="月支" />
          <TextField source="dayGan" label="日干" />
          <TextField source="dayZhi" label="日支" />
          <TextField source="hourGan" label="时干" />
          <TextField source="hourZhi" label="时支" />
          <TextField source="patternType" label="格局" />
          <TextField source="strengthLevel" label="强弱" />
          <BooleanField source="isPrimary" label="主命盘" />
          <DateField source="createdAt" label="创建时间" showTime />
        </Datagrid>
      )}
    </List>
  );
};

export default ChartList;
