'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Download,
  FileText,
  Search,
  Lock,
  Unlock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  BookOpen,
  Filter,
} from 'lucide-react';
import type { Note } from './study-library';

type Purchase = {
  id: string;
  note_id: string;
  status: string;
  payment_id: string | null;
};

type PaymentResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type CheckoutOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler: (response: PaymentResponse) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};

type CheckoutInstance = {
  open: () => void;
  on: (name: string, callback: () => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => CheckoutInstance;
  }
}

let checkoutScript: Promise<void> | null = null;

function loadCheckout() {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  if (!checkoutScript) {
    checkoutScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => (window.Razorpay ? resolve() : reject(new Error('Checkout did not load.')));
      script.onerror = () => {
        script.remove();
        checkoutScript = null;
        reject(new Error('Could not load Razorpay. Check your internet connection.'));
      };
      document.head.appendChild(script);
    });
  }
  return checkoutScript;
}

function unitLabel(value: string) {
  const text = (value || '').trim();
  if (!text) return 'General Material';
  const match = text.match(/^(unit|chapter)\s*[-:–]?\s*(\d+|[ivx]+)\b/i);
  if (!match) return text;
  const roman: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
    IX: 9,
    X: 10,
  };
  const number = roman[match[2].toUpperCase()] ?? match[2];
  return `${match[1].toLowerCase() === 'unit' ? 'Unit' : 'Chapter'} ${number}`;
}

const formatCurrency = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);

async function post(path: string, data: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = (await response.json()) as {
    error?: string;
    orderId: string;
    amount: number;
    keyId: string;
    mode: string;
  };
  if (response.status === 401) {
    window.location.href = '/account?returnTo=' + encodeURIComponent(window.location.pathname);
    throw new Error('Please sign in to buy notes.');
  }
  if (!response.ok) throw new Error(result.error || 'Please try again.');
  return result;
}

export default function NotesCatalogue({ notes }: { notes: Note[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedKind, setSelectedKind] = useState('');
  const [orders, setOrders] = useState<Purchase[]>([]);
  const [busyNoteId, setBusyNoteId] = useState('');
  const [feedback, setFeedback] = useState<{ id: string; text: string; error: boolean } | null>(null);

  // Distinct lists for filters
  const subjects = useMemo(
    () => Array.from(new Set(notes.map((n) => n.subject))).sort((a, b) => a.localeCompare(b)),
    [notes]
  );

  const kinds = useMemo(
    () => Array.from(new Set(notes.map((n) => n.kind))).filter(Boolean),
    [notes]
  );

  // Filter notes by search, subject, kind, and unit
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesSearch =
        !searchQuery.trim() ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.unit.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSubject = !selectedSubject || n.subject === selectedSubject;
      const matchesKind = !selectedKind || n.kind === selectedKind;
      const matchesUnit = !selectedUnit || unitLabel(n.unit) === selectedUnit;

      return matchesSearch && matchesSubject && matchesKind && matchesUnit;
    });
  }, [notes, searchQuery, selectedSubject, selectedKind, selectedUnit]);

  // Derived available units based on current subject filter
  const availableUnits = useMemo(() => {
    const subset = selectedSubject ? notes.filter((n) => n.subject === selectedSubject) : notes;
    return Array.from(new Set(subset.map((n) => unitLabel(n.unit)))).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [notes, selectedSubject]);

  async function loadOrders() {
    try {
      const res = await fetch('/api/payments/orders');
      if (res.ok) setOrders(await res.json());
    } catch {}
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function verify(orderId: string, noteId: string, data?: PaymentResponse) {
    setBusyNoteId(noteId);
    setFeedback(null);
    try {
      await post('/api/payments/verify', data || { razorpay_order_id: orderId });
      await loadOrders();
      setFeedback({
        id: noteId,
        text: 'Payment verified successfully! Your PDF download is unlocked.',
        error: false,
      });
    } catch (e) {
      setFeedback({
        id: noteId,
        text: e instanceof Error ? e.message : 'Verification failed. Please retry.',
        error: true,
      });
    } finally {
      setBusyNoteId('');
    }
  }

  async function buy(note: Note) {
    setBusyNoteId(note.id);
    setFeedback(null);
    try {
      await loadCheckout();
      const order = await post('/api/payments/orders', { noteId: note.id });
      await loadOrders();

      const checkout = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: 'INR',
        name: 'Ez Education',
        description: note.title,
        handler: (data) => {
          void verify(order.orderId, note.id, data);
        },
        modal: {
          ondismiss: () => {
            setBusyNoteId('');
            setFeedback({
              id: note.id,
              text: 'Checkout closed. If your payment was deducted, click "Verify payment" below.',
              error: false,
            });
          },
        },
        theme: { color: '#2563eb' },
      });

      checkout.on('payment.failed', () => {
        setBusyNoteId('');
        setFeedback({
          id: note.id,
          text: 'Payment was not completed. You can try checkout again.',
          error: true,
        });
      });

      checkout.open();
    } catch (e) {
      setBusyNoteId('');
      setFeedback({
        id: note.id,
        text: e instanceof Error ? e.message : 'Checkout could not start. Please try again.',
        error: true,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-center">
          {/* Keyword Search */}
          <div className="relative md:col-span-5">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by topic, subject, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-blue-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Subject Select */}
          <div className="md:col-span-4">
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedUnit('');
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-blue-100"
            >
              <option value="">All Subjects ({subjects.length})</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Select */}
          <div className="md:col-span-3">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-blue-100"
            >
              <option value="">All Units / Chapters</option>
              {availableUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Kind Filter Pills */}
        {kinds.length > 1 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Filter className="h-3.5 w-3.5" /> Filter by:
            </span>
            <button
              type="button"
              onClick={() => setSelectedKind('')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                selectedKind === ''
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Types
            </button>
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSelectedKind(selectedKind === k ? '' : k)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedKind === k
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {k}
              </button>
            ))}

            <span className="ml-auto text-xs font-medium text-slate-500">
              Showing {filteredNotes.length} of {notes.length} resources
            </span>
          </div>
        )}
      </div>

      {/* Empty State when filters yield no items */}
      {filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center shadow-xs">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <BookOpen className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No resources found</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            No study material matches your current search or filter criteria. Try clearing some filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedSubject('');
              setSelectedUnit('');
              setSelectedKind('');
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-transform hover:scale-[1.02] hover:bg-blue-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Notes Grid */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => {
            const paid = orders.find((o) => o.note_id === note.id && o.status === 'paid');
            const pending = orders.find((o) => o.note_id === note.id && o.status === 'created');
            const isFree = note.price_paise === 0;
            const isBusy = busyNoteId === note.id;

            return (
              <article
                key={note.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <div>
                  {/* Card Header Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                      {note.kind}
                    </span>

                    {isFree ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        Free PDF
                      </span>
                    ) : paid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                        <Unlock className="h-3 w-3" /> Unlocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                        <Lock className="h-3 w-3 text-amber-600" />
                        {formatCurrency(note.price_paise)}
                      </span>
                    )}
                  </div>

                  {/* Title & Subject */}
                  <h4 className="mt-3.5 text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {note.title}
                  </h4>

                  <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-700 truncate">{note.subject}</span>
                    <span className="text-slate-400">{note.unit ? unitLabel(note.unit) : 'General Curriculum'}</span>
                  </div>
                </div>

                {/* Card Actions & Download Buttons */}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  {!isFree && !paid ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void buy(note)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 px-4 text-sm font-semibold text-white shadow-xs transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/20 disabled:opacity-60"
                      >
                        <Lock className="h-4 w-4" />
                        {isBusy ? 'Starting checkout...' : `Unlock for ${formatCurrency(note.price_paise)}`}
                      </button>

                      {pending && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void verify(pending.id, note.id)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          Verify Payment
                        </button>
                      )}
                    </div>
                  ) : (
                    <a
                      href={note.file_key ? `/api/notes/${note.id}/file` : note.url}
                      target={note.file_key ? undefined : '_blank'}
                      rel={note.file_key ? undefined : 'noopener noreferrer'}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-semibold transition-all shadow-xs ${
                        paid
                          ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/20'
                      }`}
                    >
                      {note.file_key ? (
                        <>
                          <Download className="h-4 w-4" />
                          <span>{paid ? 'Download Unlocked PDF' : 'Download PDF'}</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4" />
                          <span>Open Resource</span>
                        </>
                      )}
                    </a>
                  )}

                  {/* Feedback Message */}
                  {feedback?.id === note.id && (
                    <div
                      className={`mt-3 flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                        feedback.error
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                      role={feedback.error ? 'alert' : 'status'}
                    >
                      {feedback.error ? (
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      )}
                      <span>{feedback.text}</span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Support / Help Banner */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 sm:flex-row">
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
          <span>Purchases are permanently saved to your student account and accessible across all devices.</span>
        </span>
        <a href="mailto:ezeducation429@gmail.com" className="font-semibold underline hover:text-blue-700 shrink-0">
          Need help? Contact support
        </a>
      </div>
    </div>
  );
}
