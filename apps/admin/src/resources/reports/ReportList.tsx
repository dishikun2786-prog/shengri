import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  BooleanField,
  ReferenceField,
  SearchInput,
  SelectInput,
  FilterButton,
  TopToolbar,
  ExportButton,
  SimpleList,
} from 'react-admin';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { REPORT_TYPES } from '../../constants';

const reportFilters = [
  <SearchInput source="q" alwaysOn placeholder="搜索UUID/类型" />,
  <SelectInput source="reportType" label="报告类型" choices={REPORT_TYPES} />,
  <SelectInput
    source="isPaid"
    label="付费"
    choices={[
      { id: true, name: '已付费' },
      { id: false, name: '免费' },
    ]}
  />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

const REPORT_TYPE_MAP: Record<string, string> = {
  free: '免费', wealth: '财运', marriage: '婚姻', career: '事业',
  annual: '流年', hehun: '合婚', partner: '合伙人', enterprise: '企业',
};

const ReportList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List filters={reportFilters} actions={<ListActions />} sort={{ field: 'id', order: 'DESC' }}>
      {isSmall ? (
        <SimpleList
          primaryText={(r) => `${REPORT_TYPE_MAP[r.reportType] || r.reportType} · ${(r.uuid || '').slice(0, 8)}`}
          secondaryText={(r) => r.aiProvider || '-'}
          tertiaryText={(r) => new Date(r.createdAt).toLocaleDateString('zh-CN')}
          linkType="show"
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid rowClick="show" bulkActionButtons={false}>
          <TextField source="id" label="ID" />
          <TextField source="uuid" label="UUID" />
          <ReferenceField source="userId" reference="users" label="用户" link="edit">
            <TextField source="nickname" />
          </ReferenceField>
          <TextField source="reportType" label="类型" />
          <TextField source="aiProvider" label="AI提供商" />
          <TextField source="promptVersion" label="Prompt版本" />
          <NumberField source="aiTokenUsed" label="Token" />
          <NumberField source="viewCount" label="浏览" />
          <NumberField source="shareCount" label="分享" />
          <BooleanField source="isPaid" label="付费" />
          <NumberField source="userRating" label="评分" />
          <DateField source="createdAt" label="创建时间" showTime />
        </Datagrid>
      )}
    </List>
  );
};

export default ReportList;
