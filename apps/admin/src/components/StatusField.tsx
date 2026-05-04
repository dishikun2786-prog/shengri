import Chip from '@mui/material/Chip';
import { useRecordContext } from 'react-admin';

const STATUS_MAPS: Record<string, Record<number | string, { label: string; color: any }>> = {
  order: {
    0: { label: '待付款', color: 'default' },
    1: { label: '已付款', color: 'primary' },
    2: { label: '已完成', color: 'success' },
    3: { label: '退款中', color: 'warning' },
    4: { label: '已退款', color: 'error' },
    5: { label: '已取消', color: 'default' },
  },
  user: {
    0: { label: '禁用', color: 'error' },
    1: { label: '正常', color: 'success' },
  },
  vip: {
    0: { label: '免费', color: 'default' },
    1: { label: '基础VIP', color: 'primary' },
    2: { label: '高级VIP', color: 'secondary' },
    3: { label: '企业VIP', color: 'warning' },
  },
  distributor: {
    0: { label: '待审核', color: 'warning' },
    1: { label: '正常', color: 'success' },
    2: { label: '冻结', color: 'error' },
  },
  consultation: {
    0: { label: '待接单', color: 'warning' },
    1: { label: '进行中', color: 'primary' },
    2: { label: '已完成', color: 'success' },
    3: { label: '已取消', color: 'default' },
  },
  master: {
    0: { label: '待审核', color: 'warning' },
    1: { label: '已上架', color: 'success' },
    2: { label: '已下架', color: 'default' },
  },
};

interface StatusFieldProps {
  source: string;
  type?: keyof typeof STATUS_MAPS | 'boolean';
  label?: string;
}

const StatusField = ({ source, type = 'order' }: StatusFieldProps) => {
  const record = useRecordContext();
  if (!record) return null;

  const value = record[source];

  if (type === 'boolean') {
    return <Chip label={value ? '是' : '否'} color={value ? 'success' : 'default'} size="small" />;
  }

  const map = STATUS_MAPS[type] || STATUS_MAPS.order;
  const item = map[value as number] || { label: String(value), color: 'default' };

  return <Chip label={item.label} color={item.color} size="small" />;
};

export default StatusField;
