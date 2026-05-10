'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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

const POLL_INTERVAL = 3000; // 每 3 秒轮询一次报告是否已生成

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
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 轮询检查报告是否已在后端生成（Cloudflare Tunnel 场景下 API 调用会超时，但后端继续处理）
  const checkForReport = useCallback(async () => {
    try {
      const reportsRes = await userApi.getReports();
      const reports = reportsRes?.data || [];
      const matched = reports.find((r: any) =>
        r.chartId === chartId && r.reportType === reportType
      );
      if (matched?.uuid) {
        console.log('轮询发现已生成报告，自动跳转:', matched.uuid);
        reportUuid.current = matched.uuid;
        return matched.uuid;
      }
    } catch {
      // 轮询失败静默处理，下次继续尝试
    }
    return null;
  }, [chartId, reportType]);

  useEffect(() => {
    if (!Number.isFinite(chartId) || chartId <= 0) {
      setError('无效的命盘参数，请返回重新选择');
      return;
    }

    if (apiCalled.current) return;
    apiCalled.current = true;

    // 发起报告生成请求（Cloudflare Tunnel 可能在 100s 超时，但后端继续处理）
    reportApi.generate({ chartId, reportType, isPaid })
      .then((res) => {
        if (res.data?.uuid) {
          reportUuid.current = res.data.uuid;
        }
      })
      .catch(async (err) => {
        const status = err?.response?.status || (err?.code === 'ECONNABORTED' ? 'TIMEOUT' : 'UNKNOWN');
        console.warn('REPORT_GENERATE_INTERRUPTED', {
          chartId, reportType, isPaid, status,
          message: err?.response?.data?.message || err?.message,
        });
        // 不设置 error —— 启动轮询在后台查找已生成的报告
      });

    // 启动轮询：无论 API 调用成功/失败/超时，都定期检查报告是否已生成
    // Cloudflare Tunnel 100s 超时会中断连接，但报告在后端正常生成
    let pollCount = 0;
    const maxPolls = 200; // 最多轮询 10 分钟 (200 * 3s)
    pollTimer.current = setInterval(async () => {
      pollCount++;
      const uuid = await checkForReport();
      if (uuid) {
        if (pollTimer.current) clearInterval(pollTimer.current);
        setProgress(100);
        setTimeout(() => router.replace(`/report/${uuid}`), 600);
      } else if (pollCount >= maxPolls) {
        if (pollTimer.current) clearInterval(pollTimer.current);
        setError('报告生成时间较长（约需5-8分钟），请稍后在个人中心查看报告列表');
      }
    }, POLL_INTERVAL);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [chartId, reportType, isPaid, checkForReport]);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (error) return prev;

        if (reportUuid.current) {
          return Math.min(100, prev + 3);
        }

        return Math.min(88, prev + (prev < 60 ? 0.8 : 0.3));
      });
    }, 200);

    return () => clearInterval(timer);
  }, [error]);

  useEffect(() => {
    const current = [...STAGES].reverse().find((s) => progress >= s.threshold);
    if (current) setStage(current.text);
  }, [progress]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: 'radial-gradient(ellipse at center, #fdf8f4 0%, #f5ebe0 50%, #ede0d0 100%)' }}>
        <div className="card max-w-md w-full text-center">
          <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
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
