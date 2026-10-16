import { database } from '@/lib/storage';
import { sameOrigin } from '@/lib/admin';
import { quizVisitor, studentDetails } from '@/lib/quiz-visitor';
import { publicQuestions, parseQuestions } from '@/lib/quiz';
import { validateUUID, ValidationError } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(
  req: Request,
  c: { params: Promise<{ id: string }> }
) {
  try {
    if (!sameOrigin(req)) {
      return Response.json({ error: 'Request not allowed.' }, { status: 403 });
    }

    // Rate limiting: max 10 attempt creations per minute per IP
    const clientIp = getClientIp(req);
    const limit = checkRateLimit(`quiz-attempt-start:${clientIp}`, 10, 60000);
    if (!limit.allowed) {
      return Response.json(
        { error: `Too many attempts started. Please wait ${limit.resetSeconds} seconds before starting another quiz.` },
        { status: 429, headers: { 'Retry-After': String(limit.resetSeconds) } }
      );
    }

    const { id } = await c.params;
    const quizId = validateUUID(id, 'quiz ID');

    const body = await req.json();
    const student = studentDetails(body);

    const q = await database()
      .prepare('SELECT * FROM quizzes WHERE id=? AND published=1')
      .bind(quizId)
      .first<{
        id: string;
        title: string;
        subject: string;
        duration: number;
        questions: string;
      }>();

    if (!q) {
      return Response.json(
        { error: 'This quiz is no longer available or has been unpublished.' },
        { status: 404 }
      );
    }

    const isHttps = new URL(req.url).protocol === 'https:';
    const visitor = await quizVisitor(true, isHttps);
    const attemptId = crypto.randomUUID();
    const now = new Date().toISOString();
    const questions = parseQuestions(String(q.questions));

    await database()
      .prepare(
        'INSERT INTO quiz_sessions (id,quiz_id,user_id,student_name,college_name,student_semester,quiz_title,subject,snapshot,duration,started_at,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
      )
      .bind(
        attemptId,
        quizId,
        visitor,
        student.name,
        student.college,
        student.semester,
        q.title,
        q.subject,
        JSON.stringify(questions),
        q.duration,
        now,
        questions.length
      )
      .run();

    return Response.json(
      {
        id: attemptId,
        title: q.title,
        questions: publicQuestions(questions),
        deadline: Date.parse(now) + Number(q.duration) * 60000,
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message, field: err.field }, { status: err.status });
    }
    console.error('Start quiz attempt error:', err);
    return Response.json(
      { error: 'Could not start quiz. Please try again.' },
      { status: 503 }
    );
  }
}
