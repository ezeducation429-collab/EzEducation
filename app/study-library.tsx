'use client';

import { useEffect, useState, useMemo } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import {
  BookOpen,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  Layers,
  FolderOpen,
  RefreshCw,
  Sparkles,
  Award,
  ChevronRight,
  FileCheck,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import NotesCatalogue from './notes-catalogue';

export type Note = {
  id: string;
  course: 'bpharm' | 'dpharm';
  semester: number;
  subject: string;
  title: string;
  unit: string;
  kind: string;
  url: string;
  file_key: string | null;
  price_paise: number;
  created_at: string;
};

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Ez Education home">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm">
        <GraduationCap className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
          Ez <span className="text-blue-600">Education</span>
        </span>
        <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">
          Easy Notes for Everyone
        </span>
      </div>
    </Link>
  );
}

interface StudyLibraryProps {
  initialCourse?: string;
  initialSemester?: string;
  detailOnly?: boolean;
  initialNotes?: Note[];
}

export default function StudyLibrary({
  initialCourse = 'bpharm',
  initialSemester = '1',
  detailOnly = false,
  initialNotes,
}: StudyLibraryProps) {
  const [course, setCourse] = useState<'bpharm' | 'dpharm'>(
    initialCourse === 'dpharm' ? 'dpharm' : 'bpharm'
  );
  const [semester, setSemester] = useState(initialSemester);
  const [notes, setNotes] = useState<Note[]>(initialNotes ?? []);
  const [loading, setLoading] = useState(initialNotes === undefined);
  const [error, setError] = useState(false);

  const isDiploma = course === 'dpharm';
  const periodLabel = isDiploma ? 'Year' : 'Semester';
  const totalPeriods = isDiploma ? 2 : 8;
  const periods = Array.from({ length: totalPeriods }, (_, i) => i + 1);
  const courseDisplayName = isDiploma ? 'D.Pharm' : 'B.Pharm';

  function changeCourse(newCourse: 'bpharm' | 'dpharm') {
    setCourse(newCourse);
    setSemester('1');
  }

  async function loadNotes() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/notes');
      if (!res.ok) throw new Error('Could not fetch notes');
      setNotes(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialNotes === undefined) {
      void loadNotes();
    }
  }, [initialNotes]);

  // AI agent tool registration for web model context
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: { signal: AbortSignal }) => void | Promise<void>;
        };
      }
    ).modelContext;

    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'browse_semester_notes',
            description: 'Select a B.Pharm semester or D.Pharm year and return the available notes.',
            inputSchema: {
              type: 'object',
              properties: {
                course: { type: 'string', enum: ['bpharm', 'dpharm'] },
                semester: { type: 'integer', minimum: 1, maximum: 8 },
              },
              required: ['semester'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute: async (input: unknown) => {
              const value = (input as { semester?: unknown })?.semester;
              const selectedCourse = (input as { course?: unknown })?.course ?? 'bpharm';
              if (!['bpharm', 'dpharm'].includes(String(selectedCourse))) {
                throw new Error('Invalid course.');
              }
              if (
                typeof value !== 'number' ||
                !Number.isInteger(value) ||
                value < 1 ||
                value > (selectedCourse === 'dpharm' ? 2 : 8)
              ) {
                throw new Error('Use B.Pharm semesters 1–8 or D.Pharm years 1–2.');
              }
              const r = await fetch('/api/notes');
              if (!r.ok) throw new Error('Study material is temporarily unavailable.');
              const data: Note[] = await r.json();
              flushSync(() => {
                setNotes(data);
                setCourse(selectedCourse as 'bpharm' | 'dpharm');
                setSemester(String(value));
                setLoading(false);
                setError(false);
              });
              return {
                course: selectedCourse,
                semester: value,
                notes: data
                  .filter((n) => (n.course || 'bpharm') === selectedCourse && n.semester === value)
                  .map((n) => ({
                    title: n.title,
                    subject: n.subject,
                    unit: n.unit,
                    price: n.price_paise / 100,
                    url:
                      n.price_paise > 0
                        ? `/study/${n.course}/${n.semester}`
                        : n.file_key
                        ? `/api/notes/${n.id}/file`
                        : n.url,
                  })),
              };
            },
          },
          { signal: lifecycle.signal }
        )
      ).catch(console.error);
    } catch (e) {
      console.error(e);
    }

    return () => lifecycle.abort();
  }, []);

  const courseNotes = useMemo(
    () => notes.filter((n) => (n.course || 'bpharm') === course),
    [notes, course]
  );

  const selectedSemesterNotes = useMemo(
    () => courseNotes.filter((n) => n.semester === Number(semester)),
    [courseNotes, semester]
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Detail Page Breadcrumbs */}
      {detailOnly ? (
        <div className="space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All Semesters
          </Link>

          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-8 text-white shadow-xl sm:p-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold tracking-wider text-blue-200 uppercase">
              <GraduationCap className="h-3.5 w-3.5" />
              {courseDisplayName} Curriculum
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
              {periodLabel} {String(semester).padStart(2, '0')} Study Material
            </h1>
            <p className="mt-3 max-w-2xl text-base text-blue-100 sm:text-lg">
              Subject-wise lecture notes, unit summaries, and previous question papers for{' '}
              {courseDisplayName} {periodLabel.toLowerCase()} {semester}.
            </p>
          </div>
        </div>
      ) : (
        /* Home Page Hero Section */
        <div className="space-y-12">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xs sm:p-12 lg:p-16">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/70 px-3.5 py-1.5 text-xs font-bold text-blue-700">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span>PHARMACY STUDY MATERIAL & LABS</span>
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.1]">
                  Less searching. <br />
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    More learning.
                  </span>
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  Curated semester-wise notes, question papers, student quizzes, and practical Python
                  programming playgrounds—built to help you excel in B.Pharm & D.Pharm.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href="#browse-semesters"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-lg"
                  >
                    <span>Browse Study Notes</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <Link
                    href="/quizzes"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <span>Take Practice Quiz</span>
                  </Link>
                </div>
              </div>

              {/* Visual Card / Highlights */}
              <div className="lg:col-span-5">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 p-8 text-white shadow-xl">
                  <div className="absolute top-0 right-0 -mt-6 -mr-6 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                  <span className="text-xs font-bold tracking-widest text-blue-200 uppercase">
                    The Pharmacy Collection
                  </span>
                  <p className="mt-4 text-3xl font-extrabold leading-tight tracking-tight">
                    B.Pharm. <br />
                    D.Pharm. <br />
                    <span className="text-blue-200">All in one place.</span>
                  </p>
                  <div className="mt-8 flex items-center justify-between border-t border-white/20 pt-6 text-xs text-blue-100">
                    <span className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-300" />
                      PCI Syllabus Aligned
                    </span>
                    <span className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-emerald-300" />
                      Free & Verified Notes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Course Selector Tabs */}
          <section id="browse-semesters" className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
                  Select Your Stream
                </span>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Choose your {periodLabel.toLowerCase()}
                </h2>
              </div>

              {/* Course Toggle */}
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => changeCourse('bpharm')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    course === 'bpharm'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>B.Pharm (8 Semesters)</span>
                </button>
                <button
                  type="button"
                  onClick={() => changeCourse('dpharm')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    course === 'dpharm'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>D.Pharm (2 Years)</span>
                </button>
              </div>
            </div>

            {/* Semester Cards Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
              {periods.map((s) => {
                const count = courseNotes.filter((n) => n.semester === s).length;
                const isSelected = semester === String(s);

                return (
                  <Link
                    key={s}
                    href={`/study/${course}/${s}`}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                        : 'border-slate-200/90 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span>{isDiploma ? 'D.PHARM' : `YEAR ${Math.ceil(s / 2)}`}</span>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
                      </div>
                      <div className="mt-3 text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {periodLabel} <span className="font-extrabold">{String(s).padStart(2, '0')}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-slate-600">
                      {loading ? (
                        <span className="text-slate-400">Loading notes...</span>
                      ) : count > 0 ? (
                        <span className="text-blue-600 font-semibold">{count} Resources</span>
                      ) : (
                        <span className="text-slate-400">Resources coming soon</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Detail or Active Semester Resources */}
      {detailOnly && (
        <section className="mt-10 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {courseDisplayName} · {periodLabel} {semester} Materials
                </h2>
                <p className="text-xs text-slate-500">Subject-wise lecture notes & question papers</p>
              </div>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {selectedSemesterNotes.length}{' '}
              {selectedSemesterNotes.length === 1 ? 'Resource' : 'Resources'}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-300 bg-rose-50/50 p-12 text-center">
              <h3 className="text-base font-bold text-rose-900">Unable to load study materials</h3>
              <p className="mt-1 text-sm text-rose-600">We encountered an issue fetching the notes.</p>
              <button
                type="button"
                onClick={loadNotes}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Loading
              </button>
            </div>
          ) : selectedSemesterNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <BookOpen className="h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-lg font-bold text-slate-900">Notes are being prepared</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Study materials for {courseDisplayName} {periodLabel.toLowerCase()} {semester} haven’t
                been added yet. Check back soon!
              </p>
            </div>
          ) : (
            <NotesCatalogue notes={selectedSemesterNotes} />
          )}
        </section>
      )}

      {/* Quizzes CTA Strip */}
      {!detailOnly && (
        <section className="mt-16 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 p-8 shadow-xs sm:p-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase">
                <Sparkles className="h-4 w-4" /> Exam Readiness & Assessment
              </span>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                Test your concepts with timed quizzes
              </h3>
              <p className="max-w-xl text-sm text-slate-600">
                Instant grading, review explanations, and student scorecards created by pharmacy
                educators.
              </p>
            </div>

            <Link
              href="/quizzes"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-lg"
            >
              <span>Explore Quizzes</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
