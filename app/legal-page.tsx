import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, ShieldCheck, Mail, Calendar, HelpCircle } from 'lucide-react';

type Section = {
  title: string;
  content: ReactNode;
};

export default function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Section[];
}) {
  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Page Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Study Library
          </Link>

          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              <ShieldCheck className="h-3 w-3" />
              {eyebrow}
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
              {intro}
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>Last updated: September 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Articles */}
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {sections.map((section, index) => (
            <section key={section.title} className="p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                    {section.title}
                  </h2>
                  <div className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm [&>p]:mb-3 last:[&>p]:mb-0 [&>p>a]:text-blue-600 [&>p>a]:underline hover:[&>p>a]:text-blue-700">
                    {section.content}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Support & Contact Callout */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Have questions or legal inquiries?</h3>
                <p className="text-xs text-slate-600">
                  Reach out directly to our academic team at{' '}
                  <a href="mailto:ezeducation429@gmail.com" className="font-semibold text-blue-700 hover:underline">
                    ezeducation429@gmail.com
                  </a>
                  .
                </p>
              </div>
            </div>

            <a
              href="mailto:ezeducation429@gmail.com"
              className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs border border-slate-200 transition hover:bg-slate-50"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
