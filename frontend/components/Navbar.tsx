'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const links = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Models', href: '/models' },
  { label: 'Watchlist', href: '/watchlist' },
];

const isActiveRoute = (pathname: string, href: string) => (href === '/' ? pathname === href : pathname.startsWith(href));

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#050816]/78 shadow-[0_18px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="text-sm font-semibold uppercase tracking-[0.24em] text-white/90 transition group-hover:text-white">QuantEdge</span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.035] p-1 md:flex">
          {links.map((link) => {
            const active = isActiveRoute(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative rounded-full px-4 py-2 text-sm font-medium transition duration-300 ease-out hover:-translate-y-0.5',
                  active ? 'text-white' : 'text-[#A1AAB8] hover:text-white',
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-full border border-[#4F8CFF]/25 bg-[#4F8CFF]/12 shadow-[0_0_34px_rgba(79,140,255,0.2)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[#A1AAB8] transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:text-white"
            aria-label="Search"
          >
            <Search size={17} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white transition duration-300 hover:bg-white/[0.08] md:hidden"
          aria-label="Toggle navigation"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="border-t border-white/[0.08] bg-[#050816]/96 px-4 py-4 backdrop-blur-2xl md:hidden"
          >
            <div className="grid gap-2">
              {links.map((link) => {
                const active = isActiveRoute(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'rounded-lg px-4 py-3 text-sm font-medium transition duration-300',
                      active ? 'border border-[#4F8CFF]/25 bg-[#4F8CFF]/12 text-white' : 'text-[#A1AAB8] hover:bg-white/[0.05] hover:text-white',
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
