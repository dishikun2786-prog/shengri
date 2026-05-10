import type { Metadata } from 'next';
import './globals.css';
import AuthNav from '@/components/AuthNav';
import MobileBottomNav from '@/components/MobileBottomNav';
import AddToHomeScreen from '@/components/AddToHomeScreen';
const API_INTERNAL = process.env.API_INTERNAL_URL || 'http://localhost:3000';

interface SiteConfig {
  title: string;
  subtitle: string;
  description: string;
  keywords: string;
  favicon: string;
  logo: string;
  brandName: string;
  brandNameEn: string;
  footer: string;
  icp: string;
  contactEmail: string;
  contactPhone: string;
}

interface UrlConfig {
  apiUrl: string;
  webUrl: string;
  adminUrl: string;
}

const DEFAULT_SITE: SiteConfig = {
  title: 'ShengRi 生日命理',
  subtitle: '专业八字排盘 · AI智能批命',
  description: '专业级八字排盘平台，真太阳时精准排盘，AI智能命理分析，财运/婚姻/事业/流年深度解读',
  keywords: '八字排盘,命理分析,八字算命,AI算命,财运分析,婚姻分析,合婚,流年运势',
  favicon: '/favicon.ico',
  logo: '',
  brandName: '生日命理',
  brandNameEn: 'ShengRi',
  footer: '命理分析仅供参考，人生选择由您做主',
  icp: '',
  contactEmail: '',
  contactPhone: '',
};

async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const res = await fetch(`${API_INTERNAL}/api/v1/config/site`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return DEFAULT_SITE;
    const data = await res.json();
    return { ...DEFAULT_SITE, ...data };
  } catch {
    return DEFAULT_SITE;
  }
}

async function getUrlConfig(): Promise<UrlConfig> {
  try {
    const res = await fetch(`${API_INTERNAL}/api/v1/admin/config/url`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { apiUrl: '', webUrl: '', adminUrl: '' };
    return await res.json();
  } catch {
    return { apiUrl: '', webUrl: '', adminUrl: '' };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();
  return {
    title: `${site.title} - ${site.subtitle}`,
    description: site.description,
    keywords: site.keywords,
    icons: { icon: site.favicon },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, urlConfig] = await Promise.all([getSiteConfig(), getUrlConfig()]);

  // 客户端请求统一走 Next.js 代理 (/api/v1 → backend)，避免跨域 CORS 问题
  // Cloudflare Tunnel 场景下，跨域直连 api.openedskill.com 会被 SW 拦截且 CORS 头易丢失

  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#dc5a2e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="生日命理" />
        <meta name="application-name" content="生日命理" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#dc5a2e" />
        <meta name="msapplication-starturl" content="/?utm_source=pwa" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="canonical" href="https://sr.openedskill.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Service Worker — register early for PWA install */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(){});
              }
            `,
          }}
        />
        <link href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        <nav className="bg-white/80 backdrop-blur-md border-b border-ink-100 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-2xl">☯</span>
              <span className="text-xl font-bold text-primary-700 font-kai">{site.brandName}</span>
            </a>
            <div className="hidden md:flex items-center gap-5 text-sm text-ink-600">
              <a href="/" className="hover:text-primary-600 transition-colors">首页</a>
              <a href="/xiaoliuren" className="hover:text-amber-600 transition-colors">小六壬</a>
              <a href="/digital-energy" className="hover:text-blue-600 transition-colors">数字能量</a>
              <a href="/bazhai" className="hover:text-emerald-600 transition-colors">八宅风水</a>
              <a href="/health" className="hover:text-green-600 transition-colors">健康养生</a>
              <a href="/products" className="hover:text-primary-600 transition-colors">产品</a>
              <a href="/moments" className="hover:text-primary-600 transition-colors">朋友圈</a>
              <a href="/about" className="hover:text-primary-600 transition-colors">关于</a>
              <AuthNav />
            </div>
            <div className="md:hidden">
              <AuthNav compact />
            </div>
          </div>
        </nav>
        <main className="pb-14 md:pb-0">{children}</main>
        <MobileBottomNav />
        <footer className="bg-ink-900 text-ink-300 py-12 mt-20 pb-14 md:pb-12">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm">
            <p className="font-kai text-lg text-gold-400 mb-2">
              {site.brandName} {site.brandNameEn}
            </p>
            <p>{site.subtitle}</p>
            <p className="mt-4 text-ink-500">{site.footer}</p>
            {site.icp && (
              <p className="mt-2 text-ink-600 text-xs">{site.icp}</p>
            )}
          </div>
        </footer>
        <AddToHomeScreen />
      </body>
    </html>
  );
}
