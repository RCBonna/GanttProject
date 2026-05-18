const { createApp, ref, computed, watch, onMounted, onUnmounted, nextTick } = Vue;

// ─── Color Validation ─────────────────────────────────────────────────────

const VALID_HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const SAFE_FALLBACK_COLOR = '#6c5ce7';

function isValidColor(val) {
  return typeof val === 'string' && VALID_HEX_COLOR.test(val);
}

function safeColor(val, fallback = SAFE_FALLBACK_COLOR) {
  return isValidColor(val) ? val : fallback;
}

// ─── File Extension Validation ────────────────────────────────────────────

const ALLOWED_EXTENSIONS = new Set(['.json', '.csv', '.bak']);

function isValidProjectFile(filename) {
  if (!filename || typeof filename !== 'string') return false;
  const lower = filename.toLowerCase();
  return Array.from(ALLOWED_EXTENSIONS).some(ext => lower.endsWith(ext));
}

function sanitizeFilename(filename) {
  if (!isValidProjectFile(filename)) {
    return null;
  }
  return filename.replace(/[/\\:*?"<>|]/g, '_').trim();
}

const BAR_COLORS = [
  'linear-gradient(135deg, #6c5ce7, #a29bfe)', // Roxo Premium
  'linear-gradient(135deg, #00cec9, #74b9ff)', // Turquesa / Azul Claro
  'linear-gradient(135deg, #fd79a8, #fab1a0)', // Rosa / Coral
  'linear-gradient(135deg, #e17055, #fab1a0)', // Coral Premium
  'linear-gradient(135deg, #0984e3, #74b9ff)'  // Azul Real
];
const ROW_H = 34;
const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Helper Functions
function isWeekend(d) {
  const w = d.getDay();
  return w === 0 || w === 6;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function parseDate(s) {
  if (!s) return null;
  if (typeof s === 'object' && s instanceof Date) return isNaN(s) ? null : s;
  const str = String(s).trim();
  // Handle DD/MM/YYYY format
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const d = new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}T00:00:00`);
    return isNaN(d) ? null : d;
  }
  const d = new Date(str + 'T00:00:00');
  return isNaN(d) ? null : d;
}

// Safer local date format YYYY-MM-DD
function getLocalISOString(d) {
  if (!d) return '';
  if (typeof d === 'string') {
    const s = d.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.substring(0, 10);
    }
    const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    }
  }
  let dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj)) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sanitizeCSV(val) {
  if (typeof val !== 'string') return val;
  if (/^[=+\-@|\t]/.test(val)) return "'" + val;
  if (/\r|\n/.test(val)) return val.replace(/\r?\n/g, ' ').replace(/\r/g, ' ');
  return val;
}

function hasLocalStorageFiles() {
  try {
    const index = localStorage.getItem('gantt_fs_index');
    return !!(index && JSON.parse(index).length > 0);
  } catch { return false; }
}

const CACHE_VERSION = 1;

function clearAllCache() {
  const keys = ['tasks', 'projectMetadata', 'projectOptions', 'holidaysMap', 'activeProjectName', 'hasFolder'];
  keys.forEach(k => localStorage.removeItem(k));
}

function checkCacheVersion() {
  const stored = localStorage.getItem('gantt_cache_version');
  if (stored !== String(CACHE_VERSION)) {
    clearAllCache();
    localStorage.setItem('gantt_cache_version', String(CACHE_VERSION));
  }
}

// ============================================================
// Web Crypto API — Optional AES-GCM encryption for LocalStorage
// ============================================================

const CACHE_ENCRYPTION_KEY = 'gantt_encryption_enabled';
const CACHE_ENCRYPTION_SALT = 'gantt_encryption_salt';

async function cryptoDeriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
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

function isEncryptionEnabled() {
  return localStorage.getItem(CACHE_ENCRYPTION_KEY) === 'true';
}

function enableEncryption(password) {
  localStorage.setItem(CACHE_ENCRYPTION_KEY, 'true');
  localStorage.setItem(CACHE_ENCRYPTION_SALT, password);
}

function disableEncryption() {
  localStorage.removeItem(CACHE_ENCRYPTION_KEY);
  localStorage.removeItem(CACHE_ENCRYPTION_SALT);
}

function getEncryptionPassword() {
  return localStorage.getItem(CACHE_ENCRYPTION_SALT);
}

async function encodeCacheEncrypted(data) {
  const password = getEncryptionPassword();
  if (!password) return encodeCache(data);
  try {
    const json = JSON.stringify(data);
    const encrypted = await cryptoEncrypt(json, password);
    return 'v2:enc:' + encrypted;
  } catch (e) {
    console.error('Encryption failed, falling back to base64:', e);
    return encodeCache(data);
  }
}

async function decodeCacheEncrypted(str) {
  if (!str || typeof str !== 'string') return null;
  if (str.startsWith('v2:enc:')) {
    const password = getEncryptionPassword();
    if (!password) return null;
    try {
      const decrypted = await cryptoDecrypt(str.slice(7), password);
      return JSON.parse(decrypted);
    } catch (e) {
      console.error('Decryption failed (wrong password or corrupted data):', e);
      return null;
    }
  }
  // Fall back to v1:e: format for backward compatibility
  return decodeCache(str);
}

// Keep original functions for backward compatibility
function encodeCache(data) {
  try { return 'v1:e:' + btoa(encodeURIComponent(JSON.stringify(data))); }
  catch { return JSON.stringify(data); }
}

function decodeCache(str) {
  if (!str || typeof str !== 'string') return null;
  if (str.startsWith('v1:e:')) {
    try { return JSON.parse(decodeURIComponent(atob(str.slice(5)))); }
    catch { return null; }
  }
  if (str.startsWith('e:')) {
    try { return JSON.parse(decodeURIComponent(atob(str.slice(2)))); }
    catch { return null; }
  }
  try { return JSON.parse(str); }
  catch { return null; }
}

function toInputDateFormat(val) {
  if (!val) return '';
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }
  const d = parseDate(str);
  if (d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return '';
}

function formatDatePT(dateStr) {
  if (!dateStr) return '--';
  if (dateStr instanceof Date) {
    const day = String(dateStr.getDate()).padStart(2, '0');
    const month = String(dateStr.getMonth() + 1).padStart(2, '0');
    const year = dateStr.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function getDayOfWeekPT(dateStr) {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  return d ? DAYS_PT[d.getDay()] : '';
}

// IndexedDB Directory Handle Persistence
const DB_NAME = 'GanttProjectDB';
const STORE_NAME = 'handles';
const KEY_NAME = 'projectFolder';

function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveHandleToDB(handle) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(handle, KEY_NAME);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('IndexedDB save failed', err);
    return false;
  }
}

async function loadHandleFromDB() {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('IndexedDB load failed', err);
    return null;
  }
}

// CSV Field Mapping — centralized source of truth for D-05
const CSV_WRITE_FIELDS = [
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

// Backward-compatible CSV header aliases for reading (lowercase)
const CSV_READ_ALIASES = {
  task: ['tarefa', 'name'],
  percent: ['progresso', 'concluido', 'percentagem'],
  duration: ['dias', 'duracao'],
  predecessor: ['predecessora'],
  type: ['tipo'],
  plannedStart: ['data_inicial_planejada', 'planned_start'],
  plannedEnd: ['data_final_planejada', 'planned_end'],
  realStart: ['data_inicial_real', 'actual_start', 'real_start'],
  realEnd: ['data_final_real', 'actual_end', 'real_end'],
  baselineStart: ['data_inicial_baseline', 'baseline_start'],
  baselineEnd: ['data_final_baseline', 'baseline_end'],
  baselineDate: ['baseline_data', 'baseline_date']
};

const mapCSVRow = (obj) => {
  const out = {};
  for (const [field, aliases] of Object.entries(CSV_READ_ALIASES)) {
    const found = aliases.find(a => obj[a] !== undefined && obj[a] !== '');
    out[field] = found ? obj[found] : obj[field] || '';
  }
  // Always include id if present
  if (obj.id !== undefined) out.id = obj.id;
  return out;
};

const App = {
  setup() {
    const hasFolder = ref(false);
    const directoryHandle = ref(null);
    const permissionStatus = ref('prompt');
    const zoomLevel = ref('day');
    let lastFocusedElement = null;
    
    // Custom Toasts and Dialogs State
    const toasts = ref([]);
    const customDialog = ref({
      show: false,
      title: '',
      message: '',
      type: 'alert',
      confirmText: 'OK',
      cancelText: 'Cancelar',
      resolve: null,
      reject: null
    });
    
    // Column Visibility View Mode & Width Persistency with responsive minimum bounds
    const columnView = ref(localStorage.getItem('columnView') || 'planejamento');
    const minTaskListWidth = computed(() => {
      if (columnView.value === 'padrao') return 325;
      if (columnView.value === 'planejamento' || columnView.value === 'execucao') return 495;
      return 665;
    });

    const taskListWidth = ref(Math.max(parseInt(localStorage.getItem('taskListWidth')) || 525, minTaskListWidth.value));

    // Baseline & Real bar visibility toggles
    const showBaselineBars = ref(localStorage.getItem('showBaselineBars') !== 'false');
    const showRealBars = ref(localStorage.getItem('showRealBars') !== 'false');

    const gridTemplate = computed(() => {
      if (columnView.value === 'padrao') return '30px 36px minmax(30px, 1fr) 45px 45px 45px 45px';
      if (columnView.value === 'planejamento' || columnView.value === 'execucao') return '30px 36px minmax(30px, 1fr) 45px 45px 45px 45px 85px 85px';
      return '30px 36px minmax(30px, 1fr) 45px 45px 45px 45px 85px 85px 85px 85px';
    });

    const selectAllBaseline = computed({
      get: () => {
        const unclosed = tasks.value.filter(t => t.percent < 100);
        return unclosed.length > 0 && unclosed.every(t => t.selectedForBaseline);
      },
      set: (val) => {
        tasks.value.forEach(t => {
          if (t.percent < 100) {
            t.selectedForBaseline = val;
          }
        });
      }
    });

    const saving = ref(false);
    const recalculateStatus = ref('');
    const hoverTaskId = ref(null);

    // Modals Control
    const showProjectSelector = ref(false);
    const showProjectSettingsModal = ref(false);
    const showHolidaysModal = ref(false);
    const showEditModal = ref(false);
    const showExportModal = ref(false);
    const showNewProjectWizard = ref(false);
    const showMoreMenu = ref(false);

    // Wizard State (existing project wizard)
    const wizardStep = ref(1);
    const wizardName = ref('');
    const wizardManager = ref('');
    const wizardColor = ref('#0984e3');
    const wizardStartDate = ref(new Date().toISOString().split('T')[0]);
    const wizardIncludeHolidays = ref(true);
    const wizardTemplate = ref('software');

    // Portfolio Wizard State
    const showPortfolioWizard = ref(false);

    const anyModalOpen = computed(() =>
      showEditModal.value || showExportModal.value || showHolidaysModal.value ||
      showProjectSelector.value || showProjectSettingsModal.value ||
      showNewProjectWizard.value || showPortfolioWizard.value
    );

    watch(anyModalOpen, (open) => {
      if (open) {
        lastFocusedElement = document.activeElement;
        nextTick(() => {
          const overlays = document.querySelectorAll('.modal-overlay');
          for (const el of overlays) {
            if (el.style.display === 'flex') {
              const first = el.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
              if (first) first.focus();
              break;
            }
          }
        });
      } else if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
        lastFocusedElement = null;
      }
    });

    const pfStep = ref(1);
    const pfFolderHandle = ref(null);
    const pfFolderPath = ref('');
    const pfName = ref('');
    const pfDescription = ref('');
    const pfColor = ref('#0984e3');
    const pfManager = ref('');
    const pfBaseDate = ref(new Date().toISOString().split('T')[0]);
    const pfIncludeHolidays = ref(true);
    const pfHolidays = ref([]);
    const pfNewHolidayDate = ref('');
    const pfNewHolidayDesc = ref('');


    // Temp variables for modals
    const editingTask = ref(null);
    const fieldErrors = ref({});
    const hasPlannedDates = ref(false);
    const projectOptions = ref([]);
    const portfolioMeta = ref(null);
    const showPortfolioInfo = ref(false);
    const showPortfolioEditModal = ref(false);
    const tempPortfolioMeta = ref({ name: '', description: '', manager: '', baseDate: '', color: '#0984e3' });
    const tempProjectMetadata = ref({ name: '', manager: '', startDate: '', color: '#6c5ce7' });
    const newHolidayDate = ref('');
    const newHolidayName = ref('');

    // Tooltip detailed state
    const tooltip = ref({
      show: false,
      x: 0,
      y: 0,
      barType: 'planned', // 'planned', 'real', 'baseline'
      isReal: false,
      taskName: '',
      duration: 0,
      percent: 0,
      start: '',
      end: '',
      baselineStart: '',
      baselineEnd: '',
      baselineDate: '',
      predecessor: '',
      type: ''
    });

    const projectMetadata = ref({
      name: 'Nome do Projeto',
      startDate: new Date().toISOString().split('T')[0],
      manager: '',
      tasksFile: 'tarefas.csv'
    });

    const holidaysMap = ref({}); // { 'YYYY-MM-DD': 'Name' }
    const tasks = ref([]);
    const filterText = ref('');
    const filteredTasks = computed(() => {
      if (!filterText.value) return tasks.value;
      const q = filterText.value.toLowerCase();
      return tasks.value.filter(t => (t.task || '').toLowerCase().includes(q) || String(t.id).includes(q));
    });

    const allDays = ref([]);
    const chartColumns = ref([]);
    const chartMonths = ref([]);

    const colWidth = computed(() => {
      if (zoomLevel.value === 'day') return 30;
      if (zoomLevel.value === 'week') return 60;
      return 100;
    });

    const sanitizeFilename = (name) => {
      if (!name) return 'tarefas.csv';
      return name.normalize("NFD")
                 .replace(/[\u0300-\u036f]/g, "")
                 .replace(/[^a-zA-Z0-9_\-\. ]/g, "")
                 .trim()
                 .replace(/\s+/g, "_");
    };

    const addToast = (message, type = 'info', duration = 4000) => {
      const id = Date.now() + Math.random().toString(36).substr(2, 5);
      toasts.value.push({ id, message, type, duration });
      setTimeout(() => {
        removeToast(id);
      }, duration);
    };

    const removeToast = (id) => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    };

    const showCustomAlert = (message, title = 'Aviso', type = 'info') => {
      return new Promise((resolve) => {
        customDialog.value = {
          show: true,
          title,
          message,
          type,
          confirmText: 'OK',
          cancelText: '',
          resolve: () => {
            customDialog.value.show = false;
            resolve(true);
          },
          reject: null
        };
      });
    };

    const showCustomConfirm = (message, title = 'Confirmação', type = 'warn') => {
      return new Promise((resolve) => {
        customDialog.value = {
          show: true,
          title,
          message,
          type,
          confirmText: 'Sim',
          cancelText: 'Não',
          resolve: () => {
            customDialog.value.show = false;
            resolve(true);
          },
          reject: () => {
            customDialog.value.show = false;
            resolve(false);
          }
        };
      });
    };

    const isWorkingDay = (date) => {
      const w = date.getDay();
      if (w === 0 || w === 6) return false;
      const iso = getLocalISOString(date);
      return !holidaysMap.value[iso];
    };

    const addWorkingDays = (start, n) => {
      let d = new Date(start);
      let count = 0;
      if (n <= 0) return d;
      while (count < n) {
        d.setDate(d.getDate() + 1);
        if (isWorkingDay(d)) count++;
      }
      return d;
    };

    const getBusinessDayIndex = (day, origin) => {
      let idx = 0, d = new Date(origin);
      while (d < day) {
        d.setDate(d.getDate() + 1);
        if (isWorkingDay(d)) idx++;
      }
      return idx;
    };

    // Format utilities (top-level implementations)

    // CSV Parser with Semicolon and Comma auto-detection
    const parseCSV = (text) => {
      const cleanText = text.replace(/^\ufeff/, "").trim();
      const lines = cleanText.split(/\r?\n/);
      if (lines.length < 2) return [];
      const delim = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(delim).map(h => h.trim().toLowerCase());
      const result = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = [];
        let cur = '', inQuote = false;
        for (let c = 0; c < lines[i].length; c++) {
          const char = lines[i][c];
          if (char === '"') inQuote = !inQuote;
          else if (char === delim && !inQuote) {
            vals.push(cur.trim());
            cur = '';
          } else cur += char;
        }
        vals.push(cur.trim());
        const obj = {};
        headers.forEach((h, j) => {
          // Remove wrapping quotes from values
          let val = vals[j] || '';
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
          }
          obj[h] = val;
        });
        result.push(obj);
      }
      return result;
    };

    // Read file from FileSystem API or localStorage fallback
    const readFileFromDisk = async (filename) => {
      const safe = sanitizeFilename(filename);
      console.log('[readFileFromDisk] filename:', filename, 'sanitized:', safe);
      if (!safe) { console.warn(`Blocked read of file with invalid extension: ${filename}`); return null; }
      if (directoryHandle.value) {
        console.log('[readFileFromDisk] using directoryHandle, name:', directoryHandle.value.name);
        try {
          const handle = await directoryHandle.value.getFileHandle(safe);
          const file = await handle.getFile();
          console.log('[readFileFromDisk] file size:', file.size);
          const text = await file.text();
          console.log('[readFileFromDisk] text length:', text.length);
          return text;
        } catch (e) {
          console.error('[readFileFromDisk] error:', e);
          return null;
        }
      }
      // Fallback: read from localStorage (decrypted)
      try {
        return await decodeCacheEncrypted(localStorage.getItem('gantt_fs_' + safe));
      } catch { return null; }
    };

    const promptFileImport = () => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.json';
        input.multiple = true;
        input.webkitdirectory = true;
        input.onchange = async () => {
          const files = input.files;
          if (!files || !files.length) { resolve({}); return; }
          const result = {};
          for (let i = 0; i < files.length; i++) {
            if (files[i].name.endsWith('.csv') || files[i].name.endsWith('.json')) {
              try {
                result[files[i].name] = await files[i].text();
              } catch {}
            }
          }
          resolve(result);
        };
        input.click();
      });
    };

    const importFilesFromDisk = async () => {
      const files = await promptFileImport();
      const entries = Object.entries(files);
      if (entries.length === 0) return;
      let imported = 0;
      for (const [name, content] of entries) {
        const safe = sanitizeFilename(name);
        if (!safe) { console.warn(`Skipped import of file with invalid extension: ${name}`); continue; }
        localStorage.setItem('gantt_fs_' + safe, await encodeCacheEncrypted(content));
        const index = JSON.parse(localStorage.getItem('gantt_fs_index') || '[]');
        if (!index.includes(safe)) { index.push(safe); localStorage.setItem('gantt_fs_index', JSON.stringify(index)); }
        imported++;
      }
      await loadProject();
      addToast(`📂 ${imported} arquivo(s) importado(s)!`, 'success');
    };

    // Create backup of existing file before overwriting
    const backupFile = async (filename) => {
      const existing = await readFileFromDisk(filename);
      if (existing === null) return;
      const bakName = filename + '.bak';
      if (directoryHandle.value) {
        try {
          const bakHandle = await directoryHandle.value.getFileHandle(bakName, { create: true });
          const bakWritable = await bakHandle.createWritable();
          await bakWritable.write('\ufeff' + existing);
          await bakWritable.close();
        } catch (err) {
          console.warn('Failed to create backup for ' + filename, err);
        }
      } else {
        localStorage.setItem('gantt_fs_' + bakName, await encodeCacheEncrypted(existing));
        const index = JSON.parse(localStorage.getItem('gantt_fs_index') || '[]');
        if (!index.includes(bakName)) { index.push(bakName); localStorage.setItem('gantt_fs_index', JSON.stringify(index)); }
      }
    };

    // File System Access Save Handler with localStorage fallback
    const saveFileToDisk = async (filename, content, retries = 1) => {
      const safe = sanitizeFilename(filename);
      if (!safe) { console.warn(`Blocked write of file with invalid extension: ${filename}`); return false; }
      await backupFile(safe);
      if (directoryHandle.value) {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const handle = await directoryHandle.value.getFileHandle(safe, { create: true });
            const writable = await handle.createWritable();
            await writable.write('\ufeff' + content);
            await writable.close();
            return true;
          } catch (err) {
            console.error(`Error writing to file ${safe} (attempt ${attempt + 1})`, err);
            if (attempt < retries) {
              await new Promise(r => setTimeout(r, 500));
              continue;
            }
            addToast(`Falha ao salvar ${safe} no disco. Salvando localmente como fallback.`, 'warn');
          }
        }
      }
      // Fallback: save to localStorage (encrypted)
      try {
        localStorage.setItem('gantt_fs_' + safe, await encodeCacheEncrypted(content));
        const index = JSON.parse(localStorage.getItem('gantt_fs_index') || '[]');
        if (!index.includes(safe)) {
          index.push(safe);
          localStorage.setItem('gantt_fs_index', JSON.stringify(index));
        }
        return true;
      } catch (err) {
        console.error("Error saving to localStorage fallback", err);
        addToast(`Erro crítico ao salvar ${safe}. Verifique o espaço disponível no navegador.`, 'error');
        return false;
      }
    };

    // Main Tasks Saver
    const saveTasksToDisk = async () => {
      const escapeCSV = (val) => {
        const str = String(val ?? '');
        if (/^[=+\-@|\t]/.test(str)) return `"'${str.replace(/"/g, '""')}"`;
        return `"${str.replace(/"/g, '""')}"`;
      };
      const headerRow = CSV_WRITE_FIELDS.map(f => f.label).join(';');
      let csvContent = headerRow + '\n';
      tasks.value.forEach(t => {
        const row = CSV_WRITE_FIELDS.map(f => {
          const val = t[f.key];
          return escapeCSV(val);
        });
        csvContent += row.join(';') + '\n';
      });
      
      // Save local storage cache too
      localStorage.setItem('tasks', await encodeCacheEncrypted(tasks.value));
      await saveFileToDisk(projectMetadata.value.tasksFile, csvContent);
    };

    // Baseline Snapshot — copies current calculated start/end to baseline fields for selected unclosed tasks
    const saveBaseline = async () => {
      if (!tasks.value.length) return;
      const selectedTasks = tasks.value.filter(t => t.percent < 100 && t.selectedForBaseline);
      if (!selectedTasks.length) {
        addToast('⚠️ Selecione pelo menos uma tarefa não concluída para salvar a Linha de Base.', 'warn');
        return;
      }
      const today = getLocalISOString(new Date());
      const hasExisting = selectedTasks.some(t => t.baselineStart || t.baselineEnd);
      if (hasExisting) {
        if (!await showCustomConfirm('Algumas das tarefas selecionadas já possuem linha de base. Deseja sobrescrever?', 'Sobrescrever Baseline', 'warn')) return;
      }
      selectedTasks.forEach(t => {
        t.baselineStart = t.start ? getLocalISOString(t.start) : '';
        t.baselineEnd = t.end ? getLocalISOString(t.end) : '';
        t.baselineDate = today;
      });
      await saveTasksToDisk();
      addToast(`📸 Linha de Base (Baseline) salva para ${selectedTasks.length} tarefa(s) selecionada(s)!`, 'success');
    };

    // Project Metadata Config modal saver
    const saveProjectSettings = async () => {
      // Find and update inside projectOptions
      const idx = projectOptions.value.findIndex(p => p.tasksFile === projectMetadata.value.tasksFile);
      if (idx !== -1) {
        projectOptions.value[idx].name = tempProjectMetadata.value.name;
        projectOptions.value[idx].manager = tempProjectMetadata.value.manager;
        projectOptions.value[idx].startDate = tempProjectMetadata.value.startDate;
        projectOptions.value[idx].color = safeColor(tempProjectMetadata.value.color);
      } else {
        const cleanName = sanitizeFilename(tempProjectMetadata.value.name || 'Novo Projeto');
        projectOptions.value.push({
          name: tempProjectMetadata.value.name,
          manager: tempProjectMetadata.value.manager,
          startDate: tempProjectMetadata.value.startDate,
          tasksFile: cleanName,
          color: safeColor(tempProjectMetadata.value.color)
        });
        projectMetadata.value.tasksFile = cleanName;
      }

      // Update active metadata
      projectMetadata.value.name = tempProjectMetadata.value.name;
      projectMetadata.value.manager = tempProjectMetadata.value.manager;
      projectMetadata.value.startDate = tempProjectMetadata.value.startDate;
      projectMetadata.value.color = safeColor(tempProjectMetadata.value.color);

      // Update LocalStorage cache
      localStorage.setItem('projectMetadata', await encodeCacheEncrypted(projectMetadata.value));
      localStorage.setItem('projectOptions', await encodeCacheEncrypted(projectOptions.value));

      // Save to portfolio.json
      const jsonContent = JSON.stringify(projectOptions.value, null, 2);

      const ok = await saveFileToDisk('portfolio.json', jsonContent);
      if (ok) {
        showProjectSettingsModal.value = false;
        calculateSchedule(tasks.value, projectMetadata.value.startDate);
        buildTimeline();
      }
    };

    const openProjectSettings = () => {
      tempProjectMetadata.value = {
        name: projectMetadata.value.name,
        manager: projectMetadata.value.manager,
        startDate: projectMetadata.value.startDate,
        color: safeColor(projectMetadata.value.color)
      };
      showProjectSettingsModal.value = true;
    };

    const openPortfolioSettings = () => {
      if (!portfolioMeta.value) return;
      tempPortfolioMeta.value = {
        name: portfolioMeta.value.name || '',
        description: portfolioMeta.value.description || '',
        manager: portfolioMeta.value.manager || '',
        baseDate: portfolioMeta.value.baseDate || '',
        color: safeColor(portfolioMeta.value.color, '#0984e3')
      };
      showPortfolioEditModal.value = true;
    };

    const savePortfolioSettings = async () => {
      portfolioMeta.value = {
        ...portfolioMeta.value,
        name: tempPortfolioMeta.value.name,
        description: tempPortfolioMeta.value.description,
        manager: tempPortfolioMeta.value.manager,
        baseDate: tempPortfolioMeta.value.baseDate,
        color: safeColor(tempPortfolioMeta.value.color, '#0984e3')
      };
      localStorage.setItem('portfolioMeta', await encodeCacheEncrypted(portfolioMeta.value));
      showPortfolioEditModal.value = false;
    };

    // Holidays Saver
    const saveHolidaysToDisk = async () => {
      localStorage.setItem('holidaysMap', await encodeCacheEncrypted(holidaysMap.value));
      const jsonContent = JSON.stringify(holidaysMap.value, null, 2);
      await saveFileToDisk('feriados.json', jsonContent);
    };

    const addHoliday = async () => {
      const name = (newHolidayName.value || '').trim().substring(0, 100);
      if (!newHolidayDate.value || !name) {
        addToast("Preencha a data e a descrição do feriado.", "warn");
        return;
      }
      const date = newHolidayDate.value;
      holidaysMap.value[date] = name;
      newHolidayDate.value = '';
      newHolidayName.value = '';
      await saveHolidaysToDisk();
      calculateSchedule(tasks.value, projectMetadata.value.startDate);
      buildTimeline();
    };

    const removeHoliday = async (date) => {
      if (await showCustomConfirm(`Deseja remover o feriado do dia ${formatDatePT(date)}?`, 'Remover Feriado', 'warn')) {
        delete holidaysMap.value[date];
        await saveHolidaysToDisk();
        calculateSchedule(tasks.value, projectMetadata.value.startDate);
        buildTimeline();
      }
    };

    const sortedHolidays = computed(() => {
      const keys = Object.keys(holidaysMap.value).sort();
      const sorted = {};
      keys.forEach(k => {
        sorted[k] = holidaysMap.value[k];
      });
      return sorted;
    });

    const loadProject = async () => {
      if (!directoryHandle.value && !hasLocalStorageFiles()) return;
      console.log('[loadProject] directoryHandle:', !!directoryHandle.value, 'hasLocalStorageFiles:', hasLocalStorageFiles());
      try {
        // 1. Read portfolio.json
        let metadadosContent = await readFileFromDisk('portfolio.json');
        console.log('[loadProject] portfolio.json length:', metadadosContent ? metadadosContent.length : 'null');

        if (metadadosContent) {
          try {
            const metaRows = JSON.parse(metadadosContent);
            if (Array.isArray(metaRows)) {
      projectOptions.value = metaRows.map(m => ({
        name: m.name || m['nome do projeto'] || m.nome || 'Meu Projeto',
        startDate: m.startDate || m['data inicial'] || m['start date'] || new Date().toISOString().split('T')[0],
        manager: m.manager || m.gerente || '',
        tasksFile: m.tasksFile || m['arquivo de tarefas'] || m['tasks file'] || 'tarefas.csv',
        color: safeColor(m.color, '#6c5ce7')
      }));

               localStorage.setItem('projectOptions', await encodeCacheEncrypted(projectOptions.value));

                if (projectOptions.value.length > 0) {
                  // Check if there's a cached active project Name
                  const savedProjectName = await decodeCacheEncrypted(localStorage.getItem('activeProjectName'));
                  console.log('[loadProject] savedProjectName:', savedProjectName);
                  const found = projectOptions.value.find(p => p.name === savedProjectName);
                  if (found) {
                    projectMetadata.value = { ...found };
                    console.log('[loadProject] found project, tasksFile:', found.tasksFile);
                  } else {
                    projectMetadata.value = { ...projectOptions.value[0] };
                    console.log('[loadProject] using first project, tasksFile:', projectOptions.value[0].tasksFile);
                  }
                  localStorage.setItem('projectMetadata', await encodeCacheEncrypted(projectMetadata.value));
                }
            }
          } catch (e) {
            console.error("Erro ao analisar portfolio.json", e);
          }
        }

        // 2. Read feriados.json
        await loadHolidays();

        // 3. Read tasks
        await loadTasks();

      } catch (err) {
        console.error("Error loading project files", err);
        addToast("Erro ao ler os arquivos do projeto. Certifique-se de que a pasta selecionada está correta.", "error");
      }
    };

    const loadHolidays = async () => {
      if (!directoryHandle.value && !hasLocalStorageFiles()) return;
      const hContent = await readFileFromDisk('feriados.json');
      if (hContent) {
        let parsed = {};
        try { parsed = JSON.parse(hContent); } catch(e) { console.error("Erro ao analisar feriados.json", e); }
        const newHols = {};
        if (Array.isArray(parsed)) {
          parsed.forEach(r => {
            const d = r.data || r.date;
            const n = r.nome || r.name;
            if (d) newHols[d] = n;
          });
        } else if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([d, n]) => {
            newHols[d] = n;
          });
        }
        holidaysMap.value = newHols;
        localStorage.setItem('holidaysMap', await encodeCacheEncrypted(holidaysMap.value));
      }
    };

    const loadTasks = async () => {
      if (!directoryHandle.value && !hasLocalStorageFiles()) return;
      console.log('[loadTasks] tasksFile:', projectMetadata.value.tasksFile);
      let tContent = await readFileFromDisk(projectMetadata.value.tasksFile);
      console.log('[loadTasks] content length:', tContent ? tContent.length : 'null');

      if (tContent) {
        const rawTasks = parseCSV(tContent);
        let index = 1;
        const mappedTasks = rawTasks.map(obj => {
          const row = mapCSVRow(obj);
          const taskId = parseInt(row.id) || index++;
          const taskName = row.task || 'Tarefa ' + taskId;
          const taskPercent = parseInt(row.percent) || 0;
          const taskDuration = parseInt(row.duration) || 0;

          return {
            id: taskId,
            task: taskName,
            percent: isNaN(taskPercent) ? 0 : Math.max(0, Math.min(100, taskPercent)),
            duration: isNaN(taskDuration) ? 0 : taskDuration,
            predecessor: row.predecessor || '',
            type: (row.type || 'FS').toUpperCase(),
            plannedStart: row.plannedStart || '',
            plannedEnd: row.plannedEnd || '',
            realStart: row.realStart || null,
            realEnd: row.realEnd || null,
            baselineStart: row.baselineStart || '',
            baselineEnd: row.baselineEnd || '',
            baselineDate: row.baselineDate || '',
            start: null,
            end: null,
            selectedForBaseline: isNaN(taskPercent) || taskPercent < 100
          };
        });
        calculateSchedule(mappedTasks, projectMetadata.value.startDate);
        tasks.value = mappedTasks;
        localStorage.setItem('tasks', await encodeCacheEncrypted(mappedTasks));
        buildTimeline();
      } else {
        tasks.value = [];
      }
    };

    const selectProject = async (proj) => {
      projectMetadata.value = {
        name: proj.name,
        startDate: proj.startDate,
        manager: proj.manager,
        tasksFile: proj.tasksFile
      };
      localStorage.setItem('activeProjectName', await encodeCacheEncrypted(proj.name));
      localStorage.setItem('projectMetadata', await encodeCacheEncrypted(projectMetadata.value));
      showProjectSelector.value = false;
      await loadTasks();
    };

    const calculateSchedule = (taskList, startDateStr) => {
      const map = {};
      const projStart = parseDate(startDateStr) || new Date();

      taskList.forEach(t => {
        t.start = null;
        t.end = null;
        t.dateSource = 'calculated';
        map[t.id] = t;
      });

      // Resolve a single task's dates recursively
      const resolve = (t, visited) => {
        if (!t || t.start) return;

        // 1. Locked dates (user-defined)
        if (t.plannedStart && t.plannedEnd) {
          t.start = parseDate(t.plannedStart);
          t.end = parseDate(t.plannedEnd);
          t.dateSource = 'locked';
          return;
        }

        // 2. Cycle detection
        if (visited.has(t.id)) {
          t.start = new Date(projStart);
          t.dateSource = 'calculated';
          return;
        }

        visited.add(t.id);

        // 3. No predecessor: start from project start
        if (!t.predecessor) {
          t.start = new Date(projStart);
        } else {
          // 4. Has predecessor(s): resolve dependencies
          const predStrs = String(t.predecessor).match(/\d+/g) || [];
          let maxStart = new Date(projStart);
          let hasValidPred = false;
          let usedForecast = false;

          predStrs.forEach(pStr => {
            const predId = parseInt(pStr);
            const pred = map[predId];
            if (!pred) return;

            resolve(pred, visited);

            const predRealStart = parseDate(pred.realStart);
            const predRealEnd = parseDate(pred.realEnd);

            if (t.type === 'SS') {
              // Start-to-Start: successor starts when predecessor starts
              const refStart = predRealStart || new Date(pred.start);
              if (predRealStart) usedForecast = true;
              if (refStart > maxStart) maxStart = refStart;
            } else {
              // Finish-to-Start (default)
              let refEnd;
              if (predRealEnd) {
                refEnd = addWorkingDays(predRealEnd, 1);
                usedForecast = true;
              } else if (predRealStart) {
                const forecastEnd = addWorkingDays(predRealStart, pred.duration - 1);
                refEnd = addWorkingDays(forecastEnd, 1);
                usedForecast = true;
              } else {
                refEnd = addWorkingDays(new Date(pred.start), pred.duration);
              }
              if (refEnd > maxStart) maxStart = refEnd;
            }
            hasValidPred = true;
          });

          t.start = hasValidPred ? maxStart : new Date(projStart);
          if (usedForecast && t.dateSource !== 'locked') t.dateSource = 'forecast';
        }

        visited.delete(t.id);

        while (!isWorkingDay(t.start)) t.start = addDays(t.start, 1);
        t.end = t.duration <= 0 ? new Date(t.start) : addWorkingDays(t.start, t.duration - 1);
      };

      taskList.forEach(t => resolve(t, new Set()));
    };

    // Sprint 5: Forecast Recalculate
    const runForecast = () => {
      if (!tasks.value.length) return;
      calculateSchedule(tasks.value, projectMetadata.value.startDate);
      buildTimeline();
      const fc = tasks.value.filter(t => t.dateSource === 'forecast').length;
      addToast(fc > 0 ? `🔄 Previsão recalculada — ${fc} tarefa(s) com forecast atualizado` : '✅ Cronograma recalculado — sem impactos em cascata', fc > 0 ? 'info' : 'success');
    };

    const buildTimeline = () => {
      if (!tasks.value.length) return;
      let minT = null, maxT = null;
      tasks.value.forEach(t => {
        if (!minT || t.start < minT) minT = t.start;
        if (!maxT || t.end > maxT) maxT = t.end;
        
        // Check real dates for timeline boundaries too
        if (t.realStart) {
          const rs = parseDate(t.realStart);
          if (rs && (!minT || rs < minT)) minT = rs;
          if (t.realEnd) {
            const re = parseDate(t.realEnd);
            if (re && (!maxT || re > maxT)) maxT = re;
          } else {
            const today = new Date();
            if (!maxT || today > maxT) maxT = today;
          }
        }
        // Check baseline dates for timeline boundaries
        if (t.baselineStart) {
          const bs = parseDate(t.baselineStart);
          if (bs && (!minT || bs < minT)) minT = bs;
        }
        if (t.baselineEnd) {
          const be = parseDate(t.baselineEnd);
          if (be && (!maxT || be > maxT)) maxT = be;
        }
      });
      if (!minT || !maxT) return;

      const days = [];
      let d = new Date(minT); d = addDays(d, -3);
      let limit = new Date(maxT); limit = addDays(limit, 7);
      let safety = 0;
      while (d <= limit && safety < 2000) {
        days.push(new Date(d));
        d = addDays(d, 1);
        safety++;
      }
      allDays.value = days;

      // Build columns
      const cols = [];
      if (zoomLevel.value === 'day') {
        days.forEach((day, idx) => {
          const iso = getLocalISOString(day);
          const holName = holidaysMap.value[iso];
          cols.push({
            id: 'day_' + idx,
            label: day.getDate(),
            subLabel: DAYS_PT[day.getDay()].charAt(0),
            isWeekend: isWeekend(day),
            isHoliday: !!holName,
            holidayName: holName,
            date: day
          });
        });
      } else if (zoomLevel.value === 'week') {
        for (let i = 0; i < days.length; i += 7) {
          const day = days[i];
          cols.push({ id: 'wk_' + i, label: 'S' + (Math.floor(i / 7) + 1), subLabel: day.getDate() + '/' + (day.getMonth() + 1), isWeekend: false, date: day });
        }
      } else {
        let lastM = -1;
        days.forEach((day, idx) => {
          if (day.getMonth() !== lastM) {
            cols.push({ id: 'mo_' + idx, label: MONTHS_PT[day.getMonth()], subLabel: day.getFullYear(), isWeekend: false, date: day });
            lastM = day.getMonth();
          }
        });
      }
      chartColumns.value = cols;

      if (zoomLevel.value === 'day') {
        const ms = [];
        let curM = -1, curObj = null;
        days.forEach((day) => {
          if (day.getMonth() !== curM) {
            if (curObj) ms.push(curObj);
            curObj = { label: MONTHS_PT[day.getMonth()] + ' ' + day.getFullYear(), width: colWidth.value };
            curM = day.getMonth();
          } else {
            curObj.width += colWidth.value;
          }
        });
        if (curObj) ms.push(curObj);
        chartMonths.value = ms;
      } else {
        chartMonths.value = [];
      }
    };

    const getPos = (date) => {
      if (!date || !allDays.value.length) return 0;
      const dayIdx = allDays.value.findIndex(d => d.getTime() >= date.getTime());
      if (dayIdx < 0) return 0;
      if (zoomLevel.value === 'day') return dayIdx * colWidth.value;
      if (zoomLevel.value === 'week') return (dayIdx / 7) * colWidth.value;
      
      const startM = allDays.value[0];
      const monthsDiff = (date.getFullYear() - startM.getFullYear()) * 12 + (date.getMonth() - startM.getMonth());
      const dayInMonth = date.getDate();
      return (monthsDiff * colWidth.value) + (dayInMonth / 30 * colWidth.value);
    };

    const openProjectFolder = async () => {
      // Try File System Access API first
      if ('showDirectoryPicker' in window) {
        try {
          directoryHandle.value = await window.showDirectoryPicker({ mode: 'readwrite' });
          hasFolder.value = true;
          localStorage.setItem('hasFolder', 'true');
          await saveHandleToDB(directoryHandle.value);
          permissionStatus.value = 'granted';
          await loadProject();
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn('FileSystem API failed, attempting fallback...', err);
        }
      }
      // Fallback: import files via file input
      const files = await promptFileImport();
      const entries = Object.entries(files);
      if (entries.length === 0) return;
      for (const [name, content] of entries) {
        localStorage.setItem('gantt_fs_' + name, await encodeCacheEncrypted(content));
        const index = JSON.parse(localStorage.getItem('gantt_fs_index') || '[]');
        if (!index.includes(name)) { index.push(name); localStorage.setItem('gantt_fs_index', JSON.stringify(index)); }
      }
      hasFolder.value = true;
      localStorage.setItem('hasFolder', 'true');
      await loadProject();
      addToast(`📂 ${entries.length} arquivo(s) importado(s) via navegador. Use "Exportar" para salvar no disco.`, 'info', 5000);
    };

    const closeProjectFolder = async () => {
      if (tasks.value.length > 0) {
        const confirmed = await showCustomConfirm(
          'Deseja realmente fechar este projeto? Os dados não salvos serão perdidos.',
          'Fechar Projeto',
          'warn'
        );
        if (!confirmed) return;
      }

      // Wipe reactive state
      tasks.value = [];
      holidaysMap.value = {};
      projectMetadata.value = { name: 'Nome do Projeto', startDate: new Date().toISOString().split('T')[0], manager: '', tasksFile: 'tarefas.csv' };
      projectOptions.value = [];
      directoryHandle.value = null;
      hasFolder.value = false;
      permissionStatus.value = 'prompt';
      filterText.value = '';
      allDays.value = [];
      chartColumns.value = [];
      chartMonths.value = [];

      // Remove folder flag from localStorage
      localStorage.removeItem('hasFolder');

      // Clear IndexedDB handle
      try {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(KEY_NAME);
      } catch (err) {
        console.warn('IndexedDB handle delete failed', err);
      }

      addToast('🔌 Projeto fechado. Dados da sessão limpos.', 'info', 4000);
    };

    const reconnectFolder = async () => {
      if (directoryHandle.value) {
        try {
          const status = await directoryHandle.value.requestPermission({ mode: 'readwrite' });
          permissionStatus.value = status;
          if (status === 'granted') {
            await loadProject();
            addToast('Pasta do projeto conectada com sucesso!', 'success');
            return;
          }
        } catch (err) {
          console.error('Request permission on directory handle failed:', err);
        }
      }
      if (hasLocalStorageFiles()) {
        permissionStatus.value = 'granted';
        await loadProject();
        addToast('Projeto carregado do armazenamento local do navegador.', 'info');
        return;
      }
      await openProjectFolder();
    };

    // Wizard de Criação do Zero
    const startNewProjectWizard = () => {
      wizardStep.value = 1;
      wizardName.value = '';
      wizardManager.value = '';
      wizardColor.value = '#0984e3';
      wizardStartDate.value = new Date().toISOString().split('T')[0];
      wizardIncludeHolidays.value = true;
      wizardTemplate.value = 'software';
      showNewProjectWizard.value = true;
    };

    const nextWizardStep = () => {
      if (wizardStep.value === 1) {
        if (!wizardName.value.trim()) {
          addToast("Informe o nome do projeto antes de prosseguir.", "warn");
          return;
        }
      } else if (wizardStep.value === 2) {
        if (!wizardStartDate.value) {
          addToast("Informe a data de início do projeto.", "warn");
          return;
        }
      }
      wizardStep.value++;
    };

    const confirmCreateProject = async () => {
      try {
        // Only ask for folder if not already set (e.g. from portfolio wizard)
        if (!directoryHandle.value) {
          if ('showDirectoryPicker' in window) {
            try {
              directoryHandle.value = await window.showDirectoryPicker({ mode: 'readwrite' });
              localStorage.setItem('hasFolder', 'true');
              await saveHandleToDB(directoryHandle.value);
              permissionStatus.value = 'granted';
            } catch (err) {
              if (err.name === 'AbortError') return;
              console.warn('FileSystem API failed in wizard, using localStorage fallback');
            }
          }
        }
        hasFolder.value = true;
        localStorage.setItem('hasFolder', 'true');

        // 1. Configurar feriados se solicitado (only for standalone, not when portfolio already has holidays)
        const existingPortfolio = await readFileFromDisk('portfolio.json');
        if (!existingPortfolio) {
          if (wizardIncludeHolidays.value) {
            const currYear = new Date(wizardStartDate.value).getFullYear();
            const defaultHols = {
              [`${currYear}-01-01`]: "Confraternização Universal (Ano Novo)",
              [`${currYear}-04-21`]: "Tiradentes",
              [`${currYear}-05-01`]: "Dia do Trabalho",
              [`${currYear}-09-07`]: "Independência do Brasil",
              [`${currYear}-10-12`]: "Nossa Senhora Aparecida",
              [`${currYear}-11-02`]: "Finados",
              [`${currYear}-11-15`]: "Proclamação da República",
              [`${currYear}-12-25`]: "Natal"
            };
            holidaysMap.value = defaultHols;
            localStorage.setItem('holidaysMap', await encodeCacheEncrypted(holidaysMap.value));
            await saveFileToDisk('feriados.json', JSON.stringify(defaultHols, null, 2));
          } else {
            holidaysMap.value = {};
            localStorage.setItem('holidaysMap', await encodeCacheEncrypted({}));
            await saveFileToDisk('feriados.json', JSON.stringify({}, null, 2));
          }
        } else {
          // Load existing holidays if portfolio already exists
          const hContent = await readFileFromDisk('feriados.json');
          if (hContent) {
            try { holidaysMap.value = JSON.parse(hContent); } catch {}
            localStorage.setItem('holidaysMap', await encodeCacheEncrypted(holidaysMap.value));
          }
        }

        // 2. Configurar tarefas baseadas no template
        let initTasks = [];
        if (wizardTemplate.value === 'blank') {
          initTasks = [
            { id: 1, task: "Planejamento Inicial", duration: 5, percent: 0, predecessor: "", type: "FS" }
          ];
        } else if (wizardTemplate.value === 'software') {
          initTasks = [
            { id: 1, task: "Levantamento de Requisitos", duration: 5, percent: 0, predecessor: "", type: "FS" },
            { id: 2, task: "Arquitetura e Design UI/UX", duration: 7, percent: 0, predecessor: "1", type: "FS" },
            { id: 3, task: "Desenvolvimento Backend", duration: 15, percent: 0, predecessor: "2", type: "FS" },
            { id: 4, task: "Desenvolvimento Frontend", duration: 15, percent: 0, predecessor: "2", type: "SS" },
            { id: 5, task: "Testes e Qualidade (QA)", duration: 6, percent: 0, predecessor: "3,4", type: "FS" },
            { id: 6, task: "Homologação e Implantação", duration: 3, percent: 0, predecessor: "5", type: "FS" }
          ];
        } else if (wizardTemplate.value === 'civil') {
          initTasks = [
            { id: 1, task: "Projetos e Licenciamento", duration: 10, percent: 0, predecessor: "", type: "FS" },
            { id: 2, task: "Terraplenagem e Fundações", duration: 15, percent: 0, predecessor: "1", type: "FS" },
            { id: 3, task: "Estrutura e Alvenaria", duration: 25, percent: 0, predecessor: "2", type: "FS" },
            { id: 4, task: "Instalações Elétricas e Hidráulicas", duration: 12, percent: 0, predecessor: "3", type: "FS" },
            { id: 5, task: "Acabamento e Pintura", duration: 15, percent: 0, predecessor: "4", type: "FS" },
            { id: 6, task: "Vistoria e Entrega", duration: 3, percent: 0, predecessor: "5", type: "FS" }
          ];
        }

        // Enriquecer e calcular
        const mappedInit = initTasks.map(t => ({
          ...t,
          plannedStart: '', plannedEnd: '', realStart: null, realEnd: null, baselineStart: '', baselineEnd: '', baselineDate: '',
          start: null, end: null, selectedForBaseline: true
        }));

        // Atualizar metadata
        const cleanName = sanitizeFilename(wizardName.value.trim() || 'Novo Projeto');
        projectMetadata.value = {
          name: wizardName.value.trim() || 'Novo Projeto',
          startDate: wizardStartDate.value,
          manager: wizardManager.value.trim() || '',
          tasksFile: cleanName,
          color: safeColor(wizardColor.value)
        };
        localStorage.setItem('activeProjectName', await encodeCacheEncrypted(projectMetadata.value.name));
        localStorage.setItem('projectMetadata', await encodeCacheEncrypted(projectMetadata.value));

        // Read existing portfolio.json, append project, save back
        let portfolioProjects = [];
        if (existingPortfolio) {
          try {
            const parsed = JSON.parse(existingPortfolio);
            if (Array.isArray(parsed)) portfolioProjects = parsed;
          } catch {}
        }
        const existingIdx = portfolioProjects.findIndex(p => p.tasksFile === cleanName);
        if (existingIdx !== -1) {
          portfolioProjects[existingIdx] = { ...projectMetadata.value };
        } else {
          portfolioProjects.push({ ...projectMetadata.value });
        }
        projectOptions.value = portfolioProjects;
        localStorage.setItem('projectOptions', await encodeCacheEncrypted(portfolioProjects));
        await saveFileToDisk('portfolio.json', JSON.stringify(portfolioProjects, null, 2));

        calculateSchedule(mappedInit, projectMetadata.value.startDate);
        tasks.value = mappedInit;
        localStorage.setItem('tasks', await encodeCacheEncrypted(mappedInit));
        buildTimeline();
        await saveTasksToDisk();

        showNewProjectWizard.value = false;
        addToast(`🚀 Projeto "${projectMetadata.value.name}" criado e inicializado com sucesso na pasta!`, 'success', 5000);
      } catch (err) {
        console.error(err);
        addToast("A criação do projeto foi cancelada ou ocorreu um erro de permissão.", "warn");
      }
    };

    // Portfolio Wizard Functions
    const startPortfolioWizard = () => {
      pfStep.value = 1;
      pfFolderHandle.value = null;
      pfFolderPath.value = '';
      pfName.value = '';
      pfDescription.value = '';
      pfColor.value = '#0984e3';
      pfManager.value = '';
      pfBaseDate.value = new Date().toISOString().split('T')[0];
      pfIncludeHolidays.value = true;
      pfHolidays.value = [];
      pfNewHolidayDate.value = '';
      pfNewHolidayDesc.value = '';
      showPortfolioWizard.value = true;
    };

    const selectPortfolioFolder = async () => {
      if (!('showDirectoryPicker' in window)) {
        addToast('Usando modo de fallback (armazenamento local). Lembre-se de exportar os arquivos.', 'info', 6000);
        pfFolderHandle.value = { name: 'Armazenamento Local', fallback: true };
        pfFolderPath.value = 'Armazenamento Local';
        addToast('📁 Pasta virtual selecionada com sucesso!', 'success');
        return;
      }
      try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        // Check if folder contains only allowed project files
        const entries = [];
        for await (const entry of handle.values()) {
          entries.push(entry.name);
        }
        const hasInvalid = entries.some(name => !isValidProjectFile(name));
        if (entries.length > 0) {
          if (hasInvalid) {
            const proceed = await showCustomConfirm(
              'A pasta contém arquivos com extensões não reconhecidas. Deseja continuar?',
              'Pasta não vazia',
              'warn'
            );
            if (!proceed) return;
          } else {
            const proceed = await showCustomConfirm(
              'Já existe um portfólio nesta pasta. Deseja sobrescrever?',
              'Portfólio existente',
              'warn'
            );
            if (!proceed) return;
          }
        }
        pfFolderHandle.value = handle;
        pfFolderPath.value = handle.name;
        addToast('📁 Pasta selecionada com sucesso!', 'success');
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Folder selection failed', err);
        addToast('Erro ao selecionar a pasta. Verifique as permissões.', 'error');
      }
    };

    const nextPortfolioStep = () => {
      if (pfStep.value === 1) {
        if (!pfFolderHandle.value) {
          addToast("Selecione uma pasta antes de prosseguir.", "warn");
          return;
        }
      } else if (pfStep.value === 2) {
        if (!pfName.value.trim() || pfName.value.trim().length < 3) {
          addToast("O nome do portfólio deve ter ao menos 3 caracteres.", "warn");
          return;
        }
      } else if (pfStep.value === 3) {
        if (!pfBaseDate.value) {
          addToast("Informe a data base do portfólio.", "warn");
          return;
        }
        if (pfNewHolidayDate.value && pfNewHolidayDesc.value.trim()) {
          addPortfolioHoliday();
        }
      }
      pfStep.value++;
    };

    const prevPortfolioStep = () => {
      if (pfStep.value > 1) pfStep.value--;
    };

    const addPortfolioHoliday = () => {
      const date = pfNewHolidayDate.value;
      const name = pfNewHolidayDesc.value.trim();
      if (!date || !name) {
        addToast("Preencha a data e a descrição do feriado.", "warn");
        return;
      }
      const baseYear = new Date(pfBaseDate.value).getFullYear();
      const holidayYear = new Date(date).getFullYear();
      if (holidayYear < baseYear) {
        addToast("Feriado com data anterior ao ano base do portfólio.", "warn");
        return;
      }
      pfHolidays.value.push({ date, name });
      pfNewHolidayDate.value = '';
      pfNewHolidayDesc.value = '';
      addToast('➕ Feriado adicional adicionado!', 'success');
    };

    const removePortfolioHoliday = (idx) => {
      pfHolidays.value.splice(idx, 1);
    };

    const confirmCreatePortfolio = async () => {
      try {
        // 1. Save handle to IndexedDB
        if (pfFolderHandle.value) {
          if (!pfFolderHandle.value.fallback) {
            await saveHandleToDB(pfFolderHandle.value);
            directoryHandle.value = pfFolderHandle.value;
          } else {
            directoryHandle.value = null;
          }
          localStorage.setItem('hasFolder', 'true');
          hasFolder.value = true;
          permissionStatus.value = 'granted';
        }

        // 2. Build holidays map
        const baseYear = new Date(pfBaseDate.value).getFullYear();
        const hols = {};
        if (pfIncludeHolidays.value) {
          hols[`${baseYear}-01-01`] = "Confraternização Universal (Ano Novo)";
          hols[`${baseYear}-04-21`] = "Tiradentes";
          hols[`${baseYear}-05-01`] = "Dia do Trabalho";
          hols[`${baseYear}-09-07`] = "Independência do Brasil";
          hols[`${baseYear}-10-12`] = "Nossa Senhora Aparecida";
          hols[`${baseYear}-11-02`] = "Finados";
          hols[`${baseYear}-11-15`] = "Proclamação da República";
          hols[`${baseYear}-12-25`] = "Natal";
        }
        pfHolidays.value.forEach(h => {
          hols[h.date] = h.name;
        });
        holidaysMap.value = hols;
        localStorage.setItem('holidaysMap', await encodeCacheEncrypted(hols));
        await saveFileToDisk('feriados.json', JSON.stringify(hols, null, 2));

        // 3. Save portfolio metadata to localStorage
        const portfolioMeta = {
          name: pfName.value.trim(),
          description: pfDescription.value.trim(),
          color: safeColor(pfColor.value),
          manager: pfManager.value.trim(),
          baseDate: pfBaseDate.value,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('portfolioMeta', await encodeCacheEncrypted(portfolioMeta));

        // 4. Create empty portfolio.json (backward-compatible array of projects)
        projectOptions.value = [];
        localStorage.setItem('projectOptions', await encodeCacheEncrypted([]));
        await saveFileToDisk('portfolio.json', JSON.stringify([], null, 2));

        // 5. Close portfolio wizard and open project wizard
        showPortfolioWizard.value = false;
        addToast(`✅ Portfólio "${pfName.value}" criado com sucesso! Agora crie o primeiro projeto.`, 'success', 4000);
        startNewProjectWizard();
      } catch (err) {
        console.error(err);
        addToast("Erro ao criar o portfólio. Verifique as permissões da pasta.", "error");
      }
    };

    const setZoom = (level) => {
      zoomLevel.value = level;
      buildTimeline();
    };

    const stats = computed(() => {
      if (!tasks.value.length) return { days: 0, progress: 0, endDate: '--', spi: null, avgDeviation: null, delayedCount: 0 };
      let pMin = tasks.value[0].start, pMax = tasks.value[0].end;
      let totalWork = 0, completedWork = 0;
      let totalDeviation = 0, deviationCount = 0, delayedCount = 0;

      tasks.value.forEach(t => {
        if (t.start < pMin) pMin = t.start;
        if (t.end > pMax) pMax = t.end;
        if (t.duration > 0) {
          totalWork += t.duration;
          completedWork += (t.duration * (t.percent / 100));
        }
        // Calculate deviation from baseline
        if (t.baselineEnd && t.end) {
          const bEnd = parseDate(t.baselineEnd);
          if (bEnd) {
            const diffMs = t.end.getTime() - bEnd.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            totalDeviation += diffDays;
            deviationCount++;
            if (diffDays > 0) delayedCount++;
          }
        }
      });
      const prct = totalWork > 0 ? Math.round((completedWork / totalWork) * 100) : 0;

      // SPI = Earned Value / Planned Value (simplified: completed work / expected work based on time elapsed)
      let spi = null;
      if (deviationCount > 0 && totalWork > 0) {
        const avgDev = totalDeviation / deviationCount;
        // SPI approximation: if avg deviation is 0, SPI=1.0; negative deviation = ahead, positive = behind
        spi = avgDev <= 0 ? 1.0 : Math.max(0.1, Math.round((1 / (1 + avgDev / totalWork * deviationCount)) * 100) / 100);
      }

      return {
        days: getBusinessDayIndex(pMax, pMin) + 1,
        progress: prct,
        endDate: pMax ? formatDatePT(pMax) : '--',
        spi: spi,
        avgDeviation: deviationCount > 0 ? Math.round(totalDeviation / deviationCount * 10) / 10 : null,
        delayedCount: delayedCount,
        forecastCount: tasks.value.filter(t => t.dateSource === 'forecast').length
      };
    });

    const donutBg = computed(() => {
      const p = stats.value.progress;
      let c = '#ff6b6b';
      if (p > 70) c = '#00cec9';
      else if (p > 30) c = '#fdcb6e';
      const deg = (p / 100) * 360;
      return `conic-gradient(${c} ${deg}deg, var(--surface3) ${deg}deg)`;
    });

    // Per-task delay detection
    const getTaskDelay = (t) => {
      if (!t.baselineEnd || !t.end) return 0;
      const bEnd = parseDate(t.baselineEnd);
      if (!bEnd) return 0;
      return Math.round((t.end.getTime() - bEnd.getTime()) / (1000 * 60 * 60 * 24));
    };

    // Column view switcher
    const setColumnView = (view) => {
      columnView.value = view;
      localStorage.setItem('columnView', view);
      // Adjust minimum widths
      if (taskListWidth.value < minTaskListWidth.value) {
        taskListWidth.value = minTaskListWidth.value;
        localStorage.setItem('taskListWidth', taskListWidth.value);
      }
    };

    const getBarLeft = (t) => getPos(t.start) + 2;
    const getMilestoneLeft = (t) => {
      const x = getPos(t.start);
      return x + (zoomLevel.value === 'day' ? colWidth.value / 2 : 10) - 7;
    };
    const getBarWidthPx = (t) => {
      if (t.duration === 0) return 0;
      const s = getPos(t.start);
      const e = getPos(t.end) + (zoomLevel.value === 'day' ? colWidth.value : colWidth.value / 7);
      return Math.max(18, e - s - 4);
    };
    const getBarColor = (t, i) => {
      return BAR_COLORS[i % BAR_COLORS.length];
    };

    // Real / Actual progress bar rendering
    const getRealBarLeft = (t) => {
      if (!t.realStart) return 0;
      const d = parseDate(t.realStart);
      return getPos(d) + 2;
    };

    const getRealBarWidthPx = (t) => {
      if (!t.realStart) return 0;
      const start = parseDate(t.realStart);
      let end;
      if (t.realEnd) {
        end = parseDate(t.realEnd);
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (today > start) {
          end = today;
        } else {
          end = start;
        }
      }
      const s = getPos(start);
      const e = getPos(end) + (zoomLevel.value === 'day' ? colWidth.value : colWidth.value / 7);
      return Math.max(18, e - s - 4);
    };

    // Baseline bar rendering
    const getBaselineBarLeft = (t) => {
      if (!t.baselineStart) return 0;
      const d = parseDate(t.baselineStart);
      return d ? getPos(d) + 2 : 0;
    };

    const getBaselineBarWidthPx = (t) => {
      if (!t.baselineStart || !t.baselineEnd) return 0;
      const start = parseDate(t.baselineStart);
      const end = parseDate(t.baselineEnd);
      if (!start || !end) return 0;
      const s = getPos(start);
      const e = getPos(end) + (zoomLevel.value === 'day' ? colWidth.value : colWidth.value / 7);
      return Math.max(10, e - s - 4);
    };

    // Toggle helpers
    const toggleBaselineBars = () => {
      showBaselineBars.value = !showBaselineBars.value;
      localStorage.setItem('showBaselineBars', showBaselineBars.value);
    };
    const toggleRealBars = () => {
      showRealBars.value = !showRealBars.value;
      localStorage.setItem('showRealBars', showRealBars.value);
    };

    // Check if any task has baseline data
    const hasAnyBaseline = computed(() => tasks.value.some(t => t.baselineStart || t.baselineEnd));

    const arrowPaths = computed(() => {
      if (!tasks.value.length) return [];
      const paths = [];
      tasks.value.forEach((t, i) => {
        if (!t.predecessor) return;
        const predStrs = String(t.predecessor).match(/\d+/g) || [];
        predStrs.forEach(pStr => {
          const predIdx = tasks.value.findIndex(x => x.id === parseInt(pStr));
          if (predIdx < 0) return;
          const pred = tasks.value[predIdx];
          const pEnd = t.type === 'SS' ? getPos(pred.start) + 5 : getPos(pred.end) + (zoomLevel.value === 'day' ? colWidth.value : 5);
          const tStart = getPos(t.start);
          const y1 = predIdx * ROW_H + ROW_H / 2;
          const y2 = i * ROW_H + ROW_H / 2;
          paths.push(`M${pEnd},${y1} C${pEnd + 15},${y1} ${tStart - 15},${y2} ${tStart},${y2}`);
        });
      });
      return paths;
    });

    const todayX = computed(() => {
      if (!allDays.value.length) return -1;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const x = getPos(today);
      if (x >= 0 && x <= (allDays.value.length * colWidth.value)) return x;
      return -1;
    });

    // horizontal layout resize listener
    let isResizing = false;
    const startResize = () => {
      isResizing = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const handleResizeMouseMove = (e) => {
      if (!isResizing) return;
      const tlElement = document.getElementById('taskList');
      if (tlElement) {
        const offset = tlElement.getBoundingClientRect().left;
        const newW = e.clientX - offset;
        if (newW > 150 && newW < 800) taskListWidth.value = newW;
      }
    };

    const handleResizeMouseUp = () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    onMounted(() => {
      window.addEventListener('mousemove', handleResizeMouseMove);
      window.addEventListener('mouseup', handleResizeMouseUp);
    });

    onUnmounted(() => {
      window.removeEventListener('mousemove', handleResizeMouseMove);
      window.removeEventListener('mouseup', handleResizeMouseUp);
    });

    const syncScroll = (e) => {
      const tl = document.getElementById('taskList');
      if (tl) tl.scrollTop = e.target.scrollTop;
    };

    const toggleTheme = () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    };

    // Export/download project files (useful in localStorage fallback mode)
    const exportProjectFiles = async () => {
      const files = ['portfolio.json', 'feriados.json', projectMetadata.value.tasksFile];
      let exported = 0;
      for (const name of files) {
        const content = await readFileFromDisk(name);
        if (content !== null) {
          const blob = new Blob(['\ufeff' + content], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = name;
          document.body.appendChild(a); a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          exported++;
        }
      }
      if (exported > 0) addToast(`📥 ${exported} arquivo(s) do projeto exportado(s)!`, 'success');
      else addToast('Nenhum arquivo de projeto encontrado para exportar.', 'warn');
    };

    const exportPNG = () => {
      const chart = document.getElementById('ganttWrapper');
      if (!chart) return;
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      html2canvas(chart, { backgroundColor: bgColor, scale: 2, logging: false }).then(canvas => {
        const link = document.createElement('a');
        const name = projectMetadata.value.name.replace(/\s+/g, '_');
        link.download = `Gantt_${name}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        addToast('Imagem HD (PNG) exportada com sucesso!', 'success');
      });
    };

    const exportPDF = () => {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        addToast('Biblioteca jsPDF não encontrada no sistema.', 'error');
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Cores do tema
      const primaryColor = [52, 31, 151]; // #341f97
      const textColor = [45, 55, 72];
      const grayColor = [113, 128, 150];

      // Faixa de cabeçalho
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 36, 'F');

      // Título
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(projectMetadata.value.name || 'Projeto Gantt', 14, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Relatório Executivo Gerencial • Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

      // Metadados do Projeto (Caixa cinza suave)
      doc.setFillColor(247, 250, 252);
      doc.rect(14, 42, 182, 32, 'F');

      doc.setTextColor(...textColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("Resumo Executivo do Projeto", 20, 50);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Gerente de Projeto: ${projectMetadata.value.manager || 'Não informado'}`, 20, 58);
      doc.text(`Data Base de Início: ${formatDatePT(projectMetadata.value.startDate)}`, 110, 58);

      // Indicadores
      doc.text(`Progresso Geral: ${stats.value.progress}% concluído`, 20, 66);
      doc.text(`Previsão de Término: ${stats.value.endDate}`, 110, 66);

      // KPIs (SPI e Atrasos)
      const spiText = stats.value.spi !== null ? String(stats.value.spi) : '1.0';
      const devText = stats.value.avgDeviation !== null ? `${stats.value.avgDeviation} dias` : '0 dias';
      doc.text(`SPI (Índice de Prazo): ${spiText}`, 20, 74);
      doc.text(`Desvio Médio: ${devText} | Atrasadas: ${stats.value.delayedCount}`, 110, 74);

      // Tabela de Tarefas
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.text("Detalhamento de Atividades e Acompanhamento", 14, 86);

      // Cabeçalho da Tabela
      doc.setFillColor(226, 232, 240);
      doc.rect(14, 90, 182, 10, 'F');
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
      doc.text("ID", 18, 97);
      doc.text("Atividade", 32, 97);
      doc.text("Progresso", 125, 97);
      doc.text("Fim Previsto", 155, 97);
      doc.text("Status", 185, 97);

      // Linhas da Tabela
      doc.setFont('helvetica', 'normal');
      let startY = 106;
      tasks.value.forEach((t, index) => {
        if (startY > 270) {
          doc.addPage();
          startY = 20;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setFillColor(226, 232, 240);
          doc.rect(14, startY, 182, 10, 'F');
          doc.text("ID", 18, startY + 7);
          doc.text("Atividade", 32, startY + 7);
          doc.text("Progresso", 125, startY + 7);
          doc.text("Fim Previsto", 155, startY + 7);
          doc.text("Status", 185, startY + 7);
          doc.setFont('helvetica', 'normal');
          startY += 16;
        }

        // Zebra striping
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, startY - 5, 182, 9, 'F');
        }

        doc.text(String(t.id), 18, startY);
        const shortName = t.task.length > 40 ? t.task.substring(0, 38) + '...' : t.task;
        doc.text(shortName, 32, startY);
        doc.text(`${t.percent}%`, 125, startY);
        doc.text(t.end ? formatDatePT(t.end) : '--', 155, startY);

        const delay = getTaskDelay(t);
        let statusStr = "Normal";
        if (t.percent === 100) statusStr = "Concluído";
        else if (delay > 0) statusStr = `+${delay} dias`;
        else if (t.dateSource === 'forecast') statusStr = "Forecast";

        if (statusStr === "Concluído") doc.setTextColor(40, 167, 69);
        else if (delay > 0) doc.setTextColor(220, 53, 69);
        else if (statusStr === "Forecast") doc.setTextColor(253, 126, 20);
        else doc.setTextColor(...grayColor);

        doc.text(statusStr, 185, startY);
        doc.setTextColor(...textColor); // reset

        startY += 9;
      });

      // Rodapé
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...grayColor);
        doc.text(`Ordo Domus / ProjectGantt • Página ${i} de ${pageCount}`, 14, 287);
      }

      const cleanName = projectMetadata.value.name.replace(/\s+/g, '_');
      doc.save(`Relatorio_Executivo_${cleanName}.pdf`);
      addToast('Relatório Executivo PDF exportado com sucesso!', 'success');
    };

    const exportCSVReport = () => {
      if (!tasks.value.length) {
        addToast('Não há tarefas para exportar.', 'warn');
        return;
      }
      
      const headers = ['ID', 'Atividade', 'Progresso (%)', 'Início Previsto', 'Fim Previsto', 'Duração (Dias)', 'Atraso (Dias)', 'Status Previsão', 'Responsável'];
      const rows = tasks.value.map(t => {
        const delay = getTaskDelay(t);
        let statusStr = 'Normal';
        if (t.percent === 100) statusStr = 'Concluído';
        else if (delay > 0) statusStr = `Atrasado em ${delay} dias`;
        else if (t.dateSource === 'forecast') statusStr = 'Forecast (Re-calculado)';

        return [
          t.id,
          `"${sanitizeCSV(t.task || '').replace(/"/g, '""')}"`,
          t.percent,
          t.start ? formatDatePT(t.start) : '',
          t.end ? formatDatePT(t.end) : '',
          t.duration,
          delay,
          statusStr,
          `"${sanitizeCSV(t.owner || '').replace(/"/g, '""')}"`
        ].join(',');
      });

      const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n'); // BOM para acentos no Excel
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const cleanName = projectMetadata.value.name.replace(/\s+/g, '_');
      link.setAttribute('href', url);
      link.setAttribute('download', `Daily_Status_Report_${cleanName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Daily Status Report (CSV) exportado para Excel com sucesso!', 'success');
    };

    // Detailed Premium Tooltips — supports 'planned', 'real', 'baseline'
    const showTooltip = (e, t, barType) => {
      tooltip.value.show = true;
      tooltip.value.barType = barType || 'planned';
      tooltip.value.isReal = barType === 'real';
      tooltip.value.taskName = t.task;
      tooltip.value.duration = t.duration;
      tooltip.value.percent = t.percent;

      if (barType === 'real') {
        tooltip.value.start = t.realStart ? formatDatePT(t.realStart) : '--';
        tooltip.value.end = t.realEnd ? formatDatePT(t.realEnd) : '--';
      } else if (barType === 'baseline') {
        tooltip.value.start = t.baselineStart ? formatDatePT(t.baselineStart) : '--';
        tooltip.value.end = t.baselineEnd ? formatDatePT(t.baselineEnd) : '--';
      } else {
        tooltip.value.start = t.start ? formatDatePT(t.start) : '--';
        tooltip.value.end = t.end ? formatDatePT(t.end) : '--';
      }
      // Always set baseline info for context
      tooltip.value.baselineStart = t.baselineStart ? formatDatePT(t.baselineStart) : '';
      tooltip.value.baselineEnd = t.baselineEnd ? formatDatePT(t.baselineEnd) : '';
      tooltip.value.baselineDate = t.baselineDate ? formatDatePT(t.baselineDate) : '';
      tooltip.value.predecessor = t.predecessor;
      tooltip.value.type = t.type || 'FS';

      tooltip.value.x = e.clientX + 15;
      tooltip.value.y = e.clientY + 15;

      nextTick(() => {
        const el = document.getElementById('tooltip');
        if (el) {
          const rect = el.getBoundingClientRect();
          if (tooltip.value.x + rect.width > window.innerWidth) {
            tooltip.value.x = e.clientX - rect.width - 15;
          }
          if (tooltip.value.y + rect.height > window.innerHeight) {
            tooltip.value.y = e.clientY - rect.height - 15;
          }
        }
      });
    };

    const hideTooltip = () => {
      tooltip.value.show = false;
    };

    // Task Editing Modal Operations
    const clearFieldErrors = () => { fieldErrors.value = {}; };

    const openEditModal = (task) => {
      clearFieldErrors();
      // Create a clean deep copy
      editingTask.value = JSON.parse(JSON.stringify(task));
      editingTask.value.plannedStart = toInputDateFormat(editingTask.value.plannedStart);
      editingTask.value.plannedEnd = toInputDateFormat(editingTask.value.plannedEnd);
      editingTask.value.realStart = toInputDateFormat(editingTask.value.realStart);
      editingTask.value.realEnd = toInputDateFormat(editingTask.value.realEnd);
      hasPlannedDates.value = !!(editingTask.value.plannedStart && editingTask.value.plannedEnd);
      showEditModal.value = true;
    };

    const closeEditModal = () => {
      clearFieldErrors();
      editingTask.value = null;
      showEditModal.value = false;
    };

    // Auto-update realStart and realEnd during editing modal progress changes
    const onProgressChange = () => {
      if (!editingTask.value) return;
      const pct = editingTask.value.percent;
      if (pct > 0) {
        if (!editingTask.value.realStart) {
          const todayStr = new Date().toISOString().split('T')[0];
          editingTask.value.realStart = todayStr;
        }
      } else {
        editingTask.value.realStart = null;
        editingTask.value.realEnd = null;
      }

      if (pct === 100) {
        if (!editingTask.value.realEnd) {
          const todayStr = new Date().toISOString().split('T')[0];
          editingTask.value.realEnd = todayStr;
        }
      } else {
        editingTask.value.realEnd = null;
      }
    };

    const deleteTask = async () => {
      if (!editingTask.value || saving.value) return;
      saving.value = true;
      try {
        if (await showCustomConfirm(`Deseja realmente excluir a tarefa #${editingTask.value.id}?`, 'Excluir Tarefa', 'error')) {
          tasks.value = tasks.value.filter(t => t.id !== editingTask.value.id);
          calculateSchedule(tasks.value, projectMetadata.value.startDate);
          buildTimeline();
          await saveTasksToDisk();
          closeEditModal();
        }
      } finally {
        saving.value = false;
      }
    };

    const saveTaskChanges = async () => {
      if (!editingTask.value || saving.value) return;
      saving.value = true;
      try {
        const errors = {};
        const taskName = (editingTask.value.task || '').trim().substring(0, 200);
        if (!taskName) errors.task = 'O nome da tarefa é obrigatório.';
        const duration = parseInt(editingTask.value.duration) || 0;
        if (duration < 0) errors.duration = 'Duração não pode ser negativa.';
        const percent = parseInt(editingTask.value.percent) || 0;
        if (percent < 0 || percent > 100) errors.percent = 'Progresso deve estar entre 0 e 100.';
        const predecessor = (editingTask.value.predecessor || '').replace(/[^\d,\s]/g, '');
        if (hasPlannedDates.value) {
          if (!editingTask.value.plannedStart) errors.plannedStart = 'Informe a data de início planejado.';
          if (!editingTask.value.plannedEnd) errors.plannedEnd = 'Informe a data de fim planejado.';
        }
        fieldErrors.value = errors;
        if (Object.keys(errors).length > 0) { saving.value = false; return; }

        const t = tasks.value.find(x => x.id === editingTask.value.id);
        if (t) {
          t.task = taskName;
          t.duration = Math.max(0, Math.min(9999, duration));
          t.predecessor = predecessor;
          t.type = (editingTask.value.type === 'SS' ? 'SS' : 'FS');
          t.percent = Math.max(0, Math.min(100, percent));

          if (hasPlannedDates.value) {
            t.plannedStart = editingTask.value.plannedStart;
            t.plannedEnd = editingTask.value.plannedEnd;
          } else {
            t.plannedStart = '';
            t.plannedEnd = '';
          }

          t.realStart = editingTask.value.realStart;
          t.realEnd = editingTask.value.realEnd;

          calculateSchedule(tasks.value, projectMetadata.value.startDate);
          buildTimeline();
          await saveTasksToDisk();
        }
        closeEditModal();
      } finally {
        saving.value = false;
      }
    };

    const addNewTask = () => {
      const nextId = tasks.value.length > 0 ? Math.max(...tasks.value.map(t => t.id)) + 1 : 1;
      const newTask = {
        id: nextId,
        task: `Nova Tarefa #${nextId}`,
        duration: 1,
        percent: 0,
        predecessor: '',
        type: 'FS',
        plannedStart: '',
        plannedEnd: '',
        realStart: null,
        realEnd: null,
        baselineStart: '',
        baselineEnd: '',
        baselineDate: '',
        start: null,
        end: null,
        selectedForBaseline: true
      };
      tasks.value.push(newTask);
      calculateSchedule(tasks.value, projectMetadata.value.startDate);
      buildTimeline();
      openEditModal(newTask);
    };

    // Watch for planned dates check to pre-fill start/end from scheduler
    watch(hasPlannedDates, (newVal) => {
      if (newVal && editingTask.value) {
        if (!editingTask.value.plannedStart) {
          editingTask.value.plannedStart = editingTask.value.start ? getLocalISOString(editingTask.value.start) : '';
        }
        if (!editingTask.value.plannedEnd) {
          editingTask.value.plannedEnd = editingTask.value.end ? getLocalISOString(editingTask.value.end) : '';
        }
      }
    });

    // Startup Cache Loader
    onMounted(async () => {
      checkCacheVersion();
      // Always load cache first for immediate rendering (UX premium!)
      const cachedHasFolder = localStorage.getItem('hasFolder') === 'true';
      if (cachedHasFolder) {
        hasFolder.value = true;
        try {
          const cachedMeta = await decodeCacheEncrypted(localStorage.getItem('projectMetadata'));
          if (cachedMeta) projectMetadata.value = cachedMeta;

          const cachedPortMeta = await decodeCacheEncrypted(localStorage.getItem('portfolioMeta'));
          if (cachedPortMeta) portfolioMeta.value = cachedPortMeta;

          const cachedOpts = await decodeCacheEncrypted(localStorage.getItem('projectOptions'));
          if (cachedOpts) projectOptions.value = cachedOpts;

          const cachedHols = await decodeCacheEncrypted(localStorage.getItem('holidaysMap'));
          if (cachedHols) holidaysMap.value = cachedHols;

          const cachedTasks = await decodeCacheEncrypted(localStorage.getItem('tasks'));
          if (cachedTasks && Array.isArray(cachedTasks)) {
            const rawCachedTasks = cachedTasks;
            tasks.value = rawCachedTasks.map(t => ({
              ...t,
              start: t.start ? new Date(t.start) : null,
              end: t.end ? new Date(t.end) : null,
              selectedForBaseline: t.percent < 100
            }));
            calculateSchedule(tasks.value, projectMetadata.value.startDate);
            buildTimeline();
          }
        } catch (err) {
          console.warn("Error parsing cache", err);
        }
      }

      // Check IndexedDB handle for reconnecting
      try {
        const handle = await loadHandleFromDB();
        if (handle) {
          directoryHandle.value = handle;
          const status = await handle.queryPermission({ mode: 'readwrite' });
          permissionStatus.value = status;
          if (status === 'granted') {
            hasFolder.value = true;
            await loadProject();
          }
        } else {
          permissionStatus.value = 'prompt';
        }
      } catch (err) {
        console.warn('IndexedDB reconnection failed:', err);
        permissionStatus.value = 'prompt';
      }

      // Keyboard Shortcuts
      const handleGlobalKeydown = (e) => {
        const isInputFocused = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

        if (e.key === 'Escape' && anyModalOpen.value) {
          if (showEditModal.value) closeEditModal();
          else if (showExportModal.value) showExportModal.value = false;
          else if (showHolidaysModal.value) showHolidaysModal.value = false;
          else if (showProjectSelector.value) showProjectSelector.value = false;
          else if (showProjectSettingsModal.value) showProjectSettingsModal.value = false;
          else if (showNewProjectWizard.value) showNewProjectWizard.value = false;
          else if (showPortfolioWizard.value) showPortfolioWizard.value = false;
          return;
        }

        if (e.key === 'Tab' && anyModalOpen.value) {
          const overlays = document.querySelectorAll('.modal-overlay');
          let modal = null;
          for (const el of overlays) {
            if (el.style.display === 'flex') { modal = el; break; }
          }
          if (modal) {
            const focusable = modal.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) {
              e.preventDefault();
              return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
              if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
              }
            } else {
              if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }
          }
          return;
        }

        if (e.key === 'Enter' && showEditModal.value && !e.shiftKey) {
          if (!isInputFocused || document.activeElement?.type === 'number') {
            saveTaskChanges();
          }
          return;
        }

        if (e.key === 'Delete' && showEditModal.value) {
          deleteTask();
          return;
        }

        if (isInputFocused) return;

        if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
          if (hasFolder.value) addNewTask();
          return;
        }
        if (e.key === 'b' && !e.ctrlKey && !e.metaKey) {
          if (hasFolder.value) saveBaseline();
          return;
        }
        if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
          if (hasFolder.value) showExportModal.value = true;
          return;
        }
        if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const fl = document.querySelector('input[placeholder*="Filtrar"]');
          if (fl) fl.focus();
          return;
        }
      };

      // Warn before page unload if project is open
      const handleBeforeUnload = (e) => {
        if (hasFolder.value && tasks.value.length > 0) {
          e.preventDefault();
          e.returnValue = '';
        }
      };

      // Close ⚙️ dropdown and portfolio overlay on outside click
      const handleDocumentClick = (e) => {
        const wrap = document.querySelector('.more-wrap');
        if (showMoreMenu.value && wrap && !wrap.contains(e.target)) {
          showMoreMenu.value = false;
        }
        const pt = document.querySelector('.portfolio-trigger');
        const po = document.querySelector('.portfolio-overlay');
        if (showPortfolioInfo.value && pt && po && !pt.contains(e.target) && !po.contains(e.target)) {
          showPortfolioInfo.value = false;
        }
      };

      window.addEventListener('keydown', handleGlobalKeydown);
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('click', handleDocumentClick);

      onUnmounted(() => {
        window.removeEventListener('keydown', handleGlobalKeydown);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('click', handleDocumentClick);
      });
    });

    return {
      hasFolder, directoryHandle, permissionStatus, zoomLevel, taskListWidth, hoverTaskId,
      projectMetadata, tasks, holidaysMap,
      chartColumns, chartMonths, colWidth, arrowPaths, todayX,
      stats, donutBg, recalculateStatus, saving,
      showBaselineBars, showRealBars, hasAnyBaseline,
      columnView, gridTemplate, minTaskListWidth, selectAllBaseline,
      safeColor,
      
      // Custom Dialogs and Toasts
      toasts, customDialog, addToast, removeToast, showCustomAlert, showCustomConfirm,

      // Modals Control
      showProjectSelector, showProjectSettingsModal, showHolidaysModal, showEditModal, showExportModal, showNewProjectWizard, showMoreMenu,
      portfolioMeta, showPortfolioInfo, showPortfolioEditModal, tempPortfolioMeta,
      openPortfolioSettings, savePortfolioSettings,
      wizardStep, wizardName, wizardManager, wizardColor, wizardStartDate, wizardIncludeHolidays, wizardTemplate,

      // Portfolio Wizard
      showPortfolioWizard, pfStep, pfFolderHandle, pfFolderPath, pfName, pfDescription, pfColor, pfManager,
      pfBaseDate, pfIncludeHolidays, pfHolidays, pfNewHolidayDate, pfNewHolidayDesc,
      editingTask, fieldErrors, clearFieldErrors, hasPlannedDates, projectOptions, tempProjectMetadata,
      newHolidayDate, newHolidayName, sortedHolidays, tooltip, filterText, filteredTasks,

      // Operations
      startNewProjectWizard, nextWizardStep, confirmCreateProject,
      startPortfolioWizard, selectPortfolioFolder, nextPortfolioStep, prevPortfolioStep,
      addPortfolioHoliday, removePortfolioHoliday, confirmCreatePortfolio,
      closeProjectFolder, openProjectFolder, reconnectFolder, setZoom, selectProject, openProjectSettings, saveProjectSettings,
      addHoliday, removeHoliday, addNewTask, openEditModal, closeEditModal,
      saveTaskChanges, deleteTask, onProgressChange, getRealBarLeft, getRealBarWidthPx,
      getBarLeft, getMilestoneLeft, getBarWidthPx, getBarColor,
      getBaselineBarLeft, getBaselineBarWidthPx, getTaskDelay, setColumnView,
      saveBaseline, toggleBaselineBars, toggleRealBars, runForecast,
      startResize, syncScroll, toggleTheme, exportPNG, exportPDF, exportCSVReport, showTooltip, hideTooltip, formatDatePT, getDayOfWeekPT,
      exportProjectFiles, promptFileImport, importFilesFromDisk
    };
  }
};

createApp(App).mount('#app');
