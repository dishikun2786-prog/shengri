import { SHARE_PAGE } from '@/lib/constants';
import SharedReportClient from './SharedReportClient';

interface SharePageProps {
  params: { token: string };
  searchParams: { ref?: string };
}

async function fetchSharedReport(token: string) {
  // Server-side: prefer internal API URL, fall back to public URL
  const apiBase = process.env.API_INTERNAL_URL
    || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')
    || 'http://localhost:3000';
  const apiUrl = `${apiBase}/api/v1/share/${token}`;
  try {
    const res = await fetch(apiUrl, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: SharePageProps) {
  const data = await fetchSharedReport(params.token);

  if (!data) {
    return {
      title: SHARE_PAGE.notFound,
      description: SHARE_PAGE.platformIntro,
    };
  }

  const sharerName = data.sharer?.nickname || '用户';
  const reportType = data.report?.reportType || '';
  const title = `${sharerName}${SHARE_PAGE.sharerSuffix} — ${SHARE_PAGE.title}`;
  const description = data.report?.aiSummary || SHARE_PAGE.description;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: '/og-share.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const data = await fetchSharedReport(params.token);
  const referrerId = searchParams.ref || '';

  return (
    <SharedReportClient
      token={params.token}
      initialData={data}
      referrerId={referrerId}
    />
  );
}
