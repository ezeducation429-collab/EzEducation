import { database } from '@/lib/storage';
import { isAdmin, sameOrigin } from '@/lib/admin';
import { validateQuiz, QuizInput } from '@/lib/quiz';
import { validateUUID, ValidationError } from '@/lib/validation';

type Context = { params: Promise<{ id: string }> };

export async function PUT(req: Request, c: Context) {
  try {
    if (!sameOrigin(req) || !(await isAdmin())) {
      return Response.json({ error: 'Educator access required.' }, { status: 403 });
    }

    const { id } = await c.params;
    const quizId = validateUUID(id, 'quiz ID');

    const body = (await req.json()) as QuizInput;
    const v = validateQuiz(body);

    const r = await database()
      .prepare(
        'UPDATE quizzes SET title=?,subject=?,course=?,semester=?,unit=?,duration=?,published=?,questions=?,updated_at=? WHERE id=?'
      )
      .bind(
        v.title,
        v.subject,
        v.course,
        v.semester,
        v.unit,
        v.duration,
        Number(v.published),
        JSON.stringify(v.questions),
        new Date().toISOString(),
        quizId
      )
      .run();

    return r.meta.changes
      ? Response.json({ ok: true })
      : Response.json({ error: 'Quiz no longer exists.' }, { status: 404 });
  } catch (e) {
    if (e instanceof ValidationError) {
      return Response.json({ error: e.message, field: e.field }, { status: e.status });
    }
    return Response.json(
      { error: e instanceof Error ? e.message : 'Could not update quiz.' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request, c: Context) {
  try {
    if (!sameOrigin(req) || !(await isAdmin())) {
      return Response.json({ error: 'Educator access required.' }, { status: 403 });
    }

    const { id } = await c.params;
    const quizId = validateUUID(id, 'quiz ID');

    const results = await database().batch([
      database()
        .prepare(
          'UPDATE quiz_attempts SET quiz_title=(SELECT title FROM quizzes WHERE id=?),subject=(SELECT subject FROM quizzes WHERE id=?) WHERE quiz_id=?'
        )
        .bind(quizId, quizId, quizId),
      database().prepare('DELETE FROM quizzes WHERE id=?').bind(quizId),
    ]);

    const r = results[1];
    return r.meta.changes
      ? Response.json({ ok: true })
      : Response.json({ error: 'Quiz no longer exists.' }, { status: 404 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error('Delete quiz error:', err);
    return Response.json({ error: 'Could not delete quiz.' }, { status: 503 });
  }
}
