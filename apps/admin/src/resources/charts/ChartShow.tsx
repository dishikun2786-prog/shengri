import {
  Show,
  TextField,
  DateField,
  BooleanField,
  NumberField,
  FunctionField,
  ReferenceField,
  useRecordContext,
} from 'react-admin';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import SectionCard from '../../components/SectionCard';
import InfoIcon from '@mui/icons-material/Info';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BarChartIcon from '@mui/icons-material/BarChart';

const GENDER_MAP: Record<number, string> = { 0: '未知', 1: '男', 2: '女' };

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Box>{children}</Box>
  </Box>
);

const JsonValue = ({ data }: { data: any }) => {
  if (data === null || data === undefined) return <Typography variant="body2" color="text.secondary">-</Typography>;
  if (typeof data === 'string') return <Typography variant="body2">{data}</Typography>;
  if (typeof data === 'number') return <Typography variant="body2">{data}</Typography>;
  return (
    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', maxWidth: 320 }}>
      {JSON.stringify(data, null, 2)}
    </Typography>
  );
};

const JsonChipList = ({ data }: { data: any }) => {
  if (!data) return <Typography variant="body2" color="text.secondary">-</Typography>;
  if (Array.isArray(data)) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {data.map((item: any, i: number) => (
          <Chip key={i} label={typeof item === 'string' ? item : item.name || JSON.stringify(item)} size="small" variant="outlined" />
        ))}
      </Box>
    );
  }
  return <JsonValue data={data} />;
};

const WuxingSection = () => {
  const record = useRecordContext();
  if (!record) return null;
  const counts = record.wuxingCounts || {};
  const score = record.wuxingScore || {};

  return (
    <SectionCard title="五行分析" icon={<BarChartIcon fontSize="small" />}>
      <FieldRow label="五行计数"><JsonValue data={counts} /></FieldRow>
      <FieldRow label="五行评分"><JsonValue data={score} /></FieldRow>
    </SectionCard>
  );
};

const FourPillarsTable = () => {
  const record = useRecordContext();
  if (!record) return null;

  const pillars = [
    { label: '年柱', gan: record.yearGan, zhi: record.yearZhi, hidden: record.yearHidden, nayin: record.yearNayin },
    { label: '月柱', gan: record.monthGan, zhi: record.monthZhi, hidden: record.monthHidden, nayin: record.monthNayin },
    { label: '日柱', gan: record.dayGan, zhi: record.dayZhi, hidden: record.dayHidden, nayin: record.dayNayin },
    { label: '时柱', gan: record.hourGan, zhi: record.hourZhi, hidden: record.hourHidden, nayin: record.hourNayin },
  ];

  const tenGods = record.tenGodsMap || {};
  const changSheng = record.changSheng || {};

  return (
    <SectionCard title="四柱详情" icon={<AutoAwesomeIcon fontSize="small" />}>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#faf5f0' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>柱位</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>天干</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>地支</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>藏干</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>十神</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>纳音</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>十二长生</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pillars.map((p) => (
              <TableRow key={p.label}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.label}</TableCell>
                <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{p.gan || '-'}</TableCell>
                <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{p.zhi || '-'}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem' }}>
                  {p.hidden ? (
                    Array.isArray(p.hidden)
                      ? p.hidden.map((h: any, i: number) => (
                          <Chip key={i} label={typeof h === 'string' ? h : h.gan || h} size="small" sx={{ mr: 0.3, mb: 0.3, fontSize: '0.7rem' }} />
                        ))
                      : <JsonValue data={p.hidden} />
                  ) : '-'}
                </TableCell>
                <TableCell sx={{ fontSize: '0.85rem' }}>
                  {tenGods[p.label] ? tenGods[p.label] : '-'}
                </TableCell>
                <TableCell sx={{ fontSize: '0.85rem' }}>{p.nayin || '-'}</TableCell>
                <TableCell sx={{ fontSize: '0.85rem' }}>{changSheng[p.label] || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </SectionCard>
  );
};

const DayunSection = () => {
  const record = useRecordContext();
  if (!record) return null;

  const dayunList = record.dayunList;
  const hasDayun = Array.isArray(dayunList) && dayunList.length > 0;

  return (
    <SectionCard title="大运" icon={<AutoAwesomeIcon fontSize="small" />}>
      <FieldRow label="起运方向">
        <Typography variant="body2">
          {record.dayunDirection === 1 ? '顺行' : record.dayunDirection === -1 ? '逆行' : '-'}
        </Typography>
      </FieldRow>
      <FieldRow label="起运年龄">
        <Typography variant="body2">
          {record.dayunStartAge != null ? `${record.dayunStartAge} 岁` : '-'}
        </Typography>
      </FieldRow>
      {hasDayun ? (
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#faf5f0' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>年龄</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>天干</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>地支</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>纳音</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>十神</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dayunList.map((d: any, i: number) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{d.age ?? '-'}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{d.gan ?? '-'}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{d.zhi ?? '-'}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{d.nayin ?? '-'}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{d.tenGod ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>-</Typography>
      )}
    </SectionCard>
  );
};

const ReportsSection = () => {
  const record = useRecordContext();
  if (!record) return null;

  const reports = record.reports || [];
  const apiBase = (window as any).__API_BASE__ || '';

  return (
    <SectionCard title={`关联报告 (${reports.length})`} icon={<AssessmentIcon fontSize="small" />}>
      {reports.length === 0 ? (
        <Typography variant="body2" color="text.secondary">暂无报告</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#faf5f0' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>UUID</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>类型</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>付费</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>浏览</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>创建时间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((r: any) => (
                <TableRow
                  key={r.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    window.location.hash = `#/reports/${r.id}/show`;
                  }}
                >
                  <TableCell sx={{ fontSize: '0.85rem' }}>{r.id}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.uuid}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{r.reportType}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.isPaid ? '付费' : '免费'}
                      size="small"
                      color={r.isPaid ? 'primary' : 'default'}
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{r.viewCount ?? 0}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN') : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </SectionCard>
  );
};

const ChartShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;

  const genderLabel = GENDER_MAP[record.gender] || '未知';
  const jiShen = record.jiShen || [];
  const shenshaList = record.shenshaList || [];

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Grid container spacing={2}>
        {/* Basic Info */}
        <Grid item xs={12} md={6}>
          <SectionCard title="基础信息" icon={<InfoIcon fontSize="small" />}>
            <FieldRow label="ID"><TextField source="id" /></FieldRow>
            <FieldRow label="UUID"><TextField source="uuid" /></FieldRow>
            <FieldRow label="名称"><TextField source="name" /></FieldRow>
            <FieldRow label="关系"><TextField source="relation" /></FieldRow>
            <FieldRow label="性别">
              <Typography variant="body2">{genderLabel}</Typography>
            </FieldRow>
            <FieldRow label="阳历日期"><DateField source="solarDate" /></FieldRow>
            <FieldRow label="时辰"><TextField source="solarTime" /></FieldRow>
            <FieldRow label="农历日期"><TextField source="lunarDate" /></FieldRow>
            <FieldRow label="出生城市"><TextField source="birthCity" /></FieldRow>
            <FieldRow label="所属国家"><TextField source="birthCountry" /></FieldRow>
            <FieldRow label="经度"><NumberField source="longitude" /></FieldRow>
            <FieldRow label="纬度"><NumberField source="latitude" /></FieldRow>
            <FieldRow label="真太阳时">
              <DateField source="trueSolarTime" showTime />
            </FieldRow>
            <FieldRow label="时差修正(分)"><NumberField source="timeCorrectionMin" /></FieldRow>
            <FieldRow label="节气"><TextField source="jieqiInfo" /></FieldRow>
            <FieldRow label="主命盘"><BooleanField source="isPrimary" /></FieldRow>
          </SectionCard>
        </Grid>

        {/* Pattern & Strength */}
        <Grid item xs={12} md={6}>
          <SectionCard title="格局与用神" icon={<AutoAwesomeIcon fontSize="small" />}>
            <FieldRow label="格局类型"><TextField source="patternType" /></FieldRow>
            <FieldRow label="格局名称"><TextField source="patternName" /></FieldRow>
            <FieldRow label="格局评分"><NumberField source="patternScore" /></FieldRow>
            <FieldRow label="强弱等级"><TextField source="strengthLevel" /></FieldRow>
            <FieldRow label="日主强度"><NumberField source="dayMasterStrength" /></FieldRow>
            <FieldRow label="用神"><TextField source="yongShen" /></FieldRow>
            <FieldRow label="喜神"><TextField source="xiShen" /></FieldRow>
            <FieldRow label="忌神"><JsonChipList data={jiShen} /></FieldRow>
            <FieldRow label="调候"><JsonValue data={record.tiaohuoNeed} /></FieldRow>
          </SectionCard>

          <WuxingSection />

          <SectionCard title="神煞" icon={<AutoAwesomeIcon fontSize="small" />}>
            {Array.isArray(shenshaList) && shenshaList.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {shenshaList.map((s: any, i: number) => (
                  <Chip
                    key={i}
                    label={typeof s === 'string' ? s : `${s.name ?? s}${s.pillar ? ` · ${s.pillar}` : ''}`}
                    size="small"
                    variant="outlined"
                    color="secondary"
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">-</Typography>
            )}
          </SectionCard>
        </Grid>

        {/* Four Pillars */}
        <Grid item xs={12}>
          <FourPillarsTable />
        </Grid>

        {/* Dayun */}
        <Grid item xs={12}>
          <DayunSection />
        </Grid>

        {/* Associated Reports */}
        <Grid item xs={12}>
          <ReportsSection />
        </Grid>
      </Grid>
    </Box>
  );
};

const ChartShow = () => (
  <Show title="命盘详情">
    <ChartShowContent />
  </Show>
);

export default ChartShow;
