'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Code2,
  ClipboardList,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Play,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  ExternalLink,
  RotateCcw,
  BookMarked,
  Check,
} from 'lucide-react';
import { lessons, units } from './lesson-data';
import { mcqs, shortQuestions, longQuestions } from './exam-data';

export default function PythonLessons() {
  const [unit, setUnit] = useState(1);
  const [selected, setSelected] = useState(lessons[0].id);
  const [tab, setTab] = useState<'lessons' | 'exam'>('lessons');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const lesson = lessons.find((l) => l.id === selected) ?? lessons[0];
  const activeUnit = units.find((u) => u.number === unit) ?? units[0];
  const score = mcqs.reduce((sum, q, i) => sum + (answers[i] === q.answer ? 1 : 0), 0);
  const currentIndex = lessons.findIndex((l) => l.id === selected);

  function selectUnit(number: number) {
    setUnit(number);
    const firstInUnit = lessons.find((l) => l.unit === number);
    if (firstInUnit) setSelected(firstInUnit.id);
  }

  function navigateLesson(index: number) {
    const next = lessons[index];
    if (next) {
      setUnit(next.unit);
      setSelected(next.id);
      document.getElementById('lesson-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  const answeredMcqCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Hero Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  <GraduationCap className="h-3.5 w-3.5" />
                  B.Pharm · Semester 1 · BP101T
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  PCI 2026 NEP Syllabus
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Pharmaceutical Python Programming
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Foundational computing curriculum designed for pharmacy sciences. Master Python syntax, dosage
                algorithms, pharmacokinetics calculations, and Matplotlib data visualization.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/python-interpreter"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Code2 className="h-4 w-4" />
                Launch Python Sandbox
              </Link>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'lessons'}
              onClick={() => setTab('lessons')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                tab === 'lessons'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Syllabus Units & Lessons ({lessons.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'exam'}
              onClick={() => setTab('exam')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                tab === 'exam'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              BP101T Exam Practice Paper
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {tab === 'lessons' ? (
          <div>
            {/* Unit Selector Strip */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {units.map((u) => {
                const isSelected = unit === u.number;
                return (
                  <button
                    key={u.number}
                    type="button"
                    onClick={() => selectUnit(u.number)}
                    className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? 'text-blue-700' : 'text-slate-500'
                        }`}
                      >
                        Unit {u.number}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        6h
                      </span>
                    </div>
                    <strong className="mt-1 line-clamp-1 text-xs font-semibold text-slate-900">
                      {u.title}
                    </strong>
                  </button>
                );
              })}
            </div>

            {/* Active Unit Focus Bar */}
            <div className="mb-6 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/40 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-[11px] font-bold tracking-wider text-blue-700 uppercase">
                    Currently Selected Unit
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    Unit {unit}: {activeUnit.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600">{activeUnit.topics}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {lessons.filter((l) => l.unit === unit).length} Lessons in this Unit
                </span>
              </div>
            </div>

            {/* 2-Column Responsive Layout: Sidebar & Lesson Reader */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Lesson Directory Navigation */}
              <aside className="lg:col-span-4">
                <div className="sticky top-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                      Unit {unit} Table of Contents
                    </h3>
                    <span className="text-xs text-slate-400">
                      Lesson {currentIndex + 1} of {lessons.length}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {lessons
                      .filter((l) => l.unit === unit)
                      .map((l, idx) => {
                        const active = selected === l.id;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => setSelected(l.id)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                              active
                                ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-mono font-bold ${
                                active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="truncate">{l.title}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </aside>

              {/* Right Column: Full Lesson Article */}
              <article
                id="lesson-content"
                className="space-y-6 lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                {/* Lesson Header */}
                <div className="border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase">
                    <span>Unit {unit}</span>
                    <span>•</span>
                    <span>Lesson {currentIndex + 1} of {lessons.length}</span>
                  </div>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    {lesson.title}
                  </h2>
                </div>

                {/* Section 1: Definition */}
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Definition & Core Concept
                  </h3>
                  <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
                    {lesson.definition}
                  </div>
                </div>

                {/* Section 2: Key Points / Easy Notes */}
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Exam Notes & Revision Points
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {lesson.notes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                          ✓
                        </span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Section 3: Syntax First */}
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Python Syntax Structure
                  </h3>
                  <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 p-3.5">
                    <pre className="font-mono text-xs text-blue-300 overflow-x-auto">
                      <code>{lesson.syntax}</code>
                    </pre>
                  </div>
                </div>

                {/* Section 4: Pharmacy Practice Code Example */}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                      Pharmaceutical Application Example
                    </h3>
                    <Link
                      href={`/python-interpreter?lesson=${encodeURIComponent(lesson.id)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Run in Sandbox
                    </Link>
                  </div>

                  <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-emerald-400">
                    <pre className="overflow-x-auto">
                      <code>{lesson.code}</code>
                    </pre>
                  </div>

                  {/* Expected Output Card */}
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-xs font-bold text-slate-700">Expected Execution Output:</span>
                    {lesson.resultPoints ? (
                      <ul className="mt-2 space-y-1">
                        {lesson.resultPoints.map((point, i) => (
                          <li key={i} className="text-xs text-slate-600 font-mono">
                            • {point}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-3 font-mono text-xs text-slate-800 border border-slate-200">
                        {lesson.expected}
                      </pre>
                    )}
                    {lesson.input && (
                      <p className="mt-2 text-xs text-slate-500">
                        Sample Input: <code className="rounded bg-slate-200 px-1 py-0.5">{lesson.input.replaceAll('\n', ' · ')}</code>
                      </p>
                    )}
                  </div>
                </div>

                {/* Optional Local Environment / Terminal instructions */}
                {lesson.local && (
                  <div>
                    <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                      Local Terminal / CLI Setup (Optional)
                    </h3>
                    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-xs text-slate-300">
                      <pre className="overflow-x-auto">
                        <code>{lesson.local}</code>
                      </pre>
                    </div>
                  </div>
                )}

                {/* Exam Practice Question & Hidden Answer Accordion */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <span className="text-[11px] font-bold tracking-wider text-indigo-700 uppercase">
                    University Exam Practice Question
                  </span>
                  <p className="mt-1 text-xs font-semibold text-slate-800 leading-relaxed">
                    {lesson.question}
                  </p>

                  <details className="group mt-3 rounded-lg border border-indigo-200/80 bg-white p-3 text-xs">
                    <summary className="flex cursor-pointer items-center justify-between font-bold text-indigo-700 select-none">
                      <span>View Marking Scheme & Model Answer Points</span>
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs text-slate-700 leading-relaxed">
                      {lesson.answer.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ol>
                  </details>
                </div>

                {/* Previous & Next Navigation Buttons */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => navigateLesson(currentIndex - 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Previous Lesson
                  </button>

                  <button
                    type="button"
                    disabled={currentIndex === lessons.length - 1}
                    onClick={() => navigateLesson(currentIndex + 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next Lesson
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            </div>
          </div>
        ) : (
          /* Tab: Exam Practice Paper */
          <div className="space-y-8">
            {/* Exam Intro Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="text-xs font-bold tracking-wider text-blue-700 uppercase">
                    PCI Blueprint Model Question Paper
                  </span>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    BP101T Pharmaceutical Computing Practice Paper
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Comprehensive practice covering all 5 syllabus units. Includes MCQs, 2-mark conceptual
                    questions, and 5-mark long programming questions.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                    30 Marks Total
                  </span>
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                    90 Minutes Suggested
                  </span>
                </div>
              </div>
            </div>

            {/* Section A: 10 MCQs */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold text-blue-700 uppercase">Section A (Compulsory)</span>
                <h3 className="text-lg font-bold text-slate-900">
                  Multiple Choice Questions · 10 Questions × 1 Mark = 10 Marks
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select the best option for each question. Instant scoring and rationales are revealed upon checking.
                </p>
              </div>

              <div className="mt-6 space-y-6">
                {mcqs.map((q, i) => {
                  const userAnswer = answers[i];
                  const isCorrect = userAnswer === q.answer;

                  return (
                    <fieldset
                      key={q.q}
                      className={`rounded-xl border p-4 transition ${
                        submitted
                          ? isCorrect
                            ? 'border-emerald-200 bg-emerald-50/40'
                            : 'border-rose-200 bg-rose-50/40'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <legend className="px-2 text-xs font-bold text-slate-900">
                        Question {i + 1} <span className="text-slate-400 font-normal">· Unit {q.unit}</span>
                      </legend>

                      <p className="mt-1 text-xs font-semibold text-slate-800 leading-relaxed">{q.q}</p>

                      <div className="mt-3 space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const checked = userAnswer === optIdx;
                          return (
                            <label
                              key={opt}
                              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer transition ${
                                checked
                                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              } ${submitted ? 'cursor-default' : ''}`}
                            >
                              <input
                                type="radio"
                                name={`q-${i}`}
                                checked={checked}
                                disabled={submitted}
                                onChange={() => setAnswers((prev) => ({ ...prev, [i]: optIdx }))}
                                className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>

                      {submitted && (
                        <div
                          className={`mt-3 rounded-lg p-3 text-xs ${
                            isCorrect ? 'bg-emerald-100/70 text-emerald-900' : 'bg-rose-100/70 text-rose-900'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            {isCorrect ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-600" />
                            )}
                            <span>Correct Answer: {q.options[q.answer]}</span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed">{q.why}</p>
                        </div>
                      )}
                    </fieldset>
                  );
                })}
              </div>

              {/* MCQ Submission Footer */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                {submitted ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>
                        Your Score: <strong className="text-blue-600">{score}</strong> / 10 Marks
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAnswers({});
                        setSubmitted(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Retake Section A
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      disabled={answeredMcqCount !== mcqs.length}
                      onClick={() => setSubmitted(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Grade My MCQ Answers
                    </button>
                    <span className="text-xs text-slate-500">
                      {answeredMcqCount} of {mcqs.length} answered
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section B: Short Answer Questions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold text-blue-700 uppercase">Section B (Conceptual)</span>
                <h3 className="text-lg font-bold text-slate-900">
                  Short Answer Questions · Attempt any 5 of 7 · 5 × 2 Marks = 10 Marks
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Write your responses on notebook paper, then expand the marking points below to self-evaluate.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {shortQuestions.map((q, i) => (
                  <details
                    key={q.q}
                    className="group rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs transition"
                  >
                    <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 select-none">
                      <span>{i + 1}. {q.q}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs text-slate-700 leading-relaxed border-t border-slate-200/60 pt-3">
                      {q.answer.map((pt, ptIdx) => (
                        <li key={ptIdx}>{pt}</li>
                      ))}
                    </ol>
                  </details>
                ))}
              </div>
            </div>

            {/* Section C: Long Answer Questions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold text-blue-700 uppercase">Section C (Application & Code)</span>
                <h3 className="text-lg font-bold text-slate-900">
                  Long Answer Questions · Attempt any 2 of 3 · 2 × 5 Marks = 10 Marks
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Detailed code implementations and algorithm designs. Compare your solution with standard answers.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {longQuestions.map((q, i) => (
                  <details
                    key={q.q}
                    className="group rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs transition"
                  >
                    <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 select-none">
                      <span>{i + 1}. {q.q}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs text-slate-700 leading-relaxed border-t border-slate-200/60 pt-3">
                      {q.answer.map((pt, ptIdx) => (
                        <li key={ptIdx}>{pt}</li>
                      ))}
                    </ol>
                  </details>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer Card */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-100/60 p-4 text-center text-xs text-slate-500">
          Pharmaceutical calculation models are simulated for academic curriculum training under PCI BP101T.
          Always adhere to official clinical guidelines and pharmacopoeial standards.
        </div>
      </div>
    </div>
  );
}
