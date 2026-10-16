import { pgTable, text, integer, index } from 'drizzle-orm/pg-core';

export const notes = pgTable(
  'notes',
  {
    id: text('id').primaryKey(),
    course: text('course').notNull().default('bpharm'),
    semester: integer('semester').notNull(),
    subject: text('subject').notNull(),
    title: text('title').notNull(),
    unit: text('unit').notNull().default(''),
    kind: text('kind').notNull(),
    url: text('url').notNull().default(''),
    fileKey: text('file_key'),
    pricePaise: integer('price_paise').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('idx_notes_semester').on(t.semester),
    index('idx_notes_course_semester').on(t.course, t.semester),
  ]
);

export const paymentSettings = pgTable('payment_settings', {
  id: text('id').primaryKey(),
  encryptedCredentials: text('encrypted_credentials').notNull(),
});

export const noteOrders = pgTable(
  'note_orders',
  {
    id: text('id').primaryKey(),
    noteId: text('note_id').notNull(),
    buyerHash: text('buyer_hash').notNull(),
    amount: integer('amount').notNull(),
    keyId: text('key_id').notNull(),
    paymentId: text('payment_id'),
    status: text('status').notNull().default('created'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('idx_note_orders_buyer_note').on(t.buyerHash, t.noteId),
    index('idx_note_orders_buyer').on(t.buyerHash),
    index('idx_note_orders_status').on(t.status),
  ]
);

export const quizzes = pgTable(
  'quizzes',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    subject: text('subject').notNull(),
    course: text('course').notNull().default('bpharm'),
    semester: integer('semester').notNull().default(1),
    unit: text('unit').notNull().default(''),
    duration: integer('duration').notNull().default(10),
    published: integer('published').notNull().default(0),
    questions: text('questions').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull().default(''),
  },
  (t) => [
    index('idx_quizzes_course_sem_pub').on(t.course, t.semester, t.published),
    index('idx_quizzes_published').on(t.published),
  ]
);

export const quizSessions = pgTable(
  'quiz_sessions',
  {
    id: text('id').primaryKey(),
    quizId: text('quiz_id').notNull(),
    userId: text('user_id').notNull(),
    studentName: text('student_name').notNull(),
    collegeName: text('college_name'),
    studentSemester: integer('student_semester'),
    quizTitle: text('quiz_title').notNull(),
    subject: text('subject').notNull(),
    snapshot: text('snapshot').notNull(),
    duration: integer('duration').notNull(),
    startedAt: text('started_at').notNull(),
    submittedAt: text('submitted_at'),
    answers: text('answers'),
    score: integer('score'),
    total: integer('total').notNull(),
  },
  (t) => [
    index('idx_attempts_user').on(t.userId),
    index('idx_attempts_quiz').on(t.quizId),
    index('idx_sessions_started_at').on(t.startedAt),
  ]
);

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: text('id').primaryKey(),
    quizId: text('quiz_id').notNull(),
    userId: text('user_id').notNull(),
    student: text('student').notNull(),
    score: integer('score').notNull(),
    total: integer('total').notNull(),
    answers: text('answers').notNull(),
    createdAt: text('created_at').notNull(),
    quizTitle: text('quiz_title'),
    subject: text('subject'),
  },
  (t) => [index('idx_quiz_attempts_quiz').on(t.quizId)]
);

export const students = pgTable(
  'students',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    salt: text('salt').notNull(),
    name: text('name'),
    college: text('college'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('idx_students_email').on(t.email)]
);

