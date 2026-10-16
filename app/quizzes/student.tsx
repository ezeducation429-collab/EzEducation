'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  FileQuestion,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  Send,
  HelpCircle,
} from 'lucide-react';

type Quiz = {
  id: string;
  title: string;
  subject: string;
  course: string;
  semester: number;
  unit: string;
  duration: number;
  total: number;
};

type Question = {
  text: string;
  options: string[];
  answer?: number;
  explanation?: string;
};

type Attempt = {
  id: string;
  title: string;
  deadline?: number;
  questions: Question[];
  score?: number;
  total?: number;
  answers?: (number | null)[];
};

export default function QuizStudent() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCourse, setFilterCourse] = useState('');

  // Selected quiz to start registration modal
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [studentSemester, setStudentSemester] = useState('');
  const [formErrors, setFormErrors] = useState<{ name?: string; college?: string; semester?: string }>({});

  // Active quiz attempt state
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const submittingRef = useRef(false);
  const autoSubmittedRef = useRef<string | null>(null);

  async function loadQuizzes() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/quizzes');
      if (!res.ok) throw new Error('Quizzes are currently unavailable. Please retry.');
      setQuizzes(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load quizzes.');
    } finally {
      setLoading(false);
    }
  }

  function acceptAttempt(data: Attempt) {
    setAttempt(data);
    let stored: (number | null)[] | null = null;
    try {
      stored = JSON.parse(sessionStorage.getItem('ez-answers-' + data.id) || 'null');
    } catch {}

    setAnswers(
      data.answers ||
        (Array.isArray(stored) && stored.length === data.questions.length
          ? stored
          : Array(data.questions.length).fill(null))
    );

    if (data.deadline) {
      setRemainingSeconds(Math.max(0, Math.ceil((data.deadline - Date.now()) / 1000)));
    }
  }

  useEffect(() => {
    void loadQuizzes();
    const attemptId = new URLSearchParams(window.location.search).get('attempt');
    if (attemptId) {
      fetch('/api/quiz-attempts/' + encodeURIComponent(attemptId))
        .then(async (res) => {
          const v = (await res.json()) as Attempt & { error?: string };
          if (!res.ok) throw new Error(v.error || 'Failed to resume attempt');
          acceptAttempt(v);
        })
        .catch((e) => setError(e.message));
    }
  }, []);

  async function startQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedQuiz) return;

    // Client-side candidate validation
    const errors: { name?: string; college?: string; semester?: string } = {};
    const trimmedName = name.trim();
    const trimmedCollege = college.trim();
    const sem = Number(studentSemester);

    if (!trimmedName || trimmedName.length < 2) {
      errors.name = 'Please enter your full name (at least 2 characters).';
    } else if (trimmedName.length > 120) {
      errors.name = 'Name cannot exceed 120 characters.';
    }

    if (!trimmedCollege || trimmedCollege.length < 2) {
      errors.college = 'Please enter your college or institution name (at least 2 characters).';
    } else if (trimmedCollege.length > 200) {
      errors.college = 'College name cannot exceed 200 characters.';
    }

    if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
      errors.semester = 'Please select a valid semester (1 to 8).';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/quizzes/' + selectedQuiz.id + '/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          college: trimmedCollege,
          semester: sem,
        }),
      });
      const data = (await res.json()) as Attempt & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not start quiz');

      acceptAttempt(data);
      setSelectedQuiz(null);
      setName('');
      setCollege('');
      setStudentSemester('');
      setCurrentQuestionIndex(0);
      window.history.replaceState(null, '', '/quizzes?attempt=' + data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start quiz.');
    } finally {
      setBusy(false);
    }
  }

  async function submitQuiz() {
    if (!attempt || attempt.score !== undefined || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError('');
    setShowConfirmModal(false);

    try {
      const res = await fetch('/api/quiz-attempts/' + attempt.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json()) as Attempt & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to submit quiz');

      acceptAttempt(data);
      sessionStorage.removeItem('ez-answers-' + attempt.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.');
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  // Timer Countdown Effect
  useEffect(() => {
    if (!attempt?.deadline || attempt.score !== undefined) return;

    const timerInterval = setInterval(() => {
      const left = Math.max(0, Math.ceil((attempt.deadline! - Date.now()) / 1000));
      setRemainingSeconds(left);

      if (left === 0 && autoSubmittedRef.current !== attempt.id) {
        autoSubmittedRef.current = attempt.id;
        void submitQuiz();
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [attempt, answers]);

  function leaveQuiz() {
    setAttempt(null);
    setError('');
    window.history.replaceState(null, '', '/quizzes');
  }

  function handleSelectOption(optionIndex: number) {
    if (!attempt || attempt.score !== undefined || remainingSeconds === 0) return;
    const nextAnswers = [...answers];
    nextAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(nextAnswers);
    sessionStorage.setItem('ez-answers-' + attempt.id, JSON.stringify(nextAnswers));
  }

  const answeredCount = answers.filter((a) => a !== null).length;
  const currentQuestion = attempt?.questions[currentQuestionIndex];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Quiz Catalog View (when no active attempt) */}
      {!attempt && (
        <div className="space-y-8">
          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 p-8 text-white shadow-xl sm:p-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold tracking-wider text-blue-200 uppercase">
              <Sparkles className="h-3.5 w-3.5" /> Self-Assessment Portal
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Pharmacy & Python Quizzes
            </h1>
            <p className="mt-3 max-w-2xl text-base text-blue-100 sm:text-lg">
              Timed multiple-choice assessments with automated grading, instant scorecards, and
              detailed explanations to test your concept clarity.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Filter Course:</span>
              {['', 'bpharm', 'dpharm', 'python'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setFilterCourse(code)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    filterCourse === code
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {code === '' ? 'All Courses' : code === 'bpharm' ? 'B.Pharm' : code === 'dpharm' ? 'D.Pharm' : 'Python'}
                </button>
              ))}
            </div>

            <span className="text-xs font-medium text-slate-500">
              {quizzes.filter((q) => !filterCourse || q.course === filterCourse).length} Active Quizzes
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={loadQuizzes}
                className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Quiz Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl bg-white border border-slate-200 p-6" />
              ))}
            </div>
          ) : quizzes.filter((q) => !filterCourse || q.course === filterCourse).length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center shadow-xs">
              <FileQuestion className="h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-lg font-bold text-slate-900">No quizzes available yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Educators haven’t published any quizzes under this course yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {quizzes
                .filter((q) => !filterCourse || q.course === filterCourse)
                .map((q) => (
                  <article
                    key={q.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 uppercase">
                          {q.course} · {q.course === 'dpharm' ? 'Year' : 'Sem'} {q.semester}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          {q.duration} mins
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-bold text-slate-900 line-clamp-2">{q.title}</h3>
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-1">
                        {q.subject} {q.unit && `· ${q.unit}`}
                      </p>

                      <div className="mt-4 flex items-center gap-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <FileQuestion className="h-3.5 w-3.5 text-blue-600" />
                          {q.total} Questions
                        </span>
                        <span>•</span>
                        <span>1 mark per question</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedQuiz(q);
                          setError('');
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-700 hover:shadow-blue-500/20"
                      >
                        <span>Start Assessment</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Registration Modal Before Starting Quiz */}
      {selectedQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">Candidate Details</span>
                <h2 className="text-xl font-bold text-slate-900">{selectedQuiz.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuiz(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Please enter your academic details to register your quiz attempt session.
            </p>

            <form onSubmit={startQuiz} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="e.g. Rahul Sharma"
                  className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-3 ${
                    formErrors.name
                      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs font-semibold text-rose-600">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">College / Institution</label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={college}
                  onChange={(e) => {
                    setCollege(e.target.value);
                    if (formErrors.college) setFormErrors((prev) => ({ ...prev, college: undefined }));
                  }}
                  placeholder="e.g. Department of Pharmaceutical Sciences"
                  className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-3 ${
                    formErrors.college
                      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
                {formErrors.college && (
                  <p className="mt-1 text-xs font-semibold text-rose-600">{formErrors.college}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Your Current Semester</label>
                <select
                  required
                  value={studentSemester}
                  onChange={(e) => {
                    setStudentSemester(e.target.value);
                    if (formErrors.semester) setFormErrors((prev) => ({ ...prev, semester: undefined }));
                  }}
                  className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-3 ${
                    formErrors.semester
                      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                >
                  <option value="">Select Semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
                {formErrors.semester && (
                  <p className="mt-1 text-xs font-semibold text-rose-600">{formErrors.semester}</p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedQuiz(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || !college.trim() || !studentSemester || busy}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? 'Starting...' : 'Begin Quiz Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Exam Interface or Results View */}
      {attempt && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
            <div>
              <button
                type="button"
                onClick={() => {
                  if (attempt.score !== undefined || confirm('Leave this quiz attempt? You can resume before the timer expires.')) {
                    leaveQuiz();
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                All Quizzes
              </button>
              <h2 className="mt-1 text-xl font-extrabold text-slate-900">{attempt.title}</h2>
            </div>

            {attempt.score === undefined && (
              <div className="flex items-center gap-4">
                {/* Timer Badge */}
                <div
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-sm font-bold shadow-xs ${
                    remainingSeconds < 120
                      ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  <span>
                    {Math.floor(remainingSeconds / 60)}:
                    {String(remainingSeconds % 60).padStart(2, '0')}
                  </span>
                </div>

                {/* Answered Progress Pill */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700">
                  {answeredCount} / {attempt.questions.length} Answered
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => (attempt.score === undefined ? void submitQuiz() : void loadQuizzes())}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Results Screen (if graded) */}
          {attempt.score !== undefined ? (
            <div className="space-y-8">
              {/* Scorecard Banner */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-md">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                    <Award className="h-10 w-10" />
                  </div>
                  <span className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Assessment Result
                  </span>
                  <h2 className="mt-1 text-4xl font-extrabold text-slate-900">
                    {attempt.score} <span className="text-2xl text-slate-400">/ {attempt.total}</span>
                  </h2>
                  <p className="mt-2 text-base font-semibold text-blue-600">
                    {Math.round((attempt.score / attempt.total!) * 100)}% Overall Score
                  </p>
                  <p className="mt-1 max-w-md text-xs text-slate-500">
                    Review your answers below with correct choices and detailed explanations.
                  </p>

                  <button
                    type="button"
                    onClick={leaveQuiz}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700"
                  >
                    <span>Browse More Quizzes</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Question Review List */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Detailed Explanations</h3>
                {attempt.questions.map((q, i) => {
                  const studentAns = answers[i];
                  const isCorrect = studentAns === q.answer;
                  const isUnanswered = studentAns === null;

                  return (
                    <div
                      key={i}
                      className={`rounded-2xl border p-6 transition-all ${
                        isCorrect
                          ? 'border-emerald-200 bg-white'
                          : 'border-rose-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-sm font-bold text-slate-900">
                          {i + 1}. {q.text}
                        </span>
                        {isCorrect ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Correct (+1)
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                            <XCircle className="h-3.5 w-3.5" /> {isUnanswered ? 'Unanswered' : 'Incorrect (0)'}
                          </span>
                        )}
                      </div>

                      {/* Options */}
                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {q.options.map((opt, j) => {
                          const isKeyCorrect = j === q.answer;
                          const isStudentSelected = j === studentAns;

                          let optionClass = 'border-slate-200 bg-slate-50 text-slate-700';
                          if (isKeyCorrect) {
                            optionClass = 'border-emerald-400 bg-emerald-50 font-bold text-emerald-800';
                          } else if (isStudentSelected && !isKeyCorrect) {
                            optionClass = 'border-rose-400 bg-rose-50 font-bold text-rose-800 line-through';
                          }

                          return (
                            <div
                              key={j}
                              className={`flex items-center gap-3 rounded-xl border p-3 text-xs ${optionClass}`}
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">
                                {String.fromCharCode(65 + j)}
                              </span>
                              <span>{opt}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation Box */}
                      {q.explanation && (
                        <div className="mt-4 rounded-xl bg-blue-50/70 p-3.5 text-xs text-blue-900 border border-blue-100">
                          <strong className="block font-bold mb-1">Explanation:</strong>
                          <span>{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Live Question Answering View */
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Question Body */}
              <div className="lg:col-span-8 space-y-6">
                <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-blue-600 uppercase">
                      Question {currentQuestionIndex + 1} of {attempt.questions.length}
                    </span>
                    <span className="text-xs text-slate-400">1 Mark</span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-900 sm:text-xl leading-relaxed">
                    {currentQuestion?.text}
                  </h3>

                  {/* MCQ Options */}
                  <div className="mt-6 space-y-3">
                    {currentQuestion?.options.map((opt, j) => {
                      const isSelected = answers[currentQuestionIndex] === j;

                      return (
                        <label
                          key={j}
                          onClick={() => handleSelectOption(j)}
                          className={`flex items-center gap-4 rounded-2xl border p-4 text-sm font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20 text-blue-950 font-semibold shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-bold transition-colors ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 bg-slate-100 text-slate-700'
                            }`}
                          >
                            {String.fromCharCode(65 + j)}
                          </span>
                          <span className="flex-1">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  {currentQuestionIndex < attempt.questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentQuestionIndex((prev) =>
                          Math.min(attempt.questions.length - 1, prev + 1)
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700"
                    >
                      <span>Next</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700"
                    >
                      <Send className="h-4 w-4" />
                      <span>Submit Quiz</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Question Navigator Drawer / Sidebar */}
              <div className="lg:col-span-4">
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-bold text-slate-900">Question Palette</h4>
                    <span className="text-xs text-slate-500">
                      {answeredCount} of {attempt.questions.length} answered
                    </span>
                  </div>

                  {/* 1..N Pill Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {attempt.questions.map((_, i) => {
                      const isAnswered = answers[i] !== null;
                      const isCurrent = currentQuestionIndex === i;

                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCurrentQuestionIndex(i)}
                          className={`h-10 rounded-xl text-xs font-bold transition-all ${
                            isCurrent
                              ? 'border-2 border-blue-600 bg-blue-600 text-white shadow-xs'
                              : isAnswered
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-blue-600" />
                      <span>Current Question</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-400" />
                      <span>Answered Question</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-slate-300" />
                      <span>Unanswered Question</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="w-full mt-4 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
                  >
                    Finish & Submit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal Before Submission */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <HelpCircle className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Submit Quiz Now?</h3>
            <p className="mt-2 text-xs text-slate-500">
              You have answered <b>{answeredCount}</b> out of{' '}
              <b>{attempt?.questions.length}</b> questions.
              {answeredCount < (attempt?.questions.length || 0) && (
                <span className="block mt-1 text-amber-700 font-semibold">
                  ({(attempt?.questions.length || 0) - answeredCount} questions are still unanswered).
                </span>
              )}
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Continue Quiz
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={submitQuiz}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
