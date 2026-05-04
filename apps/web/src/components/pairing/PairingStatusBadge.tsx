'use client';

const STATUS_CONFIG: Record<number, { label: string; className: string }> = {
  0: { label: '等待同意', className: 'bg-yellow-100 text-yellow-700' },
  1: { label: '已同意', className: 'bg-green-100 text-green-700' },
  2: { label: '已拒绝', className: 'bg-red-100 text-red-600' },
  3: { label: '配置中', className: 'bg-blue-100 text-blue-700' },
  4: { label: '分析中', className: 'bg-purple-100 text-purple-700' },
  5: { label: '已完成', className: 'bg-emerald-100 text-emerald-700' },
  6: { label: '已取消', className: 'bg-gray-100 text-gray-500' },
};

export function PairingStatusBadge({ status }: { status: number }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[0];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export function getPairingStatusLabel(status: number): string {
  return STATUS_CONFIG[status]?.label || '未知';
}
