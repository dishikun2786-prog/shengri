import { useState } from 'react';
import {
  Show,
  SimpleShowLayout,
  TextField,
  DateField,
  NumberField,
  ReferenceField,
  FunctionField,
  TopToolbar,
  useNotify,
  useRefresh,
  useRecordContext,
} from 'react-admin';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import BlockIcon from '@mui/icons-material/Block';

const STATUS_MAP: Record<number, { label: string; color: 'default' | 'success' | 'error' }> = {
  0: { label: '未使用', color: 'default' },
  1: { label: '已使用', color: 'success' },
  2: { label: '已作废', color: 'error' },
};

const VoidButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!record || record.status !== 0) return null;

  const handleVoid = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/admin/actions/card-key/void/${record.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '作废失败');
      }
      notify('卡密已作废', { type: 'success' });
      setOpen(false);
      refresh();
    } catch (err: any) {
      notify(err.message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button startIcon={<BlockIcon />} color="error" size="small" onClick={() => setOpen(true)}>
        作废
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>
          确认作废卡密
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要作废此卡密吗？此操作不可撤销，作废后该卡密将无法使用。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            取消
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleVoid}
            disabled={loading}
          >
            {loading ? '处理中...' : '确认作废'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const CardKeyShowActions = () => (
  <TopToolbar>
    <VoidButton />
  </TopToolbar>
);

const CardKeyShow = () => (
  <Show actions={<CardKeyShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="code" label="卡密码" />
      <NumberField source="amount" label="面值" options={{ style: 'currency', currency: 'CNY' }} />
      <TextField source="batchNo" label="批次号" />
      <TextField source="remark" label="备注" emptyText="—" />
      <FunctionField
        source="status"
        label="状态"
        render={(record: { status?: number }) => {
          const s = STATUS_MAP[record?.status ?? 0] || STATUS_MAP[0];
          return <Chip label={s.label} color={s.color} size="small" />;
        }}
      />
      <ReferenceField source="usedById" reference="users" link="show" label="使用者" emptyText="—">
        <TextField source="nickname" />
      </ReferenceField>
      <DateField source="usedAt" label="使用时间" showTime emptyText="—" />
      <DateField source="expireAt" label="过期时间" showTime emptyText="永久有效" />
      <DateField source="createdAt" label="创建时间" showTime />
    </SimpleShowLayout>
  </Show>
);

export default CardKeyShow;
