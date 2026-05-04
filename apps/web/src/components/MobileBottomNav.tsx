'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, ShoppingBag, User, Camera } from 'lucide-react';

const tabs = [
  { path: '/', label: '首页', icon: Home, exact: true },
  { path: '/products', label: '产品', icon: ShoppingBag },
  { path: '/moments', label: '朋友圈', icon: Camera },
  { path: '/profile', label: '我的', icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname() || '/';

  const isActive = (tab: (typeof tabs)[number]) =>
    tab.exact ? pathname === tab.path : pathname.startsWith(tab.path);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-ink-100 h-14 z-50 flex items-stretch">
      {tabs.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors relative ${
              active ? 'text-primary-600' : 'text-ink-400'
            }`}
          >
            <div
              className={`absolute top-0 left-1/4 right-1/4 h-0.5 rounded-b transition-colors ${
                active ? 'bg-primary-500' : 'bg-transparent'
              }`}
            />
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
