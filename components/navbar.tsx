'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  GraduationCap,
  Code2,
  FileQuestion,
  User,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // If in admin pages, show an educator-specific top header
  const isAdmin = pathname.startsWith('/admin');

  const navLinks = [
    { href: '/', label: 'Study Library', icon: BookOpen },
    { href: '/quizzes', label: 'Quizzes', icon: FileQuestion },
    { href: '/python-interpreter', label: 'Python Sandbox', icon: Code2 },
    { href: '/python-lessons', label: 'Lessons', icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="group flex items-center gap-3 transition-transform hover:scale-[1.01]"
          aria-label="Ez Education Home"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20 group-hover:shadow-blue-500/30">
            <GraduationCap className="h-6 w-6 transition-transform group-hover:rotate-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Ez <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Education</span>
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-slate-600 uppercase">
              Pharmacy & Code Hub
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === '/'
                ? pathname === '/' || pathname.startsWith('/study')
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Action Buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/account"
            className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
              pathname.startsWith('/account')
                ? 'border-blue-300 bg-blue-50/50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <User className="h-4 w-4 text-slate-500" />
            <span>My Account</span>
          </Link>

          <Link
            href="/admin"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide uppercase transition-all ${
              isAdmin
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
            <span>Educator Portal</span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 md:hidden"
          aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 pt-2 pb-6 shadow-xl md:hidden">
          <div className="flex flex-col gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === '/'
                  ? pathname === '/' || pathname.startsWith('/study')
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {link.label}
                </Link>
              );
            })}

            <div className="my-2 border-t border-slate-100 pt-2">
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                <User className="h-5 w-5 text-slate-400" />
                Student Login / My Purchases
              </Link>

              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-1 flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-base font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                Educator Admin Portal
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
