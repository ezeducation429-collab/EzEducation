'use client';

import { useEffect, useRef, useState, FormEvent, KeyboardEvent } from 'react';
import Link from 'next/link';
import {
  Play,
  Square,
  RotateCcw,
  Download,
  IndentIncrease,
  BookOpen,
  Terminal,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Cpu,
  CornerDownLeft,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { lessons } from '../python-lessons/lesson-data';

type Status = 'loading' | 'ready' | 'packages' | 'running' | 'input' | 'error' | 'stopped';

export default function PythonInterpreter() {
  const [code, setCode] = useState(
    '# Pharmacoinformatics Practice in Python\nprint("Welcome to Ez Education Python Sandbox!")\npatient_name = input("Enter patient name: ")\nprint(f"Ready to analyze pharmacokinetic profiles for: {patient_name}")'
  );
  const [sample, setSample] = useState('');
  const [output, setOutput] = useState('');
  const [plots, setPlots] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Initializing Pyodide WebAssembly engine…');
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [showBatchDrawer, setShowBatchDrawer] = useState(false);
  const [resultState, setResultState] = useState('');
  const [version, setVersion] = useState('3.11');

  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editor = useRef<HTMLTextAreaElement | null>(null);
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);
  const answers = useRef<string[]>([]);
  const runCode = useRef('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const initialized = useRef(false);

  function clearTimer() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function stop(text = 'Program stopped. Click Restart Python to continue.') {
    clearTimer();
    worker.current?.terminate();
    worker.current = null;
    setStatus('stopped');
    setMessage('Stopped');
    setResultState('stopped');
    setOutput((prev) => (prev ? prev + '\n' + text : text));
  }

  function armTimeout(milliseconds: number, text: string) {
    clearTimer();
    timer.current = setTimeout(() => stop(text), milliseconds);
  }

  function initialize() {
    clearTimer();
    worker.current?.terminate();
    setStatus('loading');
    setMessage('Starting Python WebAssembly engine…');
    setResultState('');

    try {
      const next = new Worker('/python-worker.js?v=2');
      worker.current = next;
      armTimeout(120000, 'Python runtime took too long to load. Check your internet connection and restart.');

      next.onmessage = ({ data }) => {
        if (worker.current !== next) return;

        if (data.type === 'status') {
          setMessage(data.text);
        }
        if (data.type === 'ready') {
          clearTimer();
          setStatus('ready');
          if (data.version) setVersion(data.version);
          setMessage('Engine ready');
        }
        if (data.type === 'packages') {
          setStatus('packages');
          setMessage(data.text || 'Importing scientific packages…');
          armTimeout(120000, 'Libraries took too long to load. Please restart Python.');
        }
        if (data.type === 'started') {
          setStatus('running');
          setMessage('Executing program…');
          armTimeout(20000, 'Safety limit reached (20 seconds). Please check for infinite loops.');
        }
        if (data.type === 'load-error') {
          clearTimer();
          next.terminate();
          setStatus('error');
          setOutput(data.text || 'Failed to initialize Python WebAssembly runtime.');
          setMessage('Runtime error');
        }
        if (data.type === 'result') {
          clearTimer();
          setOutput(data.text || '');
          setPlots(data.plots || []);
          setResultState(data.state);
          if (data.state === 'input') {
            setPrompt(data.prompt || 'Input requested:');
            setAnswer('');
            setStatus('input');
            setMessage('Awaiting input');
            setTimeout(() => inputRef.current?.focus(), 50);
          } else {
            setStatus('ready');
            setMessage(data.state === 'error' ? 'Program completed with errors' : 'Execution completed');
          }
        }
      };

      next.onerror = () => {
        clearTimer();
        next.terminate();
        setStatus('error');
        setOutput('Python runtime failed to start. Click Retry Python to initialize again.');
        setMessage('Could not load Python');
      };
    } catch {
      setStatus('error');
      setOutput('Your browser could not initialize WebAssembly workers. Please use an updated modern browser.');
      setMessage('Unsupported browser');
    }
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (typeof window !== 'undefined') {
        const id = new URLSearchParams(window.location.search).get('lesson');
        const lesson = lessons.find((l) => l.id === id);
        if (lesson) {
          setCode(lesson.code);
          setSample(lesson.id);
          setBatchInput(lesson.input ?? '');
        }
      }
    }
    initialize();
    return () => {
      clearTimer();
      worker.current?.terminate();
    };
  }, []);

  function run() {
    if (status !== 'ready' || !code.trim()) return;
    answers.current = batchInput ? batchInput.replace(/\r\n/g, '\n').split('\n') : [];
    runCode.current = code;
    setOutput('');
    setPlots([]);
    setResultState('');
    setStatus('packages');
    setMessage('Preparing libraries and execution…');
    armTimeout(120000, 'Program preparation took too long. Restart Python.');
    worker.current?.postMessage({
      type: 'run',
      code: runCode.current,
      answers: answers.current,
    });
  }

  function submitInput(e: FormEvent) {
    e.preventDefault();
    answers.current.push(answer);
    setStatus('running');
    setMessage('Processing input…');
    armTimeout(120000, 'Program response took too long. Restart Python.');
    worker.current?.postMessage({
      type: 'run',
      code: runCode.current,
      answers: answers.current,
    });
  }

  function insertIndent() {
    const el = editor.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newCode = code.slice(0, start) + '    ' + code.slice(end);
    setCode(newCode);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + 4;
    });
  }

  function newline(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      insertIndent();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      run();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const currentLine = code.slice(0, start).split('\n').at(-1) ?? '';
      const baseIndent = currentLine.match(/^ */)?.[0] ?? '';
      const extraIndent = currentLine.trimEnd().endsWith(':') ? '    ' : '';
      const indent = baseIndent + extraIndent;
      const textToInsert = '\n' + indent;
      setCode(code.slice(0, start) + textToInsert + code.slice(end));
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + textToInsert.length;
      });
    }
  }

  function download() {
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sample ? `${sample}.py` : 'main.py';
    a.click();
    URL.revokeObjectURL(url);
  }

  const busy = ['running', 'packages', 'input'].includes(status);
  const lineCount = code.split('\n').length;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Workspace Subheader / Context Bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                <Cpu className="h-3 w-3" />
                WebAssembly Sandbox
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                Python {version}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Pharmacoinformatics Interpreter
            </h1>
            <p className="mt-0.5 text-sm text-slate-600">
              Interactive Python environment with NumPy, Pandas, and Matplotlib for B.Pharm students.
            </p>
          </div>

          {/* Right Status Badge & Lesson Link */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                status === 'ready'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : status === 'running' || status === 'packages' || status === 'loading'
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : status === 'input'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  status === 'ready'
                    ? 'bg-emerald-500 ring-4 ring-emerald-200'
                    : status === 'running' || status === 'packages' || status === 'loading'
                    ? 'animate-pulse bg-blue-500'
                    : status === 'input'
                    ? 'animate-ping bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              <span className="font-semibold">{message}</span>
            </div>

            <Link
              href="/python-lessons"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <BookOpen className="h-3.5 w-3.5 text-slate-500" />
              Syllabus Lessons
            </Link>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {/* Workspace Action Toolbar */}
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
          {/* Example Selector */}
          <div className="flex flex-1 items-center gap-2">
            <label htmlFor="example-select" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Load Example:
            </label>
            <div className="relative flex-1 max-w-md">
              <select
                id="example-select"
                value={sample}
                disabled={busy}
                onChange={(e) => {
                  const val = e.target.value;
                  setSample(val);
                  const selectedLesson = lessons.find((l) => l.id === val);
                  if (selectedLesson) {
                    setCode(selectedLesson.code);
                    setBatchInput(selectedLesson.input ?? '');
                    setOutput('');
                    setPlots([]);
                    setResultState('');
                  }
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pr-8 pl-3 text-xs font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">Select a Pharmacy / Pharmacokinetics Example…</option>
                {[1, 2, 3, 4, 5].map((u) => (
                  <optgroup key={u} label={`Unit ${u}: PCI Syllabus Topics`}>
                    {lessons
                      .filter((l) => l.unit === u)
                      .map((l) => (
                        <option value={l.id} key={l.id}>
                          {l.title}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Controls: Run, Stop, Download, Indent */}
          <div className="flex flex-wrap items-center gap-2">
            {busy ? (
              <button
                type="button"
                onClick={() => stop()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop Execution
              </button>
            ) : status === 'error' || status === 'stopped' ? (
              <button
                type="button"
                onClick={initialize}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {status === 'error' ? 'Retry Python' : 'Restart Python'}
              </button>
            ) : (
              <button
                type="button"
                disabled={status !== 'ready' || !code.trim()}
                onClick={run}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {status === 'loading' ? 'Loading…' : 'Run Code (Ctrl+Enter)'}
              </button>
            )}

            <button
              type="button"
              onClick={insertIndent}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              title="Indent 4 spaces (Tab)"
            >
              <IndentIncrease className="h-3.5 w-3.5 text-slate-500" />
              Indent +4
            </button>

            <button
              type="button"
              onClick={download}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              title="Download main.py file"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              Download
            </button>

            <button
              type="button"
              onClick={() => setShowBatchDrawer(!showBatchDrawer)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition ${
                showBatchDrawer || batchInput
                  ? 'border-blue-300 bg-blue-50/70 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Stdin Inputs
              {batchInput && (
                <span className="rounded-full bg-blue-600 px-1.5 text-[10px] text-white">
                  {batchInput.split('\n').filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Pre-filled Stdin Drawer */}
        {showBatchDrawer && (
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Pre-feed Inputs for input() prompts</h4>
                <p className="mt-0.5 text-xs text-slate-600">
                  Enter inputs one per line. If provided, program execution will automatically supply these in order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBatchInput('')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Clear
              </button>
            </div>
            <textarea
              aria-label="Pre-feed stdin inputs"
              value={batchInput}
              disabled={busy}
              placeholder="e.g.&#10;Amoxicillin&#10;500&#10;70"
              onChange={(e) => setBatchInput(e.target.value)}
              className="mt-2 h-20 w-full rounded-lg border border-blue-200 bg-white p-2.5 font-mono text-xs text-slate-800 shadow-inner focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        {/* Dual Editor & Terminal Split Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Panel: Python Code Editor */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Editor Tab Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/70 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-blue-600" />
                <span className="font-mono text-xs font-semibold text-slate-700">main.py</span>
                <span className="text-[11px] text-slate-400">({lineCount} lines)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Tab = 4 spaces</span>
                <span>•</span>
                <span>Ctrl+Enter = Run</span>
              </div>
            </div>

            {/* Editor Area with Synchronized Line Numbers */}
            <div className="relative flex min-h-[460px] flex-1 font-mono text-sm">
              {/* Line Numbers Gutter */}
              <div
                ref={lineNumbersRef}
                aria-hidden="true"
                className="select-none border-r border-slate-200 bg-slate-50/80 px-3 py-3 text-right font-mono text-xs text-slate-400"
              >
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i + 1} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Textarea Code Field */}
              <textarea
                ref={editor}
                id="code-editor"
                aria-label="Python code editor"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                value={code}
                readOnly={busy}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={newline}
                onScroll={(e) => {
                  if (lineNumbersRef.current) {
                    lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
                  }
                }}
                className="flex-1 resize-none bg-white p-3 font-mono text-sm leading-6 text-slate-900 focus:outline-none disabled:opacity-75"
                placeholder="# Enter Python code here..."
              />
            </div>

            {/* Editor Footer / Info Bar */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
              <span>Standard Python 3 syntax</span>
              <span>{code.length} characters</span>
            </div>
          </div>

          {/* Right Panel: Output, Terminal, Graphs & Live Input */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-900 text-slate-100 shadow-sm">
            {/* Terminal Tab Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span className="font-mono text-xs font-semibold text-slate-200">Terminal & Visualization</span>
              </div>
              <div className="flex items-center gap-2">
                {resultState === 'error' && (
                  <span className="inline-flex items-center gap-1 rounded bg-rose-950/80 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                    <AlertCircle className="h-3 w-3" /> Error
                  </span>
                )}
                {resultState === 'success' && (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-950/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Completed
                  </span>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setOutput('');
                    setPlots([]);
                    setResultState('');
                  }}
                  className="rounded px-2 py-0.5 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40"
                >
                  Clear Output
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex min-h-[340px] flex-1 flex-col overflow-y-auto p-4 font-mono text-xs leading-relaxed">
              <pre
                className={`flex-1 whitespace-pre-wrap font-mono ${
                  resultState === 'error' ? 'text-rose-400' : 'text-slate-200'
                }`}
                aria-live="polite"
              >
                {output ||
                  (['packages', 'running'].includes(status)
                    ? `> ${message}`
                    : status === 'loading'
                    ? '> Loading Pyodide WebAssembly runtime…\n> Please wait a few seconds on first visit.'
                    : '> Ready.\n> Click "Run Code" or press Ctrl+Enter to execute.')}
              </pre>

              {resultState === 'success' && !output && !plots.length && (
                <p className="mt-2 text-xs text-amber-300">
                  Program executed successfully with no print output. Use <code>print()</code> to view results.
                </p>
              )}
            </div>

            {/* Interactive Live Input Bar (when status === 'input') */}
            {status === 'input' && (
              <form
                onSubmit={submitInput}
                className="border-t border-amber-500/30 bg-amber-950/30 p-3.5 transition-all"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <CornerDownLeft className="h-3.5 w-3.5" />
                  <label htmlFor="interactive-answer">{prompt || 'Enter value:'}</label>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    ref={inputRef}
                    id="interactive-answer"
                    type="text"
                    autoComplete="off"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your response and press Enter…"
                    className="flex-1 rounded-lg border border-amber-500/40 bg-slate-950 px-3 py-1.5 font-mono text-xs text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}

            {/* Matplotlib Figure Visualizer */}
            {plots.length > 0 && (
              <div className="border-t border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <ImageIcon className="h-4 w-4 text-blue-400" />
                    <span>Generated Graphical Figures ({plots.length})</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {plots.map((plot, idx) => (
                    <div
                      key={idx}
                      className="overflow-hidden rounded-xl border border-slate-800 bg-white p-2 shadow-sm"
                    >
                      <img
                        src={`data:image/png;base64,${plot}`}
                        alt={`Matplotlib Figure ${idx + 1}`}
                        className="mx-auto max-h-[380px] w-auto object-contain"
                      />
                      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 px-2">
                        <span className="text-xs font-medium text-slate-500">Figure {idx + 1}</span>
                        <a
                          download={`plot-${idx + 1}.png`}
                          href={`data:image/png;base64,${plot}`}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                        >
                          <Download className="h-3 w-3" />
                          Download PNG
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pharmacoinformatics Ecosystem Banner & Guidelines */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Pre-loaded Scientific Stack</h4>
                <p className="mt-1 text-xs text-slate-600">
                  <code>numpy</code>, <code>pandas</code>, and <code>matplotlib</code> are pre-configured. Use standard{' '}
                  <code>import</code> statements anytime.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <FileCode className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Virtual Pharmacy Datasets</h4>
                <p className="mt-1 text-xs text-slate-600">
                  Virtual CSV files <code>pk_data.csv</code> and <code>adr_reports.csv</code> can be read with Pandas for
                  pharmacokinetics exercises.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Safe Browser Execution</h4>
                <p className="mt-1 text-xs text-slate-600">
                  Programs run isolated in client-side WebAssembly with a 20-second safety timeout. No code or personal
                  data leaves your browser.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
