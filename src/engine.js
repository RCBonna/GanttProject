/**
 * ProjectGantt Core Engine
 * Pure utility functions for scheduling, date handling, and CSV operations.
 * Extracted from vue_app.js for testability and reusability.
 */

// ─── Date Utilities ───────────────────────────────────────────────────────

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
  let dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj)) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isWeekend(d) {
  const w = d.getDay();
  return w === 0 || w === 6;
}

// ─── CSV Utilities ────────────────────────────────────────────────────────

export function sanitizeCSV(val) {
  if (typeof val !== 'string') return val;
  if (/^[=+\-@|\t]/.test(val)) return "'" + val;
  if (/\r|\n/.test(val)) return val.replace(/\r?\n/g, ' ').replace(/\r/g, ' ');
  return val;
}

export function escapeCSV(val) {
  const str = String(val ?? '');
  if (/^[=+\-@|\t]/.test(str)) return `"'${str.replace(/"/g, '""')}"`;
  return `"${str.replace(/"/g, '""')}"`;
}

// ─── Working Day Logic ────────────────────────────────────────────────────

export function createWorkingDayChecker(holidaysSet) {
  return function isWorkingDay(date) {
    const w = date.getDay();
    if (w === 0 || w === 6) return false;
    const iso = getLocalISOString(date);
    return !holidaysSet[iso];
  };
}

export function createAddWorkingDays(holidaysSet) {
  const isWorkingDay = createWorkingDayChecker(holidaysSet);
  return function addWorkingDays(start, n) {
    let d = new Date(start);
    let count = 0;
    if (n <= 0) return d;
    while (count < n) {
      d.setDate(d.getDate() + 1);
      if (isWorkingDay(d)) count++;
    }
    return d;
  };
}

export function createBusinessDayIndexer(holidaysSet) {
  const isWorkingDay = createWorkingDayChecker(holidaysSet);
  return function getBusinessDayIndex(day, origin) {
    let idx = 0, d = new Date(origin);
    while (d < day) {
      d.setDate(d.getDate() + 1);
      if (isWorkingDay(d)) idx++;
    }
    return idx;
  };
}

// ─── Color Validation ─────────────────────────────────────────────────────

const VALID_HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const SAFE_FALLBACK_COLOR = '#6c5ce7';

export function isValidColor(val) {
  return typeof val === 'string' && VALID_HEX_COLOR.test(val);
}

export function safeColor(val, fallback = SAFE_FALLBACK_COLOR) {
  return isValidColor(val) ? val : fallback;
}

// ─── Scheduling Engine ────────────────────────────────────────────────────

export function calculateSchedule(taskList, startDateStr, holidaysSet = {}) {
  const map = {};
  const projStart = parseDate(startDateStr) || new Date();
  const isWorkingDay = createWorkingDayChecker(holidaysSet);
  const addWorkingDays = createAddWorkingDays(holidaysSet);

  taskList.forEach(t => {
    t.start = null;
    t.end = null;
    t.dateSource = 'calculated';
    map[t.id] = t;
  });

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
          const refStart = predRealStart || new Date(pred.start);
          if (predRealStart) usedForecast = true;
          if (refStart > maxStart) maxStart = refStart;
        } else {
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
}
