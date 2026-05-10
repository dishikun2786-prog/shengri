import { Show, SimpleShowLayout, TextField, DateField, FunctionField } from 'react-admin';
import { Box, Typography, Chip, Divider } from '@mui/material';

const PALM_INFO: Record<number, { name: string; wuxing: string; liushen: string; luck: string; direction: string }> = {
  1: { name: '大安', wuxing: '木', liushen: '青龙', luck: '大吉', direction: '东方' },
  2: { name: '留连', wuxing: '水', liushen: '玄武', luck: '凶', direction: '北方' },
  3: { name: '速喜', wuxing: '火', liushen: '朱雀', luck: '中吉', direction: '南方' },
  4: { name: '赤口', wuxing: '金', liushen: '白虎', luck: '大凶', direction: '西方' },
  5: { name: '小吉', wuxing: '水', liushen: '六合', luck: '小吉', direction: '北方' },
  6: { name: '空亡', wuxing: '土', liushen: '勾陈', luck: '大凶', direction: '中央' },
};

export default function XiaoliurenShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2 }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>基本信息</Typography>
            <TextField source="id" label="ID" />
            <TextField source="uuid" label="UUID" />
            <TextField source="userId" label="用户ID" />
            <DateField source="createdAt" label="创建时间" showTime />
          </Box>

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>推算方式</Typography>
            <FunctionField label="方式" render={(r: any) => r.inputType === 'time' ? '时间推算' : '随机数推算'} />
            <FunctionField
              label="输入详情"
              render={(r: any) => {
                if (!r.inputDetail) return '-';
                if (r.inputType === 'time') {
                  const d = r.inputDetail;
                  return `农历${d.month}月${d.day}日 ${d.hourBranch}时`;
                }
                const d = r.inputDetail;
                return `上数${d.r1} 中数${d.r2} 下数${d.r3}`;
              }}
            />
            <TextField source="question" label="所问事项" emptyText="-" />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>掌诀结果</Typography>
        <FunctionField
          label="掌诀结果"
          render={(r: any) => {
            const info = PALM_INFO[r.resultPosition];
            if (!info) return <span>{r.resultName}</span>;
            return (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label={info.name} sx={{ fontWeight: 700, fontSize: 16, px: 2, py: 2.5, bgcolor: info.luck.includes('吉') ? '#dcfce7' : '#fee2e2', color: info.luck.includes('吉') ? '#166534' : '#991b1b' }} />
                <Chip label={`${info.liushen}`} variant="outlined" />
                <Chip label={`五行: ${info.wuxing}`} variant="outlined" />
                <Chip label={`方位: ${info.direction}`} variant="outlined" />
                <Chip label={info.luck} color={info.luck.includes('吉') ? 'success' : 'error'} size="small" />
              </Box>
            );
          }}
        />
      </SimpleShowLayout>
    </Show>
  );
}
