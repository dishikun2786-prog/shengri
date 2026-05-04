import { useState } from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  ReferenceField,
  SearchInput,
  SelectInput,
  NumberInput,
  TextInput,
  TopToolbar,
  FilterButton,
  ExportButton,
  ShowButton,
  FunctionField,
  SimpleList,
  useRefresh,
  useNotify,
} from 'react-admin';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MuiTextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

const STATUS_MAP: Record<number, { label: string; color: 'default' | 'success' | 'error' }> = {
  0: { label: '未使用', color: 'default' },
  1: { label: '已使用', color: 'success' },
  2: { label: '已作废', color: 'error' },
};

const filters = [
  <SearchInput source="q" alwaysOn placeholder="搜索卡密 / 批次号" />,
  <SelectInput
    source="status"
    label="状态"
    choices={[
      { id: 0, name: '未使用' },
      { id: 1, name: '已使用' },
      { id: 2, name: '已作废' },
    ]}
  />,
  <NumberInput source="amount" label="面值" />,
  <TextInput source="batchNo" label="批次号" />,
];

const BatchGenerateButton = () => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [count, setCount] = useState('');
  const [remark, setRemark] = useState('');
  const [expireAt, setExpireAt] = useState('');
  const [loading, setLoading] = useState(false);
  const refresh = useRefresh();
  const notify = useNotify();

  const handleGenerate = async () => {
    if (!amount || !count) {
      notify('请填写面值和数量', { type: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/admin/actions/card-key/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(amount),
          count: Number(count),
          remark: remark || undefined,
          expireAt: expireAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '生成失败');
      notify(`成功生成 ${data.count} 张卡密，批次号: ${data.batchNo}`, { type: 'success' });
      setOpen(false);
      setAmount('');
      setCount('');
      setRemark('');
      setExpireAt('');
      refresh();
    } catch (err: any) {
      notify(err.message || '生成失败', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button startIcon={<AddIcon />} size="small" onClick={() => setOpen(true)}>
        批量生成
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>
          批量生成卡密
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <MuiTextField
              label="面值 (元)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              inputProps={{ min: 0.01, step: 0.01 }}
            />
            <MuiTextField
              label="数量"
              type="number"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              required
              inputProps={{ min: 1, max: 1000 }}
              helperText="最多 1000 张"
            />
            <MuiTextField
              label="备注"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
            <MuiTextField
              label="过期时间"
              type="datetime-local"
              value={expireAt}
              onChange={(e) => setExpireAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="留空则永不过期"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleGenerate} disabled={loading}>
            {loading ? '生成中...' : '确认生成'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <BatchGenerateButton />
    <ExportButton />
  </TopToolbar>
);

const EmptyCardKeys = () => (
  <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
    <VpnKeyIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
    <Typography variant="h6" color="text.secondary" gutterBottom>
      暂无卡密
    </Typography>
    <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
      点击下方按钮批量生成卡密，用于用户充值和营销推广
    </Typography>
    <BatchGenerateButton />
  </Box>
);


const CardKeyList = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <List
      actions={<ListActions />}
      filters={filters}
      sort={{ field: 'createdAt', order: 'DESC' }}
      empty={<EmptyCardKeys />}
    >
      {isSmall ? (
        <SimpleList
          primaryText={(r) => {
            const c = r?.code || '';
            const masked = c.length > 4 ? `****${c.slice(-4)}` : c;
            return `${masked} · ¥${Number(r?.amount || 0).toFixed(2)}`;
          }}
          secondaryText={(r) => {
            const status = STATUS_MAP[r?.status ?? 0] || STATUS_MAP[0];
            return `${r?.batchNo || '—'} · ${status.label}`;
          }}
          tertiaryText={(r) => {
            const d = r?.createdAt ? new Date(r.createdAt).toLocaleDateString('zh-CN') : '';
            return d ? `创建于 ${d}` : '';
          }}
          linkType="show"
          rowSx={() => ({ borderBottom: '1px solid rgba(0,0,0,0.06)' })}
        />
      ) : (
        <Datagrid rowClick="show" bulkActionButtons={false}>
          <TextField source="id" />
          <FunctionField
            source="code"
            label="卡密"
            render={(record: { code?: string }) => {
              const c = record?.code || '';
              return c.length > 4 ? `****${c.slice(-4)}` : c;
            }}
          />
          <NumberField source="amount" label="面值" options={{ style: 'currency', currency: 'CNY' }} />
          <TextField source="batchNo" label="批次号" />
          <FunctionField
            source="status"
            label="状态"
            render={(record: { status?: number }) => {
              const s = STATUS_MAP[record?.status ?? 0] || STATUS_MAP[0];
              return <Chip label={s.label} color={s.color} size="small" />;
            }}
          />
          <ReferenceField source="creatorId" reference="users" label="生成者" emptyText="管理员">
            <TextField source="nickname" />
          </ReferenceField>
          <ReferenceField source="usedById" reference="users" link="show" label="使用者" emptyText="—">
            <TextField source="nickname" />
          </ReferenceField>
          <DateField source="usedAt" label="使用时间" showTime emptyText="—" />
          <DateField source="expireAt" label="过期时间" showTime emptyText="永久" />
          <DateField source="createdAt" label="创建时间" showTime />
          <ShowButton />
        </Datagrid>
      )}
    </List>
  );
};

export default CardKeyList;
