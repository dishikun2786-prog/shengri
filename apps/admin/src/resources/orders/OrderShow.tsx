import {
  Show,
  TextField,
  DateField,
  ReferenceField,
  useRecordContext,
} from 'react-admin';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import SectionCard from '../../components/SectionCard';
import StatusField from '../../components/StatusField';
import MoneyField from '../../components/MoneyField';
import InfoIcon from '@mui/icons-material/Info';
import PaymentIcon from '@mui/icons-material/Payment';
import PercentIcon from '@mui/icons-material/Percent';
import DevicesIcon from '@mui/icons-material/Devices';
import UndoIcon from '@mui/icons-material/Undo';

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Box>{children}</Box>
  </Box>
);

const OrderShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;

  const showRefund = [3, 4].includes(record.status);

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <SectionCard title="基础信息" icon={<InfoIcon fontSize="small" />}>
            <FieldRow label="订单号"><TextField source="orderNo" /></FieldRow>
            <FieldRow label="用户">
              <ReferenceField source="userId" reference="users" link="edit">
                <TextField source="nickname" />
              </ReferenceField>
            </FieldRow>
            <FieldRow label="产品">
              <ReferenceField source="productId" reference="products" link="edit">
                <TextField source="name" />
              </ReferenceField>
            </FieldRow>
            <FieldRow label="状态"><StatusField source="status" type="order" /></FieldRow>
            <FieldRow label="创建时间"><DateField source="createdAt" showTime /></FieldRow>
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard title="金额明细" icon={<PaymentIcon fontSize="small" />}>
            <FieldRow label="原价"><MoneyField source="originalAmount" /></FieldRow>
            <FieldRow label="折扣"><MoneyField source="discountAmount" /></FieldRow>
            <FieldRow label="优惠券抵扣"><MoneyField source="couponDiscount" /></FieldRow>
            <FieldRow label="实付金额"><MoneyField source="paidAmount" /></FieldRow>
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard title="佣金信息" icon={<PercentIcon fontSize="small" />}>
            <FieldRow label="一级佣金"><MoneyField source="commissionL1" /></FieldRow>
            <FieldRow label="二级佣金"><MoneyField source="commissionL2" /></FieldRow>
          </SectionCard>

          <SectionCard title="支付信息" icon={<PaymentIcon fontSize="small" />}>
            <FieldRow label="支付方式"><TextField source="paymentMethod" /></FieldRow>
            <FieldRow label="支付单号"><TextField source="paymentNo" /></FieldRow>
            <FieldRow label="支付时间"><DateField source="paidAt" showTime /></FieldRow>
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard title="来源信息" icon={<DevicesIcon fontSize="small" />}>
            <FieldRow label="来源渠道"><TextField source="sourceChannel" /></FieldRow>
            <FieldRow label="客户端"><TextField source="clientType" /></FieldRow>
            <FieldRow label="IP"><TextField source="ipAddress" /></FieldRow>
          </SectionCard>

          {showRefund && (
            <SectionCard title="退款信息" icon={<UndoIcon fontSize="small" />}>
              <FieldRow label="退款时间"><DateField source="refundAt" showTime /></FieldRow>
              <FieldRow label="退款原因"><TextField source="refundReason" /></FieldRow>
            </SectionCard>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

const OrderShow = () => (
  <Show title="订单详情">
    <OrderShowContent />
  </Show>
);

export default OrderShow;
