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
  const d = new Date(s + 'T00:00:00');
  return isNaN(d) ? null : d;
}

export function isWorkingDay(date, holidaysMap = {}) {
  const w = date.getDay();
  if (w === 0 || w === 6) return false;
  const iso = date.toISOString().split('T')[0];
  return !holidaysMap[iso];
}

export function addWorkingDays(start, n, holidaysMap = {}) {
  let d = new Date(start);
  let count = 0;
  if (n <= 0) return d;
  while (count < n) {
    d.setDate(d.getDate() + 1);
    if (isWorkingDay(d, holidaysMap)) count++;
  }
  return d;
}

export function getBusinessDayIndex(day, origin, holidaysMap = {}) {
  let idx = 0, d = new Date(origin);
  while (d < day) {
    d.setDate(d.getDate() + 1);
    if (isWorkingDay(d, holidaysMap)) idx++;
  }
  return idx;
}

export function calculateSchedule(taskList, startDateStr, holidaysMap = {}) {
  const map = {};
  const projStart = parseDate(startDateStr) || new Date();
  taskList.forEach(t => { t.start = null; t.end = null; map[t.id] = t; });
  const stack = new Set();

  const resolve = (t) => {
    if (!t || t.start) return;
    if (stack.has(t.id)) { t.start = new Date(projStart); }
    else {
      stack.add(t.id);
      if (!t.predecessor) { t.start = new Date(projStart); }
      else {
        const predStrs = String(t.predecessor).match(/\d+/g) || [];
        let maxStart = new Date(projStart);
        let hasValidPred = false;
        predStrs.forEach(pStr => {
          const predId = parseInt(pStr);
          if (map[predId]) {
            const pred = map[predId];
            resolve(pred);
            const candidateStart = t.type === 'SS' ? new Date(pred.start) : addWorkingDays(pred.start, pred.duration, holidaysMap);
            if (candidateStart > maxStart) maxStart = candidateStart;
            hasValidPred = true;
          }
        });
        t.start = hasValidPred ? maxStart : new Date(projStart);
      }
      stack.delete(t.id);
    }
    while (!isWorkingDay(t.start, holidaysMap)) t.start = addDays(t.start, 1);
    t.end = t.duration <= 0 ? new Date(t.start) : addWorkingDays(t.start, t.duration - 1, holidaysMap);
  };
  taskList.forEach(resolve);
}
