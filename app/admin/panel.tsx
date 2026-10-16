'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import PaymentSettings from './payment-settings';
import NoteEditor from './note-editor';
import type { Note } from '../study-library';
import { EducatorLogin } from '@/components/educator-login';
import {
  Upload,
  LogOut,
  Trash2,
  FileText,
  Link as LinkIcon,
  Shield,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function AdminPanel({ initialAuth = false }: { initialAuth?: boolean }) {
  const [auth, setAuth] = useState(initialAuth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [mode, setMode] = useState('pdf');
  const [course, setCourse] = useState('bpharm');
  const [semester, setSemester] = useState('1');
  const [kind, setKind] = useState('Notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [filterQuery, setFilterQuery] = useState('');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function load() {
    try {
      const r = await fetch('/api/notes');
      if (!r.ok) throw new Error('The materials catalogue could not be loaded. Please refresh to try again.');
      setNotes(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load materials.');
    }
  }

  // Verify auth on mount if not already known
  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<{ authenticated: boolean }>;
      })
      .then((x) => {
        setAuth(x.authenticated);
        if (x.authenticated) void load();
      })
      .catch(() => {});
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const form = e.currentTarget;
    const data = new FormData(form);

    const title = String(data.get('title') || '').trim();
    const subject = String(data.get('subject') || '').trim();
    const unitVal = String(data.get('unit') || '').trim();
    const priceStr = String(data.get('price') || '0').trim();
    const priceVal = Number(priceStr);

    if (!title || title.length < 2) {
      setError('Please enter a document title (at least 2 characters).');
      return;
    }
    if (title.length > 160) {
      setError('Document title cannot exceed 160 characters.');
      return;
    }
    if (!subject || subject.length < 2) {
      setError('Please enter a subject name (at least 2 characters).');
      return;
    }
    if (subject.length > 160) {
      setError('Subject name cannot exceed 160 characters.');
      return;
    }
    if (unitVal.length > 80) {
      setError('Unit / chapter name cannot exceed 80 characters.');
      return;
    }
    if (isNaN(priceVal) || priceVal < 0) {
      setError('Please enter a valid price of ₹0 or greater.');
      return;
    }
    if (priceVal > 0 && priceVal < 1) {
      setError('Paid study materials must cost at least ₹1.00. Use ₹0 for free access.');
      return;
    }

    if (mode === 'pdf') {
      const file = data.get('file');
      if (!(file instanceof File) || !file.size) {
        setError('Please select a PDF document to upload.');
        return;
      }
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files (.pdf) are supported.');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError('Selected file size exceeds the 20 MB limit.');
        return;
      }
    } else {
      const url = String(data.get('url') || '').trim();
      if (!url || !url.startsWith('https://')) {
        setError('Please enter a valid secure HTTPS link (starts with https://).');
        return;
      }
      if (priceVal > 0) {
        setError('External links cannot be payment protected. Set price to 0 or upload a PDF.');
        return;
      }
    }

    setBusy(true);

    try {
      data.set('semester', semester);
      data.set('course', course);
      data.set('kind', kind);
      const r = await fetch('/api/notes', { method: 'POST', body: data });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error || 'Failed to upload material.');
      form.reset();
      setSuccess(
        `Study material successfully added to ${course === 'dpharm' ? 'D.Pharm Year' : 'B.Pharm Semester'} ${semester}.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save material.');
    } finally {
      setBusy(false);
    }
  }

  async function removeMaterial() {
    if (!deleteTarget || deleting) return;
    const target = deleteTarget;
    setDeleting(true);
    setBusy(true);
    setDeleteError('');
    setError('');
    setSuccess('');
    try {
      const r = await fetch('/api/notes/' + encodeURIComponent(target.id), { method: 'DELETE' });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        throw new Error(d.error || 'Could not delete this material.');
      }
      setNotes((current) => current.filter((n) => n.id !== target.id));
      setDeleteTarget(null);
      setSuccess(`“${target.title}” was permanently removed from the student library.`);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete this material.');
    } finally {
      setDeleting(false);
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch('/api/admin/session', { method: 'DELETE' });
      setAuth(false);
      setNotes([]);
      setSuccess('');
      setError('');
    } catch {
      setError('Could not lock the panel.');
    } finally {
      setBusy(false);
    }
  }

  // Not authenticated: render clean dedicated login view
  if (!auth) {
    return (
      <EducatorLogin
        onSuccess={() => {
          setAuth(true);
          void load();
        }}
        subtitle="Enter your private educator secret key to manage course notes, timed examinations, and payment gateways."
      />
    );
  }

  const filteredNotes = notes.filter((n) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.subject.toLowerCase().includes(q) ||
      (n.unit && n.unit.toLowerCase().includes(q))
    );
  });

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
                Study Material Management
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Upload PDFs, attach reference syllabus links, and configure pricing for student notes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
          <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs"
            >
              <BookOpen className="h-4 w-4" />
              Study Materials ({notes.length})
            </Link>
            <Link
              href="/admin/quizzes"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition"
            >
              <Layers className="h-4 w-4" />
              Quizzes & Student Analytics
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* Global Notifications */}
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

        {success && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <div className="flex-1">{success}</div>
            <button type="button" onClick={() => setSuccess('')} className="text-emerald-600 hover:text-emerald-800">
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-8">
          {/* Razorpay Integration Component */}
          <PaymentSettings />

          {/* Upload Study Material Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase">
                <Upload className="h-3.5 w-3.5" />
                <span>Publish New Resource</span>
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Add Study Material</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Select course, semester, subject, and upload a PDF or add a shareable link.
              </p>
            </div>

            <form onSubmit={save} className="mt-6 space-y-5">
              {/* Course, Semester, Material Type Row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="course" className="block text-xs font-semibold text-slate-700">
                    Course Curriculum
                  </label>
                  <Select
                    value={course}
                    onValueChange={(val) => {
                      setCourse(val);
                      setSemester('1');
                    }}
                  >
                    <SelectTrigger id="course" className="mt-1 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bpharm">B.Pharm (8 Semesters)</SelectItem>
                      <SelectItem value="dpharm">D.Pharm (2 Years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="semester" className="block text-xs font-semibold text-slate-700">
                    {course === 'dpharm' ? 'Academic Year' : 'Semester'}
                  </label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger id="semester" className="mt-1 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(course === 'dpharm' ? [1, 2] : [1, 2, 3, 4, 5, 6, 7, 8]).map((s) => (
                        <SelectItem value={String(s)} key={s}>
                          {course === 'dpharm' ? `Year ${s}` : `Semester ${s}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="kind" className="block text-xs font-semibold text-slate-700">
                    Resource Type
                  </label>
                  <Select value={kind} onValueChange={setKind}>
                    <SelectTrigger id="kind" className="mt-1 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Notes', 'Question paper', 'Syllabus', 'Study material'].map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subject & Unit Row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="subject" className="block text-xs font-semibold text-slate-700">
                    Subject Name
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    required
                    maxLength={160}
                    placeholder="e.g. Pharmaceutics I, Pharmacology"
                    list="subjects"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <datalist id="subjects">
                    {Array.from(
                      new Set(
                        notes
                          .filter((n) => (n.course || 'bpharm') === course && n.semester === Number(semester))
                          .map((n) => n.subject)
                      )
                    ).map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label htmlFor="unit" className="block text-xs font-semibold text-slate-700">
                    Unit / Chapter (Optional)
                  </label>
                  <input
                    id="unit"
                    name="unit"
                    maxLength={80}
                    placeholder="e.g. Unit 1: Solid Dosage Forms"
                    list="note-units"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <datalist id="note-units">
                    {Array.from(
                      new Set(
                        notes
                          .filter((n) => n.course === course && n.semester === Number(semester))
                          .map((n) => n.unit)
                          .filter(Boolean)
                      )
                    ).map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Title & Price Row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label htmlFor="title" className="block text-xs font-semibold text-slate-700">
                    Document Title
                  </label>
                  <input
                    id="title"
                    name="title"
                    required
                    maxLength={160}
                    placeholder="e.g. Complete Hand-written Notes on Pharmacokinetics"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="price" className="block text-xs font-semibold text-slate-700">
                    Download Price (₹)
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    max="99999.99"
                    step="0.01"
                    required
                    defaultValue="0"
                    key={mode}
                    readOnly={mode === 'link'}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none read-only:bg-slate-100"
                  />
                  <span className="mt-1 block text-[10px] text-slate-500">
                    {mode === 'pdf' ? '0 = free. ₹1+ enables Razorpay purchase.' : 'Public links are always free.'}
                  </span>
                </div>
              </div>

              {/* Source Mode: Upload PDF or Link */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Source Attachment
                </label>
                <Tabs value={mode} onValueChange={setMode} className="w-full">
                  <TabsList className="mb-3">
                    <TabsTrigger value="pdf" className="text-xs">
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Upload PDF Document
                    </TabsTrigger>
                    <TabsTrigger value="link" className="text-xs">
                      <LinkIcon className="h-3.5 w-3.5 mr-1" />
                      External Web Link
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {mode === 'pdf' ? (
                  <div>
                    <input
                      type="file"
                      name="file"
                      accept="application/pdf,.pdf"
                      required
                      className="w-full text-xs text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-blue-700"
                    />
                    <span className="mt-1 block text-[11px] text-slate-500">
                      Supported: High-resolution PDF documents up to 20 MB.
                    </span>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      name="url"
                      required
                      maxLength={2000}
                      placeholder="https://drive.google.com/..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="mt-1 block text-[11px] text-slate-500">
                      Google Drive or university resource URL. Ensure link permissions are set to public view.
                    </span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {busy ? 'Uploading & Saving…' : 'Publish to Student Library'}
              </button>
            </form>
          </div>

          {/* Published Materials Catalogue */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Published Study Materials ({notes.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Manage active materials across all courses and semesters.
                </p>
              </div>

              {/* Instant Filter */}
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Search by title, subject..."
                  className="w-full rounded-xl border border-slate-200 py-1.5 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="py-12 text-center">
                <FolderOpen className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-xs text-slate-500">
                  {filterQuery ? 'No materials match your search query.' : 'No study materials added yet.'}
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {filteredNotes.map((n) => (
                  <div
                    key={n.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          {n.course === 'dpharm' ? 'D.Pharm' : 'B.Pharm'} ·{' '}
                          {n.course === 'dpharm' ? `Year ${n.semester}` : `Sem ${n.semester}`}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {n.kind || 'Notes'}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            n.price_paise > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {n.price_paise > 0 ? `₹${(n.price_paise / 100).toFixed(2)}` : 'Free'}
                        </span>
                      </div>

                      <h4 className="mt-1 text-sm font-bold text-slate-900 truncate">{n.title}</h4>
                      <p className="text-xs text-slate-500">
                        {n.subject} {n.unit ? `• ${n.unit}` : ''}
                      </p>

                      <NoteEditor note={n} onSaved={load} />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Delete ${n.title}`}
                        onClick={() => {
                          setDeleteError('');
                          setDeleteTarget(n);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Study Material?</AlertDialogTitle>
            <AlertDialogDescription className="break-words text-xs text-slate-600">
              “{deleteTarget?.title}” will be permanently removed from the student library.{' '}
              {deleteTarget?.file_key
                ? 'Its stored PDF file will also be deleted from storage.'
                : 'The reference link will be unlinked.'}{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-xs text-rose-600 font-semibold" role="alert">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void removeMaterial();
              }}
              className="text-xs font-bold"
            >
              {deleting ? 'Deleting…' : 'Delete Material'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
