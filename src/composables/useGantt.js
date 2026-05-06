import { ref, computed } from 'vue';
import Papa from 'papaparse';

const BAR_COLORS = [
  'linear-gradient(135deg,#6c5ce7,#a29bfe)', // Roxo
  'linear-gradient(135deg,#fd79a8,#fab1a0)', // Rosa/Laranja
  'linear-gradient(135deg,#0984e3,#74b9ff)', // Azul
  'linear-gradient(135deg,#e17055,#fab1a0)'  // Coral
];
const ROW_H = 34;
const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function isWeekend(d) { const w = d.getDay(); return w === 0 || w === 6; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function parseDate(s) { if (!s) return null; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? null : d; }

export function useGantt() {
  const hasFolder = ref(false);
  const directoryHandle = ref(null);
  const zoomLevel = ref('day');
  
  const projectMetadata = ref({
    name: 'Nome do Projeto',
    startDate: new Date().toISOString().split('T')[0],
    manager: '',
    tasksFile: 'tarefas.csv'
  });

  const holidaysMap = ref({}); // { 'YYYY-MM-DD': 'Name' }
  const tasks = ref([]);
  const allDays = ref([]);
  const chartColumns = ref([]);
  const chartMonths = ref([]);

  const colWidth = computed(() => {
    if (zoomLevel.value === 'day') return 30;
    if (zoomLevel.value === 'week') return 60;
    return 100;
  });

  const isWorkingDay = (date) => {
    const w = date.getDay();
    if (w === 0 || w === 6) return false;
    const iso = date.toISOString().split('T')[0];
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

  const projectOptions = ref([]);
  const showProjectSelector = ref(false);

  const loadMetadataOnly = async () => {
    if (!directoryHandle.value) return;
    try {
      // 1. Read feriados.csv
      try {
        const hHandle = await directoryHandle.value.getFileHandle('feriados.csv');
        const hFile = await hHandle.getFile();
        const hContent = await hFile.text();
        const hParsed = Papa.parse(hContent, { header: true, skipEmptyLines: true });
        const newHols = {};
        hParsed.data.forEach(r => {
          const d = r['Data'] || r['data'] || r['date'];
          const n = r['Nome'] || r['nome'] || r['name'];
          if (d) newHols[d] = n;
        });
        holidaysMap.value = newHols;
      } catch (e) { console.warn("feriados.csv not found"); }

      // 2. Read projeto.csv
      let metadadosContent = null;
      try {
        const mHandle = await directoryHandle.value.getFileHandle('projeto.csv');
        const mFile = await mHandle.getFile();
        metadadosContent = await mFile.text();
      } catch (e) { console.warn("projeto.csv not found"); }

      if (metadadosContent) {
        const metaParsed = Papa.parse(metadadosContent, { header: true, skipEmptyLines: true });
        projectOptions.value = metaParsed.data.map(m => ({
          name: m['Nome do Projeto'] || m['nome do projeto'] || m['nome'] || m['name'] || 'Meu Projeto',
          startDate: m['Data Inicial'] || m['data inicial'] || m['start date'] || new Date().toISOString().split('T')[0],
          manager: m['Gerente'] || m['gerente'] || m['manager'] || '',
          tasksFile: m['Arquivo de Tarefas'] || m['arquivo de tarefas'] || m['tasks file'] || 'tarefas.csv'
        }));
      } else {
        projectOptions.value = [];
      }
    } catch (err) {
      console.error("Error loading project metadata", err);
      alert("Erro ao ler metadados do projeto.");
    }
  };

  const loadSelectedProject = async (index) => {
    if (!directoryHandle.value || index < 0 || index >= projectOptions.value.length) return;
    
    const p = projectOptions.value[index];
    projectMetadata.value = {
      name: p.name,
      startDate: p.startDate,
      manager: p.manager,
      tasksFile: p.tasksFile
    };

    // Read tasks
    let tContent = null;
    try {
      const tHandle = await directoryHandle.value.getFileHandle(projectMetadata.value.tasksFile);
      const tFile = await tHandle.getFile();
      tContent = await tFile.text();
    } catch (e) {
      console.error("Tasks file not found:", projectMetadata.value.tasksFile);
    }

    if (tContent) {
      const rawTasks = Papa.parse(tContent, { header: true, skipEmptyLines: true }).data;
      let indexCount = 1;
      const mappedTasks = rawTasks.map(obj => {
        const taskId = parseInt(obj.id || obj.ID) || indexCount++;
        const taskName = obj.task || obj.tarefa || obj.name || obj.Tarefa || 'Tarefa ' + taskId;
        const taskPercent = parseInt(obj.percent || obj.concluido || obj.percentagem || obj.Progresso || 0);
        const taskDuration = parseInt(obj.duration || obj.dias || obj.duracao || obj.Duracao || 0);
        const taskPred = obj.predecessor || obj.predecessora || obj.Predecessora || '';
        const type = (obj.type || obj.Tipo || 'FS').toUpperCase();
        
        // Novos campos para Fase 2/4
        const realStart = obj.data_inicial_real || obj.Data_Inicial_Real || obj.real_start || null;
        const realEnd = obj.data_final_real || obj.Data_Final_Real || obj.real_end || null;

        return {
          id: taskId,
          task: taskName,
          percent: isNaN(taskPercent) ? 0 : taskPercent,
          duration: isNaN(taskDuration) ? 0 : taskDuration,
          predecessor: taskPred,
          type: type,
          realStart: realStart,
          realEnd: realEnd,
          start: null,
          end: null
        };
      });
      calculateSchedule(mappedTasks, projectMetadata.value.startDate);
      tasks.value = mappedTasks;
      buildTimeline();
    } else {
      tasks.value = [];
    }
    showProjectSelector.value = false;
  };

  const loadProject = async () => {
    // Reload currently selected project
    await loadMetadataOnly();
    const idx = projectOptions.value.findIndex(p => p.tasksFile === projectMetadata.value.tasksFile);
    if (idx >= 0) {
      await loadSelectedProject(idx);
    } else {
      await loadSelectedProject(0);
    }
  };

  const saveTasksToDisk = async () => {
    if (!directoryHandle.value) return;
    try {
      const tHandle = await directoryHandle.value.getFileHandle(projectMetadata.value.tasksFile, { create: true });
      const writable = await tHandle.createWritable();
      
      const dataToSave = tasks.value.map(t => ({
        ID: t.id,
        Tarefa: t.task,
        Duracao: t.duration,
        Progresso: t.percent,
        Predecessora: t.predecessor,
        Tipo: t.type,
        Data_Inicial_Real: t.realStart || '',
        Data_Final_Real: t.realEnd || ''
      }));

      const csvContent = Papa.unparse(dataToSave, { delimiter: ';' });
      await writable.write(csvContent);
      await writable.close();
      console.log('Tasks saved successfully!');
    } catch (err) {
      console.error('Failed to save tasks', err);
      alert('Erro ao salvar tarefas no disco.');
    }
  };

  const calculateSchedule = (taskList, startDateStr) => {
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
              const candidateStart = t.type === 'SS' ? new Date(pred.start) : addWorkingDays(pred.start, pred.duration);
              if (candidateStart > maxStart) maxStart = candidateStart;
              hasValidPred = true;
            }
          });
          t.start = hasValidPred ? maxStart : new Date(projStart);
        }
        stack.delete(t.id);
      }
      while (!isWorkingDay(t.start)) t.start = addDays(t.start, 1);
      t.end = t.duration <= 0 ? new Date(t.start) : addWorkingDays(t.start, t.duration - 1);
    };
    taskList.forEach(resolve);
  };

  const buildTimeline = () => {
    if (!tasks.value.length) return;
    let minT = null, maxT = null;
    tasks.value.forEach(t => {
      const realS = parseDate(t.realStart);
      const realE = parseDate(t.realEnd);
      
      const s = realS && realS < t.start ? realS : t.start;
      const e = realE && realE > t.end ? realE : t.end;

      if (!minT || s < minT) minT = s;
      if (!maxT || e > maxT) maxT = e;
    });
    if (!minT || !maxT) return;

    const days = [];
    let d = new Date(minT); d = addDays(d, -2);
    let limit = new Date(maxT); limit = addDays(limit, 5);
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
        const iso = day.toISOString().split('T')[0];
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
    try {
      directoryHandle.value = await window.showDirectoryPicker({ mode: 'readwrite' });
      hasFolder.value = true;
      await loadMetadataOnly();
      if (projectOptions.value.length > 0) {
        showProjectSelector.value = true;
      } else {
        alert("Nenhum projeto cadastrado no arquivo projeto.csv.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const setZoom = (level) => {
    zoomLevel.value = level;
    buildTimeline();
  };

  const stats = computed(() => {
    if (!tasks.value.length) return { days: 0, progress: 0, endDate: '--' };
    let pMin = tasks.value[0].start, pMax = tasks.value[0].end;
    let totalWork = 0, completedWork = 0;
    tasks.value.forEach(t => {
      if (t.start < pMin) pMin = t.start;
      if (t.end > pMax) pMax = t.end;
      if (t.duration > 0) {
        totalWork += t.duration;
        completedWork += (t.duration * (t.percent / 100));
      }
    });
    const prct = totalWork > 0 ? Math.round((completedWork / totalWork) * 100) : 0;
    return {
      days: getBusinessDayIndex(pMax, pMin) + 1,
      progress: prct,
      endDate: pMax ? pMax.toLocaleDateString('pt-BR') : '--'
    };
  });

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
  
  // Real dates bar positioning
  const getRealBarLeft = (t) => {
     const rs = parseDate(t.realStart);
     if(!rs) return getBarLeft(t); // Fallback to planned if no real start
     return getPos(rs) + 2;
  };
  const getRealBarWidthPx = (t) => {
     const rs = parseDate(t.realStart);
     if(!rs) return 0;
     const re = parseDate(t.realEnd);
     // If realEnd is missing but it has start, we either draw up to today or up to calculated % based on duration
     // We will draw it based on the % completed over the planned duration or real duration
     const s = getPos(rs);
     let e;
     if(re) {
        e = getPos(re) + (zoomLevel.value === 'day' ? colWidth.value : colWidth.value / 7);
     } else {
        // Approximate width based on percent
        const plannedWidth = getBarWidthPx(t);
        return Math.max(18, plannedWidth * (t.percent / 100));
     }
     return Math.max(18, e - s - 4);
  };

  const getBarColor = (t, i) => {
    if (t.percent >= 100) return 'var(--success, #4caf50)';
    return BAR_COLORS[i % BAR_COLORS.length];
  };

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

  return {
    hasFolder, directoryHandle, zoomLevel,
    projectMetadata, tasks, holidaysMap,
    chartColumns, chartMonths, colWidth, arrowPaths, todayX,
    stats,
    projectOptions, showProjectSelector,
    openProjectFolder, setZoom, loadProject, saveTasksToDisk,
    getBarLeft, getMilestoneLeft, getBarWidthPx, getBarColor,
    getRealBarLeft, getRealBarWidthPx, parseDate,
    loadSelectedProject
  };
}
