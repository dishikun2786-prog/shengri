'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { reportApi, userApi } from '@/lib/api';
import ReportGenerating from '@/components/ReportGenerating';

const STAGES = [
  { threshold: 0, text: '正在排列四柱八字...' },
  { threshold: 15, text: '分析日主强弱...' },
  { threshold: 28, text: '推演十神格局...' },
  { threshold: 40, text: '计算五行生克...' },
  { threshold: 52, text: '盲派做功分析...' },
  { threshold: 65, text: 'AI 深度解读命盘...' },
  { threshold: 85, text: '生成专业报告...' },
];

export default function GeneratingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const chartId = Number(params?.chartId);
  const reportType = searchParams?.get('type') || 'free';
  const isPaid = searchParams?.get('paid') === '1';

  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(STAGES[0].text);
  const [error, setError] = useState('');
  const apiCalled = useRef(false);
  const reportUuid = useRef<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(chartId) || chartId <= 0) {
      setError('无效的命盘参数，请返回重新选择');
      return;
    }

    if (apiCalled.current) return;
    apiCalled.current = true;

    reportApi.generate({ chartId, reportType, isPaid })
      .then((res) => {
        if (!res.data?.uuid) {
          console.error('REPORT_GENERATE_MISSING_UUID', { chartId, reportType, isPaid });
          setError('报告生成成功但缺少报告标识，请稍后在个人中心查看');
          return;
        }
        reportUuid.current = res.data.uuid;
      })
      .catch(async (err) => {
        const status = err?.response?.status || (err?.code === 'ECONNABORTED' ? 'TIMEOUT' : 'UNKNOWN');
        console.error('REPORT_GENERATE_FAILED', {
          chartId,
          reportType,
          isPaid,
          status,
          message: err?.response?.data?.message || err?.message,
        });

        // 500 或 timeout 时，检查报告是否已在后端生成成功
        if (status === 500 || status === 'TIMEOUT') {
          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const reportsRes = await userApi.getReports();
            const reports = reportsRes?.data || [];

            const matchedReport = reports.find((r: any) =>
              r.chartId === chartId && r.reportType === reportType
            );

            if (matchedReport?.uuid) {
              console.log('发现已生成的报告，自动跳转:', matchedReport.uuid);
              router.replace(`/report/${matchedReport.uuid}`);
              return;
            }
          } catch (queryErr) {
            console.error('查询报告失败:', queryErr);
          }
        }

        // 超时时给出更友好的提示
        if (status === 'TIMEOUT') {
          setError('报告生成时间较长（约需5-8分钟），请稍后在个人中心查看报告列表');
        } else {
          setError(err.response?.data?.message || 'AI分析失败，请稍后重试');
        }
      });
  }, [chartId, reportType, isPaid]);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (error) return prev;

        if (reportUuid.current) {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => {
              router.replace(`/report/${reportUuid.current}`);
            }, 600);
            return 100;
          }
          return Math.min(100, prev + 3);
        }

        return Math.min(88, prev + (prev < 60 ? 0.8 : 0.3));
      });
    }, 200);

    return () => clearInterval(timer);
  }, [router, error]);

  useEffect(() => {
    const current = [...STAGES].reverse().find((s) => progress >= s.threshold);
    if (current) setStage(current.text);
  }, [progress]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: 'radial-gradient(ellipse at center, #fdf8f4 0%, #f5ebe0 50%, #ede0d0 100%)' }}>
        <div className="card max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-ink-700 mb-2">分析遇到问题</h2>
          <p className="text-ink-500 mb-6">{error}</p>
          <button className="btn-primary" onClick={() => router.back()}>
            返回重试
          </button>
        </div>
      </div>
    );
  }

  return <ReportGenerating progress={progress} stage={stage} />;
}
