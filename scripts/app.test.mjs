import test from 'node:test';
import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { database } from '../lib/storage.ts';
import { hmac, equalHex, pricePaise } from '../lib/payments.ts';
import { validateQuiz } from '../lib/quiz.ts';
import { studentDetails } from '../lib/quiz-visitor.ts';
import { checkRateLimit } from '../lib/rate-limit.ts';
import { keyMatches, signature } from '../lib/admin.ts';

test('1. Neon Database Connection and Tables Check', async () => {
  const url = process.env.DATABASE_URL;
  assert.ok(url, 'DATABASE_URL must be defined');

  const sql = neon(url);
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  const tableNames = tables.map(t => t.table_name);
  assert.ok(tableNames.includes('notes'), 'notes table must exist');
  assert.ok(tableNames.includes('note_orders'), 'note_orders table must exist');
  assert.ok(tableNames.includes('quizzes'), 'quizzes table must exist');
  assert.ok(tableNames.includes('quiz_sessions'), 'quiz_sessions table must exist');
  assert.ok(tableNames.includes('quiz_attempts'), 'quiz_attempts table must exist');
  assert.ok(tableNames.includes('payment_settings'), 'payment_settings table must exist');
});

test('2. Database Storage Adapter CRUD', async () => {
  const db = database();
  const testId = 'test-suite-' + Date.now();

  // Create
  const insertRes = await db.prepare(
    'INSERT INTO notes (id, course, semester, subject, title, unit, kind, url, price_paise, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).bind(testId, 'bpharm', 1, 'Pharmacology', 'Test Note Title', 'Unit 1', 'Notes', 'https://example.com', 0, new Date().toISOString())
  .run();
  assert.ok(insertRes.success, 'Insert must succeed');

  // Read
  const note = await db.prepare('SELECT * FROM notes WHERE id=?').bind(testId).first();
  assert.ok(note, 'Note should be retrieved');
  assert.equal(note.title, 'Test Note Title');
  assert.equal(note.course, 'bpharm');

  // Update
  await db.prepare('UPDATE notes SET title=? WHERE id=?').bind('Updated Note Title', testId).run();
  const updatedNote = await db.prepare('SELECT * FROM notes WHERE id=?').bind(testId).first();
  assert.equal(updatedNote.title, 'Updated Note Title');

  // Delete
  await db.prepare('DELETE FROM notes WHERE id=?').bind(testId).run();
  const deleted = await db.prepare('SELECT * FROM notes WHERE id=?').bind(testId).first();
  assert.equal(deleted, null, 'Note should be deleted');
});

test('3. Razorpay Signature & Amount Validation', async () => {
  const secret = 'rzp_test_secret_12345';
  const orderId = 'order_DAv12345';
  const paymentId = 'pay_DAv67890';
  const payload = orderId + '|' + paymentId;

  const validSig = await hmac(secret, payload);
  assert.ok(validSig, 'HMAC must generate a signature');
  assert.equal(typeof validSig, 'string');
  assert.equal(validSig.length, 64, 'SHA-256 HMAC must be 64 hex characters');

  assert.ok(equalHex(validSig, validSig), 'equalHex must return true for identical signatures');
  assert.ok(!equalHex(validSig, '0'.repeat(64)), 'equalHex must return false for mismatched signatures');

  // Price paise calculation
  assert.equal(pricePaise('0'), 0);
  assert.equal(pricePaise('49'), 4900);
  assert.equal(pricePaise('99.50'), 9950);
  assert.throws(() => pricePaise('0.5'), /at least ₹1/);
});

test('4. Rate Limiting Logic', () => {
  const testIp = 'test-rate-limit-ip-' + Date.now();
  
  // 3 requests allowed in 1000ms
  const r1 = checkRateLimit(testIp, 3, 1000);
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 2);

  const r2 = checkRateLimit(testIp, 3, 1000);
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 1);

  const r3 = checkRateLimit(testIp, 3, 1000);
  assert.equal(r3.allowed, true);
  assert.equal(r3.remaining, 0);

  const r4 = checkRateLimit(testIp, 3, 1000);
  assert.equal(r4.allowed, false, 'Fourth request should be blocked');
});

test('5. Student Details and Quiz Validation', () => {
  const validStudent = studentDetails({ name: 'Rahul Sharma', college: 'Pharmacy College', semester: 3 });
  assert.equal(validStudent.name, 'Rahul Sharma');
  assert.equal(validStudent.semester, 3);

  assert.throws(() => studentDetails({ name: '', college: 'College', semester: 3 }));
  assert.throws(() => studentDetails({ name: 'Rahul', college: '', semester: 3 }));
  assert.throws(() => studentDetails({ name: 'Rahul', college: 'College', semester: 9 }));

  // Quiz input validation
  const validQuiz = validateQuiz({
    title: 'Pharmaceutics Quiz',
    subject: 'Pharmaceutics I',
    course: 'bpharm',
    semester: 1,
    unit: 'Unit 1',
    duration: 15,
    published: true,
    questions: [
      {
        text: 'What is the dosage form of paracetamol?',
        options: ['Tablet', 'Gas', 'Plasma', 'Beam'],
        answer: 0,
        explanation: 'Paracetamol is commonly formulated as a tablet.',
      },
    ],
  });
  assert.equal(validQuiz.title, 'Pharmaceutics Quiz');
  assert.equal(validQuiz.questions.length, 1);

  assert.throws(() => validateQuiz({
    title: '',
    subject: 'Subject',
    course: 'bpharm',
    semester: 1,
    unit: '',
    duration: 10,
    published: true,
    questions: [],
  }));
});

test('6. Admin Key Verification and Signature Token', async () => {
  const adminKey = process.env.ADMIN_KEY;
  if (adminKey) {
    assert.equal(await keyMatches(adminKey), true, 'Valid admin key must match');
    assert.equal(await keyMatches('wrong-password'), false, 'Invalid admin key must not match');

    const token = await signature(`educator:${Date.now()}`);
    assert.ok(token && token.length === 64, 'HMAC signature token must be 64 characters');
  }
});

test('7. Comprehensive Form & Security Validation', async () => {
  const {
    validateUUID,
    validateEmail,
    validatePassword,
    validatePublicHttpsUrl,
    validatePriceInput,
    validateCourseAndSemester,
    validateRazorpayCredentials,
    ValidationError,
  } = await import('../lib/validation.ts');

  // UUID
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  assert.equal(validateUUID(validUuid), validUuid);
  assert.throws(() => validateUUID('invalid-uuid-string'), ValidationError);
  assert.throws(() => validateUUID(12345), ValidationError);

  // Email
  assert.equal(validateEmail('Student@College.EDU '), 'student@college.edu');
  assert.throws(() => validateEmail('not-an-email'), ValidationError);
  assert.throws(() => validateEmail(''), ValidationError);

  // Password
  assert.equal(validatePassword('secret123', true), 'secret123');
  assert.throws(() => validatePassword('short', true), ValidationError); // < 8 on signup
  assert.equal(validatePassword('short', false), 'short'); // allowed on login

  // SSRF Protection in Public HTTPS URLs
  assert.equal(validatePublicHttpsUrl('https://example.com/notes.pdf'), 'https://example.com/notes.pdf');
  assert.throws(() => validatePublicHttpsUrl('http://insecure.com'), ValidationError); // must be HTTPS
  assert.throws(() => validatePublicHttpsUrl('https://user:pass@example.com'), ValidationError); // no credentials
  assert.throws(() => validatePublicHttpsUrl('https://localhost:3000'), ValidationError); // loopback
  assert.throws(() => validatePublicHttpsUrl('https://127.0.0.1/admin'), ValidationError); // loopback IP
  assert.throws(() => validatePublicHttpsUrl('https://169.254.169.254/latest/meta-data/'), ValidationError); // AWS metadata
  assert.throws(() => validatePublicHttpsUrl('https://192.168.1.1/internal'), ValidationError); // RFC1918 private IP
  assert.throws(() => validatePublicHttpsUrl('https://10.0.0.5/api'), ValidationError); // RFC1918 private IP

  // Price
  assert.equal(validatePriceInput('0'), 0);
  assert.equal(validatePriceInput('49.00'), 4900);
  assert.throws(() => validatePriceInput('0.50'), ValidationError); // < ₹1
  assert.throws(() => validatePriceInput('-10'), ValidationError); // negative

  // Course & Semester
  assert.deepEqual(validateCourseAndSemester('bpharm', '8'), { course: 'bpharm', semester: 8 });
  assert.deepEqual(validateCourseAndSemester('dpharm', '2'), { course: 'dpharm', semester: 2 });
  assert.throws(() => validateCourseAndSemester('dpharm', '3'), ValidationError); // D.Pharm max 2 years

  // Razorpay Credentials
  assert.deepEqual(
    validateRazorpayCredentials({ keyId: 'rzp_test_12345678', keySecret: 'secret_key_8_chars' }),
    { keyId: 'rzp_test_12345678', keySecret: 'secret_key_8_chars' }
  );
  assert.throws(() => validateRazorpayCredentials({ keyId: 'invalid_id', keySecret: 'secret' }), ValidationError);
});

test('8. Student Authentication, Password Hashing & Session Tokens', async () => {
  const {
    hashPassword,
    verifyPassword,
    createStudentToken,
    verifyStudentToken,
    studentSignup,
    studentLogin,
    studentBuyerHash,
    StudentAuthError,
  } = await import('../lib/firebase-auth.ts');
  const { database } = await import('../lib/storage.ts');

  // 1. Password hashing
  const salt = 'aabbccddeeff00112233445566778899';
  const hash = hashPassword('MySecurePass123', salt);
  assert.equal(typeof hash, 'string');
  assert.equal(hash.length, 64);
  assert.equal(verifyPassword('MySecurePass123', salt, hash), true);
  assert.equal(verifyPassword('WrongPass123', salt, hash), false);

  // 2. Session tokens
  const token = createStudentToken('student-uuid-1', 'student@test.edu');
  assert.ok(token.includes('.'));
  const verified = verifyStudentToken(token);
  assert.ok(verified);
  assert.equal(verified.uid, 'student-uuid-1');
  assert.equal(verified.email, 'student@test.edu');

  // Tampered token
  const tampered = token.replace(/a/g, 'b');
  assert.equal(verifyStudentToken(tampered), null);

  // 3. Buyer Hash
  const bHash = await studentBuyerHash('student-uuid-1');
  assert.equal(bHash.length, 64);

  // 4. End-to-End Database Signup & Login
  const testEmail = `test_${Date.now()}@ez-edu.test`;
  const signupResult = await studentSignup(testEmail, 'validPassword123');
  assert.ok(signupResult.localId);
  assert.equal(signupResult.email, testEmail);

  // Attempt duplicate signup
  await assert.rejects(async () => {
    await studentSignup(testEmail, 'anotherPassword123');
  }, StudentAuthError);

  // Login with correct password
  const loginResult = await studentLogin(testEmail, 'validPassword123');
  assert.equal(loginResult.localId, signupResult.localId);
  assert.equal(loginResult.email, testEmail);

  // Login with incorrect password
  await assert.rejects(async () => {
    await studentLogin(testEmail, 'wrongPassword');
  }, StudentAuthError);

  // Clean up test student
  await database()
    .prepare('DELETE FROM students WHERE email = ?')
    .bind(testEmail)
    .run();
});


