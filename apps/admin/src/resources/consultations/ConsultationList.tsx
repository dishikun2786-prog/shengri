import {
  List,
  Datagrid,
  TextField,
  DateField,
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
import MoneyField from '../../components/MoneyField';
import StatusField from '../../components/StatusField';
import { CONSULTATION_STATUS, CONSULTATION_TYPES } from '../../constants';

const CONSULTATION_STATUS_LABELS: Record<number, string> = {
  0: '待接单', 1: '进行中', 2: '已完成', 3: '已取消',
};
const TYPE_LABELS: Record<string, string> = { text: '文字', voice: '语音', video: '视频' };

const consultationFilters = [
  <SearchInput source="q" alwaysOn placeholder="搜索咨询单号" />,
  <SelectInput source="status" label="状态" choices={CONSULTATION_STATUS} />,
  <SelectInput source="consultationType" label="类型" choices={CONSULTATION_TYPES} />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

const ConsultationList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List filters={consultationFilters} actions={<ListActions />} sort={{ field: 'id', order: 'DESC' }}>
      {isSmall ? (
        <SimpleList
          primaryText={(r) => r.consultationNo || '-'}
          secondaryText={(r) => `${r.master?.displayName || '命理师'} · ${TYPE_LABELS[r.consultationType] || r.consultationType}`}
          tertiaryText={(r) => `${CONSULTATION_STATUS_LABELS[r.status] || '未知'} · ¥${Number(r.paidAmount || 0).toFixed(0)}`}
          linkType="show"
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid rowClick="show" bulkActionButtons={false}>
          <TextField source="id" label="ID" />
          <TextField source="consultationNo" label="咨询单号" />
          <TextField source="userId" label="用户ID" />
          <ReferenceField source="masterId" reference="masters" label="命理师" link="edit">
            <TextField source="displayName" />
          </ReferenceField>
          <TextField source="consultationType" label="类型" />
          <TextField source="topic" label="主题" />
          <MoneyField source="paidAmount" label="金额" />
          <StatusField source="status" type="consultation" label="状态" />
          <DateField source="createdAt" label="创建时间" showTime />
          <DateField source="completedAt" label="完成时间" showTime />
        </Datagrid>
      )}
    </List>
  );
};

export default ConsultationList;
