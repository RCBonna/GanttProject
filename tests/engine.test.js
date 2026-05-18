/**
 * ProjectGantt Engine Tests
 * Unit tests for scheduling engine, CSV sanitization, and dependency resolution.
 * Run with: node --test tests/engine.test.js
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  parseDate,
  getLocalISOString,
  isWeekend,
  sanitizeCSV,
  escapeCSV,
  createWorkingDayChecker,
  createAddWorkingDays,
  createBusinessDayIndexer,
  calculateSchedule
} from '../src/engine.js';

// ─── Date Utilities Tests ─────────────────────────────────────────────────

describe('addDays', () => {
  it('adds positive days', () => {
    const d = new Date('2026-05-17T00:00:00');
    const result = addDays(d, 5);
    assert.strictEqual(result.getDate(), 22);
    assert.strictEqual(result.getMonth(), 4); // May (0-indexed)
  });

  it('adds negative days', () => {
    const d = new Date('2026-05-17T00:00:00');
    const result = addDays(d, -3);
    assert.strictEqual(result.getDate(), 14);
  });

  it('adds zero days', () => {
    const d = new Date('2026-05-17T00:00:00');
    const result = addDays(d, 0);
    assert.strictEqual(result.getDate(), 17);
  });

  it('does not mutate original date', () => {
    const d = new Date('2026-05-17T00:00:00');
    addDays(d, 10);
    assert.strictEqual(d.getDate(), 17);
  });
});

describe('parseDate', () => {
  it('parses ISO date string', () => {
    const result = parseDate('2026-05-17');
    assert.ok(result instanceof Date);
    assert.strictEqual(result.getFullYear(), 2026);
    assert.strictEqual(result.getMonth(), 4);
    assert.strictEqual(result.getDate(), 17);
  });

  it('parses BR format DD/MM/YYYY', () => {
    const result = parseDate('17/05/2026');
    assert.ok(result instanceof Date);
    assert.strictEqual(result.getFullYear(), 2026);
    assert.strictEqual(result.getMonth(), 4);
    assert.strictEqual(result.getDate(), 17);
  });

  it('returns null for empty string', () => {
    assert.strictEqual(parseDate(''), null);
  });

  it('returns null for null', () => {
    assert.strictEqual(parseDate(null), null);
  });

  it('returns null for undefined', () => {
    assert.strictEqual(parseDate(undefined), null);
  });

  it('returns Date object as-is', () => {
    const d = new Date('2026-05-17T00:00:00');
    assert.strictEqual(parseDate(d), d);
  });

  it('returns null for invalid Date object', () => {
    assert.strictEqual(parseDate(new Date('invalid')), null);
  });

  it('returns null for invalid string', () => {
    assert.strictEqual(parseDate('not-a-date'), null);
  });
});

describe('getLocalISOString', () => {
  it('formats Date object', () => {
    const d = new Date('2026-05-17T00:00:00');
    assert.strictEqual(getLocalISOString(d), '2026-05-17');
  });

  it('converts BR format to ISO', () => {
    assert.strictEqual(getLocalISOString('17/05/2026'), '2026-05-17');
  });

  it('truncates ISO string with time', () => {
    assert.strictEqual(getLocalISOString('2026-05-17T10:30:00'), '2026-05-17');
  });

  it('returns empty string for null', () => {
    assert.strictEqual(getLocalISOString(null), '');
  });

  it('returns empty string for invalid date', () => {
    assert.strictEqual(getLocalISOString(new Date('invalid')), '');
  });
});

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    // Use local date constructor to avoid timezone issues
    assert.strictEqual(isWeekend(new Date(2026, 4, 16)), true); // Saturday May 16
  });

  it('returns true for Sunday', () => {
    assert.strictEqual(isWeekend(new Date(2026, 4, 17)), true); // Sunday May 17
  });

  it('returns false for weekday', () => {
    assert.strictEqual(isWeekend(new Date(2026, 4, 18)), false); // Monday May 18
  });
});

// ─── CSV Sanitization Tests ───────────────────────────────────────────────

describe('sanitizeCSV', () => {
  it('prefixes formula characters with single quote', () => {
    assert.strictEqual(sanitizeCSV('=SUM(A1)'), "'=SUM(A1)");
    assert.strictEqual(sanitizeCSV('+SUM(A1)'), "'+SUM(A1)");
    assert.strictEqual(sanitizeCSV('-SUM(A1)'), "'-SUM(A1)");
    assert.strictEqual(sanitizeCSV('@SUM(A1)'), "'@SUM(A1)");
    assert.strictEqual(sanitizeCSV('|SUM(A1)'), "'|SUM(A1)");
    assert.strictEqual(sanitizeCSV('\tSUM(A1)'), "'\tSUM(A1)");
  });

  it('replaces newlines with spaces', () => {
    assert.strictEqual(sanitizeCSV('line1\nline2'), 'line1 line2');
    assert.strictEqual(sanitizeCSV('line1\r\nline2'), 'line1 line2');
    assert.strictEqual(sanitizeCSV('line1\rline2'), 'line1 line2');
  });

  it('passes through safe strings unchanged', () => {
    assert.strictEqual(sanitizeCSV('Hello World'), 'Hello World');
    assert.strictEqual(sanitizeCSV('Task 123'), 'Task 123');
  });

  it('passes through non-string values unchanged', () => {
    assert.strictEqual(sanitizeCSV(123), 123);
    assert.strictEqual(sanitizeCSV(null), null);
    assert.strictEqual(sanitizeCSV(undefined), undefined);
    assert.strictEqual(sanitizeCSV(true), true);
  });
});

describe('escapeCSV', () => {
  it('wraps values in double quotes', () => {
    assert.strictEqual(escapeCSV('Hello'), '"Hello"');
  });

  it('escapes double quotes inside values', () => {
    assert.strictEqual(escapeCSV('Say "Hi"'), '"Say ""Hi"""');
  });

  it('prefixes formula characters with single quote inside double quotes', () => {
    assert.strictEqual(escapeCSV('=SUM(A1)'), '"\'=SUM(A1)"');
    assert.strictEqual(escapeCSV('+SUM(A1)'), '"\'+SUM(A1)"');
    assert.strictEqual(escapeCSV('-SUM(A1)'), '"\'-SUM(A1)"');
    assert.strictEqual(escapeCSV('@SUM(A1)'), '"\'@SUM(A1)"');
    assert.strictEqual(escapeCSV('|SUM(A1)'), '"\'|SUM(A1)"');
  });

  it('handles null/undefined as empty string', () => {
    assert.strictEqual(escapeCSV(null), '""');
    assert.strictEqual(escapeCSV(undefined), '""');
  });

  it('handles numbers', () => {
    assert.strictEqual(escapeCSV(123), '"123"');
  });
});

// ─── Working Day Logic Tests ──────────────────────────────────────────────

describe('createWorkingDayChecker', () => {
  it('returns false for weekends', () => {
    const isWorkingDay = createWorkingDayChecker({});
    assert.strictEqual(isWorkingDay(new Date(2026, 4, 16)), false); // Saturday
    assert.strictEqual(isWorkingDay(new Date(2026, 4, 17)), false); // Sunday
  });

  it('returns true for weekdays', () => {
    const isWorkingDay = createWorkingDayChecker({});
    assert.strictEqual(isWorkingDay(new Date(2026, 4, 18)), true); // Monday
    assert.strictEqual(isWorkingDay(new Date(2026, 4, 19)), true); // Tuesday
  });

  it('returns false for holidays', () => {
    const holidays = { '2026-05-18': true };
    const isWorkingDay = createWorkingDayChecker(holidays);
    assert.strictEqual(isWorkingDay(new Date(2026, 4, 18)), false);
  });

  it('returns true for non-holiday weekdays', () => {
    const holidays = { '2026-05-20': true };
    const isWorkingDay = createWorkingDayChecker(holidays);
    assert.strictEqual(isWorkingDay(new Date(2026, 4, 18)), true);
  });
});

describe('createAddWorkingDays', () => {
  it('adds working days skipping weekends', () => {
    const addWorkingDays = createAddWorkingDays({});
    // Friday May 15 + 1 working day = Monday May 18
    const result = addWorkingDays(new Date(2026, 4, 15), 1);
    assert.strictEqual(result.getDate(), 18);
  });

  it('adds multiple working days', () => {
    const addWorkingDays = createAddWorkingDays({});
    // Monday May 18 + 5 working days = Monday May 25
    const result = addWorkingDays(new Date(2026, 4, 18), 5);
    assert.strictEqual(result.getDate(), 25);
  });

  it('skips holidays', () => {
    const holidays = { '2026-05-19': true }; // Tuesday
    const addWorkingDays = createAddWorkingDays(holidays);
    // Monday May 18 + 1 working day = Wednesday May 20 (Tuesday is holiday)
    const result = addWorkingDays(new Date(2026, 4, 18), 1);
    assert.strictEqual(result.getDate(), 20);
  });

  it('returns same date for zero or negative', () => {
    const addWorkingDays = createAddWorkingDays({});
    const d = new Date(2026, 4, 18);
    assert.strictEqual(addWorkingDays(d, 0).getDate(), 18);
    assert.strictEqual(addWorkingDays(d, -1).getDate(), 18);
  });
});

describe('createBusinessDayIndexer', () => {
  it('counts working days between dates', () => {
    const getBusinessDayIndex = createBusinessDayIndexer({});
    // Monday May 18 to Friday May 22 = 4 working days
    const result = getBusinessDayIndex(new Date(2026, 4, 22), new Date(2026, 4, 18));
    assert.strictEqual(result, 4);
  });

  it('skips weekends in count', () => {
    const getBusinessDayIndex = createBusinessDayIndexer({});
    // Friday May 15 to Saturday May 16 = 0 working days
    const result = getBusinessDayIndex(new Date(2026, 4, 16), new Date(2026, 4, 15));
    assert.strictEqual(result, 0);
  });
});

// ─── Scheduling Engine Tests ──────────────────────────────────────────────

describe('calculateSchedule', () => {
  it('schedules single task from project start', () => {
    const tasks = [
      { id: 1, name: 'Task 1', duration: 3, predecessor: null }
    ];
    calculateSchedule(tasks, '2026-05-18');
    assert.ok(tasks[0].start instanceof Date);
    assert.ok(tasks[0].end instanceof Date);
    assert.strictEqual(tasks[0].dateSource, 'calculated');
    // May 18 is Monday, 3 days = Mon, Tue, Wed
    assert.strictEqual(tasks[0].start.getDate(), 18);
    assert.strictEqual(tasks[0].end.getDate(), 20);
  });

  it('respects locked dates', () => {
    const tasks = [
      { id: 1, name: 'Task 1', duration: 3, predecessor: null, plannedStart: '2026-06-01', plannedEnd: '2026-06-03' }
    ];
    calculateSchedule(tasks, '2026-05-18');
    assert.strictEqual(tasks[0].dateSource, 'locked');
    assert.strictEqual(tasks[0].start.getDate(), 1);
    assert.strictEqual(tasks[0].end.getDate(), 3);
  });

  it('resolves Finish-to-Start dependency', () => {
    const tasks = [
      { id: 1, name: 'Task 1', duration: 2, predecessor: null },
      { id: 2, name: 'Task 2', duration: 2, predecessor: '1' }
    ];
    calculateSchedule(tasks, '2026-05-18');
    // Task 1: Mon-Tue (18-19), Task 2: starts Wed (20)
    assert.strictEqual(tasks[1].start.getDate(), 20);
    assert.strictEqual(tasks[1].end.getDate(), 21);
  });

  it('resolves Start-to-Start dependency', () => {
    const tasks = [
      { id: 1, name: 'Task 1', duration: 3, predecessor: null },
      { id: 2, name: 'Task 2', duration: 2, predecessor: '1', type: 'SS' }
    ];
    calculateSchedule(tasks, '2026-05-18');
    // Both start on same day
    assert.strictEqual(tasks[1].start.getTime(), tasks[0].start.getTime());
  });

  it('handles multiple predecessors (takes max end date)', () => {
    const tasks = [
      { id: 1, name: 'Task 1', duration: 2, predecessor: null },
      { id: 2, name: 'Task 2', duration: 5, predecessor: null },
      { id: 3, name: 'Task 3', duration: 2, predecessor: '1,2' }
    ];
    calculateSchedule(tasks, '2026-05-18');
    // Task 1: Mon-Tue (18-19), Task 2: Mon-Fri (18-22)
    // Task 3 starts after Task 2 ends: Monday May 25
    assert.strictEqual(tasks[2].start.getDate(), 25);
  });

  it('detects circular dependencies', () => {
    const tasks = [
      { id: 1, name: 'Task 1', duration: 2, predecessor: '2' },
      { id: 2, name: 'Task 2', duration: 2, predecessor: '1' }
    ];
    calculateSchedule(tasks, '2026-05-18');
    // Both should be scheduled (no infinite loop)
    assert.ok(tasks[0].start instanceof Date);
    assert.ok(tasks[1].start instanceof Date);
  });

  it('skips non-working days for start date', () => {
    const tasks = [
      { id: 1, name: 'Task 1', duration: 1, predecessor: null }
    ];
    // Project starts on Saturday - should move to Monday
    calculateSchedule(tasks, '2026-05-16');
    assert.strictEqual(tasks[0].start.getDay(), 1); // Monday
  });

  it('handles missing predecessor gracefully', () => {
    const tasks = [
      { id: 1, name: 'Task 1', duration: 2, predecessor: '999' }
    ];
    calculateSchedule(tasks, '2026-05-18');
    // Falls back to project start
    assert.strictEqual(tasks[0].start.getDate(), 18);
  });

  it('handles zero duration task', () => {
    const tasks = [
      { id: 1, name: 'Milestone', duration: 0, predecessor: null }
    ];
    calculateSchedule(tasks, '2026-05-18');
    assert.strictEqual(tasks[0].start.getTime(), tasks[0].end.getTime());
  });

  it('marks forecast when predecessor has real dates', () => {
    const tasks = [
      { id: 1, name: 'Task 1', duration: 2, predecessor: null, realEnd: '2026-05-22' },
      { id: 2, name: 'Task 2', duration: 2, predecessor: '1' }
    ];
    calculateSchedule(tasks, '2026-05-18');
    assert.strictEqual(tasks[1].dateSource, 'forecast');
  });

  it('handles empty task list', () => {
    const tasks = [];
    calculateSchedule(tasks, '2026-05-18');
    assert.strictEqual(tasks.length, 0);
  });

  it('respects holidays in scheduling', () => {
    const holidays = { '2026-05-19': true }; // Tuesday
    const tasks = [
      { id: 1, name: 'Task 1', duration: 3, predecessor: null }
    ];
    calculateSchedule(tasks, '2026-05-18', holidays);
    // Mon (18), skip Tue (holiday), Wed (20), Thu (21)
    assert.strictEqual(tasks[0].start.getDate(), 18);
    assert.strictEqual(tasks[0].end.getDate(), 21);
  });
});
