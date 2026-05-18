const VALID_HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const SAFE_FALLBACK_COLOR = '#6c5ce7';
const ALLOWED_EXTENSIONS = new Set(['.json', '.csv', '.bak']);

export const BAR_COLORS = [
  'linear-gradient(135deg, #6c5ce7, #a29bfe)',
  'linear-gradient(135deg, #00cec9, #74b9ff)',
  'linear-gradient(135deg, #fd79a8, #fab1a0)',
  'linear-gradient(135deg, #e17055, #fab1a0)',
  'linear-gradient(135deg, #0984e3, #74b9ff)'
];
export const ROW_H = 34;
export const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const CACHE_VERSION = 1;
const CACHE_ENCRYPTION_KEY = 'gantt_encryption_enabled';
const CACHE_ENCRYPTION_LEGACY_PASSWORD_KEY = 'gantt_encryption_salt';
let cacheEncryptionPassword = null;

export const DB_NAME = 'GanttProjectDB';
export const STORE_NAME = 'handles';
export const KEY_NAME = 'projectFolder';

export const CSV_WRITE_FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'task', label: 'Tarefa' },
  { key: 'duration', label: 'Duracao' },
  { key: 'percent', label: 'Progresso' },
  { key: 'predecessor', label: 'Predecessora' },
  { key: 'type', label: 'Tipo' },
  { key: 'realStart', label: 'Data_Inicial_Real' },
  { key: 'realEnd', label: 'Data_Final_Real' },
  { key: 'plannedStart', label: 'Data_Inicial_Planejada' },
  { key: 'plannedEnd', label: 'Data_Final_Planejada' },
  { key: 'baselineStart', label: 'Data_Inicial_Baseline' },
  { key: 'baselineEnd', label: 'Data_Final_Baseline' },
  { key: 'baselineDate', label: 'Baseline_Data' }
];

export const CSV_READ_ALIASES = {
  task: ['tarefa', 'name'],
  duration: ['duracao', 'duração', 'duration', 'dias'],
  percent: ['progresso', 'percent', '%'],
  predecessor: ['predecessora', 'predecessor', 'pred'],
  type: ['tipo', 'type'],
  realStart: ['data_inicial_real', 'realstart', 'inicio_real', 'início_real'],
  realEnd: ['data_final_real', 'realend', 'fim_real'],
  plannedStart: ['data_inicial_planejada', 'plannedstart', 'inicio_planejado', 'início_planejado'],
  plannedEnd: ['data_final_planejada', 'plannedend', 'fim_planejado'],
  baselineStart: ['data_inicial_baseline', 'baselinestart'],
  baselineEnd: ['data_final_baseline', 'baselineend'],
  baselineDate: ['baseline_data', 'baselinedate'],
  id: ['id']
};

export function isValidColor(val) {
  return typeof val === 'string' && VALID_HEX_COLOR.test(val);
}

export function safeColor(val, fallback = SAFE_FALLBACK_COLOR) {
  return isValidColor(val) ? val : fallback;
}

export function isValidProjectFile(filename) {
  if (!filename || typeof filename !== 'string') return false;
  const lower = filename.toLowerCase();
  return Array.from(ALLOWED_EXTENSIONS).some(ext => lower.endsWith(ext));
}

export function sanitizeFilename(filename) {
  if (!isValidProjectFile(filename)) return null;
  return filename.replace(/[/\\:*?"<>|]/g, '_').trim();
}

export function isWeekend(d) {
  const w = d.getDay();
  return w === 0 || w === 6;
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function parseDate(s) {
  if (!s) return null;
  if (typeof s === 'object' && s instanceof Date) return isNaN(s) ? null : s;
  const str = String(s).trim();
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const d = new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}T00:00:00`);
    return isNaN(d) ? null : d;
  }
  const d = new Date(str + 'T00:00:00');
  return isNaN(d) ? null : d;
}

export function getLocalISOString(d) {
  if (!d) return '';
  if (typeof d === 'string') {
    const s = d.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj)) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function sanitizeCSV(val) {
  if (typeof val !== 'string') return val;
  if (/^[=+\-@|\t]/.test(val)) return "'" + val;
  if (/\r|\n/.test(val)) return val.replace(/\r?\n/g, ' ').replace(/\r/g, ' ');
  return val;
}

export function hasLocalStorageFiles() {
  try {
    const index = localStorage.getItem('gantt_fs_index');
    return !!(index && JSON.parse(index).length > 0);
  } catch {
    return false;
  }
}

export function clearAllCache() {
  const keys = ['tasks', 'projectMetadata', 'projectOptions', 'holidaysMap', 'activeProjectName', 'hasFolder'];
  keys.forEach(k => localStorage.removeItem(k));
}

export function checkCacheVersion() {
  localStorage.removeItem(CACHE_ENCRYPTION_LEGACY_PASSWORD_KEY);
  const stored = localStorage.getItem('gantt_cache_version');
  if (stored !== String(CACHE_VERSION)) {
    clearAllCache();
    localStorage.setItem('gantt_cache_version', String(CACHE_VERSION));
  }
}

async function cryptoDeriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function cryptoEncrypt(plaintext, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await cryptoDeriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function cryptoDecrypt(b64data, password) {
  const combined = Uint8Array.from(atob(b64data), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  const key = await cryptoDeriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

export function isEncryptionEnabled() {
  return localStorage.getItem(CACHE_ENCRYPTION_KEY) === 'true';
}

export function enableEncryption(password) {
  cacheEncryptionPassword = password || null;
  localStorage.setItem(CACHE_ENCRYPTION_KEY, 'true');
  localStorage.removeItem(CACHE_ENCRYPTION_LEGACY_PASSWORD_KEY);
}

export function disableEncryption() {
  cacheEncryptionPassword = null;
  localStorage.removeItem(CACHE_ENCRYPTION_KEY);
  localStorage.removeItem(CACHE_ENCRYPTION_LEGACY_PASSWORD_KEY);
}

export function getEncryptionPassword() {
  return cacheEncryptionPassword;
}

function requestEncryptionPassword() {
  if (cacheEncryptionPassword) return cacheEncryptionPassword;
  if (localStorage.getItem(CACHE_ENCRYPTION_KEY) !== 'true') return null;
  const password = window.prompt('Informe a senha do cache criptografado para esta sessão. A senha não será salva no navegador.');
  cacheEncryptionPassword = password || null;
  localStorage.removeItem(CACHE_ENCRYPTION_LEGACY_PASSWORD_KEY);
  return cacheEncryptionPassword;
}

export async function encodeCacheEncrypted(data) {
  const password = getEncryptionPassword();
  if (!password) return encodeCache(data);
  try {
    const json = JSON.stringify(data);
    const encrypted = await cryptoEncrypt(json, password);
    return 'v2:enc:' + encrypted;
  } catch {
    return encodeCache(data);
  }
}

export async function decodeCacheEncrypted(str) {
  if (!str || typeof str !== 'string') return null;
  if (str.startsWith('v2:enc:')) {
    const password = requestEncryptionPassword();
    if (!password) return null;
    try {
      const decrypted = await cryptoDecrypt(str.slice(7), password);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }
  return decodeCache(str);
}

export function encodeCache(data) {
  try {
    return 'v1:e:' + btoa(encodeURIComponent(JSON.stringify(data)));
  } catch {
    return JSON.stringify(data);
  }
}

export function decodeCache(str) {
  if (!str || typeof str !== 'string') return null;
  if (str.startsWith('v1:e:')) {
    try {
      return JSON.parse(decodeURIComponent(atob(str.slice(5))));
    } catch {
      return null;
    }
  }
  if (str.startsWith('e:')) {
    try {
      return JSON.parse(decodeURIComponent(atob(str.slice(2))));
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function toInputDateFormat(val) {
  if (!val) return '';
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  const d = parseDate(str);
  if (d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return '';
}

export function formatDatePT(dateStr) {
  if (!dateStr) return '--';
  const d = parseDate(dateStr);
  if (!d) return '--';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getDayOfWeekPT(dateStr) {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  if (!d) return '';
  return DAYS_PT[d.getDay()];
}

export function normalizePortfolioProjects(metaRows) {
  if (!Array.isArray(metaRows)) return [];
  return metaRows.map(m => ({
    name: m.name || m['nome do projeto'] || m.nome || 'Meu Projeto',
    startDate: m.startDate || m['data inicial'] || m['start date'] || new Date().toISOString().split('T')[0],
    manager: m.manager || m.gerente || '',
    tasksFile: m.tasksFile || m['arquivo de tarefas'] || m['tasks file'] || 'tarefas.csv',
    color: safeColor(m.color, '#6c5ce7')
  }));
}

export function getDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHandleToDB(handle) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, KEY_NAME);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.error('IndexedDB save failed', err);
    return false;
  }
}

export async function loadHandleFromDB() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(KEY_NAME);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('IndexedDB load failed', err);
    return null;
  }
}
