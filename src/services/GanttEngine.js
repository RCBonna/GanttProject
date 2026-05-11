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
  if (!s || typeof s !== 'string') return null;
  let str = s.trim();
  
  // Check for DD/MM/YYYY or DD-MM-YYYY
  const dmYMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmYMatch) {
    str = `${dmYMatch[3]}-${dmYMatch[2].padStart(2, '0')}-${dmYMatch[1].padStart(2, '0')}`;
  } else if (str.includes('/')) {
    str = str.replace(/\//g, '-');
  }
  
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
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
  
  // Initialize and build map
  taskList.forEach(t => { 
    t.start = null; 
    t.end = null;
    t._baselineResolved = false;
    map[t.id] = t; 
  });

  // PASS 1: Calculate Baseline (Planned)
  let stack = new Set();
  const resolveBaseline = (t) => {
    if (!t || t._baselineResolved) return;
    
    // If it has absolute planned dates from CSV, parse them and mark resolved
    const pStart = parseDate(t.plannedStart);
    const pEnd = parseDate(t.plannedEnd);
    if (pStart && pEnd) {
      t.plannedStartDate = pStart;
      t.plannedEndDate = pEnd;
      t._baselineResolved = true;
      return;
    }

    if (stack.has(t.id)) { t.plannedStartDate = new Date(projStart); }
    else {
      stack.add(t.id);
      if (!t.predecessor) { t.plannedStartDate = new Date(projStart); }
      else {
        const predStrs = String(t.predecessor).match(/\d+/g) || [];
        let maxStart = new Date(projStart);
        let hasValidPred = false;
        predStrs.forEach(pStr => {
          const predId = parseInt(pStr);
          if (map[predId]) {
            const pred = map[predId];
            resolveBaseline(pred);
            const candidateStart = t.type === 'SS' ? new Date(pred.plannedStartDate) : addWorkingDays(pred.plannedStartDate, pred.duration, holidaysMap);
            if (candidateStart > maxStart) maxStart = candidateStart;
            hasValidPred = true;
          }
        });
        t.plannedStartDate = hasValidPred ? maxStart : new Date(projStart);
      }
      stack.delete(t.id);
    }
    while (!isWorkingDay(t.plannedStartDate, holidaysMap)) t.plannedStartDate = addDays(t.plannedStartDate, 1);
    
    t.plannedEndDate = t.duration <= 0 ? new Date(t.plannedStartDate) : addWorkingDays(t.plannedStartDate, t.duration - 1, holidaysMap);
    
    // Save string format if they were calculated
    if (!t.plannedStart) t.plannedStart = t.plannedStartDate.toISOString().split('T')[0];
    if (!t.plannedEnd) t.plannedEnd = t.plannedEndDate.toISOString().split('T')[0];
    
    t._baselineResolved = true;
  };
  taskList.forEach(resolveBaseline);

  // PASS 2: Calculate Forecast/Real Schedule
  stack.clear();
  const resolveForecast = (t) => {
    if (!t || t.start) return;
    
    if (stack.has(t.id)) { t.start = new Date(projStart); }
    else {
      stack.add(t.id);
      
      // Fixed Start: If actual start exists, it overrides forecast logic
      const aStart = parseDate(t.actualStart);
      if (aStart) {
        t.start = aStart;
      } else {
        if (!t.predecessor) { t.start = new Date(projStart); }
        else {
          const predStrs = String(t.predecessor).match(/\d+/g) || [];
          let maxStart = new Date(projStart);
          let hasValidPred = false;
          predStrs.forEach(pStr => {
            const predId = parseInt(pStr);
            if (map[predId]) {
              const pred = map[predId];
              resolveForecast(pred);
              const candidateStart = t.type === 'SS' ? new Date(pred.start) : addWorkingDays(pred.start, pred.duration, holidaysMap);
              if (candidateStart > maxStart) maxStart = candidateStart;
              hasValidPred = true;
            }
          });
          t.start = hasValidPred ? maxStart : new Date(projStart);
        }
      }
      stack.delete(t.id);
    }
    while (!isWorkingDay(t.start, holidaysMap)) t.start = addDays(t.start, 1);
    
    // Fixed End: If actual end exists, it overrides forecast logic
    const aEnd = parseDate(t.actualEnd);
    if (aEnd) {
      t.end = aEnd;
    } else {
      t.end = t.duration <= 0 ? new Date(t.start) : addWorkingDays(t.start, t.duration - 1, holidaysMap);
    }
  };
  taskList.forEach(resolveForecast);
}
