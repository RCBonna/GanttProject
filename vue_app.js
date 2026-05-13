const { createApp, ref, computed, watch, onMounted, nextTick } = Vue;

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

const App = {
  setup() {
    const hasFolder = ref(false);
    const directoryHandle = ref(null);
    const permissionStatus = ref('prompt');
    const zoomLevel = ref('day');
    
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
      if (columnView.value === 'padrao') return 295;
      if (columnView.value === 'planejamento' || columnView.value === 'execucao') return 465;
      return 635;
    });

    const taskListWidth = ref(Math.max(parseInt(localStorage.getItem('taskListWidth')) || 495, minTaskListWidth.value));

    // Baseline & Real bar visibility toggles
    const showBaselineBars = ref(localStorage.getItem('showBaselineBars') !== 'false');
    const showRealBars = ref(localStorage.getItem('showRealBars') !== 'false');

    const gridTemplate = computed(() => {
      if (columnView.value === 'padrao') return '36px minmax(30px, 1fr) 45px 45px 45px 45px';
      if (columnView.value === 'planejamento' || columnView.value === 'execucao') return '36px minmax(30px, 1fr) 45px 45px 45px 45px 85px 85px';
      return '36px minmax(30px, 1fr) 45px 45px 45px 45px 85px 85px 85px 85px';
    });

    const recalculateStatus = ref('');
    const hoverTaskId = ref(null);

    // Modals Control
    const showProjectSelector = ref(false);
    const showProjectSettingsModal = ref(false);
    const showHolidaysModal = ref(false);
    const showEditModal = ref(false);

    // Temp variables for modals
    const editingTask = ref(null);
    const hasPlannedDates = ref(false);
    const projectOptions = ref([]);
    const tempProjectMetadata = ref({ name: '', manager: '', startDate: '' });
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
    const allDays = ref([]);
    const chartColumns = ref([]);
    const chartMonths = ref([]);

    const colWidth = computed(() => {
      if (zoomLevel.value === 'day') return 30;
      if (zoomLevel.value === 'week') return 60;
      return 100;
    });

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

    // Parse Portuguese date back to local standard
    const formatDatePT = (dateStr) => {
      if (!dateStr) return '--';
      if (dateStr instanceof Date) {
        const d = dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };

    const getDayOfWeekPT = (dateStr) => {
      if (!dateStr) return '';
      const d = parseDate(dateStr);
      if (!d) return '';
      return DAYS_PT[d.getDay()];
    };

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

    // File System Access Save Handler
    const saveFileToDisk = async (filename, content) => {
      if (!directoryHandle.value) {
        console.warn("Folder is not connected. Saving to localStorage cache instead.");
        return false;
      }
      try {
        const handle = await directoryHandle.value.getFileHandle(filename, { create: true });
        const writable = await handle.createWritable();
        // UTF-8 BOM to ensure Excel opens Portuguese characters correctly
        await writable.write('\ufeff' + content);
        await writable.close();
        return true;
      } catch (err) {
        console.error("Error writing to file " + filename, err);
        addToast(`Erro ao salvar o arquivo ${filename} no disco. Certifique-se de que a pasta está conectada e possui permissões de escrita.`, 'error');
        return false;
      }
    };

    // Main Tasks Saver
    const saveTasksToDisk = async () => {
      let csvContent = "ID;Tarefa;Duracao;Progresso;Predecessora;Tipo;Data_Inicial_Real;Data_Final_Real;Data_Inicial_Planejada;Data_Final_Planejada;Data_Inicial_Baseline;Data_Final_Baseline;Baseline_Data\n";
      tasks.value.forEach(t => {
        const id = t.id;
        const task = t.task.replace(/"/g, '""');
        const duration = t.duration;
        const percent = t.percent;
        const pred = t.predecessor || '';
        const type = t.type || 'FS';
        const realStart = t.realStart || '';
        const realEnd = t.realEnd || '';
        const plannedStart = t.plannedStart || '';
        const plannedEnd = t.plannedEnd || '';
        const baselineStart = t.baselineStart || '';
        const baselineEnd = t.baselineEnd || '';
        const baselineDate = t.baselineDate || '';
        csvContent += `${id};"${task}";${duration};${percent};"${pred}";"${type}";"${realStart}";"${realEnd}";"${plannedStart}";"${plannedEnd}";"${baselineStart}";"${baselineEnd}";"${baselineDate}"\n`;
      });
      
      // Save local storage cache too
      localStorage.setItem('tasks', JSON.stringify(tasks.value));
      await saveFileToDisk(projectMetadata.value.tasksFile, csvContent);
    };

    // Baseline Snapshot — copies current calculated start/end to baseline fields
    const saveBaseline = async () => {
      if (!tasks.value.length) return;
      const today = getLocalISOString(new Date());
      const hasExisting = tasks.value.some(t => t.baselineStart || t.baselineEnd);
      if (hasExisting) {
        if (!await showCustomConfirm('Já existe uma linha de base salva. Deseja sobrescrever com o planejamento atual?', 'Sobrescrever Baseline', 'warn')) return;
      }
      tasks.value.forEach(t => {
        t.baselineStart = t.start ? getLocalISOString(t.start) : '';
        t.baselineEnd = t.end ? getLocalISOString(t.end) : '';
        t.baselineDate = today;
      });
      await saveTasksToDisk();
      addToast('📸 Linha de Base (Baseline) salva com sucesso!', 'success');
    };

    // Project Metadata Config modal saver
    const saveProjectSettings = async () => {
      // Find and update inside projectOptions
      const idx = projectOptions.value.findIndex(p => p.tasksFile === projectMetadata.value.tasksFile);
      if (idx !== -1) {
        projectOptions.value[idx].name = tempProjectMetadata.value.name;
        projectOptions.value[idx].manager = tempProjectMetadata.value.manager;
        projectOptions.value[idx].startDate = tempProjectMetadata.value.startDate;
      } else {
        projectOptions.value.push({
          name: tempProjectMetadata.value.name,
          manager: tempProjectMetadata.value.manager,
          startDate: tempProjectMetadata.value.startDate,
          tasksFile: projectMetadata.value.tasksFile
        });
      }

      // Update active metadata
      projectMetadata.value.name = tempProjectMetadata.value.name;
      projectMetadata.value.manager = tempProjectMetadata.value.manager;
      projectMetadata.value.startDate = tempProjectMetadata.value.startDate;

      // Update LocalStorage cache
      localStorage.setItem('projectMetadata', JSON.stringify(projectMetadata.value));
      localStorage.setItem('projectOptions', JSON.stringify(projectOptions.value));

      // Save to projeto.csv
      let csvContent = "Nome do Projeto;Data Inicial;Gerente;Arquivo de Tarefas\n";
      projectOptions.value.forEach(p => {
        csvContent += `"${p.name}";"${p.startDate}";"${p.manager}";"${p.tasksFile}"\n`;
      });

      const ok = await saveFileToDisk('projeto.csv', csvContent);
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
        startDate: projectMetadata.value.startDate
      };
      showProjectSettingsModal.value = true;
    };

    // Holidays Saver
    const saveHolidaysToDisk = async () => {
      let csvContent = "Data;Nome\n";
      Object.entries(holidaysMap.value).sort((a, b) => a[0].localeCompare(b[0])).forEach(([d, n]) => {
        csvContent += `${d};"${n}"\n`;
      });
      localStorage.setItem('holidaysMap', JSON.stringify(holidaysMap.value));
      await saveFileToDisk('feriados.csv', csvContent);
    };

    const addHoliday = async () => {
      if (!newHolidayDate.value || !newHolidayName.value.trim()) {
        addToast("Preencha a data e a descrição do feriado.", "warn");
        return;
      }
      const date = newHolidayDate.value;
      const name = newHolidayName.value.trim();
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
      if (!directoryHandle.value) return;
      try {
        // 1. Read projeto.csv
        let metadadosContent = null;
        try {
          const mHandle = await directoryHandle.value.getFileHandle('projeto.csv');
          const mFile = await mHandle.getFile();
          metadadosContent = await mFile.text();
        } catch (e) { console.warn("projeto.csv not found"); }

        if (metadadosContent) {
          const metaRows = parseCSV(metadadosContent);
          projectOptions.value = metaRows.map(m => ({
            name: m['nome do projeto'] || m['nome'] || m['name'] || 'Meu Projeto',
            startDate: m['data inicial'] || m['start date'] || new Date().toISOString().split('T')[0],
            manager: m['gerente'] || m['manager'] || '',
            tasksFile: m['arquivo de tarefas'] || m['tasks file'] || 'tarefas.csv'
          }));

          localStorage.setItem('projectOptions', JSON.stringify(projectOptions.value));

          if (projectOptions.value.length > 0) {
            // Check if there's a cached active project Name
            const savedProjectName = localStorage.getItem('activeProjectName');
            const found = projectOptions.value.find(p => p.name === savedProjectName);
            if (found) {
              projectMetadata.value = { ...found };
            } else {
              projectMetadata.value = { ...projectOptions.value[0] };
            }
            localStorage.setItem('projectMetadata', JSON.stringify(projectMetadata.value));
          }
        }

        // 2. Read feriados.csv
        await loadHolidays();

        // 3. Read tasks
        await loadTasks();

      } catch (err) {
        console.error("Error loading project files", err);
        addToast("Erro ao ler os arquivos do projeto. Certifique-se de que a pasta selecionada está correta.", "error");
      }
    };

    const loadHolidays = async () => {
      if (!directoryHandle.value) return;
      try {
        const hHandle = await directoryHandle.value.getFileHandle('feriados.csv');
        const hFile = await hHandle.getFile();
        const hContent = await hFile.text();
        const hRows = parseCSV(hContent);
        const newHols = {};
        hRows.forEach(r => {
          const d = r['data'] || r['date'];
          const n = r['nome'] || r['name'];
          if (d) newHols[d] = n;
        });
        holidaysMap.value = newHols;
        localStorage.setItem('holidaysMap', JSON.stringify(holidaysMap.value));
      } catch (e) { console.warn("feriados.csv not found"); }
    };

    const loadTasks = async () => {
      if (!directoryHandle.value) return;
      let tContent = null;
      try {
        const tHandle = await directoryHandle.value.getFileHandle(projectMetadata.value.tasksFile);
        const tFile = await tHandle.getFile();
        tContent = await tFile.text();
      } catch (e) {
        console.error("Tasks file not found:", projectMetadata.value.tasksFile);
      }

      if (tContent) {
        const rawTasks = parseCSV(tContent);
        let index = 1;
        const mappedTasks = rawTasks.map(obj => {
          const taskId = parseInt(obj.id || obj.id) || index++;
          const taskName = obj.task || obj.tarefa || obj.name || 'Tarefa ' + taskId;
          const taskPercent = parseInt(obj.percent || obj.concluido || obj.percentagem || obj.progresso || 0);
          const taskDuration = parseInt(obj.duration || obj.dias || obj.duracao || obj.duracao || 0);
          const taskPred = obj.predecessor || obj.predecessora || '';
          const taskType = obj.type || obj.tipo || 'FS';
          const plannedStart = obj.data_inicial_planejada || obj.planned_start || '';
          const plannedEnd = obj.data_final_planejada || obj.planned_end || '';
          const realStartStr = obj.data_inicial_real || obj.actual_start || '';
          const realEndStr = obj.data_final_real || obj.actual_end || '';
          const baselineStart = obj.data_inicial_baseline || obj.baseline_start || '';
          const baselineEnd = obj.data_final_baseline || obj.baseline_end || '';
          const baselineDate = obj.baseline_data || obj.baseline_date || '';

          return {
            id: taskId,
            task: taskName,
            percent: isNaN(taskPercent) ? 0 : taskPercent,
            duration: isNaN(taskDuration) ? 0 : taskDuration,
            predecessor: taskPred,
            type: taskType.toUpperCase(),
            plannedStart: plannedStart,
            plannedEnd: plannedEnd,
            realStart: realStartStr || null,
            realEnd: realEndStr || null,
            baselineStart: baselineStart || '',
            baselineEnd: baselineEnd || '',
            baselineDate: baselineDate || '',
            start: null,
            end: null
          };
        });
        calculateSchedule(mappedTasks, projectMetadata.value.startDate);
        tasks.value = mappedTasks;
        localStorage.setItem('tasks', JSON.stringify(mappedTasks));
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
      localStorage.setItem('activeProjectName', proj.name);
      localStorage.setItem('projectMetadata', JSON.stringify(projectMetadata.value));
      showProjectSelector.value = false;
      await loadTasks();
    };

    const calculateSchedule = (taskList, startDateStr) => {
      const map = {};
      const projStart = parseDate(startDateStr) || new Date();
      taskList.forEach(t => {
        t.start = null;
        t.end = null;
        t.dateSource = 'calculated'; // 'locked' | 'calculated' | 'forecast'
        map[t.id] = t;
      });
      const stack = new Set();

      const resolve = (t) => {
        if (!t || t.start) return;
        
        // If plannedStart and plannedEnd are locked by the user, use them directly
        if (t.plannedStart && t.plannedEnd) {
          t.start = parseDate(t.plannedStart);
          t.end = parseDate(t.plannedEnd);
          t.dateSource = 'locked';
          return;
        }

        if (stack.has(t.id)) {
          t.start = new Date(projStart);
        } else {
          stack.add(t.id);
          if (!t.predecessor) {
            t.start = new Date(projStart);
          } else {
            const predStrs = String(t.predecessor).match(/\d+/g) || [];
            let maxStart = new Date(projStart);
            let hasValidPred = false;
            let usedForecast = false;
            predStrs.forEach(pStr => {
              const predId = parseInt(pStr);
              if (map[predId]) {
                const pred = map[predId];
                resolve(pred);
                
                let candidateStart;
                if (t.type === 'SS') {
                  // Start-to-Start: use actual start if available
                  const predActualStart = pred.realStart ? parseDate(pred.realStart) : null;
                  candidateStart = predActualStart || new Date(pred.start);
                  if (predActualStart) usedForecast = true;
                } else {
                  // Finish-to-Start (default): use actual end if available for forecast
                  const predActualEnd = pred.realEnd ? parseDate(pred.realEnd) : null;
                  if (predActualEnd) {
                    // Predecessor finished: successor starts next working day after actual end
                    candidateStart = addWorkingDays(predActualEnd, 1);
                    usedForecast = true;
                  } else if (pred.realStart && !pred.realEnd) {
                    // Predecessor started but not finished: forecast based on actual start + remaining duration
                    const predRealStart = parseDate(pred.realStart);
                    const predForecastEnd = addWorkingDays(predRealStart, pred.duration - 1);
                    candidateStart = addWorkingDays(predForecastEnd, 1);
                    usedForecast = true;
                  } else {
                    // No actual data: use planned end
                    candidateStart = addWorkingDays(pred.start, pred.duration);
                  }
                }
                if (candidateStart > maxStart) maxStart = candidateStart;
                hasValidPred = true;
              }
            });
            t.start = hasValidPred ? maxStart : new Date(projStart);
            if (usedForecast && t.dateSource !== 'locked') {
              t.dateSource = 'forecast';
            }
          }
          stack.delete(t.id);
        }
        
        // Make sure task starts on a working day
        while (!isWorkingDay(t.start)) t.start = addDays(t.start, 1);
        
        // End date calculation
        t.end = t.duration <= 0 ? new Date(t.start) : addWorkingDays(t.start, t.duration - 1);
      };
      
      taskList.forEach(resolve);
    };

    // Sprint 5: Forecast Recalculate
    const runForecast = () => {
      if (!tasks.value.length) return;
      calculateSchedule(tasks.value, projectMetadata.value.startDate);
      buildTimeline();
      const forecastCount = tasks.value.filter(t => t.dateSource === 'forecast').length;
      if (forecastCount > 0) {
        addToast(`🔄 Previsão recalculada — ${forecastCount} tarefa(s) com forecast atualizado`, 'info');
      } else {
        addToast('✅ Cronograma recalculado — sem impactos em cascata', 'success');
      }
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
      try {
        directoryHandle.value = await window.showDirectoryPicker({ mode: 'readwrite' });
        hasFolder.value = true;
        localStorage.setItem('hasFolder', 'true');
        await saveHandleToDB(directoryHandle.value);
        permissionStatus.value = 'granted';
        await loadProject();
      } catch (err) {
        console.error(err);
      }
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
      // Fallback se não houver handle ou se a solicitação falhar
      await openProjectFolder();
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

    onMounted(() => {
      window.addEventListener('mousemove', e => {
        if (!isResizing) return;
        const tlElement = document.getElementById('taskList');
        if (tlElement) {
          const offset = tlElement.getBoundingClientRect().left;
          const newW = e.clientX - offset;
          if (newW > 150 && newW < 800) taskListWidth.value = newW;
        }
      });
      window.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    });

    const syncScroll = (e) => {
      const tl = document.getElementById('taskList');
      if (tl) tl.scrollTop = e.target.scrollTop;
    };

    const toggleTheme = () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
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
      });
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
    const openEditModal = (task) => {
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
      if (!editingTask.value) return;
      if (await showCustomConfirm(`Deseja realmente excluir a tarefa #${editingTask.value.id}?`, 'Excluir Tarefa', 'error')) {
        tasks.value = tasks.value.filter(t => t.id !== editingTask.value.id);
        calculateSchedule(tasks.value, projectMetadata.value.startDate);
        buildTimeline();
        await saveTasksToDisk();
        closeEditModal();
      }
    };

    const saveTaskChanges = async () => {
      if (!editingTask.value) return;
      const t = tasks.value.find(x => x.id === editingTask.value.id);
      if (t) {
        t.task = editingTask.value.task;
        t.duration = isNaN(parseInt(editingTask.value.duration)) ? 0 : parseInt(editingTask.value.duration);
        t.predecessor = editingTask.value.predecessor;
        t.type = editingTask.value.type || 'FS';
        t.percent = isNaN(parseInt(editingTask.value.percent)) ? 0 : parseInt(editingTask.value.percent);

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
        end: null
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
      // Always load cache first for immediate rendering (UX premium!)
      const cachedHasFolder = localStorage.getItem('hasFolder') === 'true';
      if (cachedHasFolder) {
        hasFolder.value = true;
        try {
          const cachedMeta = localStorage.getItem('projectMetadata');
          if (cachedMeta) projectMetadata.value = JSON.parse(cachedMeta);

          const cachedOpts = localStorage.getItem('projectOptions');
          if (cachedOpts) projectOptions.value = JSON.parse(cachedOpts);

          const cachedHols = localStorage.getItem('holidaysMap');
          if (cachedHols) holidaysMap.value = JSON.parse(cachedHols);

          const cachedTasks = localStorage.getItem('tasks');
          if (cachedTasks) {
            const rawCachedTasks = JSON.parse(cachedTasks);
            tasks.value = rawCachedTasks.map(t => ({
              ...t,
              start: t.start ? new Date(t.start) : null,
              end: t.end ? new Date(t.end) : null
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
            await loadProject();
          }
        } else {
          permissionStatus.value = 'prompt';
        }
      } catch (err) {
        console.warn('IndexedDB reconnection failed:', err);
        permissionStatus.value = 'prompt';
      }
    });

    return {
      hasFolder, directoryHandle, permissionStatus, zoomLevel, taskListWidth, hoverTaskId,
      projectMetadata, tasks, holidaysMap,
      chartColumns, chartMonths, colWidth, arrowPaths, todayX,
      stats, donutBg, recalculateStatus,
      showBaselineBars, showRealBars, hasAnyBaseline,
      columnView, gridTemplate, minTaskListWidth,
      
      // Custom Dialogs and Toasts
      toasts, customDialog, addToast, removeToast, showCustomAlert, showCustomConfirm,

      // Modals Control
      showProjectSelector, showProjectSettingsModal, showHolidaysModal, showEditModal,
      editingTask, hasPlannedDates, projectOptions, tempProjectMetadata,
      newHolidayDate, newHolidayName, sortedHolidays, tooltip,

      // Operations
      openProjectFolder, reconnectFolder, setZoom, selectProject, openProjectSettings, saveProjectSettings,
      addHoliday, removeHoliday, addNewTask, openEditModal, closeEditModal,
      saveTaskChanges, deleteTask, onProgressChange, getRealBarLeft, getRealBarWidthPx,
      getBarLeft, getMilestoneLeft, getBarWidthPx, getBarColor,
      getBaselineBarLeft, getBaselineBarWidthPx, getTaskDelay, setColumnView,
      saveBaseline, toggleBaselineBars, toggleRealBars, runForecast,
      startResize, syncScroll, toggleTheme, exportPNG, showTooltip, hideTooltip, formatDatePT, getDayOfWeekPT
    };
  }
};

createApp(App).mount('#app');
