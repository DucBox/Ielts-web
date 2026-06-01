import { neon } from '@neondatabase/serverless';


// ─── Rate limiting (KV sliding window) ───────────────────────────────────────
async function checkRateLimit(kv, key, limit, windowSecs) {
  if (!kv) return false;
  try {
    const now = Math.floor(Date.now() / 1000);
    const raw = await kv.get(key, 'json').catch(() => null);
    const data = raw && typeof raw === 'object' ? raw : { count: 0, reset: now + windowSecs };
    if (now >= data.reset) {
      data.count = 0;
      data.reset = now + windowSecs;
    }
    data.count += 1;
    // KV minimum TTL is 60s
    const ttl = Math.max(60, windowSecs);
    await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
    return data.count > limit;
  } catch {
    return false; // never block request if KV fails
  }
}

// ─── Simple HTML sanitizer (strip dangerous tags/attrs for block.html) ───────
function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  // Remove script, style, iframe, object, embed, form tags entirely
  let s = html.replace(/<(script|style|iframe|object|embed|form|base|meta|link)\b[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<(script|style|iframe|object|embed|form|base|meta|link)\b[^>]*>/gi, '');
  // Remove dangerous event handlers and javascript: in attributes
  s = s.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  s = s.replace(/\s+href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, '');
  s = s.replace(/\s+src\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, '');
  return s;
}

// ─── Allowed CORS origins ─────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://ielts-teacher.pages.dev',
  'https://ielts-student.pages.dev',
];

const NOTIFICATION_EMAIL_FIELD_KEY = 'notification_email';
const EMAIL_EVENT_TYPES = {
  NEW_ASSIGNMENT: 'new_assignment',
  SCORE_RELEASED: 'score_released',
  DEADLINE_1DAY: 'deadline_1day',
};
const SKILL_LABELS = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

// ─── Pure utilities (no request context) ──────────────────────────────────────

function matchPath(pattern, pathname) {
  const pp = pattern.split('/');
  const tp = pathname.split('/');
  if (pp.length !== tp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      params[pp[i].slice(1)] = tp[i];
    } else if (pp[i] !== tp[i]) {
      return null;
    }
  }
  return params;
}

function getStudentPasswordValidationError(password) {
  const value = String(password || '');
  if (value.length < 6) return 'Mật khẩu mới phải có ít nhất 6 ký tự';
  if (!/\p{L}/u.test(value)) return 'Mật khẩu mới phải có ít nhất 1 chữ cái';
  if (!/\p{N}/u.test(value)) return 'Mật khẩu mới phải có ít nhất 1 số';
  if (!/[^\p{L}\p{N}\s]/u.test(value)) return 'Mật khẩu mới phải có ít nhất 1 ký tự đặc biệt';
  return '';
}

function extractR2Key(url, publicBase) {
  if (!url) return null;
  if (publicBase && url.startsWith(publicBase + '/')) return url.slice(publicBase.length + 1);
  if (url.startsWith('/files/')) return url.slice('/files/'.length);
  console.warn('[extractR2Key] URL không khớp publicBase — bỏ qua:', url);
  return null;
}

function buildR2PublicUrl(env, key) {
  return `${String(env.R2_PUBLIC_URL || '').replace(/\/+$/, '')}/${key}`;
}

function sanitizeFileName(name, fallback = 'audio') {
  return String(name || fallback).replace(/[^\w.\-]+/g, '_');
}

function isAudioContentType(value) {
  return String(value || '').toLowerCase().startsWith('audio/');
}

// Strip codec qualifiers (e.g. "audio/webm;codecs=opus" → "audio/webm") so OpenAI accepts the file.
function normalizeAudioMime(raw) {
  const base = String(raw || '').split(';')[0].trim().toLowerCase();
  if (!base || !base.startsWith('audio/')) return '';
  return base;
}

// All formats OpenAI Whisper accepts, mapped both ways.
// ext→mime: use the canonical MIME for that extension
// mime→ext: covers every browser/OS variant that maps to the same container
const AUDIO_EXT_TO_MIME = {
  mp3: 'audio/mpeg', mp4: 'audio/mp4', mpeg: 'audio/mpeg', mpga: 'audio/mpeg',
  m4a: 'audio/mp4', ogg: 'audio/ogg', oga: 'audio/ogg',
  wav: 'audio/wav', wave: 'audio/wav',
  webm: 'audio/webm', flac: 'audio/flac', aac: 'audio/aac',
  aif: 'audio/aiff', aiff: 'audio/aiff',
};
const AUDIO_MIME_TO_EXT = {
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'mp4',
  'audio/m4a': 'm4a', 'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/wave': 'wav',
  'audio/x-wav': 'wav', 'audio/vnd.wav': 'wav',
  'audio/webm': 'webm', 'audio/flac': 'flac', 'audio/aac': 'aac',
  'audio/aiff': 'aiff', 'audio/x-aiff': 'aiff',
};

// Detect true audio format from file magic bytes, regardless of extension or MIME metadata.
// Returns { mime, ext } or null if unrecognised.
function sniffAudioFormat(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (b.length < 4) return null;

  // WAV: RIFF????WAVE
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) {
    if (b.length >= 12 && b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45)
      return { mime: 'audio/wav', ext: 'wav' };
  }
  // MP3: ID3 tag header
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33)
    return { mime: 'audio/mpeg', ext: 'mp3' };
  // MP3: MPEG sync word FF E*/F*
  if (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0 && (b[1] & 0x06) !== 0)
    return { mime: 'audio/mpeg', ext: 'mp3' };
  // OGG: OggS
  if (b[0] === 0x4F && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53)
    return { mime: 'audio/ogg', ext: 'ogg' };
  // FLAC: fLaC
  if (b[0] === 0x66 && b[1] === 0x4C && b[2] === 0x61 && b[3] === 0x43)
    return { mime: 'audio/flac', ext: 'flac' };
  // WebM / EBML: 1A 45 DF A3
  if (b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3)
    return { mime: 'audio/webm', ext: 'webm' };
  // MP4 / M4A: ftyp box at offset 4
  if (b.length >= 8 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70)
    return { mime: 'audio/mp4', ext: 'm4a' };
  // AAC ADTS: FF F1 (MPEG-4) or FF F9 (MPEG-2)
  if (b[0] === 0xFF && (b[1] === 0xF1 || b[1] === 0xF9))
    return { mime: 'audio/aac', ext: 'aac' };

  return null;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function awsPercentEncode(value) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, ch => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeR2KeyPath(key) {
  return String(key).split('/').map(awsPercentEncode).join('/');
}

function formatAmzDate(date = new Date()) {
  const iso = new Date(date).toISOString().replace(/[:-]|\.\d{3}/g, '');
  const amzDate = iso.replace(/\.\d+Z$/, 'Z');
  return {
    amzDate,
    shortDate: amzDate.slice(0, 8),
  };
}

async function sha256Hex(text) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return bytesToHex(new Uint8Array(digest));
}

async function hmacSha256(key, message) {
  const enc = new TextEncoder();
  const rawKey = typeof key === 'string' ? enc.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return new Uint8Array(signature);
}

async function createR2PresignedPutUrl(env, { key, contentType, expiresIn = 900 }) {
  const accountId = String(env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = String(env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = String(env.R2_BUCKET_NAME || '').trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw Object.assign(new Error('Thiếu cấu hình presigned upload cho R2'), { statusCode: 500 });
  }

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const pathname = `/${bucketName}/${encodeR2KeyPath(key)}`;
  const { amzDate, shortDate } = formatAmzDate();
  const credentialScope = `${shortDate}/auto/s3/aws4_request`;
  const signedHeaders = 'content-type;host';

  const queryEntries = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD'],
    ['X-Amz-Credential', `${accessKeyId}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders', signedHeaders],
  ];

  const canonicalQuery = queryEntries
    .slice()
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${awsPercentEncode(k)}=${awsPercentEncode(v)}`)
    .join('&');

  const canonicalHeaders = `content-type:${String(contentType || 'application/octet-stream').trim()}\nhost:${host}\n`;
  const canonicalRequest = [
    'PUT',
    pathname,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, shortDate);
  const kRegion = await hmacSha256(kDate, 'auto');
  const kService = await hmacSha256(kRegion, 's3');
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = bytesToHex(await hmacSha256(kSigning, stringToSign));

  return {
    url: `https://${host}${pathname}?${canonicalQuery}&X-Amz-Signature=${signature}`,
    key,
    publicUrl: buildR2PublicUrl(env, key),
    headers: { 'Content-Type': String(contentType || 'application/octet-stream') },
    expiresIn,
  };
}

function buildTeacherAudioKey(fileName) {
  return `audio/${crypto.randomUUID()}-${sanitizeFileName(fileName, 'audio')}`;
}

function buildStudentSpeakingKey(assignmentId, studentId, fileName) {
  return `speaking/${assignmentId}/${studentId}-${crypto.randomUUID()}-${sanitizeFileName(fileName, 'audio')}`;
}

function isExpectedStudentSpeakingKey(key, assignmentId, studentId) {
  return String(key || '').startsWith(`speaking/${assignmentId}/${studentId}-`);
}

async function r2RefIncrement(sql, key) {
  if (!key) return;
  await sql`
    INSERT INTO r2_asset_refs (r2_key, ref_count)
    VALUES (${key}, 1)
    ON CONFLICT (r2_key) DO UPDATE
    SET ref_count = r2_asset_refs.ref_count + 1, last_touched_at = NOW()
  `;
}

async function r2SafeDelete(env, sql, key) {
  if (!key) return;
  const [refRow] = await sql`
    UPDATE r2_asset_refs
    SET ref_count = ref_count - 1, last_touched_at = NOW()
    WHERE r2_key = ${key}
    RETURNING ref_count
  `;
  const refCount = refRow?.ref_count ?? null;
  if (refCount === null || refCount <= 0) {
    await env.R2.delete(key).catch(e => console.error('R2 delete failed:', key, e));
  }
}

function normalizeContentBlocks(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, index) => {
      const type = item?.type === 'image' ? 'image' : 'text';
      const id = String(item?.id || `block-${index + 1}`);
      if (type === 'image') {
        const url = String(item?.url || '').trim();
        if (!url) return null;
        const width = Number(item?.width);
        return {
          id,
          type: 'image',
          url,
          alt: String(item?.alt || '').trim(),
          ...(Number.isFinite(width) && width > 0 ? { width: Math.round(width) } : {}),
        };
      }
      const html = item?.html !== undefined ? String(item.html) : undefined;
      const rawText = item?.text != null ? String(item.text) : '';
      const text = rawText || (html ? html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') : '');
      return {
        id,
        type: 'text',
        text,
        ...(html !== undefined ? { html: sanitizeHtml(html) } : {}),
      };
    })
    .filter(Boolean);
}

function blocksToPlainText(blocks) {
  const text = normalizeContentBlocks(blocks)
    .filter(block => block.type === 'text')
    .map(block => block.text.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
  return text || null;
}

function extractContentBlockImageUrls(blocks) {
  return normalizeContentBlocks(blocks)
    .filter(block => block.type === 'image' && block.url)
    .map(block => block.url);
}

function getOpenAIEndpoint(env, path, kind = 'generic') {
  const exact =
    kind === 'stt' ? env.OPENAI_STT_URL :
    kind === 'responses' ? env.OPENAI_RESPONSES_URL :
    null;
  if (exact && String(exact).trim()) return String(exact).trim();

  const base = String(env.OPENAI_BASE_URL || 'https://api.openai.com')
    .trim()
    .replace(/\/+$/, '');
  const cleanPath = String(path || '').startsWith('/') ? String(path) : `/${path}`;
  return `${base}${cleanPath}`;
}

function getOpenAIAuthToken(env, endpoint, kind = 'generic') {
  const normalizedEndpoint = String(endpoint || '').trim();
  const directOpenAI = /^https:\/\/api\.openai\.com(?:\/|$)/i.test(normalizedEndpoint);
  if (!directOpenAI && env.OPENAI_STT_BEARER_TOKEN) {
    return String(env.OPENAI_STT_BEARER_TOKEN).trim();
  }
  return String(env.OPENAI_API_KEY || '').trim();
}

function parseOpenAIError(rawText) {
  if (!rawText) return {};
  try {
    const parsed = JSON.parse(rawText);
    const err = parsed?.error || {};
    return {
      code: err.code || null,
      type: err.type || null,
      message: err.message || null,
    };
  } catch {
    return {};
  }
}

function isUnsupportedRegionOpenAIError(rawText) {
  return parseOpenAIError(rawText).code === 'unsupported_country_region_territory';
}

async function transcribeR2Audio(env, r2Key) {
  if (!env.OPENAI_API_KEY) {
    throw Object.assign(new Error('STT not configured'), { statusCode: 500 });
  }

  const obj = await env.R2.get(r2Key);
  if (!obj) {
    throw Object.assign(new Error('Audio file not found in storage'), { statusCode: 404 });
  }

  const MAX_STT_BYTES = 25 * 1024 * 1024;
  if (obj.size > MAX_STT_BYTES) {
    throw Object.assign(
      new Error(`File quá lớn để tự động transcribe (${(obj.size / 1024 / 1024).toFixed(0)} MB, tối đa 25 MB). Vui lòng nhập script thủ công.`),
      { statusCode: 413 },
    );
  }

  // Derive format from file extension first (browser sets this correctly at upload time),
  // then fall back to R2 object metadata. This avoids MIME mismatch when R2 stores an
  // incomplete or browser-variant type (e.g. audio/x-m4a, audio/wave).
  const rawFileName = r2Key.split('/').pop() || 'audio';
  const rawExt = (rawFileName.match(/\.(\w{2,5})$/) || [])[1]?.toLowerCase() || '';
  const mimeFromExt = AUDIO_EXT_TO_MIME[rawExt] || '';
  const mimeFromMeta = normalizeAudioMime(obj.httpMetadata?.contentType);
  let contentType = mimeFromExt || mimeFromMeta || 'audio/mpeg';

  // Ensure filename always carries a recognized extension for OpenAI format detection.
  const ext = rawExt || AUDIO_MIME_TO_EXT[contentType] || 'mp3';
  let fileName = rawExt ? rawFileName : `${rawFileName}.${ext}`;

  // Materialize content into memory as raw bytes, then sniff actual format from magic bytes.
  // This corrects files whose extension/MIME lies about the true container
  // (e.g. a WAV file renamed to .mp3 — OpenAI would reject it as "corrupted").
  const arrayBuffer = await obj.arrayBuffer();
  const sniffed = sniffAudioFormat(new Uint8Array(arrayBuffer, 0, Math.min(12, arrayBuffer.byteLength)));
  if (sniffed && sniffed.mime !== contentType) {
    const baseName = rawFileName.replace(/\.\w{2,5}$/, '') || 'audio';
    console.log('[STT sniff override]', JSON.stringify({ was: { mime: contentType, file: fileName }, now: { mime: sniffed.mime, ext: sniffed.ext } }));
    contentType = sniffed.mime;
    fileName = `${baseName}.${sniffed.ext}`;
  }
  console.log('[STT]', JSON.stringify({ key: r2Key, r2Mime: obj.httpMetadata?.contentType, usedMime: contentType, file: fileName, r2Bytes: obj.size, abBytes: arrayBuffer.byteLength }));

  const sttForm = new FormData();
  sttForm.append('file', new Blob([arrayBuffer], { type: contentType }), fileName);
  sttForm.append('model', 'gpt-4o-mini-transcribe');
  sttForm.append('response_format', 'json');

  const sttUrl = getOpenAIEndpoint(env, '/v1/audio/transcriptions', 'stt');
  const sttAuthToken = getOpenAIAuthToken(env, sttUrl, 'stt');
  const sttRes = await fetch(sttUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sttAuthToken}` },
    body: sttForm,
  });

  if (!sttRes.ok) {
    const txt = await sttRes.text();
    console.error('STT error from R2 audio:', txt);
    if (isUnsupportedRegionOpenAIError(txt)) {
      throw Object.assign(
        new Error('Dịch vụ nhận diện giọng nói đang bị chặn theo vùng từ hạ tầng hiện tại. Nếu app đang chạy qua Cloudflare Worker, hãy route STT qua một server/proxy khác rồi thử lại.'),
        { statusCode: 502 },
      );
    }
    throw Object.assign(new Error('Không thể trích xuất script từ audio'), { statusCode: 502 });
  }

  const data = await sttRes.json();
  return {
    text: data.text || '',
    contentType,
    size: obj.size,
  };
}

// ─── Teacher lookup ───────────────────────────────────────────────────────────

async function getTeacherId(sql) {
  const [row] = await sql`SELECT id FROM teachers LIMIT 1`;
  if (!row) throw new Error('No teacher configured. Seed the teachers table first.');
  return row.id;
}

// ─── Password hashing — PBKDF2 with SHA-256 legacy migration support ──────────

async function hashPassword(password) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key, 256,
  );
  return btoa(String.fromCharCode(...salt)) + '.' + btoa(String.fromCharCode(...new Uint8Array(bits)));
}

async function verifyPassword(password, storedHash) {
  if (/^[0-9a-f]{64}$/.test(storedHash)) {
    // Legacy SHA-256 (no salt) — verify then re-hash on next login
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hex === storedHash;
  }
  // PBKDF2 format: <saltB64>.<hashB64>
  const dotIdx = storedHash.indexOf('.');
  if (dotIdx === -1) return false;
  const saltB64 = storedHash.slice(0, dotIdx);
  const hashB64 = storedHash.slice(dotIdx + 1);
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key, 256,
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits))) === hashB64;
}

function normalizeStudentFullName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toUsernameAscii(value) {
  return normalizeStudentFullName(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, ch => (ch === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildStudentUsernameStem(fullName) {
  const tokens = toUsernameAscii(fullName).split(' ').filter(Boolean);
  if (tokens.length === 0) return null;
  const lastName = tokens[tokens.length - 1];
  const initials = tokens.slice(0, -1).map(token => token[0]).join('');
  return `${lastName}${initials}`;
}

function cryptoRandomInt(maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) return 0;
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % maxExclusive;
}

function randomChar(chars) {
  return chars[cryptoRandomInt(chars.length)];
}

function shuffleInPlace(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function generateStudentPassword(length = 16) {
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const specials = '!@#$%^&*_-+=';
  const all = lowers + uppers + digits + specials;
  const chars = [
    randomChar(lowers),
    randomChar(uppers),
    randomChar(digits),
    randomChar(specials),
  ];
  while (chars.length < length) chars.push(randomChar(all));
  return shuffleInPlace(chars).join('');
}

async function usernameExists(sql, username) {
  const [row] = await sql`SELECT 1 FROM students WHERE username = ${username} LIMIT 1`;
  return Boolean(row);
}

async function generateUniqueStudentUsername(sql, fullName, reservedUsernames = new Set()) {
  const stem = buildStudentUsernameStem(fullName);
  if (!stem) {
    throw Object.assign(new Error('Họ tên học sinh không hợp lệ'), { statusCode: 400 });
  }

  const tried = new Set();
  for (let attempt = 0; attempt < 24; attempt++) {
    const candidate = `${stem}_${String(cryptoRandomInt(1000)).padStart(3, '0')}`;
    if (tried.has(candidate) || reservedUsernames.has(candidate)) continue;
    tried.add(candidate);
    if (!(await usernameExists(sql, candidate))) {
      reservedUsernames.add(candidate);
      return candidate;
    }
  }

  for (let suffix = 0; suffix < 1000; suffix++) {
    const candidate = `${stem}_${String(suffix).padStart(3, '0')}`;
    if (reservedUsernames.has(candidate)) continue;
    if (!(await usernameExists(sql, candidate))) {
      reservedUsernames.add(candidate);
      return candidate;
    }
  }

  throw Object.assign(
    new Error(`Không thể tạo username khả dụng cho "${fullName}"`),
    { statusCode: 409 },
  );
}

// ─── JWT — HMAC-SHA256, Web Crypto API ───────────────────────────────────────

function b64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signJWT(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const header = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body   = b64url(enc.encode(JSON.stringify(payload)));
  const sig    = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

async function verifyJWT(token, secret) {
  if (!token || !secret) return null;
  const raw = token.replace(/^Bearer\s+/i, '');
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, '+').replace(/_/g, '/').padEnd(sig.length + (4 - sig.length % 4) % 4, '=')),
      c => c.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify(
      'HMAC', key, sigBytes, enc.encode(`${header}.${body}`),
    );
    if (!valid) return null;
    const payload = JSON.parse(
      atob(body.replace(/-/g, '+').replace(/_/g, '/').padEnd(body.length + (4 - body.length % 4) % 4, '=')),
    );
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function requireStudentAuth(request, env) {
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET not configured');
  const auth = request.headers.get('Authorization') || '';
  return verifyJWT(auth, env.JWT_SECRET);
}

function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const cookies = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    cookies[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return cookies;
}

async function requireTeacherAuth(request, env) {
  if (!env.TEACHER_ACCESS_SECRET) return null;
  const authHeader = request.headers.get('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const { teacher_gate: cookieToken } = parseCookies(request);
  const token = bearerToken || cookieToken;
  if (!token) return null;
  return verifyJWT(token, env.TEACHER_ACCESS_SECRET);
}

async function loadStudentAssignmentAccess(sql, assignmentId, studentId) {
  const [row] = await sql`
    SELECT
      a.id,
      a.class_id,
      a.title,
      a.deadline,
      a.is_active,
      a.mode,
      a.time_limit_minutes,
      a.scoring_scale,
      q.skill,
      q.title AS question_title,
      q.content_text,
      q.content_blocks,
      q.content_url,
      q.content_urls,
      q.questions_data,
      q.vocabulary,
      jsonb_array_length(COALESCE(q.questions_data, '[]'::jsonb)) AS question_count
    FROM assignments a
    JOIN question_pool q ON q.id = a.question_id
    JOIN student_classes sc ON sc.class_id = a.class_id
    WHERE a.id = ${assignmentId}
      AND sc.student_id = ${studentId}
    LIMIT 1
  `;
  return row || null;
}

async function loadCompositeSectionExamSession(sql, { studentId, assignmentId, sectionId }) {
  if (!studentId || !assignmentId || !sectionId) return null;
  const [row] = await sql`
    SELECT started_at
    FROM composite_section_exam_sessions
    WHERE student_id = ${studentId}
      AND assignment_id = ${assignmentId}
      AND section_id = ${sectionId}
    LIMIT 1
  `;
  return row || null;
}

async function ensureCompositeSectionExamSession(sql, { studentId, assignmentId, sectionId }) {
  if (!studentId || !assignmentId || !sectionId) return null;
  await sql`
    INSERT INTO composite_section_exam_sessions (student_id, assignment_id, section_id)
    VALUES (${studentId}, ${assignmentId}, ${sectionId})
    ON CONFLICT (student_id, assignment_id, section_id) DO NOTHING
  `;
  return loadCompositeSectionExamSession(sql, { studentId, assignmentId, sectionId });
}

function buildCompositeSectionTeacherFeedbackText(teacherFeedback, fallback = '') {
  if (teacherFeedback?.overall) return String(teacherFeedback.overall);
  return String(fallback || '');
}

async function studentHasAnyClassMembership(sql, studentId) {
  const [row] = await sql`
    SELECT 1 AS ok
    FROM student_classes
    WHERE student_id = ${studentId}
    LIMIT 1
  `;
  return !!row;
}

function getAppTimezone(env) {
  return String(env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeStudentEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (!email) return null;
  return /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(email) ? email : false;
}

function maskEmailForDisplay(value) {
  const normalized = normalizeStudentEmail(value);
  if (!normalized) return '';
  const [localPart, domain = ''] = normalized.split('@');
  if (!localPart || !domain) return normalized;
  const safePrefix = localPart.slice(0, Math.min(2, localPart.length));
  const safeSuffix = localPart.length > 2 ? localPart.slice(-2) : '';
  const middle = localPart.length > 4 ? '....' : '..';
  return `${safePrefix}${middle}${safeSuffix}@${domain}`;
}

function formatDateTimeInTimezone(value, timeZone) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return new Date(value).toISOString();
  }
}

function skillLabel(skill) {
  return SKILL_LABELS[String(skill || '').toLowerCase()] || 'Bài tập';
}

function buildEmailHtml({ headline, intro, rows = [], outro = '' }) {
  const rowHtml = rows.map(({ label, value }) => `
    <tr>
      <td style="padding:8px 0;color:#4b5563;font-weight:600;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:8px 0;color:#111827">${escapeHtml(value)}</td>
    </tr>`).join('');
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <div style="max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff">
        <div style="font-size:22px;font-weight:800;color:#0f766e;margin-bottom:12px">${escapeHtml(headline)}</div>
        <p style="margin:0 0 16px">${escapeHtml(intro)}</p>
        <table style="width:100%;border-collapse:collapse">${rowHtml}</table>
        ${outro ? `<p style="margin:20px 0 0;color:#4b5563">${escapeHtml(outro)}</p>` : ''}
      </div>
    </div>`;
}

function buildEmailText({ headline, intro, rows = [], outro = '' }) {
  const lines = rows.map(({ label, value }) => `${label}: ${value}`);
  return [headline, '', intro, '', ...lines, ...(outro ? ['', outro] : [])].join('\n');
}

function buildStudentPasswordResetEmailPayload(student, nextPassword) {
  const studentName = String(student?.full_name || student?.username || 'bạn').trim();
  const username = String(student?.username || '').trim();
  const headline = 'Mật khẩu mới cho tài khoản học sinh';
  const intro = `Xin chào ${studentName}, hệ thống vừa tạo mật khẩu mới theo yêu cầu quên mật khẩu của bạn.`;
  const rows = [
    { label: 'Username', value: username || 'Không có dữ liệu' },
    { label: 'Mật khẩu mới', value: nextPassword },
  ];
  const outro = 'Bạn hãy đăng nhập lại và đổi sang mật khẩu riêng của mình ngay sau khi vào hệ thống.';
  return {
    subject: 'Mật khẩu mới cho tài khoản English Student',
    html: buildEmailHtml({ headline, intro, rows, outro }),
    text: buildEmailText({ headline, intro, rows, outro }),
  };
}

async function sendResendEmail(env, { to, subject, html, text, idempotencyKey }) {
  const apiKey = String(env.RESEND_API_KEY || '').trim();
  const fromEmail = String(env.EMAIL_FROM || '').trim();
  const fromName = String(env.EMAIL_FROM_NAME || 'IELTS Student').trim();
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
  if (!fromEmail) throw new Error('EMAIL_FROM is not configured');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `Resend send failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function logStudentEmail(stage, data = {}, level = 'log') {
  const payload = { stage, ...data };
  const writer = level === 'error' ? console.error : console.log;
  writer('[student-email]', JSON.stringify(payload));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureStudentEmailDispatchState(sql) {
  await sql`
    INSERT INTO student_email_dispatch_state (singleton)
    VALUES (TRUE)
    ON CONFLICT (singleton) DO NOTHING
  `;
}

async function insertStudentEmailEvents(sql, { studentIds, assignmentId, eventType, status, lastError = null }) {
  const ids = Array.isArray(studentIds)
    ? studentIds.map(id => String(id || '').trim()).filter(Boolean)
    : [];
  if (ids.length === 0) return;
  await sql`
    WITH input_rows AS (
      SELECT UNNEST(${ids}::uuid[]) AS student_id
    )
    INSERT INTO student_email_events (student_id, assignment_id, event_type, status, last_error, updated_at)
    SELECT student_id, ${assignmentId}::uuid, ${eventType}, ${status}, ${lastError}, NOW()
    FROM input_rows
    ON CONFLICT (student_id, assignment_id, event_type)
    DO NOTHING
  `;
  logStudentEmail('queued_bulk', {
    assignmentId,
    eventType,
    status,
    count: ids.length,
  });
}

async function queueStudentEmailEvent(sql, { studentId, assignmentId, eventType, email = null }) {
  const normalizedEmail = normalizeStudentEmail(email);
  const status = normalizedEmail ? 'pending' : 'skipped';
  const lastError = normalizedEmail ? null : 'missing_or_invalid_student_email';
  await sql`
    INSERT INTO student_email_events (student_id, assignment_id, event_type, status, last_error, updated_at)
    VALUES (${studentId}::uuid, ${assignmentId}::uuid, ${eventType}, ${status}, ${lastError}, NOW())
    ON CONFLICT (student_id, assignment_id, event_type)
    DO NOTHING
  `;
  logStudentEmail(status === 'pending' ? 'queued' : 'skipped_no_email', {
    studentId,
    assignmentId,
    eventType,
    status,
  });
}

async function claimStudentEmailEvent(sql, { studentId, assignmentId, eventType }) {
  const [row] = await sql`
    UPDATE student_email_events
    SET status = 'sending', updated_at = NOW(), last_error = NULL
    WHERE student_id = ${studentId}::uuid
      AND assignment_id = ${assignmentId}::uuid
      AND event_type = ${eventType}
      AND (
        status = 'pending'
        OR status = 'failed'
        OR (status = 'sending' AND updated_at < NOW() - INTERVAL '15 minutes')
      )
    RETURNING student_id, assignment_id, event_type
  `;
  if (row) {
    logStudentEmail('claimed', {
      studentId: row.student_id,
      assignmentId: row.assignment_id,
      eventType: row.event_type,
      status: 'sending',
    });
  }
  return row || null;
}

async function claimNextStudentEmailEvent(sql, { ownerId, delayMs = 2000, leaseMs = 60000 }) {
  const [row] = await sql`
    WITH gate AS (
      SELECT singleton
      FROM student_email_dispatch_state
      WHERE singleton = TRUE
        AND (lease_until IS NULL OR lease_until <= NOW())
        AND (
          last_sent_at IS NULL
          OR last_sent_at <= NOW() - (${delayMs} * INTERVAL '1 millisecond')
        )
      FOR UPDATE
    ),
    candidate AS (
      SELECT e.student_id, e.assignment_id, e.event_type, e.status
      FROM student_email_events e
      WHERE e.status IN ('pending', 'failed')
         OR (e.status = 'sending' AND e.updated_at < NOW() - INTERVAL '15 minutes')
      ORDER BY
        CASE
          WHEN e.event_type = ${EMAIL_EVENT_TYPES.DEADLINE_1DAY} THEN 1
          ELSE 0
        END,
        CASE
          WHEN e.status = 'pending' THEN 0
          WHEN e.status = 'failed' THEN 1
          ELSE 2
        END,
        e.updated_at ASC,
        e.created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    ),
    claimed_event AS (
      UPDATE student_email_events e
      SET status = 'sending', updated_at = NOW(), last_error = NULL
      FROM candidate c, gate g
      WHERE e.student_id = c.student_id
        AND e.assignment_id = c.assignment_id
        AND e.event_type = c.event_type
      RETURNING e.student_id, e.assignment_id, e.event_type, c.status AS source_status
    ),
    claimed_lock AS (
      UPDATE student_email_dispatch_state s
      SET lease_owner = ${ownerId},
          lease_until = NOW() + (${leaseMs} * INTERVAL '1 millisecond'),
          updated_at = NOW()
      WHERE s.singleton = TRUE
        AND EXISTS (SELECT 1 FROM claimed_event)
      RETURNING lease_owner, lease_until
    )
    SELECT
      ce.student_id,
      ce.assignment_id,
      ce.event_type,
      ce.source_status,
      cl.lease_until
    FROM claimed_event ce
    JOIN claimed_lock cl ON TRUE
  `;

  if (row) {
    logStudentEmail('claimed_global', {
      ownerId,
      studentId: row.student_id,
      assignmentId: row.assignment_id,
      eventType: row.event_type,
      sourceStatus: row.source_status,
      leaseUntil: row.lease_until,
    });
  }
  return row || null;
}

function parseStudentEmailEventType(eventType) {
  const raw = String(eventType || '');
  if (raw.startsWith(`${EMAIL_EVENT_TYPES.SCORE_RELEASED}:`)) {
    return {
      rawType: raw,
      baseType: EMAIL_EVENT_TYPES.SCORE_RELEASED,
      sectionId: raw.slice(`${EMAIL_EVENT_TYPES.SCORE_RELEASED}:`.length) || null,
    };
  }
  return { rawType: raw, baseType: raw, sectionId: null };
}

async function hasQueuedStudentEmails(sql) {
  const [row] = await sql`
    SELECT 1 AS queued
    FROM student_email_events
    WHERE status IN ('pending', 'failed')
       OR (status = 'sending' AND updated_at < NOW() - INTERVAL '15 minutes')
    LIMIT 1
  `;
  return !!row;
}

async function releaseStudentEmailDispatch(sql, { ownerId, updateLastSentAt = true }) {
  await sql`
    UPDATE student_email_dispatch_state
    SET lease_owner = NULL,
        lease_until = NULL,
        last_sent_at = CASE
          WHEN ${updateLastSentAt} THEN NOW()
          ELSE last_sent_at
        END,
        updated_at = NOW()
    WHERE singleton = TRUE
      AND lease_owner = ${ownerId}
  `;
  logStudentEmail('dispatch_released', {
    ownerId,
    updateLastSentAt,
  });
}

async function updateStudentEmailEvent(sql, { studentId, assignmentId, eventType, status, providerMessageId = null, lastError = null }) {
  await sql`
    UPDATE student_email_events
    SET status = ${status},
        provider_message_id = ${providerMessageId},
        last_error = ${lastError},
        sent_at = CASE WHEN ${status} = 'sent' THEN NOW() ELSE sent_at END,
        updated_at = NOW()
    WHERE student_id = ${studentId}::uuid
      AND assignment_id = ${assignmentId}::uuid
      AND event_type = ${eventType}
  `;
  logStudentEmail('status_updated', {
    studentId,
    assignmentId,
    eventType,
    status,
    providerMessageId,
    lastError,
  }, status === 'failed' ? 'error' : 'log');
}

async function loadStudentEmailContext(sql, { studentId, assignmentId, eventType }) {
  const parsedEvent = parseStudentEmailEventType(eventType);
  if (parsedEvent.baseType === EMAIL_EVENT_TYPES.SCORE_RELEASED && parsedEvent.sectionId) {
    const [compositeRow] = await sql`
      SELECT
        s.id AS student_id,
        s.full_name AS student_name,
        s.email AS student_email,
        a.id AS assignment_id,
        (a.title || ' · ' || cqs.label) AS assignment_title,
        a.deadline,
        c.class_name,
        cqs.skill,
        css.score AS overall_score
      FROM students s
      JOIN assignments a ON a.id = ${assignmentId}::uuid
      JOIN classes c ON c.id = a.class_id
      JOIN composite_section_submissions css
        ON css.assignment_id = a.id
        AND css.student_id = s.id
        AND css.section_id = ${parsedEvent.sectionId}::uuid
      JOIN composite_question_sections cqs ON cqs.id = css.section_id
      WHERE s.id = ${studentId}::uuid
      LIMIT 1
    `;
    if (compositeRow) return compositeRow;
  }

  const [row] = await sql`
    SELECT
      s.id AS student_id,
      s.full_name AS student_name,
      s.email AS student_email,
      a.id AS assignment_id,
      a.title AS assignment_title,
      a.deadline,
      c.class_name,
      q.skill,
      (
        SELECT sub.overall_score
        FROM submissions sub
        WHERE sub.assignment_id = a.id AND sub.student_id = s.id
        ORDER BY sub.submitted_at DESC
        LIMIT 1
      ) AS overall_score
    FROM students s
    JOIN assignments a ON a.id = ${assignmentId}::uuid
    JOIN classes c ON c.id = a.class_id
    JOIN question_pool q ON q.id = a.question_id
    WHERE s.id = ${studentId}::uuid
  `;
  return row || null;
}

function buildStudentEmailPayload(env, eventType, ctx) {
  const deadlineText = ctx.deadline
    ? formatDateTimeInTimezone(ctx.deadline, getAppTimezone(env))
    : 'Chưa đặt hạn';
  const skillText = skillLabel(ctx.skill);
  const commonRows = [
    { label: 'Lớp', value: ctx.class_name || '—' },
    { label: 'Kỹ năng', value: skillText },
    { label: 'Bài tập', value: ctx.assignment_title || '—' },
  ];

  if (eventType === EMAIL_EVENT_TYPES.NEW_ASSIGNMENT) {
    return {
      subject: `[IELTS Student] Bài mới: ${ctx.assignment_title}`,
      html: buildEmailHtml({
        headline: 'Bạn có bài tập mới',
        intro: `${ctx.student_name || 'Học sinh'} ơi, giáo viên vừa giao một bài tập mới cho lớp của bạn.`,
        rows: [...commonRows, { label: 'Deadline', value: deadlineText }],
        outro: 'Hãy vào hệ thống để làm bài đúng hạn.',
      }),
      text: buildEmailText({
        headline: 'Bạn có bài tập mới',
        intro: `${ctx.student_name || 'Học sinh'} ơi, giáo viên vừa giao một bài tập mới cho lớp của bạn.`,
        rows: [...commonRows, { label: 'Deadline', value: deadlineText }],
        outro: 'Hãy vào hệ thống để làm bài đúng hạn.',
      }),
    };
  }

  if (eventType === EMAIL_EVENT_TYPES.SCORE_RELEASED) {
    return {
      subject: `[IELTS Student] Đã có điểm ${skillText}: ${ctx.assignment_title}`,
      html: buildEmailHtml({
        headline: 'Bài làm của bạn đã có điểm',
        intro: `${ctx.student_name || 'Học sinh'} ơi, giáo viên đã cập nhật điểm cho bài ${skillText} của bạn.`,
        rows: [...commonRows, { label: 'Diem', value: String(ctx.overall_score ?? '—') }],
        outro: 'Hãy vào hệ thống để xem chi tiết nhận xét.',
      }),
      text: buildEmailText({
        headline: 'Bài làm của bạn đã có điểm',
        intro: `${ctx.student_name || 'Học sinh'} ơi, giáo viên đã cập nhật điểm cho bài ${skillText} của bạn.`,
        rows: [...commonRows, { label: 'Diem', value: String(ctx.overall_score ?? '—') }],
        outro: 'Hãy vào hệ thống để xem chi tiết nhận xét.',
      }),
    };
  }

  return {
    subject: `[IELTS Student] Nhắc hạn 1 ngày: ${ctx.assignment_title}`,
    html: buildEmailHtml({
      headline: 'Sắp tới hạn nộp bài',
      intro: `${ctx.student_name || 'Học sinh'} ơi, bài tập dưới đây còn dưới 24 giờ là tới hạn.`,
      rows: [...commonRows, { label: 'Deadline', value: deadlineText }],
      outro: 'Hãy sắp xếp thời gian hoàn thành bài sớm để tránh quá hạn.',
    }),
    text: buildEmailText({
      headline: 'Sắp tới hạn nộp bài',
      intro: `${ctx.student_name || 'Học sinh'} ơi, bài tập dưới đây còn dưới 24 giờ là tới hạn.`,
      rows: [...commonRows, { label: 'Deadline', value: deadlineText }],
      outro: 'Hãy sắp xếp thời gian hoàn thành bài sớm để tránh quá hạn.',
    }),
  };
}

async function deliverClaimedStudentEmail(sql, env, { studentId, assignmentId, eventType }) {
  try {
    const parsedEvent = parseStudentEmailEventType(eventType);
    const ctx = await loadStudentEmailContext(sql, { studentId, assignmentId, eventType });
    if (!ctx) {
      await updateStudentEmailEvent(sql, {
        studentId, assignmentId, eventType,
        status: 'skipped',
        lastError: 'missing_assignment_or_student_context',
      });
      return false;
    }

    const email = normalizeStudentEmail(ctx.student_email);
    if (!email) {
      await updateStudentEmailEvent(sql, {
        studentId, assignmentId, eventType,
        status: 'skipped',
        lastError: 'missing_or_invalid_student_email',
      });
      return false;
    }

    if (parsedEvent.baseType === EMAIL_EVENT_TYPES.SCORE_RELEASED && ctx.overall_score == null) {
      await updateStudentEmailEvent(sql, {
        studentId, assignmentId, eventType,
        status: 'failed',
        lastError: 'missing_score_context',
      });
      return false;
    }

    const payload = buildStudentEmailPayload(env, parsedEvent.baseType, ctx);
    logStudentEmail('sending', {
      studentId,
      assignmentId,
      eventType,
      to: email,
      assignmentTitle: ctx.assignment_title || '',
      className: ctx.class_name || '',
    });
    const response = await sendResendEmail(env, {
      to: email,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      idempotencyKey: `${eventType}:${studentId}:${assignmentId}`,
    });

    await updateStudentEmailEvent(sql, {
      studentId, assignmentId, eventType,
      status: 'sent',
      providerMessageId: response?.id ? String(response.id) : null,
    });
    return true;
  } catch (e) {
    await updateStudentEmailEvent(sql, {
      studentId, assignmentId, eventType,
      status: 'failed',
      lastError: String(e?.message || e || 'unknown_email_error').slice(0, 500),
    });
    return false;
  }
}

async function deliverQueuedStudentEmail(sql, env, { studentId, assignmentId, eventType }) {
  const claimed = await claimStudentEmailEvent(sql, { studentId, assignmentId, eventType });
  if (!claimed) {
    logStudentEmail('claim_skipped', { studentId, assignmentId, eventType });
    return false;
  }
  return deliverClaimedStudentEmail(sql, env, { studentId, assignmentId, eventType });
}

async function processQueuedStudentEmails(sql, env, opts = {}) {
  const limit = Math.max(1, Math.min(Number(opts.limit) || 50, 300));
  const delayMs = Math.max(0, Math.min(Number(opts.delayMs) || 2000, 10000));
  const leaseMs = Math.max(delayMs + 30000, 60000);
  const ownerId = crypto.randomUUID();
  await ensureStudentEmailDispatchState(sql);
  logStudentEmail('process_batch', {
    limit,
    delayMs,
    leaseMs,
    ownerId,
  });

  const summary = { attempted: 0, fulfilled: 0, sent: 0, notSent: 0, rejected: 0, exitedBusy: false };
  for (let index = 0; index < limit; index += 1) {
    const claimed = await claimNextStudentEmailEvent(sql, { ownerId, delayMs, leaseMs });
    if (!claimed) {
      const remaining = await hasQueuedStudentEmails(sql);
      logStudentEmail(remaining ? 'process_batch_busy' : 'process_batch_empty', {
        ownerId,
        processedCount: summary.attempted,
      });
      summary.exitedBusy = remaining;
      break;
    }

    summary.attempted += 1;
    logStudentEmail('process_item_start', {
      ownerId,
      index,
      studentId: claimed.student_id,
      assignmentId: claimed.assignment_id,
      eventType: claimed.event_type,
      sourceStatus: claimed.source_status,
    });

    try {
      const sent = await deliverClaimedStudentEmail(sql, env, {
        studentId: claimed.student_id,
        assignmentId: claimed.assignment_id,
        eventType: claimed.event_type,
      });
      summary.fulfilled += 1;
      if (sent) summary.sent += 1;
      else summary.notSent += 1;
    } catch (error) {
      summary.rejected += 1;
      logStudentEmail('process_item_rejected', {
        ownerId,
        studentId: claimed.student_id,
        assignmentId: claimed.assignment_id,
        eventType: claimed.event_type,
        sourceStatus: claimed.source_status,
        reason: String(error?.stack || error?.message || error || 'unknown_rejection').slice(0, 2000),
      }, 'error');
    } finally {
      await releaseStudentEmailDispatch(sql, { ownerId, updateLastSentAt: true });
    }

    if (index + 1 < limit && delayMs > 0) {
      logStudentEmail('process_chunk_pause', {
        ownerId,
        nextIndex: index + 1,
        delayMs,
      });
      await sleep(delayMs);
    }
  }

  logStudentEmail('process_batch_done', summary, summary.rejected > 0 ? 'error' : 'log');
}

async function enqueueDeadline1DayEmails(sql) {
  const rows = await sql`
    SELECT sc.student_id, a.id AS assignment_id, s.email AS student_email
    FROM assignments a
    JOIN student_classes sc ON sc.class_id = a.class_id
    JOIN students s ON s.id = sc.student_id
    LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = sc.student_id
    WHERE a.is_active = true
      AND a.deadline IS NOT NULL
      AND a.deadline > NOW()
      AND a.deadline <= NOW() + INTERVAL '24 hours'
      AND sub.id IS NULL
  `;
  const grouped = new Map();
  for (const row of rows) {
    const key = String(row.assignment_id);
    const bucket = grouped.get(key) || { valid: [], skipped: [] };
    if (normalizeStudentEmail(row.student_email)) bucket.valid.push(row.student_id);
    else bucket.skipped.push(row.student_id);
    grouped.set(key, bucket);
  }

  for (const [assignmentId, bucket] of grouped.entries()) {
    await insertStudentEmailEvents(sql, {
      studentIds: bucket.valid,
      assignmentId,
      eventType: EMAIL_EVENT_TYPES.DEADLINE_1DAY,
      status: 'pending',
    });
    await insertStudentEmailEvents(sql, {
      studentIds: bucket.skipped,
      assignmentId,
      eventType: EMAIL_EVENT_TYPES.DEADLINE_1DAY,
      status: 'skipped',
      lastError: 'missing_or_invalid_student_email',
    });
  }
}

// ─── Auto-grade ───────────────────────────────────────────────────────────────

const IELTS_BAND_TABLE = [
  [0, 0.0], [1, 1.0], [2, 2.0],
  [3, 2.5], [4, 2.5],
  [5, 3.0], [6, 3.0],
  [7, 3.5], [8, 3.5], [9, 3.5],
  [10, 4.0], [11, 4.0], [12, 4.0],
  [13, 4.5], [14, 4.5], [15, 4.5],
  [16, 5.0], [17, 5.0],
  [18, 5.5], [19, 5.5], [20, 5.5], [21, 5.5], [22, 5.5],
  [23, 6.0], [24, 6.0], [25, 6.0], [26, 6.0],
  [27, 6.5], [28, 6.5], [29, 6.5],
  [30, 7.0], [31, 7.0], [32, 7.0],
  [33, 7.5], [34, 7.5],
  [35, 8.0], [36, 8.0],
  [37, 8.5], [38, 8.5],
  [39, 9.0], [40, 9.0],
];

function correctCountToIeltsBand(correct) {
  const clamped = Math.max(0, Math.min(40, correct));
  const entry = IELTS_BAND_TABLE.find(([c]) => c === clamped);
  return entry ? entry[1] : null;
}

// scoringScale: 'ielts' | '10' (default '10')
function autoGrade(studentAnswers, questionsData, scoringScale = '10') {
  if (!questionsData || questionsData.length === 0) return null;
  if (!studentAnswers || studentAnswers.length === 0) return 0;
  let correct = 0;
  for (const sa of studentAnswers) {
    const q = questionsData.find(q => q.q_no === sa.q_no);
    if (!q || !q.answers || q.answers.length === 0) continue;
    const normalized = (sa.answer || '').toLowerCase().trim();
    if (q.answers.some(a => a.toLowerCase().trim() === normalized)) correct++;
  }
  if (scoringScale === 'ielts') {
    return correctCountToIeltsBand(correct);
  }
  return Math.round((correct / questionsData.length) * 10 * 10) / 10;
}

// ─── AI Feedback helpers ──────────────────────────────────────────────────────

// ── Shared criterion sub-object schema ───────────────────────────────────────
const CRITERION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['band_justification', 'strengths', 'errors', 'tips'],
  properties: {
    band_justification: { type: 'string' },
    strengths:          { type: 'string' },
    errors:             { type: 'string' },
    tips:               { type: 'string' },
  },
};

// ── Writing AI schema (4 criteria + overall) ────────────────────────────────
const WRITING_AI_SYSTEM_PROMPT = `You are a senior IELTS examiner with 15+ years of experience assessing IELTS Writing responses.

Evaluate the student's writing on ALL FOUR official IELTS Writing criteria:
1. Task Response (TR) — addressing all parts of the task, developing a clear position, supporting ideas
2. Coherence and Cohesion (CC) — logical organisation, paragraphing, use of cohesive devices
3. Lexical Resource (LR) — vocabulary range, accuracy, collocation, word formation
4. Grammatical Range and Accuracy (GRA) — range and accuracy of grammar structures, punctuation

For each criterion return a score (0–9, multiples of 0.5) and an object with FOUR fields:
- band_justification: 1–2 sentences explaining why this band was awarded (Vietnamese)
- strengths: bullet list of 1–2 specific strengths, quoting the student's text when helpful (Vietnamese)
- errors: bullet list of key errors with correction format ❌ "wrong" → ✅ "correct"; use "- Không thấy lỗi nổi bật." if none (Vietnamese)
- tips: bullet list of 1–2 concrete, actionable coaching tips (Vietnamese)

overall_score = average of the four criteria scores rounded to nearest 0.5.
overall_comment = 1–2 sentence summary highlighting the most important improvement area (Vietnamese).

Critical rules:
- Scores MUST be multiples of 0.5 between 0 and 9. Be calibrated — do not inflate.
- ALL text MUST be in Vietnamese.
- Use plain bullet lists (- item) for strengths/errors/tips fields. No markdown headers inside fields.
- If the response is completely off-topic, assign 0.0 to all criteria and briefly explain in band_justification.
- Output ONLY valid JSON. No text before or after the JSON object.`;

const WRITING_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['tr_score', 'tr', 'cc_score', 'cc', 'lr_score', 'lr', 'gra_score', 'gra', 'overall_score', 'overall_comment'],
  properties: {
    tr_score:       { type: 'number' },
    tr:             CRITERION_SCHEMA,
    cc_score:       { type: 'number' },
    cc:             CRITERION_SCHEMA,
    lr_score:       { type: 'number' },
    lr:             CRITERION_SCHEMA,
    gra_score:      { type: 'number' },
    gra:            CRITERION_SCHEMA,
    overall_score:  { type: 'number' },
    overall_comment:{ type: 'string' },
  },
};

// ── Speaking AI schema (LR + GRA scored; FC + Pron advice only; overall) ────
const SPEAKING_AI_SYSTEM_PROMPT = `You are a senior IELTS examiner with 15+ years of experience assessing IELTS Speaking.

You are given an AI-generated transcript of the student's spoken response. Assess it as follows:

SCORED criteria (band 0–9, multiples of 0.5) — return score + object with band_justification / strengths / errors / tips:
1. Lexical Resource (LR) — vocabulary range, accuracy, collocation, appropriacy in speech
2. Grammatical Range and Accuracy (GRA) — range and accuracy of grammar structures in speech

ADVICE-ONLY criteria (single string with bullet-list advice, no score):
3. fc_advice — Fluency and Coherence: practical advice based on text cues visible in transcript
4. pron_advice — Pronunciation: general tips for Vietnamese speakers; note limitations of transcript-based assessment

overall_score = average of LR and GRA scores rounded to nearest 0.5.
overall_comment = 1–2 sentence summary (Vietnamese).

Critical rules:
- Scores MUST be multiples of 0.5 between 0 and 9.
- ALL text MUST be in Vietnamese.
- Use plain bullet lists (- item) for all list fields. No markdown headers inside fields.
- Output ONLY valid JSON. No text before or after the JSON object.`;

const SPEAKING_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lr_score', 'lr', 'gra_score', 'gra', 'fc_advice', 'pron_advice', 'overall_score', 'overall_comment'],
  properties: {
    lr_score:       { type: 'number' },
    lr:             CRITERION_SCHEMA,
    gra_score:      { type: 'number' },
    gra:            CRITERION_SCHEMA,
    fc_advice:      { type: 'string' },
    pron_advice:    { type: 'string' },
    overall_score:  { type: 'number' },
    overall_comment:{ type: 'string' },
  },
};

// ── Legacy schema (kept for existing regular-assignment AI feedback) ──────────
const IELTS_SYSTEM_PROMPT = WRITING_AI_SYSTEM_PROMPT;
const AI_FEEDBACK_RESPONSE_SCHEMA = WRITING_AI_SCHEMA;

function buildWritingPrompt(questionText, writingContent) {
  return [
    questionText ? `### Đề bài (Task Prompt):\n${questionText}` : '',
    '',
    `### Bài làm của học sinh:\n${writingContent}`,
  ].filter(s => s !== undefined).join('\n');
}

function buildSpeakingPrompt(questionText, speakingScript) {
  return [
    questionText ? `### Câu hỏi / Chủ đề:\n${questionText}` : '',
    '',
    `### Transcript (AI STT — có thể có lỗi nhận dạng nhỏ):\n${speakingScript}`,
  ].filter(s => s !== undefined).join('\n');
}

function extractOutputText(aiData) {
  if (typeof aiData.output_text === 'string') return aiData.output_text;
  const chunks = [];
  if (Array.isArray(aiData.output)) {
    for (const item of aiData.output) {
      if (item.type === 'message' && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c.type === 'output_text' && typeof c.text === 'string') chunks.push(c.text);
        }
      }
    }
  }
  return chunks.join('\n').trim();
}

function normalizeMarkdownSection(value) {
  return String(value || '').trim();
}

function buildCriterionFallbackMarkdown(criterion) {
  const parts = [
    criterion.band_justification_md ? `**Lý do band:**\n${criterion.band_justification_md}` : '',
    criterion.strengths_md ? `**Điểm mạnh:**\n${criterion.strengths_md}` : '',
    criterion.errors_md ? `**Lỗi & điểm yếu:**\n${criterion.errors_md}` : '',
    criterion.tips_md ? `**Gợi ý cải thiện:**\n${criterion.tips_md}` : '',
  ].filter(Boolean);
  return parts.join('\n\n');
}

function normalizeAiCriterion(value, legacyText = '') {
  const obj = value && typeof value === 'object' ? value : {};
  const criterion = {
    band_justification_md: normalizeMarkdownSection(obj.band_justification_md),
    strengths_md: normalizeMarkdownSection(obj.strengths_md),
    errors_md: normalizeMarkdownSection(obj.errors_md),
    tips_md: normalizeMarkdownSection(obj.tips_md),
  };

  if (!Object.values(criterion).some(Boolean) && legacyText) {
    criterion.band_justification_md = normalizeMarkdownSection(legacyText);
  }

  return criterion;
}

function normalizeAiFeedbackPayload(feedback) {
  const lr = normalizeAiCriterion(feedback.lr, feedback.lr_feedback);
  const gra = normalizeAiCriterion(feedback.gra, feedback.gra_feedback);
  return {
    schema_version: 2,
    lr_score: feedback.lr_score,
    lr,
    lr_feedback: buildCriterionFallbackMarkdown(lr),
    gra_score: feedback.gra_score,
    gra,
    gra_feedback: buildCriterionFallbackMarkdown(gra),
    generated_at: new Date().toISOString(),
  };
}

// ─── Shared pool AI helper ───────────────────────────────────────────────────
async function callAiFeedback(skill, contentText, studentContent, env) {
  if (!env.OPENAI_API_KEY) throw Object.assign(new Error('Chưa cấu hình OPENAI_API_KEY'), { statusCode: 500 });
  const isWriting = skill === 'writing';
  const systemPrompt = isWriting ? WRITING_AI_SYSTEM_PROMPT : SPEAKING_AI_SYSTEM_PROMPT;
  const schema      = isWriting ? WRITING_AI_SCHEMA         : SPEAKING_AI_SCHEMA;
  const schemaName  = isWriting ? 'ielts_writing_feedback'  : 'ielts_speaking_feedback';
  const prompt      = isWriting
    ? buildWritingPrompt(contentText, studentContent)
    : buildSpeakingPrompt(contentText, studentContent);

  const responsesUrl = getOpenAIEndpoint(env, '/v1/responses', 'responses');
  console.log('[AI] calling', skill, responsesUrl, 'schema:', schemaName);
  const aiRes = await fetch(responsesUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getOpenAIAuthToken(env, responsesUrl, 'responses')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      text: { format: { type: 'json_schema', name: schemaName, strict: true, schema } },
      input: [
        { role: 'developer', content: systemPrompt },
        { role: 'user',      content: prompt },
      ],
    }),
  });
  const responseText = await aiRes.text();
  console.log('[AI] status:', aiRes.status, 'body:', responseText.slice(0, 600));
  if (!aiRes.ok) {
    console.error('[AI] error:', JSON.stringify({ skill, endpoint: responsesUrl, status: aiRes.status, body: responseText.slice(0, 400) }));
    throw Object.assign(new Error('Lỗi khi gọi AI'), { statusCode: 502 });
  }
  let aiData;
  try { aiData = JSON.parse(responseText); } catch(e) {
    console.error('[AI] JSON parse fail:', responseText.slice(0, 300));
    throw new Error('AI response không phải JSON');
  }
  const rawText = extractOutputText(aiData);
  console.log('[AI] extracted text:', rawText.slice(0, 400));
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  let parsed;
  try { parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText); } catch(e) {
    console.error('[AI] inner JSON parse fail:', rawText.slice(0, 300));
    throw new Error('AI trả về JSON không hợp lệ');
  }
  console.log('[AI] parsed keys:', Object.keys(parsed).join(', '));
  return { ...parsed, skill, schema_version: 'v3', generated_at: new Date().toISOString() };
}

function buildSharedSpeakingKey(poolId, studentId, fileName) {
  return `shared-speaking/${poolId}/${studentId}-${crypto.randomUUID()}-${sanitizeFileName(fileName, 'audio')}`;
}
function isExpectedSharedSpeakingKey(key, poolId, studentId) {
  return String(key || '').startsWith(`shared-speaking/${poolId}/${studentId}-`);
}

// ─── Assignment auto-close ────────────────────────────────────────────────────
// Closes assignments whose deadline has passed, but only once per deadline value.
// `last_auto_closed_at >= deadline` means the system has already auto-closed for
// this deadline; if teacher manually re-opens (is_active=true) we won't close again
// unless the deadline itself is moved forward to a value > last_auto_closed_at.
async function autoCloseExpired(sql, opts = {}) {
  if (opts.assignmentId) {
    await sql`
      UPDATE assignments
      SET is_active = false, last_auto_closed_at = NOW()
      WHERE id = ${opts.assignmentId}
        AND is_active = true
        AND deadline IS NOT NULL
        AND deadline < NOW()
        AND (last_auto_closed_at IS NULL OR last_auto_closed_at < deadline)
    `;
  } else if (opts.classId) {
    await sql`
      UPDATE assignments
      SET is_active = false, last_auto_closed_at = NOW()
      WHERE class_id = ${opts.classId}
        AND is_active = true
        AND deadline IS NOT NULL
        AND deadline < NOW()
        AND (last_auto_closed_at IS NULL OR last_auto_closed_at < deadline)
    `;
  } else {
    await sql`
      UPDATE assignments
      SET is_active = false, last_auto_closed_at = NOW()
      WHERE is_active = true
        AND deadline IS NOT NULL
        AND deadline < NOW()
        AND (last_auto_closed_at IS NULL OR last_auto_closed_at < deadline)
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // Per-request CORS (dynamic origin — avoids module-level state race)
    const origin      = request.headers.get('Origin') || '';
    const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : null;
    const CORS = {
      ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin } : {}),
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
    };

    // Per-request response helpers (closure over CORS)
    function json(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    function err(msg, status = 400) {
      return json({ error: msg }, status);
    }

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const sql = neon(env.DATABASE_URL);
    let p;

    try {
      // ── Auth ───────────────────────────────────────────────────────────────

      if (path === '/auth/login' && method === 'POST') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (await checkRateLimit(env.KV, `login:${ip}`, 10, 60))
          return err('Quá nhiều yêu cầu đăng nhập — thử lại sau', 429);
        const body = await request.json();
        if (!body.username || !body.password)
          return err('username và password là bắt buộc');

        const [student] = await sql`
          SELECT id, full_name, username, password_hash, email
          FROM students
          WHERE username = ${body.username}
        `;
        if (!student || !(await verifyPassword(body.password, student.password_hash)))
          return err('Sai tên đăng nhập hoặc mật khẩu', 401);

        // Migrate legacy SHA-256 hash → PBKDF2 on successful login
        if (/^[0-9a-f]{64}$/.test(student.password_hash)) {
          const newHash = await hashPassword(body.password);
          await sql`UPDATE students SET password_hash = ${newHash} WHERE id = ${student.id}`;
        }

        const classes = await sql`
          SELECT c.id, c.class_name
          FROM classes c
          JOIN student_classes sc ON sc.class_id = c.id
          WHERE sc.student_id = ${student.id}
          ORDER BY c.class_name ASC
        `;

        const token = env.JWT_SECRET
          ? await signJWT(
              { student_id: student.id, exp: Date.now() + 24 * 60 * 60 * 1000 },
              env.JWT_SECRET,
            )
          : null;

        const { password_hash: _ph, ...studentSafe } = student;
        return json({ student: { ...studentSafe, classes }, token });
      }

      if (path === '/auth/forgot-password' && method === 'POST') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (await checkRateLimit(env.KV, `student-forgot-password:${ip}`, 5, 300))
          return err('Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau ít phút.', 429);

        const body = await request.json().catch(() => null);
        const username = String(body?.username || '').trim();
        if (!username) return err('username là bắt buộc', 400);

        const [student] = await sql`
          SELECT id, full_name, username, password_hash, email
          FROM students
          WHERE username = ${username}
        `;
        if (!student) return err('Không tìm thấy tài khoản học sinh với username này.', 404);

        const email = normalizeStudentEmail(student.email);
        if (!email) {
          return err('Tài khoản này chưa có Gmail trong hồ sơ để nhận mật khẩu mới.', 400);
        }

        const nextPassword = generateStudentPassword();
        const nextPasswordHash = await hashPassword(nextPassword);
        const payload = buildStudentPasswordResetEmailPayload(student, nextPassword);

        await sql`
          UPDATE students
          SET password_hash = ${nextPasswordHash}
          WHERE id = ${student.id}
        `;

        try {
          await sendResendEmail(env, {
            to: email,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
            idempotencyKey: `student-forgot-password:${student.id}:${Date.now()}`,
          });
        } catch (sendError) {
          await sql`
            UPDATE students
            SET password_hash = ${student.password_hash}
            WHERE id = ${student.id}
          `.catch(restoreError => {
            console.error('[forgot-password] rollback failed', {
              studentId: student.id,
              restoreError: String(restoreError?.message || restoreError || 'unknown_restore_error'),
            });
          });
          return err(
            String(sendError?.message || 'Không thể gửi email mật khẩu mới lúc này. Vui lòng thử lại sau.'),
            502,
          );
        }

        return json({
          ok: true,
          email,
          message: `Mật khẩu mới đã được gửi tới ${maskEmailForDisplay(email)}.`,
        });
      }

      // ── Teacher Auth ───────────────────────────────────────────────────────

      if (path === '/teacher-auth/login' && method === 'POST') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (await checkRateLimit(env.KV, `teacher-login:${ip}`, 10, 60))
          return err('Quá nhiều yêu cầu — thử lại sau', 429);
        if (!env.TEACHER_ACCESS_PASSWORD || !env.TEACHER_ACCESS_SECRET)
          return err('Server chưa cấu hình', 500);
        const body = await request.json();
        if (body.password !== env.TEACHER_ACCESS_PASSWORD)
          return err('Sai mật khẩu', 401);
        const token = await signJWT(
          { teacher: true, exp: Date.now() + 24 * 60 * 60 * 1000 },
          env.TEACHER_ACCESS_SECRET,
        );
        return new Response(JSON.stringify({ ok: true, token }), {
          status: 200,
          headers: {
            ...CORS,
            'Content-Type': 'application/json',
            'Set-Cookie': `teacher_gate=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${24 * 60 * 60}`,
          },
        });
      }

      if (path === '/teacher-auth/logout' && method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            ...CORS,
            'Content-Type': 'application/json',
            'Set-Cookie': 'teacher_gate=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0',
          },
        });
      }

      if (path === '/teacher-auth/status' && method === 'GET') {
        const claims = await requireTeacherAuth(request, env);
        return json({ authenticated: !!claims });
      }

      // ── Classes ────────────────────────────────────────────────────────────

      if (path === '/classes') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'GET') {
          await autoCloseExpired(sql);
          const rows = await sql`
            SELECT c.*,
              (SELECT COUNT(*) FROM student_classes sc WHERE sc.class_id = c.id)::int AS student_count,
              (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id)::int AS assignment_count,
              (
                SELECT COUNT(DISTINCT sub.student_id)
                FROM assignments a
                JOIN submissions sub ON sub.assignment_id = a.id
                WHERE a.class_id = c.id
              )::int AS submitted_student_count,
              (
                SELECT COUNT(*) FROM assignments a
                WHERE a.class_id = c.id
                  AND a.deadline IS NOT NULL
                  AND a.deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days'
                  AND a.is_active = true
              )::int AS upcoming_deadline_count,
              -- B4.9: writing/speaking submissions chưa có overall_score (cần GV chấm)
              (
                SELECT COUNT(*) FROM submissions sub
                JOIN assignments a ON a.id = sub.assignment_id
                JOIN question_pool q ON q.id = a.question_id
                WHERE a.class_id = c.id
                  AND sub.overall_score IS NULL
                  AND q.skill IN ('writing', 'speaking')
              )::int AS pending_grading_count
            FROM classes c
            ORDER BY c.created_at DESC
          `;
          return json(rows);
        }
        if (method === 'POST') {
          const body = await request.json();
          if (!body.class_name) return err('class_name is required');
          const teacherId = await getTeacherId(sql);
          const [row] = await sql`
            INSERT INTO classes (teacher_id, class_name, description)
            VALUES (${teacherId}, ${body.class_name}, ${body.description ?? null})
            RETURNING *
          `;
          return json(row, 201);
        }
      }

      if ((p = matchPath('/classes/:id/students', path))) {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'GET') {
          const rows = await sql`
            SELECT s.id, s.full_name, s.username
            FROM students s
            JOIN student_classes sc ON sc.student_id = s.id
            WHERE sc.class_id = ${p.id}
            ORDER BY s.full_name ASC
          `;
          return json(rows);
        }
      }

      if ((p = matchPath('/classes/:id/analytics', path))) {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method !== 'GET') return err('Method not allowed', 405);

        const classId = p.id;
        const [submissions, allAssignments, allStudents, compositeSubmissions] = await Promise.all([
          sql`
            SELECT
              sub.id, sub.student_id, sub.assignment_id,
              sub.overall_score::float AS overall_score,
              sub.submitted_at, sub.status, sub.is_overtime,
              q.skill, a.deadline, a.is_active, a.title AS assignment_title,
              a.scoring_scale,
              s.full_name AS student_name
            FROM submissions sub
            JOIN assignments a ON a.id = sub.assignment_id
            JOIN question_pool q ON q.id = a.question_id
            JOIN students s ON s.id = sub.student_id
            WHERE a.class_id = ${classId}
            ORDER BY sub.submitted_at ASC
          `,
          sql`
            SELECT a.id, a.title, a.deadline, a.is_active, a.mode, a.time_limit_minutes, a.scoring_scale, q.skill
            FROM assignments a
            JOIN question_pool q ON q.id = a.question_id
            WHERE a.class_id = ${classId}
            ORDER BY a.created_at DESC
          `,
          sql`
            SELECT s.id, s.full_name
            FROM students s
            JOIN student_classes sc ON sc.student_id = s.id
            WHERE sc.class_id = ${classId}
            ORDER BY s.full_name ASC
          `,
          // Per-student composite submissions: one row per (assignment, student) with avg score of scored sections
          sql`
            SELECT
              css.assignment_id,
              css.student_id,
              MAX(css.submitted_at) AS submitted_at,
              a.deadline, a.is_active,
              COUNT(css.id)::int AS section_count,
              COUNT(css.id) FILTER (WHERE css.score IS NOT NULL)::int AS scored_count,
              AVG(css.score) FILTER (WHERE css.score IS NOT NULL)::float AS avg_score,
              s.full_name AS student_name
            FROM composite_section_submissions css
            JOIN assignments a ON a.id = css.assignment_id
            JOIN students s ON s.id = css.student_id
            WHERE a.class_id = ${classId}
            GROUP BY css.assignment_id, css.student_id, a.deadline, a.is_active, s.full_name
          `,
        ]);

        const totalStudents = allStudents.length;
        const totalAssignments = allAssignments.length;
        const activeAssignments = allAssignments.filter(a => a.is_active).length;
        const closedAssignments = totalAssignments - activeAssignments;
        const scoredSubs = submissions.filter(s => s.overall_score !== null);
        const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
        const avgScore = avg(scoredSubs.map(s => Number(s.overall_score)));
        const maxPossible = totalAssignments * totalStudents;
        const submissionRate = maxPossible > 0 ? Math.round(submissions.length / maxPossible * 100) : 0;

        // Score distribution buckets: 0-2, 2-4, 4-6, 6-8, 8-10
        const distribution = [0, 0, 0, 0, 0];
        for (const sub of scoredSubs) {
          const score = Number(sub.overall_score);
          const idx = score >= 9 ? 4 : Math.min(4, Math.floor(score / 2));
          distribution[idx]++;
        }

        // Average score and completion per skill
        const skillKeys = ['reading', 'listening', 'writing', 'speaking'];
        const scoreBySkill = {};
        const completionBySkill = {};
        for (const skill of skillKeys) {
          const skillSubs = scoredSubs.filter(s => s.skill === skill);
          scoreBySkill[skill] = avg(skillSubs.map(s => Number(s.overall_score)));
          const skillAssigns = allAssignments.filter(a => a.skill === skill);
          const allSkillSubs = submissions.filter(s => s.skill === skill);
          const maxPoss = skillAssigns.length * totalStudents;
          completionBySkill[skill] = {
            count: skillAssigns.length,
            submitted: allSkillSubs.length,
            pct: maxPoss > 0 ? Math.round(allSkillSubs.length / maxPoss * 100) : 0,
          };
        }

        // Timeline grouped by ISO week (Monday)
        const timelineMap = {};
        for (const sub of submissions) {
          const date = new Date(sub.submitted_at);
          const day = date.getUTCDay();
          const diff = day === 0 ? -6 : 1 - day;
          const monday = new Date(Date.UTC(
            date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + diff,
          ));
          const key = monday.toISOString().slice(0, 10);
          timelineMap[key] = (timelineMap[key] || 0) + 1;
        }
        const timeline = Object.entries(timelineMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([week, count]) => ({ week, count }));

        // Per-student aggregation
        const studentMap = {};
        for (const st of allStudents) {
          studentMap[st.id] = {
            id: st.id, name: st.full_name,
            submitted: 0, total: totalAssignments,
            scores: [],
            bySkill: { reading: [], listening: [], writing: [], speaking: [] },
            onTime: 0, late: 0, closedTotal: 0,
            subs: [],
          };
        }
        for (const sub of submissions) {
          const st = studentMap[sub.student_id];
          if (!st) continue;
          st.submitted++;
          const score = sub.overall_score !== null ? Number(sub.overall_score) : null;
          if (score !== null) {
            st.scores.push(score);
            if (st.bySkill[sub.skill]) st.bySkill[sub.skill].push(score);
          }
          if (!sub.is_active && sub.deadline) {
            st.closedTotal++;
            if (new Date(sub.submitted_at) <= new Date(sub.deadline)) st.onTime++;
            else st.late++;
          }
          st.subs.push({
            assignment_id: sub.assignment_id,
            assignment_title: sub.assignment_title,
            skill: sub.skill,
            overall_score: score,
            submitted_at: sub.submitted_at,
            is_active: sub.is_active,
            deadline: sub.deadline,
            on_time: sub.deadline ? new Date(sub.submitted_at) <= new Date(sub.deadline) : null,
            is_overtime: sub.is_overtime ?? false,
          });
        }
        const perStudent = Object.values(studentMap).map(st => ({
          id: st.id, name: st.name,
          submitted: st.submitted, total: st.total,
          avg_score: avg(st.scores),
          avg_reading: avg(st.bySkill.reading),
          avg_listening: avg(st.bySkill.listening),
          avg_writing: avg(st.bySkill.writing),
          avg_speaking: avg(st.bySkill.speaking),
          on_time: st.onTime, late: st.late, closed_total: st.closedTotal,
          missing_closed: Math.max(0, closedAssignments - st.closedTotal),
          submissions: st.subs,
        }));

        // Per-assignment aggregation
        const assignMap = {};
        for (const a of allAssignments) {
          assignMap[a.id] = {
            id: a.id, title: a.title, skill: a.skill,
            deadline: a.deadline, is_active: a.is_active,
            submitted: 0, total: totalStudents,
            scores: [], onTime: 0, late: 0,
          };
        }
        for (const sub of submissions) {
          const a = assignMap[sub.assignment_id];
          if (!a) continue;
          a.submitted++;
          if (sub.overall_score !== null) a.scores.push(Number(sub.overall_score));
          if (!sub.is_active && sub.deadline) {
            if (new Date(sub.submitted_at) <= new Date(sub.deadline)) a.onTime++;
            else a.late++;
          }
        }
        // Composite: count one submission per student (regardless of section count)
        for (const csub of compositeSubmissions) {
          const a = assignMap[csub.assignment_id];
          if (!a) continue;
          a.submitted++;
          if (csub.avg_score !== null) a.scores.push(Number(csub.avg_score));
          if (!csub.is_active && csub.deadline) {
            if (new Date(csub.submitted_at) <= new Date(csub.deadline)) a.onTime++;
            else a.late++;
          }
        }
        const perAssignment = allAssignments.map(a => {
          const d = assignMap[a.id];
          return {
            id: d.id, title: d.title, skill: d.skill, mode: a.mode, scoring_scale: a.scoring_scale ?? '10', time_limit_minutes: a.time_limit_minutes ?? null,
            deadline: d.deadline, is_active: d.is_active,
            submitted: d.submitted, total: d.total,
            avg_score: avg(d.scores),
            on_time: d.onTime, late: d.late,
            missing: !d.is_active ? Math.max(0, d.total - d.submitted) : null,
          };
        });

        return json({
          overview: {
            total_students: totalStudents,
            total_assignments: totalAssignments,
            active_assignments: activeAssignments,
            closed_assignments: closedAssignments,
            total_submissions: submissions.length,
            submission_rate: submissionRate,
            avg_score: avgScore,
            scored_submissions: scoredSubs.length,
          },
          score_distribution: distribution,
          score_by_skill: scoreBySkill,
          completion_by_skill: completionBySkill,
          timeline,
          per_student: perStudent,
          per_assignment: perAssignment,
        });
      }

      if ((p = matchPath('/classes/:id', path))) {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'GET') {
          await autoCloseExpired(sql, { classId: p.id });
          const [cls] = await sql`
            SELECT c.*,
              (SELECT COUNT(*) FROM student_classes sc WHERE sc.class_id = c.id)::int AS student_count
            FROM classes c WHERE c.id = ${p.id}
          `;
          if (!cls) return err('Không tìm thấy lớp', 404);

          const assignments = await sql`
            SELECT a.*, q.title AS question_title, q.skill,
              CASE WHEN q.skill = 'composite' THEN
                (SELECT COUNT(DISTINCT css.student_id) FROM composite_section_submissions css WHERE css.assignment_id = a.id)::int
              ELSE
                (SELECT COUNT(*) FROM submissions sub WHERE sub.assignment_id = a.id)::int
              END AS submission_count,
              CASE WHEN q.skill = 'composite' THEN (
                SELECT json_agg(json_build_object(
                  'id', cqs.id, 'label', cqs.label, 'skill', cqs.skill,
                  'time_limit_minutes', cqs.time_limit_minutes, 'display_order', cqs.display_order
                ) ORDER BY cqs.display_order)
                FROM composite_question_sections cqs WHERE cqs.composite_id = q.id
              ) ELSE NULL END AS composite_sections
            FROM assignments a
            JOIN question_pool q ON q.id = a.question_id
            WHERE a.class_id = ${p.id}
            ORDER BY a.created_at DESC
          `;
          return json({ ...cls, assignments });
        }
        if (method === 'PATCH') {
          const body = await request.json();
          const [row] = await sql`
            UPDATE classes
            SET class_name  = COALESCE(${body.class_name  ?? null}, class_name),
                description = COALESCE(${body.description ?? null}, description)
            WHERE id = ${p.id}
            RETURNING *
          `;
          return json(row);
        }
        if (method === 'DELETE') {
          const subAudios = await sql`
            SELECT sub.speaking_audio_url, sub.speaking_audio_urls
            FROM submissions sub
            JOIN assignments a ON a.id = sub.assignment_id
            WHERE a.class_id = ${p.id}
          `;
          await sql`DELETE FROM classes WHERE id = ${p.id}`;
          for (const sub of subAudios) {
            const entries = Array.isArray(sub.speaking_audio_urls) && sub.speaking_audio_urls.length > 0
              ? sub.speaking_audio_urls
              : (sub.speaking_audio_url ? [{ url: sub.speaking_audio_url }] : []);
            for (const e of entries) {
              const key = e.key || extractR2Key(e.url, env.R2_PUBLIC_URL);
              if (key) await env.R2.delete(key).catch(err => console.error('R2 speaking cleanup failed:', err));
            }
          }
          return json({ ok: true });
        }
      }

      // ── Students ───────────────────────────────────────────────────────────

      if (path === '/students' && method === 'POST') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        const body = await request.json();
        const classId = String(body.class_id || '').trim() || null;
        const requestedStudents = Array.isArray(body.students) ? body.students : [];
        const students = requestedStudents
          .map(item => ({ full_name: normalizeStudentFullName(item?.full_name) }))
          .filter(item => item.full_name);

        if (students.length === 0) {
          return err('students là bắt buộc và phải có ít nhất 1 học sinh hợp lệ');
        }

        if (classId) {
          const [cls] = await sql`SELECT id FROM classes WHERE id = ${classId}`;
          if (!cls) return err('Không tìm thấy lớp', 404);
        }

        const reservedUsernames = new Set();
        const preparedStudents = [];
        try {
          for (const student of students) {
            const username = await generateUniqueStudentUsername(sql, student.full_name, reservedUsernames);
            const password = generateStudentPassword();
            const passwordHash = await hashPassword(password);
            preparedStudents.push({
              full_name: student.full_name,
              username,
              password,
              passwordHash,
            });
          }
        } catch (e) {
          return err(e.message || 'Không thể tạo tài khoản học sinh', e.statusCode || 400);
        }

        try {
          const rows = await sql.transaction(txn =>
            preparedStudents.map(student => (
              classId
                ? txn`
                    WITH inserted AS (
                      INSERT INTO students (full_name, username, password_hash)
                      VALUES (${student.full_name}, ${student.username}, ${student.passwordHash})
                      RETURNING id, full_name, username
                    ), linked AS (
                      INSERT INTO student_classes (student_id, class_id)
                      SELECT id, ${classId} FROM inserted
                      ON CONFLICT DO NOTHING
                    )
                    SELECT id, full_name, username FROM inserted
                  `
                : txn`
                    INSERT INTO students (full_name, username, password_hash)
                    VALUES (${student.full_name}, ${student.username}, ${student.passwordHash})
                    RETURNING id, full_name, username
                  `
            ))
          );

          const created = rows.map((result, index) => ({
            id: result[0]?.id,
            full_name: preparedStudents[index].full_name,
            username: preparedStudents[index].username,
            password: preparedStudents[index].password,
          }));

          return json({ created }, 201);
        } catch (e) {
          if (e.message?.includes('unique') || e.message?.includes('duplicate'))
            return err('Username vừa bị trùng, vui lòng thử lại', 409);
          throw e;
        }
      }

      if ((p = matchPath('/students/:id/reset-password', path)) && method === 'POST') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        const [student] = await sql`
          SELECT id, full_name, username
          FROM students
          WHERE id = ${p.id}
        `;
        if (!student) return err('Không tìm thấy học sinh', 404);

        const password = generateStudentPassword();
        const passwordHash = await hashPassword(password);
        await sql`UPDATE students SET password_hash = ${passwordHash} WHERE id = ${p.id}`;
        return json({
          student,
          credentials: {
            full_name: student.full_name,
            username: student.username,
            password,
          },
        });
      }

      if ((p = matchPath('/students/:id', path))) {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'DELETE') {
          const subAudios = await sql`
            SELECT speaking_audio_url, speaking_audio_urls FROM submissions
            WHERE student_id = ${p.id}
          `;
          await sql`DELETE FROM students WHERE id = ${p.id}`;
          for (const sub of subAudios) {
            const entries = Array.isArray(sub.speaking_audio_urls) && sub.speaking_audio_urls.length > 0
              ? sub.speaking_audio_urls
              : (sub.speaking_audio_url ? [{ url: sub.speaking_audio_url }] : []);
            for (const e of entries) {
              const key = e.key || extractR2Key(e.url, env.R2_PUBLIC_URL);
              if (key) await env.R2.delete(key).catch(err => console.error('R2 speaking cleanup failed:', err));
            }
          }
          return json({ ok: true });
        }
        if (method === 'PATCH') {
          const body = await request.json();
          if (body.full_name) {
            const fullName = normalizeStudentFullName(body.full_name);
            if (!fullName) return err('full_name không hợp lệ');
            await sql`UPDATE students SET full_name = ${fullName} WHERE id = ${p.id}`;
          }
          const [student] = await sql`
            SELECT id, full_name, username FROM students WHERE id = ${p.id}
          `;
          return json(student);
        }
      }

      // ── Student-Classes (junction) ──────────────────────────────────────────

      if (path === '/student-classes') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'POST') {
          const body = await request.json();
          if (!body.class_id) return err('class_id là bắt buộc');

          let studentId = body.student_id;
          if (!studentId && body.username) {
            const [s] = await sql`SELECT id FROM students WHERE username = ${body.username}`;
            if (!s) return err('Không tìm thấy học sinh với username này', 404);
            studentId = s.id;
          }
          if (!studentId) return err('student_id hoặc username là bắt buộc');

          try {
            await sql`
              INSERT INTO student_classes (student_id, class_id)
              VALUES (${studentId}, ${body.class_id})
            `;
          } catch (e) {
            if (e.message?.includes('duplicate') || e.message?.includes('unique'))
              return err('Học sinh đã thuộc lớp này rồi', 409);
            throw e;
          }
          return json({ ok: true }, 201);
        }

        if (method === 'DELETE') {
          const studentId = url.searchParams.get('student_id');
          const classId   = url.searchParams.get('class_id');
          if (!studentId || !classId) return err('student_id và class_id là bắt buộc');
          await sql`
            DELETE FROM student_classes
            WHERE student_id = ${studentId} AND class_id = ${classId}
          `;
          return json({ ok: true });
        }
      }

      if (path === '/uploads/images/presign' && method === 'POST') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        const body = await request.json().catch(() => null);
        const fileName = String(body?.file_name || 'image');
        const contentType = String(body?.content_type || '').trim().toLowerCase();
        const size = Number(body?.size || 0);

        if (!contentType.startsWith('image/')) return err('Chỉ chấp nhận file ảnh', 415);
        const MAX_IMAGE_MB = 12;
        if (!Number.isFinite(size) || size <= 0) return err('Kích thước file không hợp lệ', 400);
        if (size > MAX_IMAGE_MB * 1024 * 1024) return err(`File ảnh quá lớn — tối đa ${MAX_IMAGE_MB}MB`, 413);

        const ALLOWED_EXT = ['jpg','jpeg','png','gif','webp','svg'];
        const rawExt = fileName.split('.').pop()?.toLowerCase() || '';
        const ext = ALLOWED_EXT.includes(rawExt) ? rawExt : 'png';
        const key = `images/${crypto.randomUUID()}.${ext}`;

        try {
          const signed = await createR2PresignedPutUrl(env, { key, contentType, expiresIn: 300 });
          return json({
            upload_url: signed.url,
            key: signed.key,
            public_url: signed.publicUrl,
            headers: signed.headers,
            expires_in: signed.expiresIn,
          }, 201);
        } catch (e) {
          return err('Không thể tạo presigned URL: ' + e.message, 500);
        }
      }

      if (path === '/uploads/images' && method === 'POST') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        const form = await request.formData();
        const file = form.get('image');
        if (!file || typeof file === 'string') return err('Thiếu file image', 400);
        if (!String(file.type || '').startsWith('image/')) return err('Chỉ chấp nhận file ảnh', 415);
        const MAX_IMAGE_MB = 12;
        if (file.size > MAX_IMAGE_MB * 1024 * 1024)
          return err(`File ảnh quá lớn — tối đa ${MAX_IMAGE_MB}MB`, 413);

        const ALLOWED_EXT = ['jpg','jpeg','png','gif','webp','svg'];
        const rawExt = (file.name || 'image').split('.').pop()?.toLowerCase() || '';
        const ext = ALLOWED_EXT.includes(rawExt) ? rawExt : 'png';
        const key = `images/${crypto.randomUUID()}.${ext}`;
        await env.R2.put(key, file.stream(), {
          httpMetadata: { contentType: file.type || 'application/octet-stream' },
        });
        return json({
          url: `${env.R2_PUBLIC_URL}/${key}`,
          name: file.name || 'image',
          content_type: file.type || 'application/octet-stream',
          size: file.size,
        }, 201);
      }

      if (path === '/uploads/audio/presign' && method === 'POST') {
        const body = await request.json().catch(() => null);
        const scope = String(body?.scope || '').trim();
        const fileName = sanitizeFileName(body?.file_name || 'audio');
        const contentType = String(body?.content_type || '').trim().toLowerCase();
        const size = Number(body?.size || 0);
        if (!isAudioContentType(contentType)) return err('Chỉ chấp nhận file âm thanh', 415);

        let key = null;
        let maxBytes = 0;

        if (scope === 'teacher-listening') {
          if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
          maxBytes = 200 * 1024 * 1024;
          key = buildTeacherAudioKey(fileName);
        } else if (scope === 'student-speaking') {
          const claims = await requireStudentAuth(request, env);
          if (!claims) return err('Unauthorized', 401);
          const assignmentId = String(body?.assignment_id || '').trim();
          const studentId = String(claims.student_id);
          if (!assignmentId || !studentId) return err('assignment_id và student_id là bắt buộc', 400);
          const assignment = await loadStudentAssignmentAccess(sql, assignmentId, studentId);
          if (!assignment) return err('Học sinh không thuộc bài tập này', 403);
          if (!assignment.is_active) return err('Bài tập đã đóng', 403);
          maxBytes = 50 * 1024 * 1024;
          key = buildStudentSpeakingKey(assignmentId, studentId, fileName);
        } else if (scope === 'student-shared-speaking') {
          const claims = await requireStudentAuth(request, env);
          if (!claims) return err('Unauthorized', 401);
          const poolId   = String(body?.pool_id   || '').trim();
          const studentId = String(claims.student_id);
          if (!poolId || !studentId) return err('pool_id là bắt buộc', 400);
          if (!await studentHasAnyClassMembership(sql, studentId))
            return err('Học sinh chưa thuộc lớp nào', 403);
          const [pool] = await sql`SELECT id FROM shared_pool WHERE id = ${poolId}`;
          if (!pool) return err('Không tìm thấy đề luyện tập', 404);
          maxBytes = 50 * 1024 * 1024;
          key = buildSharedSpeakingKey(poolId, studentId, fileName);
        } else {
          return err('Upload scope không hợp lệ', 400);
        }

        if (!Number.isFinite(size) || size <= 0) return err('Kích thước file không hợp lệ', 400);
        if (size > maxBytes) {
          return err(`File quá lớn — tối đa ${Math.round(maxBytes / 1024 / 1024)}MB`, 413);
        }

        try {
          const signed = await createR2PresignedPutUrl(env, { key, contentType, expiresIn: 900 });
          return json({
            upload_url: signed.url,
            key: signed.key,
            public_url: signed.publicUrl,
            headers: signed.headers,
            expires_in: signed.expiresIn,
          }, 201);
        } catch (signErr) {
          return err(signErr.message || 'Không thể tạo URL upload', signErr.statusCode || 500);
        }
      }

      if (path === '/uploads/audio' && method === 'POST') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        const form = await request.formData();
        const file = form.get('audio');
        if (!file || typeof file === 'string') return err('Thiếu file audio', 400);
        if (!String(file.type || '').startsWith('audio/')) return err('Chỉ chấp nhận file âm thanh', 415);
        const MAX_AUDIO_MB = 200;
        if (file.size > MAX_AUDIO_MB * 1024 * 1024)
          return err(`File âm thanh quá lớn — tối đa ${MAX_AUDIO_MB}MB`, 413);

        const key = buildTeacherAudioKey(file.name || 'audio');
        await env.R2.put(key, file.stream(), {
          httpMetadata: { contentType: file.type || 'application/octet-stream' },
        });
        return json({
          url: buildR2PublicUrl(env, key),
          key,
          name: file.name || 'audio',
          content_type: file.type || 'application/octet-stream',
          size: file.size,
        }, 201);
      }

      // ── Listening Script Transcription (by R2 key — no second browser upload) ─

      if (path === '/questions/transcribe-audio' && method === 'POST') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        const body = await request.json().catch(() => null);

        // Multi-key mode: keys = [{key, name}, ...]
        if (Array.isArray(body?.keys) && body.keys.length > 0) {
          const parts = [];
          for (const item of body.keys) {
            const r2Key = item?.key;
            const label = String(item?.name || r2Key || '').trim();
            if (!r2Key) continue;
            try {
              const data = await transcribeR2Audio(env, r2Key);
              parts.push(`--- Transcript: ${label} ---\n${data.text || ''}`);
            } catch (sttErr) {
              return err(`Không thể transcribe "${label}": ${sttErr.message}`, sttErr.statusCode || 502);
            }
          }
          return json({ text: parts.join('\n\n\n') });
        }

        // Single-key mode (backward compat)
        const r2Key = body?.key;
        if (!r2Key) return err('Missing R2 key', 400);
        try {
          const data = await transcribeR2Audio(env, r2Key);
          return json({ text: data.text || '' });
        } catch (sttErr) {
          return err(sttErr.message || 'Không thể trích xuất script từ audio', sttErr.statusCode || 502);
        }
      }

      // ── Question Pool ──────────────────────────────────────────────────────

      // ── Question Folders ───────────────────────────────────────────────────

      if (path === '/question-folders') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'GET') {
          const rows = await sql`SELECT * FROM question_folders ORDER BY display_order, name`;
          return json(rows);
        }
        if (method === 'POST') {
          const body = await request.json();
          const name = String(body.name || '').trim();
          if (!name) return err('Tên thư mục là bắt buộc', 400);
          const parentId = body.parent_id || null;
          const [folder] = await sql`
            INSERT INTO question_folders (name, parent_id)
            VALUES (${name}, ${parentId})
            RETURNING *
          `;
          return json(folder, 201);
        }
      }

      if ((p = matchPath('/question-folders/:id', path))) {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'PATCH') {
          const body = await request.json();
          const name  = body.name  !== undefined ? String(body.name  || '').trim() : null;
          const order = body.display_order !== undefined ? Number(body.display_order) : null;
          const [folder] = await sql`
            UPDATE question_folders
            SET name          = COALESCE(${name},  name),
                display_order = COALESCE(${order}, display_order)
            WHERE id = ${p.id}
            RETURNING *
          `;
          if (!folder) return err('Không tìm thấy thư mục', 404);
          return json(folder);
        }
        if (method === 'DELETE') {
          const [existing] = await sql`SELECT id FROM question_folders WHERE id = ${p.id}`;
          if (!existing) return err('Không tìm thấy thư mục', 404);
          // Cascade: subfolders deleted, questions in any subfolder get folder_id = NULL via ON DELETE SET NULL
          await sql`DELETE FROM question_folders WHERE id = ${p.id}`;
          return json({ ok: true });
        }
      }

      if (path === '/questions') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'GET') {
          const skill = url.searchParams.get('skill');
          const rows = skill
            ? await sql`
                SELECT id, teacher_id, skill, title, content_url, content_text, content_blocks, questions_data, tags, script, folder_id, created_at
                FROM question_pool
                WHERE skill = ${skill}::skill_type
                ORDER BY created_at DESC
              `
            : await sql`
                SELECT id, teacher_id, skill, title, content_url, content_text, content_blocks, questions_data, tags, script, folder_id, created_at
                FROM question_pool
                ORDER BY created_at DESC
              `;
          return json(rows);
        }
        if (method === 'POST') {
          const teacherId = await getTeacherId(sql);
          const ct = request.headers.get('Content-Type') || '';
          let title, skill, content_text, questions_data, content_url = null, content_blocks = [];
          let uploadedR2Key = null;
          let vocabulary = [];
          let script = null;
          let compositeSections = [];

          if (ct.includes('multipart/form-data')) {
            const form = await request.formData();
            title        = form.get('title');
            skill        = form.get('skill');
            content_text = form.get('content_text') || null;

            try {
              content_blocks = JSON.parse(form.get('content_blocks') || '[]');
              questions_data = JSON.parse(form.get('questions_data') || '[]');
              vocabulary     = JSON.parse(form.get('vocabulary')     || '[]');
              var tagsArr    = JSON.parse(form.get('tags')           || '[]');
            } catch {
              return err('Dữ liệu câu hỏi không hợp lệ (JSON parse error)', 400);
            }

            const audio = form.get('audio');
            if (audio && audio.size > 0) {
              const MAX_AUDIO_MB = 200;
              if (audio.size > MAX_AUDIO_MB * 1024 * 1024)
                return err(`File âm thanh quá lớn — tối đa ${MAX_AUDIO_MB}MB`, 413);
              if (!audio.type.startsWith('audio/'))
                return err('Chỉ chấp nhận file âm thanh', 415);

              uploadedR2Key = buildTeacherAudioKey(audio.name);
              await env.R2.put(uploadedR2Key, audio.stream(), {
                httpMetadata: { contentType: audio.type },
              });
              content_url = `${env.R2_PUBLIC_URL}/${uploadedR2Key}`;
            }
          } else {
            const body = await request.json();
            title          = body.title;
            skill          = body.skill;
            content_blocks = body.content_blocks || [];
            content_text   = body.content_text ?? null;
            uploadedR2Key  = body.content_upload_key ?? null;
            content_url    = body.content_url  ?? (uploadedR2Key ? buildR2PublicUrl(env, uploadedR2Key) : null);
            questions_data = body.questions_data || [];
            vocabulary     = body.vocabulary    || [];
            script         = body.script        ?? null;
            var tagsArr    = body.tags          || [];
            var contentUrls = Array.isArray(body.content_urls) ? body.content_urls : [];
            compositeSections = Array.isArray(body.sections) ? body.sections : [];
          }
          content_blocks = normalizeContentBlocks(content_blocks);
          if (content_blocks.length) content_text = blocksToPlainText(content_blocks);
          const tags = Array.isArray(tagsArr) ? tagsArr.map(String).filter(Boolean) : [];
          if (typeof contentUrls === 'undefined') contentUrls = [];

          if (!title || !skill) {
            if (uploadedR2Key) await env.R2.delete(uploadedR2Key).catch(() => {});
            return err('title và skill là bắt buộc');
          }

          try {
            const [row] = await sql`
              INSERT INTO question_pool (teacher_id, skill, title, content_text, content_blocks, content_url, content_urls, questions_data, vocabulary, tags, script)
              VALUES (
                ${teacherId}, ${skill}::skill_type, ${title},
                ${content_text}, ${JSON.stringify(content_blocks)}::jsonb, ${content_url},
                ${JSON.stringify(contentUrls)}::jsonb,
                ${JSON.stringify(questions_data)}, ${JSON.stringify(vocabulary)},
                ${tags}, ${script}
              )
              RETURNING *
            `;
            for (const item of (row.content_urls || [])) {
              const k = item?.key || extractR2Key(item?.url, env.R2_PUBLIC_URL);
              if (k) await r2RefIncrement(sql, k).catch(e => console.error('R2 ref track failed:', e));
            }
            if (!(row.content_urls?.length) ) {
              const audioKey = extractR2Key(row.content_url, env.R2_PUBLIC_URL);
              if (audioKey) await r2RefIncrement(sql, audioKey).catch(e => console.error('R2 ref track failed:', e));
            }
            for (const imgUrl of extractContentBlockImageUrls(row.content_blocks || [])) {
              const imgKey = extractR2Key(imgUrl, env.R2_PUBLIC_URL);
              if (imgKey) await r2RefIncrement(sql, imgKey).catch(e => console.error('R2 ref track failed:', e));
            }

            // Insert composite sections if this is a composite question
            if (skill === 'composite' && compositeSections.length > 0) {
              let qOffset = 0;
              for (let i = 0; i < compositeSections.length; i++) {
                const sec = compositeSections[i];
                if (!sec.label || !sec.skill) continue;
                const secQuestionsData  = sec.questions_data  || [];
                const secContentBlocks  = normalizeContentBlocks(sec.content_blocks || []);
                const secContentText    = secContentBlocks.length ? blocksToPlainText(secContentBlocks) : (sec.content_text ?? null);
                const secContentUrl     = sec.content_url  ?? null;
                const secContentUrls    = sec.content_urls ?? [];
                const secVocabulary     = sec.vocabulary ?? [];
                const isObjective = sec.skill === 'reading' || sec.skill === 'listening';
                await sql`
                  INSERT INTO composite_question_sections
                    (composite_id, label, skill, questions_data, prompt, content_text,
                     content_blocks, content_url, content_urls, script, vocabulary,
                     time_limit_minutes, question_offset, display_order)
                  VALUES (
                    ${row.id}, ${sec.label}, ${sec.skill},
                    ${JSON.stringify(secQuestionsData)}::jsonb,
                    ${sec.prompt ?? null}, ${secContentText},
                    ${JSON.stringify(secContentBlocks)}::jsonb,
                    ${secContentUrl},
                    ${JSON.stringify(secContentUrls)}::jsonb,
                    ${sec.script ?? null},
                    ${JSON.stringify(secVocabulary)}::jsonb,
                    ${sec.time_limit_minutes ?? null}, ${qOffset}, ${i}
                  )
                `;
                if (isObjective) qOffset += secQuestionsData.length;
              }
            }

            return json(row, 201);
          } catch (dbErr) {
            if (uploadedR2Key) await env.R2.delete(uploadedR2Key).catch(() => {});
            throw dbErr;
          }
        }
      }

      // B4.6 — Duplicate question (must match before /questions/:id)
      if ((p = matchPath('/questions/:id/duplicate', path)) && method === 'POST') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        const [src] = await sql`SELECT * FROM question_pool WHERE id = ${p.id}`;
        if (!src) return err('Không tìm thấy đề', 404);
        const teacherId = await getTeacherId(sql);
        const [row] = await sql`
          INSERT INTO question_pool (
            teacher_id, skill, title, content_text, content_blocks, content_url, content_urls,
            questions_data, vocabulary, tags, script, folder_id
          )
          VALUES (
            ${teacherId}, ${src.skill}::skill_type, ${(src.title || '') + ' (Bản sao)'},
            ${src.content_text}, ${JSON.stringify(src.content_blocks || [])}::jsonb, ${src.content_url},
            ${JSON.stringify(src.content_urls || [])}::jsonb,
            ${JSON.stringify(src.questions_data || [])}, ${JSON.stringify(src.vocabulary || [])},
            ${src.tags || []}, ${src.script ?? null}, ${src.folder_id ?? null}
          )
          RETURNING *
        `;
        for (const item of (row.content_urls || [])) {
          const k = item?.key || extractR2Key(item?.url, env.R2_PUBLIC_URL);
          if (k) await r2RefIncrement(sql, k).catch(e => console.error('R2 ref track failed:', e));
        }
        if (!(row.content_urls?.length)) {
          const audioKey = extractR2Key(row.content_url, env.R2_PUBLIC_URL);
          if (audioKey) await r2RefIncrement(sql, audioKey).catch(e => console.error('R2 ref track failed:', e));
        }
        for (const imgUrl of extractContentBlockImageUrls(row.content_blocks || [])) {
          const imgKey = extractR2Key(imgUrl, env.R2_PUBLIC_URL);
          if (imgKey) await r2RefIncrement(sql, imgKey).catch(e => console.error('R2 ref track failed:', e));
        }
        return json(row, 201);
      }

      if ((p = matchPath('/questions/:id', path))) {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'GET') {
          const [row] = await sql`SELECT * FROM question_pool WHERE id = ${p.id}`;
          if (!row) return err('Không tìm thấy đề', 404);
          if (row.skill === 'composite') {
            const sections = await sql`
              SELECT * FROM composite_question_sections
              WHERE composite_id = ${p.id}
              ORDER BY display_order
            `;
            return json({ ...row, sections });
          }
          return json(row);
        }
        if (method === 'PATCH') {
          const body = await request.json();
          const [existing] = await sql`SELECT content_blocks FROM question_pool WHERE id = ${p.id}`;
          if (!existing) return err('Không tìm thấy đề', 404);
          const normalizedBlocks = body.content_blocks !== undefined
            ? normalizeContentBlocks(body.content_blocks)
            : null;
          const nextContentText = normalizedBlocks
            ? blocksToPlainText(normalizedBlocks)
            : (body.content_text !== undefined ? (body.content_text ?? null) : null);
          const questionsDataJson = body.questions_data !== undefined
            ? JSON.stringify(body.questions_data)
            : null;
          const vocabularyJson = body.vocabulary !== undefined
            ? JSON.stringify(body.vocabulary)
            : null;
          const contentBlocksJson = normalizedBlocks !== null
            ? JSON.stringify(normalizedBlocks)
            : null;
          const tagsArr = body.tags !== undefined
            ? (Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean) : null)
            : null;
          const shouldUpdateContentText = normalizedBlocks !== null || body.content_text !== undefined;
          const scriptVal = body.script !== undefined ? (body.script ?? null) : null;
          // folder_id: undefined = don't touch, null/uuid = set value
          const shouldUpdateFolder = body.folder_id !== undefined;
          const folderIdVal = shouldUpdateFolder ? (body.folder_id || null) : null;
          const [row] = await sql`
            UPDATE question_pool
            SET title          = COALESCE(${body.title          ?? null}, title),
                content_text   = CASE WHEN ${shouldUpdateContentText} THEN ${nextContentText} ELSE content_text END,
                content_blocks = COALESCE(${contentBlocksJson}::jsonb,        content_blocks),
                questions_data = COALESCE(${questionsDataJson}::jsonb,    questions_data),
                vocabulary     = COALESCE(${vocabularyJson}::jsonb,       vocabulary),
                tags           = COALESCE(${tagsArr},                     tags),
                script         = COALESCE(${scriptVal},                   script),
                folder_id      = CASE WHEN ${shouldUpdateFolder} THEN ${folderIdVal}::uuid ELSE folder_id END
            WHERE id = ${p.id}
            RETURNING *
          `;
          if (normalizedBlocks !== null) {
            const oldKeys = extractContentBlockImageUrls(existing.content_blocks).map(url => extractR2Key(url, env.R2_PUBLIC_URL)).filter(Boolean);
            const newKeySet = new Set(extractContentBlockImageUrls(normalizedBlocks).map(url => extractR2Key(url, env.R2_PUBLIC_URL)).filter(Boolean));
            for (const key of newKeySet) {
              if (!oldKeys.includes(key)) await r2RefIncrement(sql, key).catch(e => console.error('R2 ref increment failed:', key, e));
            }
            for (const key of oldKeys) {
              if (!newKeySet.has(key)) await r2SafeDelete(env, sql, key).catch(e => console.error('R2 image cleanup failed:', e));
            }
          }
          // Handle composite section update: delete orphaned sections, upsert remaining
          if (row.skill === 'composite' && Array.isArray(body.sections)) {
            const incomingSections = body.sections;
            const incomingIds = incomingSections.map(s => s._id).filter(Boolean);
            // Delete sections not in the incoming list
            if (incomingIds.length > 0) {
              await sql`DELETE FROM composite_question_sections WHERE composite_id = ${p.id} AND id != ALL(${incomingIds}::uuid[])`;
            } else {
              await sql`DELETE FROM composite_question_sections WHERE composite_id = ${p.id}`;
            }
            let qOffset = 0;
            for (let i = 0; i < incomingSections.length; i++) {
              const sec = incomingSections[i];
              if (!sec.label || !sec.skill) continue;
              const secQuestionsData = sec.questions_data || [];
              const secContentBlocks = normalizeContentBlocks(sec.content_blocks || []);
              const secContentText = secContentBlocks.length ? blocksToPlainText(secContentBlocks) : (sec.content_text ?? null);
              const secVocabulary = sec.vocabulary || [];
              const isObjective = sec.skill === 'reading' || sec.skill === 'listening';
              if (sec._id) {
                await sql`
                  UPDATE composite_question_sections SET
                    label = ${sec.label}, skill = ${sec.skill},
                    questions_data = ${JSON.stringify(secQuestionsData)}::jsonb,
                    prompt = ${sec.prompt ?? null}, content_text = ${secContentText},
                    content_blocks = ${JSON.stringify(secContentBlocks)}::jsonb,
                    content_url = ${sec.content_url ?? null},
                    content_urls = ${JSON.stringify(sec.content_urls ?? [])}::jsonb,
                    script = ${sec.script ?? null},
                    vocabulary = ${JSON.stringify(secVocabulary)}::jsonb,
                    time_limit_minutes = ${sec.time_limit_minutes ?? null},
                    question_offset = ${qOffset}, display_order = ${i}
                  WHERE id = ${sec._id} AND composite_id = ${p.id}
                `;
              } else {
                await sql`
                  INSERT INTO composite_question_sections
                    (composite_id, label, skill, questions_data, prompt, content_text,
                     content_blocks, content_url, content_urls, script, vocabulary,
                     time_limit_minutes, question_offset, display_order)
                  VALUES (
                    ${p.id}, ${sec.label}, ${sec.skill},
                    ${JSON.stringify(secQuestionsData)}::jsonb,
                    ${sec.prompt ?? null}, ${secContentText},
                    ${JSON.stringify(secContentBlocks)}::jsonb,
                    ${sec.content_url ?? null},
                    ${JSON.stringify(sec.content_urls ?? [])}::jsonb,
                    ${sec.script ?? null},
                    ${JSON.stringify(secVocabulary)}::jsonb,
                    ${sec.time_limit_minutes ?? null}, ${qOffset}, ${i}
                  )
                `;
              }
              if (isObjective) qOffset += secQuestionsData.length;
            }
          }
          return json(row);
        }
        if (method === 'DELETE') {
          const [question] = await sql`
            SELECT id, content_url, content_urls, content_blocks FROM question_pool WHERE id = ${p.id}
          `;
          if (!question) return err('Không tìm thấy đề', 404);

          const used = await sql`
            SELECT id FROM assignments WHERE question_id = ${p.id} LIMIT 1
          `;
          if (used.length > 0)
            return err('Đề đang được dùng trong bài tập, không thể xoá', 409);

          await sql`DELETE FROM question_pool WHERE id = ${p.id}`;

          if ((question.content_urls || []).length > 0) {
            for (const item of question.content_urls) {
              const k = item?.key || extractR2Key(item?.url, env.R2_PUBLIC_URL);
              if (k) await r2SafeDelete(env, sql, k).catch(e => console.error('R2 audio cleanup failed:', e));
            }
          } else {
            const r2Key = extractR2Key(question.content_url, env.R2_PUBLIC_URL);
            if (r2Key) await r2SafeDelete(env, sql, r2Key).catch(e => console.error('R2 cleanup failed:', e));
          }
          for (const url of extractContentBlockImageUrls(question.content_blocks)) {
            const key = extractR2Key(url, env.R2_PUBLIC_URL);
            if (key) await r2SafeDelete(env, sql, key).catch(e => console.error('R2 image cleanup failed:', e));
          }

          return json({ ok: true });
        }
      }

      // ── Assignments ────────────────────────────────────────────────────────

      if (path === '/assignments') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'GET') {
          const classId = url.searchParams.get('class_id');
          if (!classId) return err('class_id là bắt buộc');
          await autoCloseExpired(sql, { classId });
          const rows = await sql`
            SELECT a.*, q.title AS question_title, q.skill,
              (SELECT COUNT(*) FROM submissions sub WHERE sub.assignment_id = a.id)::int AS submission_count
            FROM assignments a
            JOIN question_pool q ON q.id = a.question_id
            WHERE a.class_id = ${classId}
            ORDER BY a.created_at DESC
          `;
          return json(rows);
        }
        if (method === 'POST') {
          const body = await request.json();
          if (!body.class_id || !body.question_id || !body.title)
            return err('class_id, question_id, title là bắt buộc');
          const assignMode = body.mode === 'practice' ? 'practice' : 'exam';
          const timeLimitMinutes = (assignMode === 'exam' && body.time_limit_minutes) ? Number(body.time_limit_minutes) : null;
          const [question] = await sql`SELECT skill, questions_data FROM question_pool WHERE id = ${body.question_id}`;
          // Determine scoring_scale: speaking/writing always ielts; R/L use body value or auto-detect by 40q
          let scoringScale = body.scoring_scale || null;
          if (!scoringScale) {
            if (question?.skill === 'speaking' || question?.skill === 'writing') {
              scoringScale = 'ielts';
            } else {
              const qCount = Array.isArray(question?.questions_data) ? question.questions_data.length : 0;
              scoringScale = qCount === 40 ? 'ielts' : '10';
            }
          }
          const [row] = await sql`
            INSERT INTO assignments (class_id, question_id, title, deadline, is_active, mode, time_limit_minutes, scoring_scale)
            VALUES (${body.class_id}, ${body.question_id}, ${body.title}, ${body.deadline ?? null}, true, ${assignMode}, ${timeLimitMinutes}, ${scoringScale})
            RETURNING *
          `;
          // Notify all students in the class about the new assignment
          const classStudents = await sql`
            SELECT sc.student_id, s.email
            FROM student_classes sc
            JOIN students s ON s.id = sc.student_id
            WHERE sc.class_id = ${body.class_id}
          `;
          const notifMeta = JSON.stringify({ title: body.title, skill: question?.skill ?? null, deadline: body.deadline ?? null });
          const studentIds = classStudents.map(row => row.student_id);
          if (studentIds.length > 0) {
            await sql`
              WITH input_rows AS (
                SELECT UNNEST(${studentIds}::uuid[]) AS student_id
              )
              INSERT INTO notifications (student_id, type, ref_id, metadata)
              SELECT student_id, 'new_assignment', ${row.id}, ${notifMeta}::jsonb
              FROM input_rows
              ON CONFLICT DO NOTHING
            `;
          }
          const deliverableStudentIds = [];
          const skippedStudentIds = [];
          for (const student of classStudents) {
            if (normalizeStudentEmail(student.email)) deliverableStudentIds.push(student.student_id);
            else skippedStudentIds.push(student.student_id);
          }
          await insertStudentEmailEvents(sql, {
            studentIds: deliverableStudentIds,
            assignmentId: row.id,
            eventType: EMAIL_EVENT_TYPES.NEW_ASSIGNMENT,
            status: 'pending',
          });
          await insertStudentEmailEvents(sql, {
            studentIds: skippedStudentIds,
            assignmentId: row.id,
            eventType: EMAIL_EVENT_TYPES.NEW_ASSIGNMENT,
            status: 'skipped',
            lastError: 'missing_or_invalid_student_email',
          });
          const immediateEmailDispatchLimit = Math.min(Math.max(deliverableStudentIds.length, 1), 5);
          if (deliverableStudentIds.length > 0) {
            ctx?.waitUntil?.(processQueuedStudentEmails(sql, env, {
              limit: immediateEmailDispatchLimit,
              delayMs: 1000,
            }));
          }
          return json(row, 201);
        }
      }

      // Must match before /assignments/:id
      if ((p = matchPath('/assignments/:id/submissions', path)) && method === 'GET') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        await autoCloseExpired(sql, { assignmentId: p.id });
        const [assignment] = await sql`
          SELECT a.id, a.title, a.deadline, a.is_active, a.class_id,
            q.skill, q.title AS question_title,
            c.class_name
          FROM assignments a
          JOIN question_pool q ON q.id = a.question_id
          JOIN classes c ON c.id = a.class_id
          WHERE a.id = ${p.id}
        `;
        if (!assignment) return err('Không tìm thấy bài tập', 404);

        const students = await sql`
          SELECT s.id AS student_id, s.full_name, s.username,
            sub.id AS submission_id, sub.overall_score,
            sub.status AS submission_status, sub.submitted_at
          FROM student_classes sc
          JOIN students s ON s.id = sc.student_id
          LEFT JOIN submissions sub
            ON sub.student_id = s.id AND sub.assignment_id = ${p.id}
          WHERE sc.class_id = ${assignment.class_id}
          ORDER BY s.full_name ASC
        `;
        return json({ assignment, students });
      }

      if ((p = matchPath('/assignments/:id/question', path)) && method === 'GET') {
        // Student endpoint — require JWT
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);

        await autoCloseExpired(sql, { assignmentId: p.id });
        const assignment = await loadStudentAssignmentAccess(sql, p.id, String(claims.student_id));
        if (!assignment) return err('Không tìm thấy bài tập', 404);
        if (!assignment.is_active) return err('Bài tập đã đóng', 403);
        return json(assignment);
      }

      if ((p = matchPath('/assignments/:id/vocabulary', path)) && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);

        const row = await loadStudentAssignmentAccess(sql, p.id, String(claims.student_id));
        if (!row) return err('Không tìm thấy bài tập', 404);
        return json({ assignment_title: row.assignment_title, skill: row.skill, vocabulary: row.vocabulary || [] });
      }

      if ((p = matchPath('/assignments/:id/submit', path)) && method === 'POST') {
        // Student endpoint — require JWT
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);

        const ct = request.headers.get('Content-Type') || '';
        let studentAnswers = null, writingContent = null, speakingAudioUrl = null, speakingScript = null;
        let speakingAudioUrls = [];
        let uploadedR2Key = null;
        let directUploadKey = null;
        let audioUploadKeys = null; // [{key, name}] multi-file

        const studentId = String(claims.student_id);
        let audioFile = null;

        if (ct.includes('multipart/form-data')) {
          const form = await request.formData();
          audioFile = form.get('audio');
        } else {
          const body = await request.json();
          studentAnswers  = body.student_answers  ?? null;
          writingContent  = body.writing_content  ?? null;
          directUploadKey = body.audio_upload_key ?? null;
          audioUploadKeys = Array.isArray(body.audio_upload_keys) && body.audio_upload_keys.length > 0
            ? body.audio_upload_keys : null;
        }

        if (!studentId) return err('student_id là bắt buộc');

        await autoCloseExpired(sql, { assignmentId: p.id });
        const assignment = await loadStudentAssignmentAccess(sql, p.id, studentId);
        if (!assignment) {
          if (audioUploadKeys) for (const k of audioUploadKeys) await env.R2.delete(k.key).catch(() => {});
          else if (directUploadKey) await env.R2.delete(directUploadKey).catch(() => {});
          return err('Học sinh không thuộc bài tập này', 403);
        }

        const [existing] = await sql`
          SELECT id FROM submissions WHERE assignment_id = ${p.id} AND student_id = ${studentId}
        `;
        if (existing) {
          if (audioUploadKeys) for (const k of audioUploadKeys) await env.R2.delete(k.key).catch(() => {});
          else if (directUploadKey) await env.R2.delete(directUploadKey).catch(() => {});
          return err('Bạn đã nộp bài này rồi', 409);
        }
        if (!assignment.is_active) {
          if (audioUploadKeys) for (const k of audioUploadKeys) await env.R2.delete(k.key).catch(() => {});
          else if (directUploadKey) await env.R2.delete(directUploadKey).catch(() => {});
          return err('Bài tập đã đóng', 403);
        }

        if (audioFile && audioFile.size > 0) {
          // Legacy multipart upload path (single file)
          const MAX_AUDIO_MB = 50;
          if (audioFile.size > MAX_AUDIO_MB * 1024 * 1024) return err(`File quá lớn — tối đa ${MAX_AUDIO_MB}MB`, 413);
          if (!isAudioContentType(audioFile.type)) return err('Chỉ chấp nhận file âm thanh', 415);
          if (!env.OPENAI_API_KEY) return err('Chưa cấu hình OPENAI_API_KEY trên server', 500);

          const openaiForm = new FormData();
          openaiForm.append('file', audioFile, audioFile.name || 'audio.webm');
          openaiForm.append('model', 'gpt-4o-mini-transcribe');
          openaiForm.append('response_format', 'json');

          const sttUrl = getOpenAIEndpoint(env, '/v1/audio/transcriptions', 'stt');
          const sttAuthToken = getOpenAIAuthToken(env, sttUrl, 'stt');
          const aiRes = await fetch(sttUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sttAuthToken}` },
            body: openaiForm,
          });

          if (!aiRes.ok) {
            const aiText = await aiRes.text();
            console.error('OpenAI STT error:', JSON.stringify({ endpoint: sttUrl, colo: request.cf?.colo || null, error: parseOpenAIError(aiText), raw: aiText }));
            if (isUnsupportedRegionOpenAIError(aiText)) return err('Dịch vụ nhận diện giọng nói đang bị chặn theo vùng từ hạ tầng hiện tại. Nếu app đang chạy qua Cloudflare Worker, hãy route STT qua một server/proxy khác rồi thử lại.', 502);
            return err('Không thể nhận diện giọng nói (STT Failed). Nộp bài thất bại.', 500);
          }
          const transcriptData = await aiRes.json();
          speakingScript = transcriptData.text || '';
          uploadedR2Key = buildStudentSpeakingKey(p.id, studentId, audioFile.name || 'audio.webm');
          await env.R2.put(uploadedR2Key, audioFile.stream(), { httpMetadata: { contentType: audioFile.type } });
          speakingAudioUrl = buildR2PublicUrl(env, uploadedR2Key);
          speakingAudioUrls = [{ url: speakingAudioUrl, key: uploadedR2Key, name: '' }];

        } else if (audioUploadKeys) {
          // Multi-file presigned upload path
          const validKeys = audioUploadKeys.filter(item => item.key && isExpectedStudentSpeakingKey(item.key, p.id, studentId));
          if (validKeys.length === 0) {
            for (const k of audioUploadKeys) await env.R2.delete(k.key).catch(() => {});
            return err('audio_upload_keys không hợp lệ', 400);
          }
          const parts = [];
          const processedKeys = [];
          try {
            for (const item of validKeys) {
              const transcriptData = await transcribeR2Audio(env, item.key);
              const label = item.name || item.key.split('/').pop();
              parts.push(`--- Transcript: ${label} ---\n${transcriptData.text || ''}`);
              speakingAudioUrls.push({ url: buildR2PublicUrl(env, item.key), key: item.key, name: item.name || '' });
              processedKeys.push(item.key);
            }
          } catch (sttErr) {
            for (const k of validKeys) await env.R2.delete(k.key).catch(() => {});
            return err(sttErr.message || 'Không thể nhận diện giọng nói (STT Failed). Nộp bài thất bại.', sttErr.statusCode || 500);
          }
          speakingScript = parts.join('\n\n\n');
          speakingAudioUrl = speakingAudioUrls[0]?.url || null;
          uploadedR2Key = validKeys[0]?.key || null;

        } else if (directUploadKey) {
          // Legacy single presigned key
          if (!isExpectedStudentSpeakingKey(directUploadKey, p.id, studentId)) {
            await env.R2.delete(directUploadKey).catch(() => {});
            return err('audio_upload_key không hợp lệ', 400);
          }
          uploadedR2Key = directUploadKey;
          try {
            const transcriptData = await transcribeR2Audio(env, directUploadKey);
            speakingScript = transcriptData.text || '';
            speakingAudioUrl = buildR2PublicUrl(env, directUploadKey);
            speakingAudioUrls = [{ url: speakingAudioUrl, key: directUploadKey, name: '' }];
          } catch (sttErr) {
            await env.R2.delete(directUploadKey).catch(() => {});
            return err(sttErr.message || 'Không thể nhận diện giọng nói (STT Failed). Nộp bài thất bại.', sttErr.statusCode || 500);
          }
        }

        let overallScore = null;
        if ((assignment.skill === 'reading' || assignment.skill === 'listening') && studentAnswers) {
          overallScore = autoGrade(studentAnswers, assignment.questions_data, assignment.scoring_scale || '10');
        }

        // Determine overtime: exam mode with time limit, check against exam_sessions
        let isOvertime = false;
        if (assignment.mode === 'exam' && assignment.time_limit_minutes) {
          const [session] = await sql`
            SELECT started_at FROM exam_sessions
            WHERE student_id = ${studentId} AND ref_type = 'assignment' AND ref_id = ${p.id}
          `;
          if (session) {
            const elapsedSec = (Date.now() - new Date(session.started_at).getTime()) / 1000;
            const limitSec   = assignment.time_limit_minutes * 60 + 30; // 30s grace
            isOvertime = elapsedSec > limitSec;
          }
        }

        try {
          const [submission] = await sql`
            INSERT INTO submissions
              (assignment_id, student_id, student_answers, writing_content, speaking_script, speaking_audio_url, speaking_audio_urls, overall_score, is_overtime)
            VALUES (
              ${p.id}, ${studentId},
              ${studentAnswers ? JSON.stringify(studentAnswers) : null},
              ${writingContent}, ${speakingScript}, ${speakingAudioUrl},
              ${JSON.stringify(speakingAudioUrls)}::jsonb, ${overallScore}, ${isOvertime}
            )
            RETURNING *
          `;
          // Mark assignment-related notifications as read since student has now submitted
          await sql`
            UPDATE notifications SET is_read = true, read_at = NOW()
            WHERE student_id = ${studentId}::uuid
              AND ref_id = ${p.id}::uuid
              AND type IN ('new_assignment', 'deadline_reminder')
              AND is_read = false
          `;
          return json(submission, 201);
        } catch (dbErr) {
          if (audioUploadKeys) for (const k of audioUploadKeys) await env.R2.delete(k.key).catch(() => {});
          else if (uploadedR2Key) await env.R2.delete(uploadedR2Key).catch(() => {});
          throw dbErr;
        }
      }

      if ((p = matchPath('/assignments/:id', path))) {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'PATCH') {
          const body = await request.json();
          const fields = [];
          const vals   = [];
          if (body.title     !== undefined) { fields.push('title');     vals.push(body.title); }
          if (body.deadline  !== undefined) { fields.push('deadline');  vals.push(body.deadline); }
          if (body.is_active !== undefined) { fields.push('is_active'); vals.push(body.is_active); }
          if (fields.length === 0) return err('Không có trường nào cần cập nhật');

          const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
          const result = await sql(
            `UPDATE assignments SET ${setClauses} WHERE id = $${fields.length + 1} RETURNING *`,
            [...vals, p.id],
          );
          return json(result[0]);
        }
        if (method === 'DELETE') {
          const subAudios = await sql`
            SELECT speaking_audio_url, speaking_audio_urls FROM submissions
            WHERE assignment_id = ${p.id}
          `;
          await sql`DELETE FROM assignments WHERE id = ${p.id}`;
          for (const sub of subAudios) {
            const entries = Array.isArray(sub.speaking_audio_urls) && sub.speaking_audio_urls.length > 0
              ? sub.speaking_audio_urls
              : (sub.speaking_audio_url ? [{ url: sub.speaking_audio_url }] : []);
            for (const e of entries) {
              const key = e.key || extractR2Key(e.url, env.R2_PUBLIC_URL);
              if (key) await env.R2.delete(key).catch(err => console.error('R2 speaking cleanup failed:', err));
            }
          }
          return json({ ok: true });
        }
      }

      // ── Submissions ────────────────────────────────────────────────────────

      if (path === '/submissions') {
        if (method === 'GET') {
          // Student endpoint — require JWT; use student_id from token
          const claims = await requireStudentAuth(request, env);
          if (!claims) return err('Unauthorized', 401);

          const assignmentId = url.searchParams.get('assignment_id');
          if (!assignmentId) return err('assignment_id là bắt buộc', 400);

          const studentId = String(claims.student_id);
          if (!studentId) return err('student_id là bắt buộc', 400);

          const [sub] = await sql`
            SELECT sub.*, a.title AS assignment_title, q.skill, q.questions_data, q.content_text, q.content_blocks, q.content_url, q.content_urls, q.vocabulary, q.script
            FROM submissions sub
            JOIN assignments a ON a.id = sub.assignment_id
            JOIN question_pool q ON q.id = a.question_id
            WHERE sub.assignment_id = ${assignmentId} AND sub.student_id = ${studentId}
          `;
          if (!sub) return err('Không tìm thấy bài nộp', 404);
          return json(sub);
        }
      }

      if ((p = matchPath('/submissions/:id/ai-feedback', path)) && method === 'POST') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (!env.OPENAI_API_KEY) return err('Chưa cấu hình OPENAI_API_KEY', 500);
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (await checkRateLimit(env.KV, `aifeedback:${ip}`, 60, 60))
          return err('Quá nhiều yêu cầu — thử lại sau', 429);

        const [sub] = await sql`
          SELECT sub.writing_content, sub.speaking_script, q.skill, q.content_text
          FROM submissions sub
          JOIN assignments a ON a.id = sub.assignment_id
          JOIN question_pool q ON q.id = a.question_id
          WHERE sub.id = ${p.id}
        `;
        if (!sub) return err('Không tìm thấy bài nộp', 404);
        if (sub.skill !== 'writing' && sub.skill !== 'speaking')
          return err('AI Feedback chỉ hỗ trợ Writing và Speaking', 400);

        const studentText = sub.skill === 'writing' ? sub.writing_content : sub.speaking_script;
        if (!studentText?.trim()) return err('Bài làm trống, không thể phân tích', 400);

        const prompt = sub.skill === 'writing'
          ? buildWritingPrompt(sub.content_text, studentText)
          : buildSpeakingPrompt(sub.content_text, studentText);

        const responsesUrl = getOpenAIEndpoint(env, '/v1/responses', 'responses');
        const aiRes = await fetch(responsesUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getOpenAIAuthToken(env, responsesUrl, 'responses')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            text: {
              format: {
                type: 'json_schema',
                name: 'ielts_ai_feedback',
                strict: true,
                schema: AI_FEEDBACK_RESPONSE_SCHEMA,
              },
            },
            input: [
              { role: 'developer', content: IELTS_SYSTEM_PROMPT },
              { role: 'user',      content: prompt },
            ],
          }),
        });

        if (!aiRes.ok) {
          const text = await aiRes.text();
          console.error('OpenAI error:', JSON.stringify({
            endpoint: responsesUrl,
            colo: request.cf?.colo || null,
            error: parseOpenAIError(text),
            raw: text,
          }));
          if (isUnsupportedRegionOpenAIError(text)) {
            return err('Dịch vụ AI hiện đang bị chặn theo vùng từ hạ tầng hiện tại. Nếu app đang chạy qua Cloudflare Worker, hãy route OpenAI qua một server/proxy khác rồi thử lại.', 502);
          }
          return err('Lỗi khi gọi AI, thử lại sau', 502);
        }

        const aiData  = await aiRes.json();
        const rawText = extractOutputText(aiData);
        let feedback;
        try {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          feedback = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
        } catch {
          console.error('AI response parse error:', rawText);
          return err('AI trả về định dạng không hợp lệ', 502);
        }

        const aiFeedback = normalizeAiFeedbackPayload(feedback);

        const [updated] = await sql`
          UPDATE submissions
          SET ai_feedback = ${JSON.stringify(aiFeedback)}::jsonb
          WHERE id = ${p.id}
          RETURNING id, ai_feedback
        `;
        return json(updated);
      }

      if ((p = matchPath('/submissions/:id', path))) {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'GET') {
          const [sub] = await sql`
            SELECT sub.*, a.id AS assignment_id, a.title AS assignment_title,
              a.class_id, c.class_name,
              q.skill, q.questions_data, q.content_text, q.content_blocks, q.content_url, q.vocabulary,
              s.full_name AS student_name, s.username AS student_username
            FROM submissions sub
            JOIN assignments a ON a.id = sub.assignment_id
            JOIN classes c ON c.id = a.class_id
            JOIN question_pool q ON q.id = a.question_id
            JOIN students s ON s.id = sub.student_id
            WHERE sub.id = ${p.id}
          `;
          if (sub) return json({ ...sub, submission_kind: 'assignment', supports_ai_feedback: true });

          const [compositeSub] = await sql`
            SELECT
              css.id,
              css.assignment_id,
              css.section_id,
              css.student_id,
              css.answers AS student_answers,
              css.content AS section_content,
              css.audio_url,
              css.audio_key,
              css.submitted_at,
              css.is_overtime,
              css.score AS overall_score,
              css.feedback,
              css.teacher_feedback,
              a.title AS assignment_title,
              a.class_id,
              c.class_name,
              cqs.label AS section_label,
              cqs.skill,
              cqs.questions_data,
              cqs.content_text,
              cqs.content_blocks,
              cqs.content_url,
              cqs.content_urls,
              cqs.script,
              cqs.vocabulary,
              st.full_name AS student_name,
              st.username AS student_username
            FROM composite_section_submissions css
            JOIN assignments a ON a.id = css.assignment_id
            JOIN classes c ON c.id = a.class_id
            JOIN composite_question_sections cqs ON cqs.id = css.section_id
            JOIN students st ON st.id = css.student_id
            WHERE css.id = ${p.id}
          `;
          if (!compositeSub) return err('Không tìm thấy bài nộp', 404);
          return json({
            id: compositeSub.id,
            assignment_id: compositeSub.assignment_id,
            class_id: compositeSub.class_id,
            class_name: compositeSub.class_name,
            student_id: compositeSub.student_id,
            student_name: compositeSub.student_name,
            student_username: compositeSub.student_username,
            submitted_at: compositeSub.submitted_at,
            is_overtime: compositeSub.is_overtime,
            overall_score: compositeSub.overall_score,
            skill: compositeSub.skill,
            assignment_title: `${compositeSub.assignment_title} · ${compositeSub.section_label}`,
            section_label: compositeSub.section_label,
            questions_data: compositeSub.questions_data,
            content_text: compositeSub.content_text,
            content_blocks: compositeSub.content_blocks,
            content_url: compositeSub.content_url,
            content_urls: compositeSub.content_urls || [],
            script: compositeSub.script || '',
            vocabulary: compositeSub.vocabulary || [],
            student_answers: compositeSub.student_answers || [],
            writing_content: compositeSub.skill === 'writing' ? (compositeSub.section_content || '') : '',
            speaking_script: compositeSub.skill === 'speaking' ? (compositeSub.section_content || '') : '',
            speaking_audio_url: compositeSub.skill === 'speaking' ? compositeSub.audio_url : null,
            speaking_audio_urls: compositeSub.skill === 'speaking' && compositeSub.audio_url
              ? [{ url: compositeSub.audio_url, name: '' }]
              : [],
            teacher_feedback: compositeSub.teacher_feedback || null,
            ai_feedback: null,
            submission_kind: 'composite_section',
            supports_ai_feedback: false,
          });
        }
        if (method === 'PATCH') {
          const body = await request.json();
          // Capture previous score to detect first-time grading
          const [prev] = await sql`SELECT overall_score FROM submissions WHERE id = ${p.id}`;
          const wasUnscored = prev && prev.overall_score == null;
          if (!prev) {
            const [prevComposite] = await sql`
              SELECT css.score AS overall_score
              FROM composite_section_submissions css
              WHERE css.id = ${p.id}
            `;
            if (!prevComposite) return err('Không tìm thấy bài nộp', 404);
            const compositeWasUnscored = prevComposite.overall_score == null;
            const teacherFeedbackJson = body.teacher_feedback != null ? JSON.stringify(body.teacher_feedback) : null;
            const [updatedComposite] = await sql`
              UPDATE composite_section_submissions
              SET teacher_feedback = ${teacherFeedbackJson}::jsonb,
                  score = COALESCE(${body.overall_score ?? null}, score),
                  feedback = COALESCE(${buildCompositeSectionTeacherFeedbackText(body.teacher_feedback, body.feedback)} , feedback)
              WHERE id = ${p.id}
              RETURNING id, assignment_id, student_id, section_id, score
            `;
            if (body.overall_score != null && compositeWasUnscored) {
              const [asgn] = await sql`
                SELECT
                  a.id AS assignment_id,
                  (a.title || ' · ' || cqs.label) AS title,
                  cqs.skill,
                  s.email AS student_email
                FROM composite_section_submissions css
                JOIN assignments a ON a.id = css.assignment_id
                JOIN composite_question_sections cqs ON cqs.id = css.section_id
                JOIN students s ON s.id = css.student_id
                WHERE css.id = ${p.id}
              `;
              if (asgn && (asgn.skill === 'writing' || asgn.skill === 'speaking')) {
                const meta = JSON.stringify({ title: asgn.title, skill: asgn.skill, score: body.overall_score });
                await sql`
                  INSERT INTO notifications (student_id, type, ref_id, metadata)
                  VALUES (${updatedComposite.student_id}, 'score_released', ${asgn.assignment_id}, ${meta}::jsonb)
                `;
                await queueStudentEmailEvent(sql, {
                  studentId: updatedComposite.student_id,
                  assignmentId: asgn.assignment_id,
                  eventType: `${EMAIL_EVENT_TYPES.SCORE_RELEASED}:${updatedComposite.section_id}`,
                  email: asgn.student_email,
                });
                if (normalizeStudentEmail(asgn.student_email)) {
                  ctx?.waitUntil?.(processQueuedStudentEmails(sql, env, { limit: 1, delayMs: 1000 }));
                }
              }
            }
            return json(updatedComposite);
          }
          const [sub] = await sql`
            UPDATE submissions
            SET teacher_feedback = ${body.teacher_feedback != null ? JSON.stringify(body.teacher_feedback) : null}::jsonb,
                overall_score    = COALESCE(${body.overall_score ?? null}, overall_score)
            WHERE id = ${p.id}
            RETURNING *
          `;
          if (!sub) return err('Không tìm thấy bài nộp', 404);
          // Create score_released notification on first grade of Writing/Speaking
          if (body.overall_score != null && wasUnscored) {
            const [asgn] = await sql`
              SELECT a.id AS assignment_id, a.title, q.skill, s.email AS student_email
              FROM assignments a
              JOIN question_pool q ON q.id = a.question_id
              JOIN students s ON s.id = ${sub.student_id}
              WHERE a.id = ${sub.assignment_id}
            `;
            if (asgn && (asgn.skill === 'writing' || asgn.skill === 'speaking')) {
              const meta = JSON.stringify({ title: asgn.title, skill: asgn.skill, score: body.overall_score });
              await sql`
                INSERT INTO notifications (student_id, type, ref_id, metadata)
                VALUES (${sub.student_id}, 'score_released', ${asgn.assignment_id}, ${meta}::jsonb)
              `;
              await queueStudentEmailEvent(sql, {
                studentId: sub.student_id,
                assignmentId: asgn.assignment_id,
                eventType: EMAIL_EVENT_TYPES.SCORE_RELEASED,
                email: asgn.student_email,
              });
              if (normalizeStudentEmail(asgn.student_email)) {
                ctx?.waitUntil?.(processQueuedStudentEmails(sql, env, { limit: 1, delayMs: 1000 }));
              }
            }
          }
          return json(sub);
        }
      }

      // ── Teacher Inbox (B4.8) ──────────────────────────────────────────────

      if (path === '/inbox' && method === 'GET') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        const teacherId = await getTeacherId(sql);
        const [standardRows, compositeRows] = await Promise.all([
          sql`
            SELECT sub.id AS submission_id, sub.submitted_at, sub.overall_score, sub.status,
              sub.teacher_feedback IS NOT NULL AS has_teacher_feedback,
              st.full_name AS student_name,
              a.id AS assignment_id, a.title AS assignment_title,
              q.skill, c.class_name, c.id AS class_id
            FROM submissions sub
            JOIN assignments a ON a.id = sub.assignment_id
            JOIN question_pool q ON q.id = a.question_id
            JOIN classes c ON c.id = a.class_id
            JOIN students st ON st.id = sub.student_id
            WHERE c.teacher_id = ${teacherId}
              AND q.skill IN ('writing', 'speaking')
              AND sub.overall_score IS NULL
          `,
          sql`
            SELECT
              css.id AS submission_id,
              css.submitted_at,
              css.score AS overall_score,
              'submitted'::text AS status,
              css.feedback IS NOT NULL AS has_teacher_feedback,
              st.full_name AS student_name,
              a.id AS assignment_id,
              (a.title || ' · ' || cqs.label) AS assignment_title,
              cqs.skill,
              c.class_name,
              c.id AS class_id
            FROM composite_section_submissions css
            JOIN composite_question_sections cqs ON cqs.id = css.section_id
            JOIN assignments a ON a.id = css.assignment_id
            JOIN classes c ON c.id = a.class_id
            JOIN students st ON st.id = css.student_id
            WHERE c.teacher_id = ${teacherId}
              AND cqs.skill IN ('writing', 'speaking')
              AND css.score IS NULL
          `,
        ]);
        const rows = [
          ...standardRows.map(row => ({ ...row, submission_kind: 'assignment' })),
          ...compositeRows.map(row => ({ ...row, submission_kind: 'composite_section' })),
        ]
          .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))
          .slice(0, 100);
        return json(rows);
      }

      // ── Student Assignments ────────────────────────────────────────────────

      if (path === '/student/assignments' && method === 'GET') {
        // Require JWT for student endpoints
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);

        const classId = url.searchParams.get('class_id');
        if (!classId) return err('class_id là bắt buộc', 400);

        const studentId = String(claims.student_id);

        const [membership] = await sql`
          SELECT 1 FROM student_classes
          WHERE student_id = ${studentId} AND class_id = ${classId}
        `;
        if (!membership) return err('Học sinh không thuộc lớp này', 403);

        await autoCloseExpired(sql, { classId });
        const rows = await sql`
          SELECT a.id, a.question_id, a.title, a.deadline, a.is_active, a.created_at, a.mode, a.time_limit_minutes, a.scoring_scale,
            q.skill, q.title AS question_title, q.content_text, q.content_blocks, q.content_url,
            jsonb_array_length(COALESCE(q.vocabulary, '[]'::jsonb)) AS vocab_count,
            sub.id AS submission_id, sub.overall_score, sub.status AS submission_status,
            sub.submitted_at,
            CASE WHEN q.skill = 'composite' THEN (
              SELECT json_agg(json_build_object(
                'id', cqs.id, 'label', cqs.label, 'skill', cqs.skill,
                'time_limit_minutes', cqs.time_limit_minutes, 'display_order', cqs.display_order,
                'submitted', CASE WHEN css.id IS NOT NULL THEN true ELSE false END,
                'score', css.score
              ) ORDER BY cqs.display_order)
              FROM composite_question_sections cqs
              LEFT JOIN composite_section_submissions css
                ON css.section_id = cqs.id AND css.assignment_id = a.id AND css.student_id = ${studentId}
              WHERE cqs.composite_id = q.id
            ) ELSE NULL END AS composite_sections
          FROM assignments a
          JOIN question_pool q ON q.id = a.question_id
          LEFT JOIN submissions sub
            ON sub.assignment_id = a.id AND sub.student_id = ${studentId}
          WHERE a.class_id = ${classId}
          ORDER BY a.created_at DESC
        `;
        return json(rows);
      }

      // POST /exam-sessions — record (or retrieve) when student first opened an exam
      if (path === '/exam-sessions' && method === 'POST') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);
        const body = await request.json().catch(() => null);
        const compositeAssignmentId = String(body?.assignment_id || '').trim() || null;
        if (!body?.ref_type || !body?.ref_id) return err('ref_type và ref_id là bắt buộc', 400);
        if (!['assignment', 'shared_pool', 'composite_section'].includes(body.ref_type)) return err('ref_type không hợp lệ', 400);

        // Verify student has access to this ref
        if (body.ref_type === 'assignment') {
          const [row] = await sql`
            SELECT a.time_limit_minutes FROM assignments a
            JOIN student_classes sc ON sc.class_id = a.class_id
            WHERE a.id = ${body.ref_id} AND sc.student_id = ${studentId} LIMIT 1
          `;
          if (!row) return err('Không tìm thấy bài tập', 404);
        } else if (body.ref_type === 'composite_section') {
          const [row] = compositeAssignmentId
            ? await sql`
                SELECT cqs.id
                FROM composite_question_sections cqs
                JOIN question_pool q ON q.id = cqs.composite_id
                JOIN assignments a ON a.question_id = q.id
                JOIN student_classes sc ON sc.class_id = a.class_id
                WHERE cqs.id = ${body.ref_id}
                  AND a.id = ${compositeAssignmentId}
                  AND sc.student_id = ${studentId}
                LIMIT 1
              `
            : await sql`
                SELECT cqs.id
                FROM composite_question_sections cqs
                JOIN question_pool q ON q.id = cqs.composite_id
                JOIN assignments a ON a.question_id = q.id
                JOIN student_classes sc ON sc.class_id = a.class_id
                WHERE cqs.id = ${body.ref_id}
                  AND sc.student_id = ${studentId}
                LIMIT 1
              `;
          if (!row) return err('Không tìm thấy section', 404);
        } else {
          const [row] = await sql`SELECT id, time_limit_minutes FROM shared_pool WHERE id = ${body.ref_id}`;
          if (!row) return err('Không tìm thấy đề', 404);
        }

        if (body.ref_type === 'composite_section' && compositeAssignmentId) {
          const session = await ensureCompositeSectionExamSession(sql, {
            studentId,
            assignmentId: compositeAssignmentId,
            sectionId: body.ref_id,
          });
          return json({ started_at: session?.started_at || new Date().toISOString() });
        }

        // ON CONFLICT DO NOTHING keeps the original started_at
        await sql`
          INSERT INTO exam_sessions (student_id, ref_type, ref_id)
          VALUES (${studentId}, ${body.ref_type}, ${body.ref_id})
          ON CONFLICT (student_id, ref_type, ref_id) DO NOTHING
        `;
        const [session] = await sql`
          SELECT started_at FROM exam_sessions
          WHERE student_id = ${studentId} AND ref_type = ${body.ref_type} AND ref_id = ${body.ref_id}
        `;
        return json({ started_at: session.started_at });
      }

      if (path === '/student/change-password' && method === 'POST') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);

        const body = await request.json().catch(() => null);
        if (!body) return err('Invalid JSON', 400);

        const oldPassword = String(body.old_password || '');
        const newPassword = String(body.new_password || '');
        const confirmPassword = String(body.confirm_password || '');

        if (!oldPassword || !newPassword || !confirmPassword) {
          return err('old_password, new_password và confirm_password là bắt buộc', 400);
        }
        if (oldPassword === newPassword) {
          return err('Mật khẩu mới phải khác mật khẩu cũ', 400);
        }
        if (newPassword !== confirmPassword) {
          return err('Mật khẩu nhập lại không khớp', 400);
        }
        const passwordError = getStudentPasswordValidationError(newPassword);
        if (passwordError) {
          return err(passwordError, 400);
        }

        const [student] = await sql`
          SELECT id, password_hash
          FROM students
          WHERE id = ${String(claims.student_id)}
        `;
        if (!student) return err('Không tìm thấy học sinh', 404);

        if (!(await verifyPassword(oldPassword, student.password_hash))) {
          return err('Mật khẩu cũ không đúng', 400);
        }

        const passwordHash = await hashPassword(newPassword);
        await sql`UPDATE students SET password_hash = ${passwordHash} WHERE id = ${student.id}`;
        return json({ ok: true });
      }

      // ── Practice Attempts (C1.1/C1.2) ─────────────────────────────────────

      if (path === '/practice/submit' && method === 'POST') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);

        const body = await request.json().catch(() => null);
        if (!body) return err('Invalid JSON', 400);

        const studentId    = String(claims.student_id);
        const assignmentId = String(body.assignment_id || '');
        const attemptType  = String(body.attempt_type || '');
        const answers      = Array.isArray(body.student_answers) ? body.student_answers : [];

        if (!studentId || !assignmentId)    return err('student_id và assignment_id là bắt buộc', 400);
        if (!['retry_wrong','retry_full'].includes(attemptType)) return err('attempt_type không hợp lệ', 400);

        const assignment = await loadStudentAssignmentAccess(sql, assignmentId, studentId);
        if (!assignment) return err('Học sinh không thuộc bài tập này', 403);

        const qData = Array.isArray(assignment.questions_data) ? assignment.questions_data : [];
        let correctCount = 0;
        for (const q of qData) {
          const sa    = answers.find(a => a.q_no === q.q_no);
          const given = (sa?.answer || '').trim().toLowerCase();
          if (q.answers?.some(a => a.toLowerCase().trim() === given)) correctCount++;
        }

        const [attempt] = await sql`
          INSERT INTO practice_attempts (student_id, assignment_id, attempt_type, student_answers, correct_count, total_count)
          VALUES (${studentId}, ${assignmentId}, ${attemptType}, ${JSON.stringify(answers)}, ${correctCount}, ${qData.length})
          RETURNING id, assignment_id, correct_count, total_count, attempted_at
        `;
        return json({ ...attempt, questions_data: qData }, 201);
      }

      if (path === '/practice/history' && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);

        const studentId    = String(claims.student_id);
        const assignmentId = url.searchParams.get('assignment_id');

        const rows = await sql`
          SELECT id, assignment_id, attempt_type, correct_count, total_count, attempted_at
          FROM practice_attempts
          WHERE student_id = ${studentId}
          ${assignmentId ? sql`AND assignment_id = ${assignmentId}` : sql``}
          ORDER BY attempted_at DESC
          LIMIT 20
        `;
        return json(rows);
      }

      // ── Profile Fields & Student Answers ──────────────────────────────────

      if (path === '/profile-fields') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'GET') {
          const rows = await sql`SELECT * FROM profile_fields ORDER BY display_order ASC, created_at ASC`;
          return json(rows);
        }
        if (method === 'POST') {
          const body = await request.json().catch(() => null);
          if (!body?.label?.trim()) return err('label là bắt buộc', 400);
          const label = String(body.label).trim().slice(0, 200);
          const rawFieldKey = body.field_key == null ? '' : String(body.field_key).trim().toLowerCase();
          if (rawFieldKey && !/^[a-z0-9_]+$/.test(rawFieldKey)) return err('field_key không hợp lệ', 400);
          const fieldKey = rawFieldKey || null;
          const fieldType = fieldKey === NOTIFICATION_EMAIL_FIELD_KEY
            ? 'text'
            : (['text', 'textarea', 'select', 'date'].includes(body.field_type) ? body.field_type : 'text');
          const options = fieldType === 'select' && Array.isArray(body.options) && body.options.length
            ? JSON.stringify(body.options.map(String).filter(Boolean))
            : null;
          const displayOrder = Number.isFinite(Number(body.display_order)) ? Number(body.display_order) : 0;
          try {
            const [row] = await sql`
              INSERT INTO profile_fields (label, field_key, field_type, options, display_order)
              VALUES (${label}, ${fieldKey}, ${fieldType}, ${options}, ${displayOrder})
              RETURNING *
            `;
            return json(row, 201);
          } catch (dbErr) {
            if (String(dbErr?.message || '').includes('idx_profile_fields_field_key_unique')) {
              return err('field_key này đã được sử dụng', 409);
            }
            throw dbErr;
          }
        }
      }

      if ((p = matchPath('/profile-fields/:id', path)) && method === 'DELETE') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        await sql`DELETE FROM profile_fields WHERE id = ${p.id}`;
        return json({ ok: true });
      }

      if ((p = matchPath('/students/:id/profile-answers', path)) && method === 'GET') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        const [student] = await sql`SELECT id, full_name, username, email FROM students WHERE id = ${p.id}`;
        if (!student) return err('Không tìm thấy học sinh', 404);
        const fields = await sql`SELECT * FROM profile_fields ORDER BY display_order ASC, created_at ASC`.catch(() => []);
        const answers = await sql`SELECT field_id, value FROM student_profile_answers WHERE student_id = ${p.id}`.catch(() => []);
        const answerMap = {};
        for (const a of answers) answerMap[a.field_id] = a.value;
        return json({ student, fields, answers: answerMap });
      }

      if (path === '/student/profile-answers') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);

        if (method === 'GET') {
          const [student] = await sql`
            SELECT id, full_name, username, email
            FROM students
            WHERE id = ${studentId}
          `;
          const fields = await sql`SELECT * FROM profile_fields ORDER BY display_order ASC, created_at ASC`.catch(() => []);
          const answers = await sql`SELECT field_id, value FROM student_profile_answers WHERE student_id = ${studentId}`.catch(() => []);
          const answerMap = {};
          for (const a of answers) answerMap[a.field_id] = a.value;
          return json({ student: student || null, fields, answers: answerMap });
        }

        if (method === 'PATCH') {
          const body = await request.json().catch(() => null);
          if (!body?.answers || typeof body.answers !== 'object') return err('answers là bắt buộc', 400);
          const fields = await sql`SELECT id, field_key FROM profile_fields ORDER BY display_order ASC, created_at ASC`.catch(() => []);
          const fieldIds = new Set(fields.map(f => String(f.id)));
          const notificationField = fields.find(f => f.field_key === NOTIFICATION_EMAIL_FIELD_KEY) || null;

          if (notificationField && Object.prototype.hasOwnProperty.call(body.answers, notificationField.id)) {
            const parsedEmail = normalizeStudentEmail(body.answers[notificationField.id]);
            if (parsedEmail === false) return err('Email nhận thông báo không hợp lệ', 400);
          }

          for (const [fieldId, value] of Object.entries(body.answers)) {
            if (!fieldIds.has(String(fieldId))) continue;
            const v = String(value ?? '').trim();
            if (v) {
              await sql`
                INSERT INTO student_profile_answers (student_id, field_id, value, updated_at)
                VALUES (${studentId}, ${fieldId}, ${v}, NOW())
                ON CONFLICT (student_id, field_id) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
              `;
            } else {
              await sql`DELETE FROM student_profile_answers WHERE student_id = ${studentId} AND field_id = ${fieldId}`;
            }
          }

          if (notificationField) {
            let sourceValue = body.answers[notificationField.id];
            if (sourceValue === undefined) {
              const [existing] = await sql`
                SELECT value FROM student_profile_answers
                WHERE student_id = ${studentId}::uuid AND field_id = ${notificationField.id}::uuid
              `;
              sourceValue = existing?.value || '';
            }
            const parsedEmail = normalizeStudentEmail(sourceValue);
            await sql`
              UPDATE students
              SET email = ${parsedEmail || null}
              WHERE id = ${studentId}::uuid
            `;
          } else {
            await sql`
              UPDATE students
              SET email = NULL
              WHERE id = ${studentId}::uuid
            `;
          }
          return json({ ok: true });
        }
      }

      // PATCH /student/me — update student's own full_name
      if (path === '/student/me' && method === 'PATCH') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const body = await request.json().catch(() => null);
        const full_name = String(body?.full_name || '').trim();
        if (!full_name) return err('Tên không được để trống', 400);
        if (full_name.length > 100) return err('Tên quá dài', 400);
        await sql`UPDATE students SET full_name = ${full_name} WHERE id = ${claims.student_id}::uuid`;
        return json({ ok: true, full_name });
      }

      // ── Student Vocab (DB-backed) ──────────────────────────────────────────

      if (path === '/student/vocab' && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = claims.student_id;
        const rows = await sql`
          SELECT word, definition, pronunciation, example, source, saved_at
          FROM student_vocab WHERE student_id = ${studentId}
          ORDER BY saved_at DESC
        `;
        return json(rows);
      }

      if (path === '/student/vocab' && method === 'POST') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = claims.student_id;
        const body = await request.json();
        const { word, definition = '', pronunciation = '', example = '', source = '' } = body;
        if (!word) return err('word required', 400);
        await sql`
          INSERT INTO student_vocab (student_id, word, definition, pronunciation, example, source)
          VALUES (${studentId}, ${word}, ${definition}, ${pronunciation}, ${example}, ${source})
          ON CONFLICT (student_id, word) DO UPDATE
            SET definition   = EXCLUDED.definition,
                pronunciation = EXCLUDED.pronunciation,
                example      = EXCLUDED.example,
                source       = EXCLUDED.source,
                saved_at     = NOW()
        `;
        return json({ ok: true });
      }

      if ((p = matchPath('/student/vocab/:word', path)) && method === 'DELETE') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = claims.student_id;
        await sql`DELETE FROM student_vocab WHERE student_id = ${studentId} AND word = ${decodeURIComponent(p.word)}`;
        return json({ ok: true });
      }

      // ── Vocab sessions (streak) ────────────────────────────────────────────

      if (path === '/student/vocab/sessions' && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const rows = await sql`
          SELECT practiced_at
          FROM vocab_sessions
          WHERE student_id = ${claims.student_id}
          ORDER BY practiced_at DESC
        `;
        return json(rows);
      }

      if (path === '/student/vocab/sessions' && method === 'POST') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        await sql`
          INSERT INTO vocab_sessions (student_id) VALUES (${claims.student_id})
        `;
        return json({ ok: true });
      }

      // ── Shared Pool — Teacher endpoints ──────────────────────────────────────

      if (path === '/shared-pool') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'GET') {
          const rows = await sql`
            SELECT sp.id, sp.skill, sp.title, sp.tags, sp.time_limit_minutes, sp.created_at,
                   COUNT(sa.id)::int AS attempt_count
            FROM shared_pool sp
            LEFT JOIN shared_attempts sa ON sa.shared_pool_id = sp.id
            GROUP BY sp.id
            ORDER BY sp.created_at DESC
          `;
          return json(rows);
        }
        if (method === 'POST') {
          const ct = request.headers.get('Content-Type') || '';
          let title, skill, content_text = '', questions_data = [], content_url = null, content_blocks = [];
          let uploadedR2Key = null, vocabulary = [], script = null, tags = [], time_limit_minutes = null;
          let contentUrls = [];

          if (ct.includes('multipart/form-data')) {
            const form = await request.formData();
            title        = form.get('title');
            skill        = form.get('skill');
            content_text = form.get('content_text') || '';
            questions_data = JSON.parse(form.get('questions_data') || '[]');
            vocabulary   = JSON.parse(form.get('vocabulary') || '[]');
            tags         = JSON.parse(form.get('tags') || '[]');
            script       = form.get('script') || null;
            time_limit_minutes = form.get('time_limit_minutes') ? Number(form.get('time_limit_minutes')) : null;
            const audioFile = form.get('audio');
            if (audioFile && audioFile.size > 0) {
              const key = buildTeacherAudioKey(audioFile.name || 'audio');
              await env.R2.put(key, audioFile.stream(), { httpMetadata: { contentType: audioFile.type } });
              uploadedR2Key = key;
              content_url = buildR2PublicUrl(env, key);
            }
          } else {
            const body = await request.json();
            title              = body.title;
            skill              = body.skill;
            content_text       = body.content_text || '';
            content_blocks     = normalizeContentBlocks(body.content_blocks || []);
            content_text       = content_text || blocksToPlainText(content_blocks);
            questions_data     = body.questions_data || [];
            vocabulary         = body.vocabulary || [];
            tags               = Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean) : [];
            script             = body.script || null;
            time_limit_minutes = body.time_limit_minutes ? Number(body.time_limit_minutes) : null;
            if (body.content_url) { content_url = body.content_url; contentUrls = [{ url: body.content_url }]; }
            if (Array.isArray(body.content_urls) && body.content_urls.length) contentUrls = body.content_urls;
          }
          if (!title || !skill) return err('title và skill là bắt buộc', 400);
          const [row] = await sql`
            INSERT INTO shared_pool (skill, title, content_text, content_blocks, content_url, content_urls, questions_data, vocabulary, tags, script, time_limit_minutes)
            VALUES (
              ${skill}, ${title}, ${content_text ?? ''},
              ${JSON.stringify(content_blocks)}::jsonb, ${content_url ?? ''},
              ${JSON.stringify(contentUrls ?? [])}::jsonb,
              ${JSON.stringify(questions_data ?? [])}::jsonb, ${JSON.stringify(vocabulary ?? [])}::jsonb,
              ${tags ?? []}, ${script ?? ''}, ${time_limit_minutes}
            )
            RETURNING *
          `;
          for (const imgUrl of extractContentBlockImageUrls(row.content_blocks || [])) {
            const imgKey = extractR2Key(imgUrl, env.R2_PUBLIC_URL);
            if (imgKey) await r2RefIncrement(sql, imgKey).catch(() => {});
          }
          return json(row, 201);
        }
      }

      // Teacher: force re-grade a stuck shared attempt
      if ((p = matchPath('/shared-attempts/:id/retry-ai', path)) && method === 'POST') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        const [sa] = await sql`
          SELECT sa.*, sp.skill, sp.content_text
          FROM shared_attempts sa
          JOIN shared_pool sp ON sp.id = sa.shared_pool_id
          WHERE sa.id = ${p.id}
        `;
        if (!sa) return err('Không tìm thấy attempt', 404);
        if (sa.skill !== 'writing' && sa.skill !== 'speaking') return err('Skill này không cần AI chấm', 400);
        if (!env.OPENAI_API_KEY) return err('Chưa cấu hình AI', 500);
        const studentContent = sa.skill === 'writing' ? sa.writing_content : sa.speaking_script;
        if (!studentContent?.trim()) return err('Bài làm trống', 400);
        await sql`UPDATE shared_attempts SET ai_feedback = NULL WHERE id = ${sa.id}`;
        ctx.waitUntil(
          callAiFeedback(sa.skill, sa.content_text || '', studentContent, env)
            .then(aiFeedback => sql`
              UPDATE shared_attempts
              SET ai_feedback   = ${JSON.stringify(aiFeedback)}::jsonb,
                  overall_score = ${aiFeedback.overall_score ?? null}
              WHERE id = ${sa.id}`)
            .catch(e => console.error('Teacher retry AI error:', e))
        );
        return json({ status: 'queued', attempt_id: sa.id });
      }

      if ((p = matchPath('/shared-pool/:id/stats', path)) && method === 'GET') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        const rows = await sql`
          SELECT sa.id, sa.student_id, sa.mode, sa.overall_score, sa.max_score, sa.submitted_at,
                 s.full_name AS student_name, s.username,
                 (SELECT string_agg(c.class_name, ', ')
                  FROM student_classes sc JOIN classes c ON c.id = sc.class_id
                  WHERE sc.student_id = sa.student_id) AS class_names
          FROM shared_attempts sa
          JOIN students s ON s.id = sa.student_id
          WHERE sa.shared_pool_id = ${p.id}
          ORDER BY sa.submitted_at DESC
        `;
        return json(rows);
      }

      if ((p = matchPath('/shared-pool/:id', path))) {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        if (method === 'GET') {
          const [row] = await sql`SELECT * FROM shared_pool WHERE id = ${p.id}`;
          if (!row) return err('Không tìm thấy đề', 404);
          return json(row);
        }
        if (method === 'PATCH') {
          const body = await request.json();
          const [existing] = await sql`SELECT content_blocks FROM shared_pool WHERE id = ${p.id}`;
          if (!existing) return err('Không tìm thấy đề', 404);
          const normalizedBlocks = body.content_blocks !== undefined ? normalizeContentBlocks(body.content_blocks) : null;
          const nextContentText  = normalizedBlocks ? blocksToPlainText(normalizedBlocks) : (body.content_text !== undefined ? (body.content_text ?? null) : null);
          const qDataJson        = body.questions_data !== undefined ? JSON.stringify(body.questions_data) : null;
          const vocabJson        = body.vocabulary    !== undefined ? JSON.stringify(body.vocabulary)     : null;
          const blocksJson       = normalizedBlocks   !== null      ? JSON.stringify(normalizedBlocks)    : null;
          const tagsArr          = body.tags !== undefined ? (Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean) : null) : null;
          const scriptVal        = body.script !== undefined ? (body.script ?? null) : null;
          const timeLimitVal     = body.time_limit_minutes !== undefined ? (body.time_limit_minutes ? Number(body.time_limit_minutes) : null) : undefined;
          const shouldUpdateText = normalizedBlocks !== null || body.content_text !== undefined;
          const [row] = await sql`
            UPDATE shared_pool
            SET title              = COALESCE(${body.title ?? null}, title),
                content_text       = CASE WHEN ${shouldUpdateText} THEN ${nextContentText} ELSE content_text END,
                content_blocks     = COALESCE(${blocksJson}::jsonb, content_blocks),
                questions_data     = COALESCE(${qDataJson}::jsonb,  questions_data),
                vocabulary         = COALESCE(${vocabJson}::jsonb,  vocabulary),
                tags               = COALESCE(${tagsArr},           tags),
                script             = COALESCE(${scriptVal},         script),
                time_limit_minutes = CASE WHEN ${timeLimitVal !== undefined} THEN ${timeLimitVal ?? null} ELSE time_limit_minutes END
            WHERE id = ${p.id}
            RETURNING *
          `;
          if (normalizedBlocks !== null) {
            const oldKeys = extractContentBlockImageUrls(existing.content_blocks).map(u => extractR2Key(u, env.R2_PUBLIC_URL)).filter(Boolean);
            const newKeySet = new Set(extractContentBlockImageUrls(normalizedBlocks).map(u => extractR2Key(u, env.R2_PUBLIC_URL)).filter(Boolean));
            for (const key of newKeySet) if (!oldKeys.includes(key)) await r2RefIncrement(sql, key).catch(() => {});
            for (const key of oldKeys)   if (!newKeySet.has(key))    await r2SafeDelete(env, sql, key).catch(() => {});
          }
          return json(row);
        }
        if (method === 'DELETE') {
          const [q] = await sql`SELECT content_blocks FROM shared_pool WHERE id = ${p.id}`;
          if (!q) return err('Không tìm thấy đề', 404);
          await sql`DELETE FROM shared_pool WHERE id = ${p.id}`;
          for (const url of extractContentBlockImageUrls(q.content_blocks || [])) {
            const key = extractR2Key(url, env.R2_PUBLIC_URL);
            if (key) await r2SafeDelete(env, sql, key).catch(() => {});
          }
          return json({ ok: true });
        }
      }

      // ── Shared Pool — Student endpoints ──────────────────────────────────────

      // List shared pool (student must be in ≥1 class)
      if (path === '/student/shared-pool' && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);
        const [membership] = await sql`SELECT 1 FROM student_classes WHERE student_id = ${studentId} LIMIT 1`;
        if (!membership) return json([]);
        const rows = await sql`
          SELECT sp.id, sp.skill, sp.title, sp.tags, sp.time_limit_minutes, sp.created_at,
                 COUNT(sa.id) FILTER (WHERE sa.mode = 'real_test')::int AS real_test_count,
                 MAX(sa.overall_score) FILTER (WHERE sa.mode = 'real_test') AS best_score,
                 (sp.questions_data->0->'answers') IS NULL AS is_open_ended
          FROM shared_pool sp
          LEFT JOIN shared_attempts sa ON sa.shared_pool_id = sp.id AND sa.student_id = ${studentId}
          GROUP BY sp.id
          ORDER BY sp.created_at DESC
        `;
        return json(rows);
      }

      // Get single shared pool question (for taking the test)
      if ((p = matchPath('/student/shared-pool/:id', path)) && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);
        const [membership] = await sql`SELECT 1 FROM student_classes WHERE student_id = ${studentId} LIMIT 1`;
        if (!membership) return err('Bạn chưa vào lớp nào', 403);
        const [row] = await sql`SELECT * FROM shared_pool WHERE id = ${p.id}`;
        if (!row) return err('Không tìm thấy đề', 404);
        return json(row);
      }

      // Submit a shared pool attempt
      if ((p = matchPath('/student/shared-pool/:id/attempts', path)) && method === 'POST') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);

        // Rate limit: 30 submits per student per 60s (DB flood protection)
        if (await checkRateLimit(env.KV, `shared-submit:${studentId}`, 30, 60))
          return err('Quá nhiều lần nộp — thử lại sau', 429);

        // Must be in at least one class
        const [membership] = await sql`SELECT 1 FROM student_classes WHERE student_id = ${studentId} LIMIT 1`;
        if (!membership) return err('Bạn chưa vào lớp nào', 403);

        const [poolQ] = await sql`SELECT * FROM shared_pool WHERE id = ${p.id}`;
        if (!poolQ) return err('Không tìm thấy đề', 404);

        const ct = request.headers.get('Content-Type') || '';
        let mode = 'practice', studentAnswers = null, writingContent = null;
        let speakingScript = null, speakingAudioUrls = [], audioUploadKeys = null;

        const body = await request.json();
        mode           = body.mode === 'real_test' ? 'real_test' : 'practice';
        studentAnswers = body.student_answers ?? null;
        writingContent = body.writing_content ?? null;
        audioUploadKeys = Array.isArray(body.audio_upload_keys) && body.audio_upload_keys.length > 0
          ? body.audio_upload_keys : null;

        // Handle speaking audio transcription
        if (audioUploadKeys) {
          const validKeys = audioUploadKeys.filter(item => item.key && isExpectedSharedSpeakingKey(item.key, p.id, studentId));
          if (validKeys.length === 0) {
            for (const k of audioUploadKeys) await env.R2.delete(k.key).catch(() => {});
            return err('audio_upload_keys không hợp lệ', 400);
          }
          const parts = [];
          for (const item of validKeys) {
            try {
              const transcriptData = await transcribeR2Audio(env, item.key);
              const label = item.name || item.key.split('/').pop();
              parts.push(`--- Transcript: ${label} ---\n${transcriptData.text || ''}`);
              speakingAudioUrls.push({ url: buildR2PublicUrl(env, item.key), key: item.key, name: item.name || '' });
            } catch (sttErr) {
              for (const k of validKeys) await env.R2.delete(k.key).catch(() => {});
              return err(sttErr.message || 'Không thể nhận diện giọng nói', sttErr.statusCode || 500);
            }
          }
          speakingScript = parts.join('\n\n\n');
        }

        // Auto-grade reading/listening (shared pool: IELTS scale if 40 questions)
        let overallScore = null, maxScore = null;
        if ((poolQ.skill === 'reading' || poolQ.skill === 'listening') && studentAnswers) {
          const poolQCount = Array.isArray(poolQ.questions_data) ? poolQ.questions_data.length : 0;
          const poolScale = poolQCount === 40 ? 'ielts' : '10';
          overallScore = autoGrade(studentAnswers, poolQ.questions_data, poolScale);
          maxScore     = poolQCount || null;
        }

        // Determine overtime for real_test with time limit
        let isOvertime = false;
        if (mode === 'real_test' && poolQ.time_limit_minutes) {
          const [session] = await sql`
            SELECT started_at FROM exam_sessions
            WHERE student_id = ${studentId} AND ref_type = 'shared_pool' AND ref_id = ${p.id}
          `;
          if (session) {
            const elapsedSec = (Date.now() - new Date(session.started_at).getTime()) / 1000;
            const limitSec   = poolQ.time_limit_minutes * 60 + 30; // 30s grace
            isOvertime = elapsedSec > limitSec;
          }
        }

        const [attempt] = await sql`
          INSERT INTO shared_attempts
            (student_id, shared_pool_id, mode, student_answers, writing_content, speaking_script, speaking_audio_urls, overall_score, max_score, is_overtime)
          VALUES (
            ${studentId}, ${p.id}, ${mode},
            ${JSON.stringify(studentAnswers || [])}::jsonb,
            ${writingContent || ''}, ${speakingScript || ''},
            ${JSON.stringify(speakingAudioUrls)}::jsonb,
            ${overallScore}, ${maxScore}, ${isOvertime}
          )
          RETURNING *
        `;

        // Auto AI feedback for writing/speaking (fire-and-forget, update async)
        if ((poolQ.skill === 'writing' || poolQ.skill === 'speaking') && env.OPENAI_API_KEY) {
          const studentContent = poolQ.skill === 'writing' ? writingContent : speakingScript;
          const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
          const aiOverLimit = await checkRateLimit(env.KV, `shared-ai:${ip}`, 20, 60);
          if (studentContent?.trim() && !aiOverLimit) {
            ctx.waitUntil(
              callAiFeedback(poolQ.skill, poolQ.content_text || '', studentContent, env)
                .then(aiFeedback => sql`
                  UPDATE shared_attempts
                  SET ai_feedback   = ${JSON.stringify(aiFeedback)}::jsonb,
                      overall_score = ${aiFeedback.overall_score ?? null}
                  WHERE id = ${attempt.id}`)
                .catch(e => console.error('Shared pool AI feedback error:', e))
            );
          }
        }

        return json(attempt, 201);
      }

      // Student attempt history for a specific shared pool question
      if ((p = matchPath('/student/shared-pool/:id/attempts', path)) && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);
        const rows = await sql`
          SELECT id, mode, overall_score, max_score, ai_feedback IS NOT NULL AS has_feedback, submitted_at
          FROM shared_attempts
          WHERE student_id = ${studentId} AND shared_pool_id = ${p.id}
          ORDER BY submitted_at DESC
        `;
        return json(rows);
      }

      // Get a single shared attempt result
      if ((p = matchPath('/student/shared-attempts/:id', path)) && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);
        const [row] = await sql`
          SELECT sa.*, sp.skill, sp.title, sp.content_text, sp.content_blocks, sp.content_urls, sp.content_url,
                 sp.questions_data, sp.vocabulary, sp.script, sp.time_limit_minutes
          FROM shared_attempts sa
          JOIN shared_pool sp ON sp.id = sa.shared_pool_id
          WHERE sa.id = ${p.id} AND sa.student_id = ${studentId}
        `;
        if (!row) return err('Không tìm thấy kết quả', 404);
        return json(row);
      }

      // Retry AI grading for a stuck shared attempt (student-triggered)
      if ((p = matchPath('/student/shared-attempts/:id/retry-ai', path)) && method === 'POST') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);
        // Rate limit: 5 retries per student per 60s (synchronous AI call — must protect aggressively)
        if (await checkRateLimit(env.KV, `shared-retry-ai:${studentId}`, 5, 60))
          return err('Quá nhiều yêu cầu — thử lại sau 1 phút', 429);
        const [sa] = await sql`
          SELECT sa.*, sp.skill, sp.content_text
          FROM shared_attempts sa
          JOIN shared_pool sp ON sp.id = sa.shared_pool_id
          WHERE sa.id = ${p.id} AND sa.student_id = ${studentId}
        `;
        if (!sa) return err('Không tìm thấy kết quả', 404);
        if (sa.skill !== 'writing' && sa.skill !== 'speaking') return err('Skill này không cần AI chấm', 400);
        if (!env.OPENAI_API_KEY) return err('Chưa cấu hình AI', 500);
        const studentContent = sa.skill === 'writing' ? sa.writing_content : sa.speaking_script;
        if (!studentContent?.trim()) return err('Bài làm trống', 400);
        // Synchronous: call AI and return full updated attempt (no polling needed)
        let aiFeedback;
        try {
          aiFeedback = await callAiFeedback(sa.skill, sa.content_text || '', studentContent, env);
        } catch (e) {
          console.error('[retry-ai] callAiFeedback failed:', e.message);
          return err(e.message || 'Lỗi khi gọi AI', 502);
        }
        const [updated] = await sql`
          UPDATE shared_attempts
          SET ai_feedback   = ${JSON.stringify(aiFeedback)}::jsonb,
              overall_score = ${aiFeedback.overall_score ?? null}
          WHERE id = ${sa.id}
          RETURNING *
        `;
        // Return full attempt + pool data (same shape as GET /student/shared-attempts/:id)
        const [full] = await sql`
          SELECT sa.*, sp.skill, sp.title, sp.content_text, sp.content_blocks, sp.content_urls, sp.content_url,
                 sp.questions_data, sp.vocabulary, sp.script, sp.time_limit_minutes
          FROM shared_attempts sa
          JOIN shared_pool sp ON sp.id = sa.shared_pool_id
          WHERE sa.id = ${sa.id}
        `;
        return json(full);
      }

      // ── File serving (R2) ──────────────────────────────────────────────────

      if (path.startsWith('/files/')) {
        const key = path.slice('/files/'.length);
        if (!key || key.includes('..') || key.startsWith('/'))
          return err('Invalid file path', 400);

        const obj = await env.R2.get(key);
        if (!obj) return new Response('Not found', { status: 404, headers: CORS });
        return new Response(obj.body, {
          headers: {
            ...CORS,
            'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000',
          },
        });
      }

      // ── Student Notifications ─────────────────────────────────────────────

      // GET /student/notifications/count — badge count (must be before /student/notifications)
      if (path === '/student/notifications/count' && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);
        const classId = url.searchParams.get('class_id');
        if (!classId) return err('class_id là bắt buộc', 400);
        const [row] = await sql`
          SELECT COUNT(*)::int AS count FROM notifications n
          JOIN assignments a ON a.id = n.ref_id
          WHERE n.student_id = ${studentId}::uuid
            AND n.is_read = false
            AND a.class_id = ${classId}::uuid
            AND (
              n.type IN ('score_released', 'new_assignment')
              OR (
                n.type = 'deadline_reminder'
                AND a.is_active = true
                AND NOT EXISTS (
                  SELECT 1 FROM submissions sub
                  WHERE sub.assignment_id = a.id AND sub.student_id = ${studentId}::uuid
                )
              )
            )
        `;
        return json({ count: row?.count ?? 0 });
      }

      // GET /student/notifications — fetch all + lazy-create deadline reminders
      if (path === '/student/notifications' && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);
        const classId = url.searchParams.get('class_id');
        if (!classId) return err('class_id là bắt buộc', 400);

        // Lazy-create deadline_reminder notifications for approaching deadlines (within 3 days)
        const today = new Date().toISOString().slice(0, 10);
        const approaching = await sql`
          SELECT a.id, a.title, a.deadline, q.skill
          FROM assignments a
          JOIN question_pool q ON q.id = a.question_id
          JOIN student_classes sc ON sc.class_id = a.class_id AND sc.student_id = ${studentId}::uuid
          LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = ${studentId}::uuid
          WHERE a.is_active = true
            AND a.deadline IS NOT NULL
            AND sub.id IS NULL
            AND a.deadline > NOW()
            AND a.deadline <= NOW() + INTERVAL '3 days'
            AND a.class_id = ${classId}::uuid
        `;
        for (const a of approaching) {
          const msLeft = new Date(a.deadline).getTime() - Date.now();
          const daysLeft = Math.ceil(msLeft / 86400000);
          const meta = JSON.stringify({ title: a.title, skill: a.skill, deadline: a.deadline, days_left: daysLeft });
          await sql`
            INSERT INTO notifications (student_id, type, ref_id, metadata, day_bucket)
            VALUES (${studentId}::uuid, 'deadline_reminder', ${a.id}, ${meta}::jsonb, ${today})
            ON CONFLICT DO NOTHING
          `;
        }

        // Fetch notifications filtered by class (join assignments to get class_id)
        const rows = await sql`
          SELECT n.id, n.type, n.ref_id, n.metadata, n.is_read, n.day_bucket, n.created_at, n.read_at
          FROM notifications n
          JOIN assignments a ON a.id = n.ref_id
          WHERE n.student_id = ${studentId}::uuid
            AND a.class_id = ${classId}::uuid
            AND (
              n.type IN ('score_released', 'new_assignment')
              OR (
                n.type = 'deadline_reminder'
                AND a.is_active = true
                AND (
                  n.is_read = true
                  OR NOT EXISTS (
                    SELECT 1 FROM submissions sub
                    WHERE sub.assignment_id = a.id AND sub.student_id = ${studentId}::uuid
                  )
                )
              )
            )
          ORDER BY n.is_read ASC, n.created_at DESC
          LIMIT 50
        `;
        return json(rows);
      }

      // PATCH /student/notifications/read-all — mark all as read for current class (must be before /:id)
      if (path === '/student/notifications/read-all' && method === 'PATCH') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);
        const classId = url.searchParams.get('class_id');
        if (classId) {
          // Only mark notifications for assignments in this class
          await sql`
            UPDATE notifications SET is_read = true, read_at = NOW()
            WHERE student_id = ${studentId}::uuid
              AND is_read = false
              AND ref_id IN (SELECT id FROM assignments WHERE class_id = ${classId})
          `;
        } else {
          await sql`
            UPDATE notifications SET is_read = true, read_at = NOW()
            WHERE student_id = ${studentId}::uuid AND is_read = false
          `;
        }
        return json({ ok: true });
      }

      // PATCH /student/notifications/:id/read — mark single notification as read
      if ((p = matchPath('/student/notifications/:id/read', path)) && method === 'PATCH') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);
        await sql`
          UPDATE notifications SET is_read = true, read_at = NOW()
          WHERE id = ${p.id}::uuid AND student_id = ${studentId}::uuid
        `;
        return json({ ok: true });
      }

      // DELETE /student/notifications/:id — delete a notification
      if ((p = matchPath('/student/notifications/:id', path)) && method === 'DELETE') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);
        await sql`
          DELETE FROM notifications
          WHERE id = ${p.id}::uuid AND student_id = ${studentId}::uuid
        `;
        return json({ ok: true });
      }

      // ══════════════════════════════════════════════════════════════════════════
      // COMPOSITE — student detail + submit + teacher grading
      // ══════════════════════════════════════════════════════════════════════════

      // ── Student: get assignment detail (includes sections for composite) ──────
      if ((p = matchPath('/student/assignments/:id', path)) && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);
        const [assignment] = await sql`
          SELECT a.*, q.skill, q.title AS question_title,
            q.content_text, q.content_blocks, q.content_url, q.content_urls,
            q.questions_data, q.script, q.vocabulary
          FROM assignments a
          JOIN question_pool q ON q.id = a.question_id
          WHERE a.id = ${p.id}
        `;
        if (!assignment) return err('Không tìm thấy bài tập', 404);
        const [membership] = await sql`
          SELECT 1 FROM student_classes
          WHERE student_id = ${studentId} AND class_id = ${assignment.class_id}
        `;
        if (!membership) return err('Học sinh không thuộc lớp này', 403);

        if (assignment.skill === 'composite') {
          const sections = await sql`
            SELECT cqs.*,
              css.id AS submission_id, css.answers, css.content, css.audio_url,
              css.score, css.feedback, css.teacher_feedback, css.submitted_at, css.is_overtime
            FROM composite_question_sections cqs
            LEFT JOIN composite_section_submissions css
              ON css.section_id = cqs.id
              AND css.assignment_id = ${p.id}
              AND css.student_id = ${studentId}
            WHERE cqs.composite_id = ${assignment.question_id}
            ORDER BY cqs.display_order
          `;
          return json({ ...assignment, sections });
        }
        return json(assignment);
      }

      // ── Student: submit a composite section ───────────────────────────────────
      if ((p = matchPath('/student/composite-sections/:id/submit', path)) && method === 'POST') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);

        const [section] = await sql`
          SELECT cqs.*, q.id AS composite_question_id
          FROM composite_question_sections cqs
          JOIN question_pool q ON q.id = cqs.composite_id
          WHERE cqs.id = ${p.id}
        `;
        if (!section) return err('Không tìm thấy section', 404);

        const ct = request.headers.get('Content-Type') || '';
        let assignmentId = null, answers = null, content = null, audioUrl = null, audioKey = null;
        let directUploadKey = null, audioUploadKeys = null;

        if (ct.includes('multipart/form-data')) {
          const form = await request.formData();
          assignmentId = form.get('assignment_id');
          const audioFile = form.get('audio');
          if (audioFile && audioFile.size > 0) {
            if (audioFile.size > 50 * 1024 * 1024) return err('File quá lớn — tối đa 50MB', 413);
            if (!isAudioContentType(audioFile.type)) return err('Chỉ chấp nhận file âm thanh', 415);
            if (!env.OPENAI_API_KEY) return err('Chưa cấu hình OPENAI_API_KEY', 500);
            const openaiForm = new FormData();
            openaiForm.append('file', audioFile, audioFile.name || 'audio.webm');
            openaiForm.append('model', 'gpt-4o-mini-transcribe');
            openaiForm.append('response_format', 'json');
            const sttUrl = getOpenAIEndpoint(env, '/v1/audio/transcriptions', 'stt');
            const aiRes = await fetch(sttUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${getOpenAIAuthToken(env, sttUrl, 'stt')}` }, body: openaiForm });
            if (!aiRes.ok) { const t = await aiRes.text(); if (isUnsupportedRegionOpenAIError(t)) return err('Dịch vụ nhận diện giọng nói đang bị chặn', 502); return err('Không thể nhận diện giọng nói', 500); }
            content = (await aiRes.json()).text || '';
            audioKey = `speaking/${section.composite_question_id}/${studentId}-${crypto.randomUUID()}-${sanitizeFileName(audioFile.name)}`;
            await env.R2.put(audioKey, audioFile.stream(), { httpMetadata: { contentType: audioFile.type } });
            audioUrl = buildR2PublicUrl(env, audioKey);
          }
        } else {
          const body = await request.json().catch(() => null);
          assignmentId    = body?.assignment_id     ?? null;
          answers         = body?.answers           ?? null;
          content         = body?.content           ?? null;
          directUploadKey = body?.audio_upload_key  ?? null;
          audioUploadKeys = Array.isArray(body?.audio_upload_keys) && body.audio_upload_keys.length > 0
            ? body.audio_upload_keys : null;
        }

        if (!assignmentId) return err('assignment_id là bắt buộc', 400);

        // Verify student access via assignment
        const [assignment] = await sql`
          SELECT a.id, a.is_active, a.deadline, a.mode, a.time_limit_minutes, a.class_id
          FROM assignments a
          JOIN student_classes sc ON sc.class_id = a.class_id
          WHERE a.id = ${assignmentId} AND a.question_id = ${section.composite_question_id}
            AND sc.student_id = ${studentId}
          LIMIT 1
        `;
        if (!assignment) return err('Không tìm thấy bài tập', 404);
        if (!assignment.is_active) return err('Bài tập đã đóng', 403);
        if (assignment.deadline && new Date(assignment.deadline) < new Date()) return err('Đã hết hạn nộp bài', 403);

        const [existing] = await sql`
          SELECT id FROM composite_section_submissions
          WHERE assignment_id = ${assignmentId} AND section_id = ${p.id} AND student_id = ${studentId}
        `;
        if (existing) return err('Bạn đã nộp phần này rồi', 409);

        // Handle R2 pre-uploaded audio for speaking
        if (section.skill === 'speaking' && (directUploadKey || audioUploadKeys) && !content) {
          const r2Key = directUploadKey || audioUploadKeys[0]?.key;
          try {
            content  = (await transcribeR2Audio(env, r2Key)).text || '';
            audioUrl = buildR2PublicUrl(env, r2Key);
            audioKey = r2Key;
          } catch (sttErr) {
            if (directUploadKey) await env.R2.delete(directUploadKey).catch(() => {});
            else if (audioUploadKeys) for (const k of audioUploadKeys) await env.R2.delete(k.key).catch(() => {});
            return err(sttErr.message || 'Không thể nhận diện giọng nói', sttErr.statusCode || 500);
          }
        }

        // Auto-grade reading/listening (composite section: IELTS if 40q)
        let score = null;
        if ((section.skill === 'reading' || section.skill === 'listening') && answers) {
          const secQCount = Array.isArray(section.questions_data) ? section.questions_data.length : 0;
          const secScale = secQCount === 40 ? 'ielts' : '10';
          score = autoGrade(answers, section.questions_data, secScale);
        }

        // Overtime detection using exam_session for this section
        let isOvertime = false;
        if (assignment.mode === 'exam' && section.time_limit_minutes) {
          const scopedSession = await loadCompositeSectionExamSession(sql, {
            studentId,
            assignmentId,
            sectionId: p.id,
          });
          const [legacySession] = scopedSession ? [null] : await sql`
            SELECT started_at FROM exam_sessions
            WHERE student_id = ${studentId} AND ref_type = 'composite_section' AND ref_id = ${p.id}
          `;
          const session = scopedSession || legacySession;
          if (session) {
            const elapsedSec = (Date.now() - new Date(session.started_at).getTime()) / 1000;
            isOvertime = elapsedSec > section.time_limit_minutes * 60 + 30;
          }
        }

        try {
          const [submission] = await sql`
            INSERT INTO composite_section_submissions
              (assignment_id, section_id, student_id, answers, content, audio_url, audio_key, score, is_overtime)
            VALUES (
              ${assignmentId}, ${p.id}, ${studentId},
              ${answers ? JSON.stringify(answers) : null}::jsonb,
              ${content}, ${audioUrl}, ${audioKey}, ${score}, ${isOvertime}
            )
            RETURNING *
          `;
          return json(submission, 201);
        } catch (dbErr) {
          if (audioKey && !directUploadKey && !audioUploadKeys) await env.R2.delete(audioKey).catch(() => {});
          throw dbErr;
        }
      }

      // ── Teacher: grade composite section submission ────────────────────────────
      if ((p = matchPath('/composite-section-submissions/:id/score', path)) && method === 'PATCH') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        const body = await request.json().catch(() => null);
        const updateFields = [], updateVals = [];
        if (body?.score    !== undefined) { updateFields.push('score');    updateVals.push(Number(body.score)); }
        if (body?.feedback !== undefined) { updateFields.push('feedback'); updateVals.push(String(body.feedback)); }
        if (updateFields.length === 0) return err('score hoặc feedback là bắt buộc');
        const setClauses = updateFields.map((f, i) => `${f} = $${i + 1}`).join(', ');
        const [row] = await sql(`UPDATE composite_section_submissions SET ${setClauses} WHERE id = $${updateFields.length + 1} RETURNING *`, [...updateVals, p.id]);
        if (!row) return err('Không tìm thấy bài nộp', 404);
        return json(row);
      }

      // ── Teacher: view composite assignment submissions ─────────────────────────
      if ((p = matchPath('/assignments/:id/composite-submissions', path)) && method === 'GET') {
        if (!await requireTeacherAuth(request, env)) return err('Unauthorized', 401);
        const [assignment] = await sql`
          SELECT a.*, q.id AS question_id FROM assignments a
          JOIN question_pool q ON q.id = a.question_id
          WHERE a.id = ${p.id} AND q.skill = 'composite'
        `;
        if (!assignment) return err('Không tìm thấy bài tập composite', 404);

        const sections = await sql`
          SELECT cqs.*
          FROM composite_question_sections cqs
          WHERE cqs.composite_id = ${assignment.question_id}
          ORDER BY cqs.display_order
        `;
        const students = await sql`
          SELECT s.id AS student_id, s.full_name, s.username
          FROM student_classes sc JOIN students s ON s.id = sc.student_id
          WHERE sc.class_id = ${assignment.class_id}
          ORDER BY s.full_name
        `;
        const submissions = await sql`
          SELECT css.*, cqs.skill, cqs.label AS section_label
          FROM composite_section_submissions css
          JOIN composite_question_sections cqs ON cqs.id = css.section_id
          WHERE css.assignment_id = ${p.id}
        `;
        const subMap = {};
        for (const sub of submissions) {
          if (!subMap[sub.student_id]) subMap[sub.student_id] = {};
          subMap[sub.student_id][sub.section_id] = sub;
        }
        const perStudent = students.map(s => ({
          student_id: s.student_id,
          full_name:  s.full_name,
          username:   s.username,
          sections:   sections.map(sec => ({
            section_id: sec.id,
            label:      sec.label,
            skill:      sec.skill,
            submission: subMap[s.student_id]?.[sec.id] ?? null,
          })),
        }));
        return json({ assignment, sections, perStudent });
      }

      if ((p = matchPath('/student/composite-section-submissions/:id', path)) && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = String(claims.student_id);
        const [sub] = await sql`
          SELECT
            css.id,
            css.assignment_id,
            css.section_id,
            css.answers,
            css.content,
            css.audio_url,
            css.submitted_at,
            css.is_overtime,
            css.score,
            css.feedback,
            css.teacher_feedback,
            a.title AS assignment_title,
            a.class_id,
            c.class_name,
            cqs.label AS section_label,
            cqs.skill,
            cqs.questions_data,
            cqs.content_text,
            cqs.content_blocks,
            cqs.content_url,
            cqs.content_urls,
            cqs.script,
            cqs.vocabulary
          FROM composite_section_submissions css
          JOIN assignments a ON a.id = css.assignment_id
          JOIN classes c ON c.id = a.class_id
          JOIN composite_question_sections cqs ON cqs.id = css.section_id
          JOIN student_classes sc ON sc.class_id = a.class_id
          WHERE css.id = ${p.id}
            AND css.student_id = ${studentId}
            AND sc.student_id = ${studentId}
          LIMIT 1
        `;
        if (!sub) return err('Không tìm thấy bài nộp', 404);
        return json({
          id: sub.id,
          assignment_id: sub.assignment_id,
          composite_assignment_id: sub.assignment_id,
          class_id: sub.class_id,
          class_name: sub.class_name,
          assignment_title: `${sub.assignment_title} · ${sub.section_label}`,
          section_label: sub.section_label,
          skill: sub.skill,
          submitted_at: sub.submitted_at,
          is_overtime: sub.is_overtime,
          overall_score: sub.score,
          questions_data: sub.questions_data,
          content_text: sub.content_text,
          content_blocks: sub.content_blocks,
          content_url: sub.content_url,
          content_urls: sub.content_urls || [],
          script: sub.script || '',
          vocabulary: sub.vocabulary || [],
          student_answers: sub.answers || [],
          writing_content: sub.skill === 'writing' ? (sub.content || '') : '',
          speaking_script: sub.skill === 'speaking' ? (sub.content || '') : '',
          speaking_audio_url: sub.skill === 'speaking' ? sub.audio_url : null,
          speaking_audio_urls: sub.skill === 'speaking' && sub.audio_url ? [{ url: sub.audio_url, name: '' }] : [],
          teacher_feedback: sub.teacher_feedback || null,
          ai_feedback: null,
          is_composite_section: true,
        });
      }

      return err('Not found', 404);
    } catch (e) {
      console.error('[worker error]', e);
      return err('Lỗi máy chủ nội bộ', 500);
    }
  },

  async scheduled(controller, env, ctx) {
    const sql = neon(env.DATABASE_URL);
    ctx.waitUntil((async () => {
      const scheduledTime = Number(controller?.scheduledTime || Date.now());
      const scheduledDate = new Date(scheduledTime);
      const shouldEnqueueDeadlines = scheduledDate.getUTCMinutes() === 50;
      logStudentEmail('scheduled_start', {
        cron: controller?.cron || null,
        scheduledTime,
        shouldEnqueueDeadlines,
      });
      await autoCloseExpired(sql);
      if (shouldEnqueueDeadlines) {
        await enqueueDeadline1DayEmails(sql);
      }
      await processQueuedStudentEmails(sql, env, { limit: 300, delayMs: 1000 });
      logStudentEmail('scheduled_done', {
        cron: controller?.cron || null,
        scheduledTime,
        shouldEnqueueDeadlines,
      });
    })());
  },
};
