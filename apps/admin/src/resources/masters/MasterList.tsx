import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  EditButton,
  TopToolbar,
  FilterButton,
  SearchInput,
  SelectInput,
  SimpleList,
} from 'react-admin';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MoneyField from '../../components/MoneyField';
import StatusField from '../../components/StatusField';
import { MASTER_STATUS } from '../../constants';

const MASTER_STATUS_LABELS: Record<number, string> = { 0: '待审核', 1: '已上架', 2: '已下架' };

const masterFilters = [
  <SearchInput source="q" alwaysOn placeholder="搜索命理师" />,
  <SelectInput source="status" label="状态" choices={MASTER_STATUS} />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
  </TopToolbar>
);

const MasterList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List filters={masterFilters} actions={<ListActions />} sort={{ field: 'totalConsultations', order: 'DESC' }}>
      {isSmall ? (
        <SimpleList
          primaryText={(r) => `${r.displayName || '-'} · ${r.title || ''}`}
          secondaryText={(r) => `评分 ${Number(r.avgRating || 0).toFixed(1)} · 咨询 ${r.totalConsultations || 0}`}
          tertiaryText={(r) => MASTER_STATUS_LABELS[r.status] || '未知'}
          linkType="edit"
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid rowClick="edit" bulkActionButtons={false}>
          <TextField source="id" label="ID" />
          <TextField source="displayName" label="名称" />
          <TextField source="title" label="头衔" />
          <NumberField source="experienceYears" label="经验(年)" />
          <NumberField source="totalConsultations" label="咨询数" />
          <NumberField source="avgRating" label="评分" options={{ maximumFractionDigits: 1 }} />
          <NumberField source="totalReviews" label="评价数" />
          <MoneyField source="textPrice" label="文字价" />
          <MoneyField source="voicePrice" label="语音价" />
          <MoneyField source="totalEarnings" label="总收入" />
          <BooleanField source="isFeatured" label="推荐" />
          <StatusField source="status" type="master" label="状态" />
          <DateField source="createdAt" label="入驻时间" showTime />
          <EditButton />
        </Datagrid>
      )}
    </List>
  );
};

export default MasterList;
