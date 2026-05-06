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
  let s = html.replace(/<(script|style|iframe|object|embed|form|base|meta|link)[\s\S]*?<\/>/gi, '');
  s = s.replace(/<(script|style|iframe|object|embed|form|base|meta|link)[^>]*>/gi, '');
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

async function queueStudentEmailEvent(sql, { studentId, assignmentId, eventType }) {
  await sql`
    INSERT INTO student_email_events (student_id, assignment_id, event_type, status, updated_at)
    VALUES (${studentId}::uuid, ${assignmentId}::uuid, ${eventType}, 'pending', NOW())
    ON CONFLICT (student_id, assignment_id, event_type)
    DO NOTHING
  `;
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
  return row || null;
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
}

async function loadStudentEmailContext(sql, { studentId, assignmentId }) {
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

async function deliverQueuedStudentEmail(sql, env, { studentId, assignmentId, eventType }) {
  const claimed = await claimStudentEmailEvent(sql, { studentId, assignmentId, eventType });
  if (!claimed) return false;

  try {
    const ctx = await loadStudentEmailContext(sql, { studentId, assignmentId });
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
        status: 'failed',
        lastError: 'missing_or_invalid_student_email',
      });
      return false;
    }

    if (eventType === EMAIL_EVENT_TYPES.SCORE_RELEASED && ctx.overall_score == null) {
      await updateStudentEmailEvent(sql, {
        studentId, assignmentId, eventType,
        status: 'failed',
        lastError: 'missing_score_context',
      });
      return false;
    }

    const payload = buildStudentEmailPayload(env, eventType, ctx);
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

async function processQueuedStudentEmails(sql, env, opts = {}) {
  const limit = Math.max(1, Math.min(Number(opts.limit) || 50, 200));
  let rows;
  if (opts.studentId && opts.assignmentId && Array.isArray(opts.eventTypes) && opts.eventTypes.length > 0) {
    rows = opts.eventTypes.map(eventType => ({
      student_id: opts.studentId,
      assignment_id: opts.assignmentId,
      event_type: eventType,
    }));
  } else {
    rows = await sql`
      SELECT student_id, assignment_id, event_type
      FROM student_email_events
      WHERE status IN ('pending', 'failed')
      ORDER BY
        CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
        updated_at ASC,
        created_at ASC
      LIMIT ${limit}
    `;
  }

  await Promise.allSettled(rows.map(row => (
    deliverQueuedStudentEmail(sql, env, {
      studentId: row.student_id,
      assignmentId: row.assignment_id,
      eventType: row.event_type,
    })
  )));
}

async function enqueueDeadline1DayEmails(sql) {
  const rows = await sql`
    SELECT sc.student_id, a.id AS assignment_id
    FROM assignments a
    JOIN student_classes sc ON sc.class_id = a.class_id
    LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = sc.student_id
    WHERE a.is_active = true
      AND a.deadline IS NOT NULL
      AND a.deadline > NOW()
      AND a.deadline <= NOW() + INTERVAL '24 hours'
      AND sub.id IS NULL
  `;

  await Promise.allSettled(rows.map(row => (
    queueStudentEmailEvent(sql, {
      studentId: row.student_id,
      assignmentId: row.assignment_id,
      eventType: EMAIL_EVENT_TYPES.DEADLINE_1DAY,
    })
  )));
}

// ─── Auto-grade ───────────────────────────────────────────────────────────────

function autoGrade(studentAnswers, questionsData) {
  if (!questionsData || questionsData.length === 0) return null;
  if (!studentAnswers || studentAnswers.length === 0) return 0;
  let correct = 0;
  for (const sa of studentAnswers) {
    const q = questionsData.find(q => q.q_no === sa.q_no);
    if (!q || !q.answers || q.answers.length === 0) continue;
    const normalized = (sa.answer || '').toLowerCase().trim();
    if (q.answers.some(a => a.toLowerCase().trim() === normalized)) correct++;
  }
  return Math.round((correct / questionsData.length) * 9 * 10) / 10;
}

// ─── AI Feedback helpers ──────────────────────────────────────────────────────

const IELTS_SYSTEM_PROMPT = `You are a senior IELTS examiner with 15+ years of experience. Your task is to assess a student's response and provide concise, actionable feedback for the teacher's reference.

Evaluate EXACTLY TWO criteria:
1. Lexical Resource (LR) — vocabulary range, accuracy, collocation, and appropriacy
2. Grammatical Range and Accuracy (GRA) — range and accuracy of grammar structures, punctuation

---

## IELTS Band Descriptors — Lexical Resource (LR)

Band 9: Full flexibility and precise use. Wide range used accurately and naturally with very sophisticated control. Minor errors extremely rare.
Band 8: Wide resource, fluent and flexible. Skilful use of uncommon/idiomatic items. Occasional inaccuracies in word choice/collocation; minimal spelling errors.
Band 7: Sufficient for flexibility and precision. Some less common/idiomatic items used. Awareness of style/collocation evident, though inappropriacies occur. Few spelling/word-form errors.
Band 6: Generally adequate. Meaning clear despite restricted range or imprecision. Risk-takers may use wider vocab with higher inaccuracy. Some spelling/word-form errors but do not impede communication.
Band 5: Limited but minimally adequate. Simple vocabulary accurate but range limited; frequent lapses in appropriacy; noticeable spelling errors that may cause difficulty.
Band 4: Limited and inadequate. Basic vocabulary, possibly repetitive; inappropriate lexical chunks; errors may impede meaning.
Band 3: Inadequate. Very limited control of word choice/spelling; errors predominate, severely impeding meaning.
Band 2: Extremely limited. Few recognisable strings; no apparent control of word formation/spelling.
Band 1: No resource except isolated words.

## IELTS Band Descriptors — Grammatical Range and Accuracy (GRA)

Band 9: Structures precise and accurate at all times. Wide range, flexibly used. Errors extremely rare.
Band 8: Wide range, flexibly and accurately used. Majority of sentences error-free. Occasional non-systematic errors; well-managed punctuation.
Band 7: Variety of complex structures used with flexibility. Error-free sentences frequent. Few errors persist but do not impede communication.
Band 6: Mix of simple and complex sentence forms, limited flexibility. Errors in complex structures; rarely impede communication. Basic sentences fairly controlled.
Band 5: Limited, repetitive range. Complex sentences attempted but faulty; greatest accuracy on simple sentences. Errors may cause difficulty; faulty punctuation.
Band 4: Very limited range. Simple sentences predominate. Grammatical errors frequent; may impede meaning. Punctuation often faulty or inadequate.
Band 3: Sentence forms attempted but grammatical/punctuation errors predominate; prevents most meaning from coming through.
Band 2: Little or no evidence of sentence forms.
Band 1: No rateable language.

---

## Analysis Requirements

For each criterion, your feedback MUST include:
1. **Band justification** — explain specifically why this band was awarded
2. **Strengths** — 1–2 specific things the student did well, with direct quotes from the text when useful
3. **Errors & weaknesses** — list specific errors found, quoting the exact wrong phrase and suggesting a correction (e.g., "❌ 'very much informations' → ✅ 'a great deal of information'")
4. **Improvement tips** — 1–2 concrete, actionable suggestions the teacher can use to coach the student

---

## Output format (strict JSON only, no markdown outside JSON):
{
  "lr_score": <number 0–9 in 0.5 steps>,
  "lr": {
    "band_justification_md": "<Vietnamese markdown, 1 short paragraph>",
    "strengths_md": "<Vietnamese markdown bullet list with 1-2 bullets>",
    "errors_md": "<Vietnamese markdown bullet list with specific wrong phrase → correction pairs, or '- Không thấy lỗi nổi bật.'>",
    "tips_md": "<Vietnamese markdown bullet list with 1-2 coaching tips>"
  },
  "gra_score": <number 0–9 in 0.5 steps>,
  "gra": {
    "band_justification_md": "<Vietnamese markdown, 1 short paragraph>",
    "strengths_md": "<Vietnamese markdown bullet list with 1-2 bullets>",
    "errors_md": "<Vietnamese markdown bullet list with specific wrong phrase → correction pairs, or '- Không thấy lỗi nổi bật.'>",
    "tips_md": "<Vietnamese markdown bullet list with 1-2 coaching tips>"
  }
}

Critical rules:
- Scores MUST be multiples of 0.5 between 0 and 9. Be calibrated and honest — do not inflate.
- ALL feedback text MUST be in Vietnamese.
- Quote exact phrases from the student's text when that evidence is useful and clear (use double quotes around quotes).
- Markdown is allowed ONLY inside the *_md string fields. Use **bold**, *italic*, bullet lists, and inline code sparingly. Do not output HTML.
- Keep feedback concise and practical — usually around 80-140 Vietnamese words per criterion is enough.
- You MUST first check whether the student actually answered the task/topic. If the response is completely off-topic or answers the wrong prompt (for example, describing a person when the task asks for a place), clearly state "Sai đề" or "Lạc đề" in the feedback.
- If the response is completely off-topic / wrong-task, assign 0.0 for both LR and GRA, briefly explain why it is wrong-task, and do not give normal band justification as if the task had been answered correctly.
- This analysis is for the teacher's reference only, not shown directly to students.
- Output ONLY valid JSON. Absolutely no text before or after the JSON object.`;

const AI_FEEDBACK_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lr_score', 'lr', 'gra_score', 'gra'],
  properties: {
    lr_score: { type: 'number' },
    lr: {
      type: 'object',
      additionalProperties: false,
      required: ['band_justification_md', 'strengths_md', 'errors_md', 'tips_md'],
      properties: {
        band_justification_md: { type: 'string' },
        strengths_md: { type: 'string' },
        errors_md: { type: 'string' },
        tips_md: { type: 'string' },
      },
    },
    gra_score: { type: 'number' },
    gra: {
      type: 'object',
      additionalProperties: false,
      required: ['band_justification_md', 'strengths_md', 'errors_md', 'tips_md'],
      properties: {
        band_justification_md: { type: 'string' },
        strengths_md: { type: 'string' },
        errors_md: { type: 'string' },
        tips_md: { type: 'string' },
      },
    },
  },
};

function buildWritingPrompt(questionText, writingContent) {
  return [
    '## SKILL: IELTS Writing',
    '',
    questionText ? `### Đề bài (Task Prompt):\n${questionText}` : '',
    '',
    `### Bài làm của học sinh:\n${writingContent}`,
    '',
    'Hãy phân tích kỹ bài viết trên theo 2 tiêu chí LR và GRA.',
  ].filter(Boolean).join('\n');
}

function buildSpeakingPrompt(questionText, speakingScript) {
  return [
    '## SKILL: IELTS Speaking',
    '',
    questionText ? `### Câu hỏi / Chủ đề:\n${questionText}` : '',
    '',
    `### Transcript (được tạo tự động bằng AI STT):\n${speakingScript}`,
    '',
    'Lưu ý: Đây là transcript từ bài nói — có thể có lỗi nhận dạng nhỏ từ STT.',
    'Hãy phân tích kỹ transcript trên theo 2 tiêu chí LR và GRA.',
  ].join('\n');
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

    // Global rate limit — 200 requests per 10s per IP (anti-spam/DDoS)
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (await checkRateLimit(env.KV, `global:${clientIp}`, 600, 60))
      return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { 'Content-Type': 'application/json' } });

    // Per-request CORS (dynamic origin — avoids module-level state race)
    const origin      = request.headers.get('Origin') || '';
    const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : null;
    const CORS = {
      ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin } : {}),
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
          SELECT id, full_name, username, password_hash
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

      // ── Classes ────────────────────────────────────────────────────────────

      if (path === '/classes') {
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

      if ((p = matchPath('/classes/:id', path))) {
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
              (SELECT COUNT(*) FROM submissions sub WHERE sub.assignment_id = a.id)::int AS submission_count
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
          maxBytes = 200 * 1024 * 1024;
          key = buildTeacherAudioKey(fileName);
        } else if (scope === 'student-speaking') {
          const claims = await requireStudentAuth(request, env);
          if (!claims) return err('Unauthorized', 401);
          const assignmentId = String(body?.assignment_id || '').trim();
          const studentId = String(claims.student_id);
          if (!assignmentId || !studentId) return err('assignment_id và student_id là bắt buộc', 400);
          maxBytes = 50 * 1024 * 1024;
          key = buildStudentSpeakingKey(assignmentId, studentId, fileName);
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

      if (path === '/questions') {
        if (method === 'GET') {
          const skill = url.searchParams.get('skill');
          const rows = skill
            ? await sql`
                SELECT id, teacher_id, skill, title, content_url, content_text, content_blocks, questions_data, tags, script, created_at
                FROM question_pool
                WHERE skill = ${skill}::skill_type
                ORDER BY created_at DESC
              `
            : await sql`
                SELECT id, teacher_id, skill, title, content_url, content_text, content_blocks, questions_data, tags, script, created_at
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
            return json(row, 201);
          } catch (dbErr) {
            if (uploadedR2Key) await env.R2.delete(uploadedR2Key).catch(() => {});
            throw dbErr;
          }
        }
      }

      // B4.6 — Duplicate question (must match before /questions/:id)
      if ((p = matchPath('/questions/:id/duplicate', path)) && method === 'POST') {
        const [src] = await sql`SELECT * FROM question_pool WHERE id = ${p.id}`;
        if (!src) return err('Không tìm thấy đề', 404);
        const teacherId = await getTeacherId(sql);
        const [row] = await sql`
          INSERT INTO question_pool (teacher_id, skill, title, content_text, content_blocks, content_url, content_urls, questions_data, vocabulary)
          VALUES (
            ${teacherId}, ${src.skill}::skill_type, ${(src.title || '') + ' (Bản sao)'},
            ${src.content_text}, ${JSON.stringify(src.content_blocks || [])}::jsonb, ${src.content_url},
            ${JSON.stringify(src.content_urls || [])}::jsonb,
            ${JSON.stringify(src.questions_data || [])},
            ${JSON.stringify(src.vocabulary || [])}
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
        if (method === 'GET') {
          const [row] = await sql`SELECT * FROM question_pool WHERE id = ${p.id}`;
          if (!row) return err('Không tìm thấy đề', 404);
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
          const [row] = await sql`
            UPDATE question_pool
            SET title          = COALESCE(${body.title          ?? null}, title),
                content_text   = CASE WHEN ${shouldUpdateContentText} THEN ${nextContentText} ELSE content_text END,
                content_blocks = COALESCE(${contentBlocksJson}::jsonb,        content_blocks),
                questions_data = COALESCE(${questionsDataJson}::jsonb,    questions_data),
                vocabulary     = COALESCE(${vocabularyJson}::jsonb,       vocabulary),
                tags           = COALESCE(${tagsArr},                     tags),
                script         = COALESCE(${scriptVal},                   script)
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
          const [question] = await sql`SELECT skill FROM question_pool WHERE id = ${body.question_id}`;
          const [row] = await sql`
            INSERT INTO assignments (class_id, question_id, title, deadline, is_active)
            VALUES (${body.class_id}, ${body.question_id}, ${body.title}, ${body.deadline ?? null}, true)
            RETURNING *
          `;
          // Notify all students in the class about the new assignment
          const classStudents = await sql`SELECT student_id FROM student_classes WHERE class_id = ${body.class_id}`;
          const notifMeta = JSON.stringify({ title: body.title, skill: question?.skill ?? null, deadline: body.deadline ?? null });
          for (const { student_id } of classStudents) {
            await sql`
              INSERT INTO notifications (student_id, type, ref_id, metadata)
              VALUES (${student_id}, 'new_assignment', ${row.id}, ${notifMeta}::jsonb)
              ON CONFLICT DO NOTHING
            `;
            await queueStudentEmailEvent(sql, {
              studentId: student_id,
              assignmentId: row.id,
              eventType: EMAIL_EVENT_TYPES.NEW_ASSIGNMENT,
            });
          }
          ctx?.waitUntil?.(processQueuedStudentEmails(sql, env, { limit: Math.max(10, classStudents.length * 2) }));
          return json(row, 201);
        }
      }

      // Must match before /assignments/:id
      if ((p = matchPath('/assignments/:id/submissions', path)) && method === 'GET') {
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
        const [assignment] = await sql`
          SELECT a.id, a.title, a.deadline, a.is_active,
            q.skill, q.title AS question_title, q.content_text, q.content_blocks, q.content_url, q.content_urls,
            jsonb_array_length(q.questions_data) AS question_count
          FROM assignments a
          JOIN question_pool q ON q.id = a.question_id
          WHERE a.id = ${p.id}
        `;
        if (!assignment) return err('Không tìm thấy bài tập', 404);
        if (!assignment.is_active) return err('Bài tập đã đóng', 403);
        return json(assignment);
      }

      if ((p = matchPath('/assignments/:id/vocabulary', path)) && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);

        const [row] = await sql`
          SELECT a.title AS assignment_title, q.skill, q.vocabulary
          FROM assignments a
          JOIN question_pool q ON q.id = a.question_id
          WHERE a.id = ${p.id}
        `;
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

        const [existing] = await sql`
          SELECT id FROM submissions WHERE assignment_id = ${p.id} AND student_id = ${studentId}
        `;
        if (existing) {
          if (audioUploadKeys) for (const k of audioUploadKeys) await env.R2.delete(k.key).catch(() => {});
          else if (directUploadKey) await env.R2.delete(directUploadKey).catch(() => {});
          return err('Bạn đã nộp bài này rồi', 409);
        }

        await autoCloseExpired(sql, { assignmentId: p.id });
        const [assignment] = await sql`
          SELECT q.skill, q.questions_data, a.is_active
          FROM assignments a
          JOIN question_pool q ON q.id = a.question_id
          WHERE a.id = ${p.id}
        `;
        if (!assignment) {
          if (audioUploadKeys) for (const k of audioUploadKeys) await env.R2.delete(k.key).catch(() => {});
          else if (directUploadKey) await env.R2.delete(directUploadKey).catch(() => {});
          return err('Không tìm thấy bài tập', 404);
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
          overallScore = autoGrade(studentAnswers, assignment.questions_data);
        }

        try {
          const [submission] = await sql`
            INSERT INTO submissions
              (assignment_id, student_id, student_answers, writing_content, speaking_script, speaking_audio_url, speaking_audio_urls, overall_score)
            VALUES (
              ${p.id}, ${studentId},
              ${studentAnswers ? JSON.stringify(studentAnswers) : null},
              ${writingContent}, ${speakingScript}, ${speakingAudioUrl},
              ${JSON.stringify(speakingAudioUrls)}::jsonb, ${overallScore}
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
          if (!sub) return err('Không tìm thấy bài nộp', 404);
          return json(sub);
        }
        if (method === 'PATCH') {
          const body = await request.json();
          // Capture previous score to detect first-time grading
          const [prev] = await sql`SELECT overall_score FROM submissions WHERE id = ${p.id}`;
          const wasUnscored = prev && prev.overall_score == null;
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
              SELECT a.id AS assignment_id, a.title, q.skill
              FROM assignments a JOIN question_pool q ON q.id = a.question_id
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
              });
              ctx?.waitUntil?.(processQueuedStudentEmails(sql, env, {
                studentId: sub.student_id,
                assignmentId: asgn.assignment_id,
                eventTypes: [EMAIL_EVENT_TYPES.SCORE_RELEASED],
              }));
            }
          }
          return json(sub);
        }
      }

      // ── Teacher Inbox (B4.8) ──────────────────────────────────────────────

      if (path === '/inbox' && method === 'GET') {
        const teacherId = await getTeacherId(sql);
        const rows = await sql`
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
          ORDER BY sub.submitted_at ASC
          LIMIT 100
        `;
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
          SELECT a.id, a.title, a.deadline, a.is_active, a.created_at,
            q.skill, q.title AS question_title, q.content_text, q.content_blocks, q.content_url,
            jsonb_array_length(COALESCE(q.vocabulary, '[]'::jsonb)) AS vocab_count,
            sub.id AS submission_id, sub.overall_score, sub.status AS submission_status,
            sub.submitted_at
          FROM assignments a
          JOIN question_pool q ON q.id = a.question_id
          LEFT JOIN submissions sub
            ON sub.assignment_id = a.id AND sub.student_id = ${studentId}
          WHERE a.class_id = ${classId}
          ORDER BY a.created_at DESC
        `;
        return json(rows);
      }

      if (path === '/student/change-password' && method === 'POST') {
        const claims = await requireStudentAuth(request, env);

        const body = await request.json().catch(() => null);
        if (!body) return err('Invalid JSON', 400);

        const oldPassword = String(body.old_password || '');
        const newPassword = String(body.new_password || '');

        if (!oldPassword || !newPassword) {
          return err('old_password và new_password là bắt buộc', 400);
        }
        if (newPassword.length < 8) {
          return err('Mật khẩu mới phải có ít nhất 8 ký tự', 400);
        }
        if (oldPassword === newPassword) {
          return err('Mật khẩu mới phải khác mật khẩu cũ', 400);
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

        // Load question to grade
        const [assignment] = await sql`
          SELECT q.questions_data FROM assignments a
          JOIN question_pool q ON q.id = a.question_id
          WHERE a.id = ${assignmentId}
        `;
        if (!assignment) return err('Không tìm thấy bài tập', 404);

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
        await sql`DELETE FROM profile_fields WHERE id = ${p.id}`;
        return json({ ok: true });
      }

      if ((p = matchPath('/students/:id/profile-answers', path)) && method === 'GET') {
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
          const fields = await sql`SELECT * FROM profile_fields ORDER BY display_order ASC, created_at ASC`.catch(() => []);
          const answers = await sql`SELECT field_id, value FROM student_profile_answers WHERE student_id = ${studentId}`.catch(() => []);
          const answerMap = {};
          for (const a of answers) answerMap[a.field_id] = a.value;
          return json({ fields, answers: answerMap });
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

      // ── Student Vocab (DB-backed) ──────────────────────────────────────────

      if (path === '/student/vocab' && method === 'GET') {
        const claims = await requireStudentAuth(request, env);
        if (!claims) return err('Unauthorized', 401);
        const studentId = claims.student_id;
        const rows = await sql`
          SELECT word, definition, example, source, saved_at
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
        const { word, definition = '', example = '', source = '' } = body;
        if (!word) return err('word required', 400);
        await sql`
          INSERT INTO student_vocab (student_id, word, definition, example, source)
          VALUES (${studentId}, ${word}, ${definition}, ${example}, ${source})
          ON CONFLICT (student_id, word) DO UPDATE
            SET definition = EXCLUDED.definition,
                example    = EXCLUDED.example,
                source     = EXCLUDED.source,
                saved_at   = NOW()
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

      return err('Not found', 404);
    } catch (e) {
      console.error('[worker error]', e);
      return err('Lỗi máy chủ nội bộ', 500);
    }
  },

  async scheduled(controller, env, ctx) {
    const sql = neon(env.DATABASE_URL);
    ctx.waitUntil((async () => {
      await autoCloseExpired(sql);
      await enqueueDeadline1DayEmails(sql);
      await processQueuedStudentEmails(sql, env, { limit: 200 });
    })());
  },
};
