'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Lock,
  Download,
  CheckCircle2,
  AlertCircle,
  LogOut,
  FileText,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowRight,
  BookOpen,
  Sparkles,
  Copy,
  ExternalLink,
} from 'lucide-react';

type Purchase = {
  id: string;
  note_id: string;
  title: string;
  status: string;
  amount: number;
};

export default function StudentAccount() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Purchase[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadOrders() {
    try {
      const r = await fetch('/api/payments/orders');
      const d = (await r.json()) as Purchase[] & { error?: string };
      if (!r.ok) throw new Error(d.error || 'Could not load your purchases.');
      setOrders(Array.isArray(d) ? d : []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetch('/api/student/session')
      .then((r) => r.json() as Promise<{ user: { email: string } | null }>)
      .then(async (d) => {
        setUser(d.user);
        if (d.user) await loadOrders();
      })
      .catch(() => setError('Could not check your current session. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setError('');

    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');

    // Client-side validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address (e.g. student@college.edu).');
      return;
    }

    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (mode === 'login' && !password) {
      setError('Please enter your account password.');
      return;
    }

    setBusy(true);

    try {
      const r = await fetch('/api/student/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          email,
          password,
          linkPurchases: data.get('linkPurchases') === 'on',
        }),
      });

      const d = (await r.json()) as { error?: string; message?: string; user?: { email: string } };
      if (!r.ok) throw new Error(d.error || 'Authentication failed. Please verify your credentials.');

      if (mode === 'reset') {
        setMessage(d.message || 'Password reset link sent! Please check your email inbox and spam folder.');
        return;
      }

      if (d.user) {
        setUser(d.user);
        await loadOrders();
        setMessage(mode === 'signup' ? 'Account created successfully! Welcome to Ez Education.' : 'Signed in successfully.');

        if (typeof window !== 'undefined') {
          const back = new URLSearchParams(window.location.search).get('returnTo');
          if (back?.startsWith('/') && !back.startsWith('//') && !back.includes('\\')) {
            window.location.assign(back);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please check your information and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const r = await fetch('/api/student/session', { method: 'DELETE' });
      if (!r.ok) throw new Error('Could not sign out.');
      setUser(null);
      setOrders([]);
      setMessage('You have signed out safely.');
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(order: Purchase) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const r = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ razorpay_order_id: order.id }),
      });
      const d = (await r.json()) as { error?: string; message?: string };
      if (!r.ok) throw new Error(d.error || 'Payment verification failed.');
      await loadOrders();
      setMessage('Payment verified! Your study material PDF is now unlocked.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment verification could not be confirmed.');
    } finally {
      setBusy(false);
    }
  }

  function copyOrder(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header Context Bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
          >
            ← Back to Study Library
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              <User className="h-3 w-3" />
              Student Portal
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {user ? 'My Student Account' : 'Student Sign In & Library Access'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Access your unlocked premium pharmacy notes, download receipts, and manage your account.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* Global Notifications */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-rose-600 hover:text-rose-800"
            >
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
            <button
              type="button"
              onClick={() => setMessage('')}
              className="text-emerald-600 hover:text-emerald-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-3 text-sm font-medium text-slate-600">Checking your account session…</p>
          </div>
        ) : user ? (
          /* LOGGED IN VIEW */
          <div className="space-y-8">
            {/* User Profile Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{user.email}</h2>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        Active Student
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      All purchased materials are securely bound to your verified email account.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void logout()}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Purchased Study Materials Library */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">My Unlocked Materials</h3>
                  <p className="text-xs text-slate-500">
                    {orders.length} {orders.length === 1 ? 'material' : 'materials'} purchased and available for download.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadOrders()}
                  disabled={busy}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  <RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <FileText className="h-7 w-7" />
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-slate-900">No Purchased Notes Yet</h4>
                  <p className="mt-1 max-w-sm text-xs text-slate-500">
                    When you purchase premium notes or question banks, your permanent high-resolution PDF downloads will appear here.
                  </p>
                  <Link
                    href="/"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Browse Study Material Library
                  </Link>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {orders.map((o) => {
                    const isPaid = o.status === 'paid';
                    return (
                      <div
                        key={o.id}
                        className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{o.title}</h4>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">₹{(o.amount / 100).toFixed(2)}</span>
                              <span>•</span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  isPaid
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {isPaid ? 'Payment Verified' : 'Awaiting Verification'}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                              <span>Order: {o.id}</span>
                              <button
                                type="button"
                                onClick={() => copyOrder(o.id)}
                                className="text-slate-400 hover:text-slate-600"
                                title="Copy Order ID"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              {copiedId === o.id && <span className="text-emerald-600 text-[10px]">Copied!</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:self-center">
                          {isPaid ? (
                            <a
                              href={`/api/notes/${encodeURIComponent(o.note_id)}/file`}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download PDF
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void verify(o)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                              Verify Payment
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Assistance Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Need help with an order?</span> Contact us at{' '}
              <a href="mailto:ezeducation429@gmail.com" className="font-semibold text-blue-600 hover:underline">
                ezeducation429@gmail.com
              </a>{' '}
              with your Order ID and payment receipt.
            </div>
          </div>
        ) : (
          /* NOT LOGGED IN / AUTH FORMS */
          <div className="mx-auto max-w-md">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Tab Selector: Sign In vs Create Account */}
              <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setMessage('');
                  }}
                  className={`py-3 transition ${
                    mode === 'login'
                      ? 'border-b-2 border-blue-600 bg-white text-blue-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError('');
                    setMessage('');
                  }}
                  className={`py-3 transition ${
                    mode === 'signup'
                      ? 'border-b-2 border-blue-600 bg-white text-blue-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {mode === 'reset'
                      ? 'Reset Your Password'
                      : mode === 'signup'
                      ? 'Create Your Student Account'
                      : 'Welcome Back'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {mode === 'reset'
                      ? 'Enter your registered email address to receive password reset instructions.'
                      : mode === 'signup'
                      ? 'Sign up to safely retain and sync your study materials across all devices.'
                      : 'Sign in to access your unlocked PDF notes and past purchases.'}
                  </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                      Email Address
                    </label>
                    <div className="relative mt-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        placeholder="student@college.edu"
                        className="w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Password Field (only for login & signup) */}
                  {mode !== 'reset' && (
                    <div>
                      <div className="flex items-center justify-between">
                        <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                          Password
                        </label>
                        {mode === 'login' && (
                          <button
                            type="button"
                            onClick={() => {
                              setMode('reset');
                              setError('');
                              setMessage('');
                            }}
                            className="text-[11px] font-semibold text-blue-600 hover:underline"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative mt-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Lock className="h-4 w-4" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                          minLength={mode === 'signup' ? 8 : undefined}
                          maxLength={128}
                          required
                          placeholder={mode === 'signup' ? 'Minimum 8 characters' : 'Enter your password'}
                          className="w-full rounded-xl border border-slate-200 py-2.5 pr-10 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Link Past Purchases Checkbox */}
                  {mode !== 'reset' && (
                    <label className="flex items-start gap-2.5 pt-1 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        name="linkPurchases"
                        defaultChecked
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>
                        Link older guest purchases made in this browser to this account. (Recommended on personal devices).
                      </span>
                    </label>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {busy
                      ? 'Please wait…'
                      : mode === 'signup'
                      ? 'Create Account'
                      : mode === 'reset'
                      ? 'Send Reset Instructions'
                      : 'Sign In to Account'}
                  </button>

                  {/* Cancel Reset Option */}
                  {mode === 'reset' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError('');
                        setMessage('');
                      }}
                      className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      ← Back to Sign In
                    </button>
                  )}
                </form>

                {/* Legal Policy Links */}
                <p className="mt-5 text-center text-[11px] text-slate-400">
                  By continuing, you agree to Ez Education’s{' '}
                  <Link href="/terms" className="underline hover:text-slate-600">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy-policy" className="underline hover:text-slate-600">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
