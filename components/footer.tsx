import Link from 'next/link';
import { BookOpen, GraduationCap, ArrowUpRight, Heart, Sparkles } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/80 bg-slate-50/70 text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Ez <span className="text-blue-600">Education</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-slate-500">
              Easy notes, semester-wise curriculum, student quizzes, and interactive Python
              sandboxes designed specifically for B.Pharm and D.Pharm pharmacy students.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Made with</span>
              <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
              <span>for pharmacy & computing learners</span>
            </div>
          </div>

          {/* Column 1: Curriculum */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-slate-900 uppercase">Study Library</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/study/bpharm/1" className="hover:text-blue-600 transition-colors">
                  B.Pharm 1st Year (Sem 1 & 2)
                </Link>
              </li>
              <li>
                <Link href="/study/bpharm/3" className="hover:text-blue-600 transition-colors">
                  B.Pharm 2nd Year (Sem 3 & 4)
                </Link>
              </li>
              <li>
                <Link href="/study/bpharm/5" className="hover:text-blue-600 transition-colors">
                  B.Pharm 3rd Year (Sem 5 & 6)
                </Link>
              </li>
              <li>
                <Link href="/study/bpharm/7" className="hover:text-blue-600 transition-colors">
                  B.Pharm 4th Year (Sem 7 & 8)
                </Link>
              </li>
              <li>
                <Link href="/study/dpharm/1" className="hover:text-blue-600 transition-colors">
                  D.Pharm 1st & 2nd Year
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Interactive Tools */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-slate-900 uppercase">Learning Tools</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/quizzes" className="hover:text-blue-600 transition-colors">
                  Online Quizzes & Tests
                </Link>
              </li>
              <li>
                <Link href="/python-interpreter" className="hover:text-blue-600 transition-colors">
                  Python Playground
                </Link>
              </li>
              <li>
                <Link href="/python-lessons" className="hover:text-blue-600 transition-colors">
                  Pharmacy Python Lessons
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-blue-600 transition-colors">
                  My Student Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Admin */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-slate-900 uppercase">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-blue-600 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-blue-600 transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-blue-600 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-600 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="hover:text-blue-600 transition-colors">
                  Disclaimer
                </Link>
              </li>
              <li className="pt-2">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <span>Educator Access</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row text-xs text-slate-400">
          <p>© {currentYear} Ez Education. All rights reserved. Easy Notes for Everyone.</p>
          <p>Fictional learning datasets for pharmacy education. Not clinical prescribing advice.</p>
        </div>
      </div>
    </footer>
  );
}
