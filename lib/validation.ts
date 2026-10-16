import type { QuizInput, Question } from './quiz';

export class ValidationError extends Error {
  constructor(
    message: string,
    public status = 400,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate UUID string format (v4 / standard 8-4-4-4-12 hex).
 */
export function validateUUID(id: unknown, fieldName = 'ID'): string {
  if (typeof id !== 'string') {
    throw new ValidationError(`Invalid ${fieldName}: must be a string.`, 400, fieldName);
  }
  const trimmed = id.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(trimmed)) {
    throw new ValidationError(`Invalid ${fieldName} format.`, 400, fieldName);
  }
  return trimmed;
}

/**
 * Validate and normalize email address.
 */
export function validateEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw new ValidationError('Email address must be a string.', 400, 'email');
  }
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || trimmed.length > 254) {
    throw new ValidationError('Enter a valid email address under 254 characters.', 400, 'email');
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    throw new ValidationError('Enter a valid email address (e.g. student@college.edu).', 400, 'email');
  }
  return trimmed;
}

/**
 * Validate password requirements.
 */
export function validatePassword(password: unknown, isSignup = false): string {
  if (typeof password !== 'string') {
    throw new ValidationError('Password must be a string.', 400, 'password');
  }
  if (!password) {
    throw new ValidationError('Password cannot be empty.', 400, 'password');
  }
  if (password.length > 128) {
    throw new ValidationError('Password cannot exceed 128 characters.', 400, 'password');
  }
  if (isSignup && password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long.', 400, 'password');
  }
  return password;
}

/**
 * Validate a sanitized text string within bounds.
 */
export function validateString(
  val: unknown,
  fieldName: string,
  minLen = 1,
  maxLen = 255
): string {
  if (typeof val !== 'string') {
    throw new ValidationError(`${fieldName} must be a string.`, 400, fieldName);
  }
  // Strip dangerous ASCII control chars (allow standard linebreaks if needed)
  const sanitized = val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (sanitized.length < minLen) {
    throw new ValidationError(
      minLen === 1
        ? `${fieldName} is required.`
        : `${fieldName} must be at least ${minLen} characters long.`,
      400,
      fieldName
    );
  }
  if (sanitized.length > maxLen) {
    throw new ValidationError(
      `${fieldName} cannot exceed ${maxLen} characters.`,
      400,
      fieldName
    );
  }
  return sanitized;
}

/**
 * Validate public HTTPS URL and protect against SSRF (private IPs, loopback, cloud metadata).
 */
export function validatePublicHttpsUrl(url: unknown, fieldName = 'URL'): string {
  if (typeof url !== 'string' || !url.trim()) {
    throw new ValidationError(`${fieldName} is required.`, 400, fieldName);
  }
  const trimmed = url.trim();
  if (trimmed.length > 2000) {
    throw new ValidationError(`${fieldName} cannot exceed 2000 characters.`, 400, fieldName);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ValidationError(`Enter a valid HTTPS link for ${fieldName}.`, 400, fieldName);
  }

  if (parsed.protocol !== 'https:') {
    throw new ValidationError(`${fieldName} must use a secure HTTPS protocol.`, 400, fieldName);
  }

  if (parsed.username || parsed.password) {
    throw new ValidationError(`${fieldName} cannot include embedded login credentials.`, 400, fieldName);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block loopback, localhost, and internal link-local / AWS metadata
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal'
  ) {
    throw new ValidationError(`${fieldName} must point to a public external website.`, 400, fieldName);
  }

  // Block private RFC 1918 IPv4 ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = hostname.match(ipv4Regex);
  if (ipMatch) {
    const p1 = parseInt(ipMatch[1], 10);
    const p2 = parseInt(ipMatch[2], 10);
    if (
      p1 === 10 || // 10.0.0.0/8
      (p1 === 172 && p2 >= 16 && p2 <= 31) || // 172.16.0.0/12
      (p1 === 192 && p2 === 168) || // 192.168.0.0/16
      (p1 === 169 && p2 === 254) // 169.254.0.0/16
    ) {
      throw new ValidationError(`${fieldName} cannot target private network IP addresses.`, 400, fieldName);
    }
  }

  return trimmed;
}

/**
 * Validate an uploaded PDF file and check MIME / Magic bytes.
 */
export async function validatePdfFile(
  file: unknown,
  maxBytes = 20 * 1024 * 1024
): Promise<{ buffer: ArrayBuffer; name: string; size: number }> {
  if (!(file instanceof File) || !file.size) {
    throw new ValidationError('Please select a valid PDF file.', 400, 'file');
  }

  if (file.size > maxBytes) {
    throw new ValidationError(
      `File size exceeds limit (${(maxBytes / (1024 * 1024)).toFixed(0)} MB max).`,
      400,
      'file'
    );
  }

  const fileName = file.name.trim();
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    throw new ValidationError('Only PDF files (.pdf) are supported.', 400, 'file');
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength < 5) {
    throw new ValidationError('The uploaded file is empty or corrupted.', 400, 'file');
  }

  // Check magic bytes: "%PDF-" = 0x25, 0x50, 0x44, 0x46, 0x2D
  const header = new TextDecoder('ascii').decode(buffer.slice(0, 5));
  if (header !== '%PDF-') {
    throw new ValidationError('The uploaded file is not a valid PDF document.', 400, 'file');
  }

  return { buffer, name: fileName, size: file.size };
}

/**
 * Validate price input in rupees and convert to integer paise.
 */
export function validatePriceInput(price: unknown): number {
  const str = String(price ?? '').trim();
  if (!str || str === '0') return 0;

  if (!/^\d{1,5}(\.\d{1,2})?$/.test(str)) {
    throw new ValidationError(
      'Enter a valid price from ₹0 to ₹99,999.99 (up to 2 decimal places).',
      400,
      'price'
    );
  }

  const [whole, fraction = ''] = str.split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));

  if (paise > 0 && paise < 100) {
    throw new ValidationError(
      'Paid study materials must cost at least ₹1.00. Set ₹0 for free access.',
      400,
      'price'
    );
  }

  return paise;
}

/**
 * Validate course and semester combination.
 */
export function validateCourseAndSemester(
  courseInput: unknown,
  semesterInput: unknown
): { course: 'bpharm' | 'dpharm'; semester: number } {
  const courseStr = String(courseInput || '').trim().toLowerCase();
  if (!['bpharm', 'dpharm'].includes(courseStr)) {
    throw new ValidationError('Course must be either "bpharm" or "dpharm".', 400, 'course');
  }
  const course = courseStr as 'bpharm' | 'dpharm';

  const semNum = Number(semesterInput);
  if (!Number.isInteger(semNum) || semNum < 1) {
    throw new ValidationError('Semester or academic year must be a positive integer.', 400, 'semester');
  }

  const maxSem = course === 'dpharm' ? 2 : 8;
  if (semNum > maxSem) {
    throw new ValidationError(
      `${course === 'dpharm' ? 'D.Pharm' : 'B.Pharm'} only has ${maxSem} ${
        course === 'dpharm' ? 'years' : 'semesters'
      }.`,
      400,
      'semester'
    );
  }

  return { course, semester: semNum };
}

/**
 * Validate study material kind.
 */
export function validateMaterialKind(
  kindInput: unknown
): 'Notes' | 'Question paper' | 'Syllabus' | 'Study material' {
  const allowed = ['Notes', 'Question paper', 'Syllabus', 'Study material'] as const;
  const str = String(kindInput || '').trim();
  if (!allowed.includes(str as (typeof allowed)[number])) {
    throw new ValidationError(
      'Material type must be "Notes", "Question paper", "Syllabus", or "Study material".',
      400,
      'kind'
    );
  }
  return str as (typeof allowed)[number];
}

/**
 * Validate student candidate details for exam registration.
 */
export function validateCandidateDetails(data: unknown): {
  name: string;
  college: string;
  semester: number;
} {
  const x = data as Record<string, unknown> | null;
  if (!x || typeof x !== 'object') {
    throw new ValidationError('Candidate details are required.', 400);
  }

  const name = validateString(x.name, 'Student full name', 2, 120);
  const college = validateString(x.college, 'College or university name', 2, 200);

  const semNum = Number(x.semester);
  if (!Number.isInteger(semNum) || semNum < 1 || semNum > 8) {
    throw new ValidationError('Current semester must be an integer between 1 and 8.', 400, 'semester');
  }

  return { name, college, semester: semNum };
}

/**
 * Detailed quiz authoring validation with granular field and question identification.
 */
export function validateQuizDetailed(input: unknown): QuizInput {
  const v = input as Partial<QuizInput> | null;
  if (!v || typeof v !== 'object') {
    throw new ValidationError('Quiz data payload is required.', 400);
  }

  const title = validateString(v.title, 'Quiz title', 3, 160);
  const subject = validateString(v.subject, 'Subject name', 2, 160);

  const courseStr = String(v.course || '').trim().toLowerCase();
  if (!['bpharm', 'dpharm', 'python'].includes(courseStr)) {
    throw new ValidationError('Course must be "bpharm", "dpharm", or "python".', 400, 'course');
  }

  const semNum = Number(v.semester);
  const maxSem = courseStr === 'dpharm' ? 2 : 8;
  if (!Number.isInteger(semNum) || semNum < 1 || semNum > maxSem) {
    throw new ValidationError(
      `Semester must be between 1 and ${maxSem} for ${courseStr.toUpperCase()}.`,
      400,
      'semester'
    );
  }

  const unit = v.unit !== undefined && v.unit !== null ? String(v.unit).trim() : '';
  if (unit.length > 80) {
    throw new ValidationError('Unit or chapter name cannot exceed 80 characters.', 400, 'unit');
  }

  const duration = Number(v.duration);
  if (!Number.isInteger(duration) || duration < 1 || duration > 180) {
    throw new ValidationError('Quiz duration must be between 1 and 180 minutes.', 400, 'duration');
  }

  const published = typeof v.published === 'boolean' ? v.published : false;

  if (!Array.isArray(v.questions) || v.questions.length < 1) {
    throw new ValidationError('A quiz must have at least 1 question.', 400, 'questions');
  }
  if (v.questions.length > 100) {
    throw new ValidationError('A quiz cannot contain more than 100 questions.', 400, 'questions');
  }

  const validatedQuestions: Question[] = [];

  for (let i = 0; i < v.questions.length; i++) {
    const q = v.questions[i];
    const qNum = i + 1;

    if (!q || typeof q !== 'object') {
      throw new ValidationError(`Question ${qNum} has invalid data.`, 400, `questions[${i}]`);
    }

    const text = validateString(q.text, `Question ${qNum} statement`, 2, 2000);

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new ValidationError(
        `Question ${qNum} must have exactly 4 choices (Options A, B, C, and D).`,
        400,
        `questions[${i}].options`
      );
    }

    const cleanedOptions: string[] = [];
    for (let j = 0; j < 4; j++) {
      const optLabel = `Option ${String.fromCharCode(65 + j)}`;
      const optText = validateString(q.options[j], `Question ${qNum}, ${optLabel}`, 1, 500);
      cleanedOptions.push(optText);
    }

    // Check for distinct options
    const uniqueOptions = new Set(cleanedOptions.map((o) => o.toLowerCase()));
    if (uniqueOptions.size !== 4) {
      throw new ValidationError(
        `Question ${qNum} contains duplicate options. All 4 choices must be distinct.`,
        400,
        `questions[${i}].options`
      );
    }

    const ansNum = Number(q.answer);
    if (!Number.isInteger(ansNum) || ansNum < 0 || ansNum > 3) {
      throw new ValidationError(
        `Question ${qNum}: Select a valid correct answer choice (0–3 / Option A–D).`,
        400,
        `questions[${i}].answer`
      );
    }

    const explanation =
      q.explanation !== undefined && q.explanation !== null ? String(q.explanation).trim() : '';
    if (explanation.length > 2000) {
      throw new ValidationError(
        `Question ${qNum} explanation cannot exceed 2000 characters.`,
        400,
        `questions[${i}].explanation`
      );
    }

    validatedQuestions.push({
      text,
      options: cleanedOptions,
      answer: ansNum,
      explanation,
    });
  }

  return {
    title,
    subject,
    course: courseStr,
    semester: semNum,
    unit,
    duration,
    published,
    questions: validatedQuestions,
  };
}

/**
 * Validate candidate quiz answers array.
 */
export function validateQuizAnswers(
  answers: unknown,
  expectedLength: number
): (number | null)[] {
  if (!Array.isArray(answers)) {
    throw new ValidationError('Answers payload must be an array.', 400, 'answers');
  }

  if (answers.length !== expectedLength) {
    throw new ValidationError(
      `Answers array count (${answers.length}) does not match question count (${expectedLength}).`,
      400,
      'answers'
    );
  }

  const cleaned: (number | null)[] = [];
  for (let i = 0; i < answers.length; i++) {
    const val = answers[i];
    if (val === null || val === undefined) {
      cleaned.push(null);
    } else {
      const n = Number(val);
      if (!Number.isInteger(n) || n < 0 || n > 3) {
        throw new ValidationError(
          `Answer at question ${i + 1} is invalid (must be choice 0, 1, 2, 3, or null).`,
          400,
          `answers[${i}]`
        );
      }
      cleaned.push(n);
    }
  }

  return cleaned;
}

/**
 * Validate Razorpay gateway configuration credentials.
 */
export function validateRazorpayCredentials(data: unknown): {
  keyId: string;
  keySecret: string;
} {
  const d = data as Record<string, unknown> | null;
  if (!d || typeof d !== 'object') {
    throw new ValidationError('Razorpay credentials payload is required.', 400);
  }

  const keyId = String(d.keyId || '').trim();
  const keySecret = String(d.keySecret || '').trim();

  if (!/^rzp_(test|live)_[A-Za-z0-9]{8,80}$/.test(keyId)) {
    throw new ValidationError(
      'Enter a valid Razorpay Key ID (starts with rzp_test_ or rzp_live_).',
      400,
      'keyId'
    );
  }

  if (!keySecret || keySecret.length < 8 || keySecret.length > 200) {
    throw new ValidationError(
      'Enter a valid Razorpay Key Secret (8 to 200 characters).',
      400,
      'keySecret'
    );
  }

  return { keyId, keySecret };
}
