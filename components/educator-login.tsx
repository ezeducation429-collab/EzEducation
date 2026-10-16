'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { LockKeyhole, Eye, EyeOff, Shield, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

interface EducatorLoginProps {
  onSuccess: () => void;
  subtitle?: string;
}

export function EducatorLogin({
  onSuccess,
  subtitle = 'Enter your private educator secret key to manage course notes, timed examinations, and payment gateways.',
}: EducatorLoginProps) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError('Please enter your private educator key.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: trimmed }),
      });

      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'The educator key is incorrect. Please verify your credentials.');
      }

      setKey('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Student Study Library
          </Link>
        </div>

        {/* Login Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
            <LockKeyhole className="h-7 w-7" />
          </div>

          <div className="mt-5 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              <Shield className="h-3 w-3" />
              Educator Space
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Educator Access Required
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {subtitle}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="educator-key-input" className="block text-xs font-semibold text-slate-700">
                Private Educator Key
              </label>
              <div className="relative mt-1">
                <input
                  id="educator-key-input"
                  type={showKey ? 'text' : 'password'}
                  required
                  autoFocus
                  autoComplete="current-password"
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter private secret key"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pr-10 pl-3 text-xs font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Use the private administrative master key provided with your website.
              </p>
            </div>

            <button
              type="submit"
              disabled={busy || !key.trim()}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Verifying Key…
                </span>
              ) : (
                'Unlock Educator Dashboard'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
