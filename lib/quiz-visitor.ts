import { cookies } from 'next/headers';
import { validateCandidateDetails } from './validation';

const COOKIE = 'ez_quiz_visitor';

export async function quizVisitor(create = false, secure = true) {
  const jar = await cookies();
  let token = jar.get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    if (!create) return null;
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('');
    jar.set(COOKIE, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return 'guest:' + token;
}

export function studentDetails(v: unknown) {
  return validateCandidateDetails(v);
}

