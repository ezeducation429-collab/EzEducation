'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { validateQuiz, type QuizInput, type Question } from '@/lib/quiz';
import { EducatorLogin } from '@/components/educator-login';
import {
  Layers,
  BarChart3,
  Plus,
  Trash2,
  Edit,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Clock,
  BookOpen,
  ArrowLeft,
  Users,
  Award,
  Calendar,
  Shield,
} from 'lucide-react';

type Quiz = QuizInput & { id: string };

type Attempt = {
  id: string;
  quiz_id: string;
  quiz_title: string;
  subject: string;
  student_name: string;
  college_name: string | null;
  student_semester: number | null;
  user_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total: number;
};

const question = (): Question => ({
  text: '',
  options: ['', '', '', ''],
  answer: 0,
  explanation: '',
});

const blank = (): QuizInput => ({
  title: '',
  subject: '',
  course: 'bpharm',
  semester: 1,
  unit: '',
  duration: 10,
  published: false,
  questions: [question()],
});

export default function Panel({ initialAuth = false }: { initialAuth?: boolean }) {
  const [auth, setAuth] = useState(initialAuth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [form, setForm] = useState<QuizInput>(blank);
  const [edit, setEdit] = useState<string | null>(null);
  const [tab, setTab] = useState<'manage' | 'performance'>('manage');
  const [selected, setSelected] = useState('');

  async function request<T = { authenticated: boolean }>(url: string, init?: RequestInit) {
    const r = await fetch(url, init);
    const d = (await r.json()) as T & { error?: string };
    if (!r.ok) throw new Error(d.error || 'Request failed. Please try again.');
    return d;
  }

  async function load() {
    const [q, a] = await Promise.all([
      request<Quiz[]>('/api/quizzes?manage=1'),
      request<Attempt[]>('/api/admin/quiz-performance'),
    ]);
    setQuizzes(q);
    setAttempts(a);
  }

  useEffect(() => {
    if (!initialAuth) {
      request('/api/admin/session')
        .then((d) => {
          if (d.authenticated) setAuth(true);
        })
        .catch(() => {});
    }
  }, [initialAuth]);

  useEffect(() => {
    if (auth) {
      load().catch((e) => setError(e.message));
    }
  }, [auth]);

  async function logout() {
    setBusy(true);
    try {
      await request('/api/admin/session', { method: 'DELETE' });
      setAuth(false);
      setQuizzes([]);
      setAttempts([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      validateQuiz(form);
    } catch (valErr) {
      setError(valErr instanceof Error ? valErr.message : 'Please check your quiz entries.');
      return;
    }

    setBusy(true);
    try {
      await request('/api/quizzes' + (edit ? '/' + edit : ''), {
        method: edit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setMessage(form.published ? 'Quiz published successfully!' : 'Quiz saved as draft.');
      setForm(blank());
      setEdit(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(q: Quiz) {
    if (
      !confirm(
        `Are you sure you want to delete “${q.title}”? Active students will no longer see it. Past submission scores will be preserved.`
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await request('/api/quizzes/' + q.id, { method: 'DELETE' });
      if (edit === q.id) {
        setEdit(null);
        setForm(blank());
      }
      setMessage(`Quiz “${q.title}” deleted.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function patch(i: number, v: Partial<Question>) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, k) => (k === i ? { ...q, ...v } : q)),
    }));
  }

  const rows = attempts.filter((a) => !selected || a.quiz_id === selected);
  const finished = rows.filter((a) => a.submitted_at);
  const avg = finished.length
    ? Math.round(finished.reduce((n, a) => n + (a.score! / a.total) * 100, 0) / finished.length)
    : 0;

  function exportCSV() {
    const cell = (v: unknown) =>
      '"' + String(v ?? '').replace(/^[=+@\-\t\r]/, "'").replaceAll('"', '""') + '"';
    const lines = [
      ['Student', 'College', 'Semester', 'Quiz', 'Subject', 'Started', 'Submitted', 'Score', 'Total', 'Percent', 'Status'],
      ...rows.map((a) => [
        a.student_name,
        a.college_name,
        a.student_semester,
        a.quiz_title,
        a.subject,
        a.started_at,
        a.submitted_at,
        a.score,
        a.total,
        a.submitted_at ? Math.round((a.score! / a.total) * 100) : '',
        a.submitted_at ? 'Submitted' : 'In Progress',
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + lines.map((r) => r.map(cell).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Ez-Education-Quiz-Performance.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!auth) {
    return (
      <EducatorLogin
        onSuccess={() => {
          setAuth(true);
          void load();
        }}
        subtitle="Enter your private educator secret key to manage examination question sets and review student performance analytics."
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Educator Header Banner */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  <Shield className="h-3 w-3" />
                  Educator Portal
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Session Active
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Quiz Management & Student Analytics
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Create timed examinations, review question sets, and export student performance reports.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                Lock Panel
              </button>
            </div>
          </div>

          {/* Sub Navigation Strip */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition"
              >
                <BookOpen className="h-4 w-4" />
                Study Materials
              </Link>
              <div className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs">
                <Layers className="h-4 w-4" />
                Quizzes & Student Analytics
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTab('manage')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  tab === 'manage'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Quizzes ({quizzes.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('performance')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  tab === 'performance'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Student Performance ({finished.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">{error}</div>
            <button type="button" onClick={() => setError('')} className="text-rose-600 hover:text-rose-800">
              Dismiss
            </button>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <div className="flex-1">{message}</div>
            <button type="button" onClick={() => setMessage('')} className="text-emerald-600 hover:text-emerald-800">
              Dismiss
            </button>
          </div>
        )}

        {tab === 'manage' ? (
          /* TAB 1: MANAGE QUIZZES & BUILDER */
          <div className="space-y-8">
            {/* Quiz Builder Form Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold text-blue-600 uppercase">
                  {edit ? 'Modify Existing Quiz' : 'Create New Assessment'}
                </span>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {edit ? 'Edit Quiz Blueprint' : 'Author a Timed Quiz'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  4 options per question · 1 mark each · No negative marking · Strict server-timed submissions.
                </p>
              </div>

              <form onSubmit={save} className="mt-6 space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Quiz Title</label>
                    <input
                      required
                      maxLength={160}
                      value={form.title}
                      placeholder="e.g. Pharmacokinetics Mid-Term Quiz"
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Subject</label>
                    <input
                      required
                      maxLength={160}
                      value={form.subject}
                      placeholder="e.g. Biopharmaceutics"
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Course</label>
                    <select
                      value={form.course}
                      onChange={(e) => setForm({ ...form, course: e.target.value, semester: 1 })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="bpharm">B.Pharm</option>
                      <option value="dpharm">D.Pharm</option>
                      <option value="python">Python Programming</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {form.course === 'dpharm' ? 'Academic Year' : 'Semester'}
                    </label>
                    <select
                      value={form.semester}
                      onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    >
                      {Array.from({ length: form.course === 'dpharm' ? 2 : 8 }, (_, i) => (
                        <option key={i} value={i + 1}>
                          {form.course === 'dpharm' ? `Year ${i + 1}` : `Semester ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Unit / Chapter (Optional)</label>
                    <input
                      maxLength={80}
                      value={form.unit}
                      placeholder="e.g. Unit 2"
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Duration (Minutes)</label>
                    <input
                      required
                      type="number"
                      min={1}
                      max={180}
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Questions Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">
                      Questions ({form.questions.length})
                    </h3>
                    <button
                      type="button"
                      disabled={busy || form.questions.length >= 100}
                      onClick={() => setForm({ ...form, questions: [...form.questions, question()] })}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                    >
                      <Plus className="h-3.5 w-3.5 text-blue-600" />
                      Add Question
                    </button>
                  </div>

                  {form.questions.map((q, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Question {i + 1}</span>
                        <button
                          type="button"
                          disabled={form.questions.length === 1}
                          onClick={() =>
                            setForm({
                              ...form,
                              questions: form.questions.filter((_, k) => k !== i),
                            })
                          }
                          className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700">Question Statement</label>
                        <textarea
                          required
                          maxLength={2000}
                          rows={2}
                          value={q.text}
                          placeholder="Enter clear multiple-choice question stem..."
                          onChange={(e) => patch(i, { text: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {q.options.map((opt, j) => (
                          <div key={j}>
                            <label className="block text-[10px] font-semibold text-slate-600">
                              Option {String.fromCharCode(65 + j)}
                            </label>
                            <input
                              required
                              maxLength={500}
                              value={opt}
                              placeholder={`Option ${String.fromCharCode(65 + j)} text`}
                              onChange={(e) =>
                                patch(i, {
                                  options: q.options.map((v, k) => (k === j ? e.target.value : v)),
                                })
                              }
                              className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Correct Answer Option
                          </label>
                          <select
                            value={q.answer}
                            onChange={(e) => patch(i, { answer: Number(e.target.value) })}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                          >
                            {q.options.map((_, j) => (
                              <option key={j} value={j}>
                                Option {String.fromCharCode(65 + j)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Explanation / Rationale (Shown after submission)
                          </label>
                          <input
                            maxLength={2000}
                            value={q.explanation}
                            placeholder="e.g. As defined by PCI guidelines..."
                            onChange={(e) => patch(i, { explanation: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Published Checkbox and Save Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.published}
                      onChange={(e) => setForm({ ...form, published: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Publish live for student registration</span>
                  </label>

                  <div className="flex items-center gap-2">
                    {edit && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEdit(null);
                          setForm(blank());
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {busy ? 'Saving…' : edit ? 'Update Quiz' : 'Save Quiz Blueprint'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Quizzes List Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Configured Quizzes ({quizzes.length})</h3>
              <p className="text-xs text-slate-500">Live quizzes and drafts available to students.</p>

              {quizzes.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No quizzes configured yet. Author your first quiz using the blueprint form above.
                </div>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {quizzes.map((q) => (
                    <div
                      key={q.id}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {q.course.toUpperCase()} · Sem {q.semester}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              q.published
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {q.published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <h4 className="mt-1 text-sm font-bold text-slate-900">{q.title}</h4>
                        <p className="text-xs text-slate-500">
                          {q.subject} • {q.questions.length} Questions • {q.duration} Minutes
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEdit(q.id);
                            setForm({
                              ...q,
                              questions: q.questions.map((x) => ({ ...x, options: [...x.options] })),
                            });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void remove(q)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TAB 2: STUDENT PERFORMANCE ANALYTICS */
          <div className="space-y-8">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500">Submitted Attempts</span>
                    <h3 className="text-2xl font-bold text-slate-900">{finished.length}</h3>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500">Unique Students</span>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {
                        new Set(
                          finished.map((a) =>
                            a.user_id.startsWith('guest:')
                              ? JSON.stringify([a.student_name, a.college_name, a.student_semester])
                              : a.user_id
                          )
                        ).size
                      }
                    </h3>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500">Average Score</span>
                    <h3 className="text-2xl font-bold text-slate-900">{avg}%</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Table Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Student Attempts Registry</h3>
                  <p className="text-xs text-slate-500">
                    Detailed record of recent student test submissions and scores.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All Quizzes</option>
                    {Array.from(
                      new Map([
                        ...quizzes.map((q) => [q.id, q.title] as const),
                        ...attempts.map((a) => [a.quiz_id, a.quiz_title] as const),
                      ]).entries()
                    ).map(([id, title]) => (
                      <option key={id} value={id}>
                        {title}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!rows.length}
                    onClick={exportCSV}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5 text-blue-600" />
                    Export CSV
                  </button>
                </div>
              </div>

              {!rows.length ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No student exam attempts found for the selected filter.
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                        <th className="pb-3 pl-2">Candidate</th>
                        <th className="pb-3">Institution</th>
                        <th className="pb-3">Sem</th>
                        <th className="pb-3">Assessment</th>
                        <th className="pb-3">Score</th>
                        <th className="pb-3">Percentage</th>
                        <th className="pb-3 pr-2">Date / Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((a) => {
                        const pct = a.submitted_at ? Math.round((a.score! / a.total) * 100) : 0;
                        return (
                          <tr key={a.id} className="hover:bg-slate-50/70">
                            <td className="py-3 pl-2 font-bold text-slate-900">{a.student_name}</td>
                            <td className="py-3 text-slate-600">{a.college_name || '—'}</td>
                            <td className="py-3 text-slate-600">{a.student_semester || '—'}</td>
                            <td className="py-3">
                              <span className="font-semibold text-slate-900">{a.quiz_title}</span>
                              <span className="block text-[11px] text-slate-400">{a.subject}</span>
                            </td>
                            <td className="py-3 font-semibold text-slate-900">
                              {a.submitted_at ? `${a.score} / ${a.total}` : '—'}
                            </td>
                            <td className="py-3">
                              {a.submitted_at ? (
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                    pct >= 70
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : pct >= 50
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  {pct}%
                                </span>
                              ) : (
                                <span className="text-slate-400">In Progress</span>
                              )}
                            </td>
                            <td className="py-3 pr-2 text-slate-500 text-[11px]">
                              {new Date(a.submitted_at || a.started_at).toLocaleDateString()}{' '}
                              <span className="text-slate-400">
                                {new Date(a.submitted_at || a.started_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
