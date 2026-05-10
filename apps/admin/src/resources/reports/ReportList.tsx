import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  BooleanField,
  ReferenceField,
  FunctionField,
  SearchInput,
  SelectInput,
  FilterButton,
  TopToolbar,
  ExportButton,
  SimpleList,
} from 'react-admin';
import { Chip } from '@mui/material';
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
  free: '八字·免费', basic: '八字·基础', wealth: '八字·财运', marriage: '八字·婚姻',
  career: '八字·事业', annual: '八字·流年', hehun: '八字·合婚', partner: '八字·合伙人',
  enterprise: '八字·企业', full: '八字·全方位', pairing: '八字·配对',
  xiaoliuren: '小六壬', digital_energy: '数字能量', bazhai: '八宅风水',
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
          <FunctionField label="类型" render={(r: any) => {
            const label = REPORT_TYPE_MAP[r.reportType] || r.reportType;
            const isXlr = r.reportType === 'xiaoliuren';
            const isDe = r.reportType === 'digital_energy';
            const isBz = r.reportType === 'bazhai';
            const isBazi = !isXlr && !isDe && !isBz && r.reportType !== 'pairing';
            return (
              <Chip size="small" label={label}
                sx={{ fontWeight: 600, fontSize: 12,
                  bgcolor: isXlr ? '#fef3c7' : isDe ? '#dbeafe' : isBz ? '#d1fae5' : isBazi ? '#fce7f3' : '#e0e7ff',
                  color: isXlr ? '#92400e' : isDe ? '#1e40af' : isBz ? '#065f46' : isBazi ? '#9d174d' : '#3730a3',
                  border: '1px solid',
                  borderColor: isXlr ? '#fcd34d' : isDe ? '#93c5fd' : isBz ? '#6ee7b7' : isBazi ? '#f9a8d4' : '#a5b4fc',
                }} />
            );
          }} />
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
