import { database } from '@/lib/storage';
import { sameOrigin } from '@/lib/admin';
import { quizVisitor } from '@/lib/quiz-visitor';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { Question, grade, publicQuestions } from '@/lib/quiz';
import { validateUUID, validateQuizAnswers, ValidationError } from '@/lib/validation';

type Context = { params: Promise<{ id: string }> };

function formatResult(a: Record<string, unknown>) {
  const q = JSON.parse(String(a.snapshot)) as Question[];
  return {
    id: a.id,
    title: a.quiz_title,
    score: a.score,
    total: a.total,
    submittedAt: a.submitted_at,
    questions: q,
    answers: JSON.parse(String(a.answers || '[]')),
  };
}

async function getAttempt(c: Context) {
  const visitor = await quizVisitor();
  const u = await getChatGPTUser();
  if (!visitor && !u) return null;

  const { id } = await c.params;
  const attemptId = validateUUID(id, 'attempt ID');

  return database()
    .prepare('SELECT * FROM quiz_sessions WHERE id=? AND (user_id=? OR user_id=?)')
    .bind(attemptId, visitor || '', u?.userId || '')
    .first<Record<string, unknown>>();
}

export async function GET(req: Request, c: Context) {
  try {
    const a = await getAttempt(c);
    if (!a) {
      return Response.json(
        { error: 'Attempt not found. Please access using the same browser session used to start the quiz.' },
        { status: 404 }
      );
    }

    if (a.submitted_at) {
      return Response.json(formatResult(a));
    }

    return Response.json(
      {
        id: a.id,
        title: a.quiz_title,
        questions: publicQuestions(JSON.parse(String(a.snapshot))),
        deadline: Date.parse(String(a.started_at)) + Number(a.duration) * 60000,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error('Get quiz attempt error:', err);
    return Response.json({ error: 'Could not load quiz attempt.' }, { status: 503 });
  }
}

export async function POST(req: Request, c: Context) {
  try {
    if (!sameOrigin(req)) {
      return Response.json({ error: 'Request not allowed.' }, { status: 403 });
    }

    const a = await getAttempt(c);
    if (!a) {
      return Response.json(
        { error: 'Quiz attempt session not found or expired.' },
        { status: 404 }
      );
    }

    // Idempotent: if already submitted, return the graded result immediately
    if (a.submitted_at) {
      return Response.json(formatResult(a));
    }

    const body = (await req.json()) as { answers?: unknown };
    const questions = JSON.parse(String(a.snapshot)) as Question[];

    // Validate answers array strictly
    const validatedAnswers = validateQuizAnswers(body.answers, questions.length);

    // Enforce deadline with 60-second network latency buffer
    const deadline = Date.parse(String(a.started_at)) + Number(a.duration) * 60000;
    if (Date.now() > deadline + 60000) {
      return Response.json(
        { error: 'The exam submission window has closed. Your time has expired.' },
        { status: 410 }
      );
    }

    const score = grade(questions, validatedAnswers);
    const submittedAt = new Date().toISOString();

    await database()
      .prepare(
        'UPDATE quiz_sessions SET answers=?,score=?,submitted_at=? WHERE id=? AND submitted_at IS NULL'
      )
      .bind(JSON.stringify(validatedAnswers), score, submittedAt, a.id)
      .run();

    const saved = await database()
      .prepare('SELECT * FROM quiz_sessions WHERE id=?')
      .bind(a.id)
      .first<Record<string, unknown>>();

    return Response.json(formatResult(saved!), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message, field: err.field }, { status: err.status });
    }
    console.error('Submit quiz attempt error:', err);
    return Response.json(
      { error: 'Submission failed. Please verify your connection and retry.' },
      { status: 503 }
    );
  }
}
