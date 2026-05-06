import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Vue CDN
content = content.replace(
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>\n<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>'
)

# 2. Add Vue mount div
content = content.replace('<body>', '<body>\n<div id="app">')
content = content.replace('</body>', '</div>\n</body>')

# 3. Add v-pre to manual DOM elements to prevent Vue interference
content = content.replace('<div class="gantt-wrapper" id="ganttWrapper"></div>', '<div class="gantt-wrapper" id="ganttWrapper" v-pre></div>')
content = content.replace('<div class="tooltip" id="tooltip"></div>', '<div class="tooltip" id="tooltip" v-pre></div>')

# 4. Replace Header HTML with Vue syntax
header_original = """<div class="header">
  <div class="header-left">
    <h1 id="projectTitle" contenteditable="true" spellcheck="false" title="Clique para editar o nome do projeto">Nome do Projeto</h1>
    <p>Gráfico de Gantt Compacto</p>
  </div>
  <div class="controls">
    <div class="control-group">
      <label>Início</label>
      <input type="date" id="startDate" value="2026-05-04">
    </div>
    <div class="control-group">
      <label>Dados (CSV) <span class="info-icon" onclick="toggleHelp(true)" title="Ver formato do arquivo">?</span></label>
      <label class="btn-secondary" for="csvFile" id="fileLabel" title="Selecione um arquivo de Projeto CSV">
        <span id="fileName">Selecionar Arquivo</span>
        <input type="file" id="csvFile" accept=".csv" style="display:none">
      </label>
    </div>
    <div class="control-group">
      <label>Zoom</label>
      <div style="display:flex; background:var(--surface3); border-radius:6px; padding:2px; border:1px solid var(--border); height:36px">
        <button onclick="setZoom('day')" id="z-day" class="btn-zoom active">Dia</button>
        <button onclick="setZoom('week')" id="z-week" class="btn-zoom">Sem</button>
        <button onclick="setZoom('month')" id="z-month" class="btn-zoom">Mês</button>
      </div>
    </div>
    <button class="btn-theme" onclick="toggleTheme()" title="Alternar entre tema Claro e Escuro">🌓</button>
    <button class="btn-theme" onclick="toggleHolidaysModal(true)" title="Gerenciar Feriados" style="font-size:14px">📅</button>
    <button class="btn" onclick="exportPNG(this)">Exportar Imagem</button>
  </div>
</div>"""

header_vue = """<div class="header">
  <div class="header-left">
    <h1 id="projectTitle" contenteditable="true" spellcheck="false" title="Clique para editar o nome do projeto" @blur="updateProjectTitle" v-text="projectTitle"></h1>
    <p>Gráfico de Gantt Compacto</p>
  </div>
  <div class="controls">
    <div class="control-group">
      <label>Início</label>
      <input type="date" id="startDate" v-model="startDate">
    </div>
    <div class="control-group">
      <label>Dados (CSV) <span class="info-icon" @click="toggleHelp(true)" title="Ver formato do arquivo">?</span></label>
      <label class="btn-secondary" for="csvFile" id="fileLabel" :class="{'has-file': folderName}" title="Selecione os arquivos CSV">
        <span id="fileName">{{ folderName || 'Selecionar Arquivos' }}</span>
        <input type="file" id="csvFile" accept=".csv" multiple style="display:none" @change="handleFiles">
      </label>
    </div>
    <div class="control-group">
      <label>Zoom</label>
      <div style="display:flex; background:var(--surface3); border-radius:6px; padding:2px; border:1px solid var(--border); height:36px">
        <button @click="setZoom('day')" :class="['btn-zoom', {active: zoomLevel === 'day'}]">Dia</button>
        <button @click="setZoom('week')" :class="['btn-zoom', {active: zoomLevel === 'week'}]">Sem</button>
        <button @click="setZoom('month')" :class="['btn-zoom', {active: zoomLevel === 'month'}]">Mês</button>
      </div>
    </div>
    <button class="btn-theme" @click="toggleTheme" title="Alternar entre tema Claro e Escuro">🌓</button>
    <button class="btn-theme" @click="toggleHolidaysModal(true)" title="Gerenciar Feriados" style="font-size:14px">📅</button>
    <button class="btn" @click="exportPNG($event.target)">Exportar Imagem</button>
  </div>
</div>"""

content = content.replace(header_original, header_vue)

# 5. Replace Stats Bar with Vue syntax
stats_original = """<div class="stats-bar" id="statsBar">
  <div class="stat"><div class="stat-icon purple">📋</div><div class="stat-info"><span class="stat-val" id="statTasks">0</span><span class="stat-lbl">Tarefas</span></div></div>
  <div class="stat"><div class="stat-icon pink">📅</div><div class="stat-info"><span class="stat-val" id="statDays">0</span><span class="stat-lbl">Dias</span></div></div>
  <div class="stat"><div class="progress-donut" id="progressDonut" style="background:conic-gradient(var(--text3) 0deg, var(--surface3) 0deg)"><span class="donut-val" id="statProgress">0%</span></div><div class="stat-info"><span class="stat-lbl" style="margin-top:4px">Progresso</span></div></div>
  <div class="stat"><div class="stat-icon teal">🏁</div><div class="stat-info"><span class="stat-val" id="statEnd">--</span><span class="stat-lbl">Fim</span></div></div>
</div>"""

stats_vue = """<div class="stats-bar" id="statsBar">
  <div class="stat"><div class="stat-icon purple">📋</div><div class="stat-info"><span class="stat-val" id="statTasks">{{ tasksCount }}</span><span class="stat-lbl">Tarefas</span></div></div>
  <div class="stat"><div class="stat-icon pink">📅</div><div class="stat-info"><span class="stat-val" id="statDays">{{ daysCount }}</span><span class="stat-lbl">Dias</span></div></div>
  <div class="stat"><div class="progress-donut" id="progressDonut" :style="{background: donutBackground}"><span class="donut-val" id="statProgress">{{ projectProgress }}%</span></div><div class="stat-info"><span class="stat-lbl" style="margin-top:4px">Progresso</span></div></div>
  <div class="stat"><div class="stat-icon teal">🏁</div><div class="stat-info"><span class="stat-val" id="statEnd">{{ endDateFormatted }}</span><span class="stat-lbl">Fim</span></div></div>
</div>"""

content = content.replace(stats_original, stats_vue)

# 6. Replace Help Modal
help_modal_original = """<!-- Modal de Ajuda CSV -->
<div class="modal-overlay" id="helpModal" onclick="toggleHelp(false)">
  <div class="modal" onclick="event.stopPropagation()">
    <h3>Formato do Arquivo CSV</h3>
    <p>O arquivo deve ser um <code>.csv</code> usando <code>;</code> ou <code>,</code> como separador.</p>
    <p style="margin:8px 0 4px;font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Cabeçalho obrigatório:</p>
    <code style="display:block;background:var(--surface3);padding:8px 12px;border-radius:6px;font-size:12px;color:var(--accent2);margin-bottom:12px;border:1px solid var(--border)">id;task;percent;duration;predecessor;type</code>
    <table class="csv-example-table">
      <thead>
        <tr><th>id</th><th>task</th><th>percent</th><th>duration</th><th>predecessor</th><th>type</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>Levantamento</td><td>100</td><td>3</td><td></td><td></td></tr>
        <tr><td>2</td><td>Análise</td><td>50</td><td>2</td><td>1</td><td>FS</td></tr>
        <tr><td>3</td><td>Design</td><td>0</td><td>4</td><td>2</td><td>SS</td></tr>
        <tr><td>4</td><td>Marco Entrega</td><td>0</td><td>0</td><td>3</td><td>FS</td></tr>
      </tbody>
    </table>
    <div style="font-size:12px;line-height:1.8;margin-top:10px">
      <p style="margin:0">• <b>id:</b> Identificador numérico único da tarefa.</p>
      <p style="margin:0">• <b>task:</b> Nome descritivo da tarefa.</p>
      <p style="margin:0">• <b>percent:</b> Progresso de 0 a 100.</p>
      <p style="margin:0">• <b>duration:</b> Duração em dias úteis (0 = Milestone ◆).</p>
      <p style="margin:0">• <b>predecessor:</b> ID da tarefa predecessora (vazio se nenhuma).</p>
      <p style="margin:0">• <b>type:</b> Tipo de dependência — <code>FS</code> (Finish-to-Start) ou <code>SS</code> (Start-to-Start).</p>
    </div>
    <button class="btn" style="width:100%; margin-top:14px" onclick="toggleHelp(false)">Entendi</button>
  </div>
</div>"""

help_modal_vue = """<!-- Modal de Ajuda CSV -->
<div class="modal-overlay" id="helpModal" v-show="showHelpModal" @click="toggleHelp(false)" style="display: flex;">
  <div class="modal" @click.stop>
    <h3>Formato dos Arquivos CSV</h3>
    <p>Selecione múltiplos arquivos CSV juntos (ex: <code>tarefas.csv</code>, <code>metadata.csv</code>, <code>feriados.csv</code>).</p>
    <p style="margin:8px 0 4px;font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Cabeçalho de Tarefas:</p>
    <code style="display:block;background:var(--surface3);padding:8px 12px;border-radius:6px;font-size:12px;color:var(--accent2);margin-bottom:12px;border:1px solid var(--border)">id;task;percent;duration;predecessor;type</code>
    <button class="btn" style="width:100%; margin-top:14px" @click="toggleHelp(false)">Entendi</button>
  </div>
</div>"""

content = content.replace(help_modal_original, help_modal_vue)

# 7. Replace Holidays Modal
holidays_modal_original = """<!-- Modal de Feriados -->
<div class="modal-overlay" id="holidaysModal" onclick="toggleHolidaysModal(false)">
  <div class="modal" onclick="event.stopPropagation()">
    <h3>Gerenciar Feriados</h3>
    <p>Datas que serão ignoradas no cálculo de prazos e destacadas no gráfico.</p>
    
    <div class="add-holiday-form">
      <input type="date" id="newHolidayDate" style="width:140px">
      <input type="text" id="newHolidayName" placeholder="Nome (opcional)" style="flex:1">
      <button class="btn" onclick="addHolidayManual()" style="padding:0 12px">Adicionar</button>
    </div>

    <div class="holiday-list" id="holidayList">
      <!-- Feriados aparecerão aqui -->
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px">
      <button class="btn-secondary" onclick="fetchNationalHolidays()" id="btnFetchHolidays" title="Busca feriados nacionais do ano atual">
        <span>☁️</span> Importar Feriados Nacionais
      </button>
    </div>
    
    <div class="modal-footer">
      <button class="btn" onclick="toggleHolidaysModal(false)">Fechar e Aplicar</button>
    </div>
  </div>
</div>"""

holidays_modal_vue = """<!-- Modal de Feriados -->
<div class="modal-overlay" id="holidaysModal" v-show="showHolidaysModal" @click="toggleHolidaysModal(false)" style="display: flex;">
  <div class="modal" @click.stop>
    <h3>Gerenciar Feriados</h3>
    <p>Datas que serão ignoradas no cálculo de prazos e destacadas no gráfico.</p>
    
    <div class="add-holiday-form">
      <input type="date" v-model="newHolidayDate" style="width:140px">
      <input type="text" v-model="newHolidayName" placeholder="Nome (opcional)" style="flex:1" @keyup.enter="addHolidayManual">
      <button class="btn" @click="addHolidayManual" style="padding:0 12px">Adicionar</button>
    </div>

    <div class="holiday-list" id="holidayList">
      <div v-if="sortedHolidays.length === 0" style="padding:20px;text-align:center;color:var(--text3);font-size:12px">Nenhum feriado cadastrado.</div>
      <div v-for="holiday in sortedHolidays" :key="holiday.date" class="holiday-item">
        <span class="date">{{ holiday.formatted }}</span>
        <span class="name" :title="holiday.name">{{ holiday.name }}</span>
        <button class="btn-remove" @click="removeHoliday(holiday.date)" title="Remover">✕</button>
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px">
      <button class="btn-secondary" @click="fetchNationalHolidays" id="btnFetchHolidays" title="Busca feriados nacionais do ano atual" :disabled="isFetchingHolidays">
        <span>☁️</span> {{ isFetchingHolidays ? 'Buscando...' : 'Importar Feriados Nacionais' }}
      </button>
    </div>
    
    <div class="modal-footer">
      <button class="btn" @click="toggleHolidaysModal(false)">Fechar e Aplicar</button>
    </div>
  </div>
</div>"""

content = content.replace(holidays_modal_original, holidays_modal_vue)

# 8. Keyboard Hint
kbd_hint_original = """<!-- Keyboard Shortcuts Badge -->
<div class="kbd-hint" id="kbdHint" onclick="toggleKbdPanel()">
  <span class="kbd-icon">⌨</span> Atalhos
</div>
<div class="kbd-panel" id="kbdPanel">
  <h4>Atalhos de Teclado</h4>
  <div class="kbd-row"><span class="kbd-key">1</span><span class="kbd-desc">Zoom Dia</span></div>
  <div class="kbd-row"><span class="kbd-key">2</span><span class="kbd-desc">Zoom Semana</span></div>
  <div class="kbd-row"><span class="kbd-key">3</span><span class="kbd-desc">Zoom Mês</span></div>
  <div class="kbd-row"><span class="kbd-key">T</span><span class="kbd-desc">Alternar Tema</span></div>
  <div class="kbd-row"><span class="kbd-key">?</span><span class="kbd-desc">Ajuda CSV</span></div>
  <div class="kbd-row"><span class="kbd-key">E</span><span class="kbd-desc">Exportar PNG</span></div>
</div>"""

kbd_hint_vue = """<!-- Keyboard Shortcuts Badge -->
<div class="kbd-hint" id="kbdHint" @click.stop="toggleKbdPanel">
  <span class="kbd-icon">⌨</span> Atalhos
</div>
<div class="kbd-panel" id="kbdPanel" v-show="showKbdPanel" style="display: block;">
  <h4>Atalhos de Teclado</h4>
  <div class="kbd-row"><span class="kbd-key">1</span><span class="kbd-desc">Zoom Dia</span></div>
  <div class="kbd-row"><span class="kbd-key">2</span><span class="kbd-desc">Zoom Semana</span></div>
  <div class="kbd-row"><span class="kbd-key">3</span><span class="kbd-desc">Zoom Mês</span></div>
  <div class="kbd-row"><span class="kbd-key">T</span><span class="kbd-desc">Alternar Tema</span></div>
  <div class="kbd-row"><span class="kbd-key">?</span><span class="kbd-desc">Ajuda CSV</span></div>
  <div class="kbd-row"><span class="kbd-key">E</span><span class="kbd-desc">Exportar PNG</span></div>
</div>"""

content = content.replace(kbd_hint_original, kbd_hint_vue)

# Extract and rewrite JS script.
script_pattern = re.compile(r'<script>(.*?)</script>', re.DOTALL)
js_content = script_pattern.search(content).group(1)

# We will put our new Vue setup inside the script.
new_js = """
const { createApp, ref, reactive, computed, watch, onMounted, nextTick } = Vue;

const BAR_COLORS = [
  'linear-gradient(135deg,#6c5ce7,#a29bfe)', // Roxo
  'linear-gradient(135deg,#fd79a8,#fab1a0)', // Rosa/Laranja
  'linear-gradient(135deg,#0984e3,#74b9ff)', // Azul
  'linear-gradient(135deg,#e17055,#fab1a0)'  // Coral
];
const ROW_H = 34;
const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

createApp({
  setup() {
    // Estado Reativo
    const projectTitle = ref('Nome do Projeto');
    const folderName = ref('');
    const startDate = ref('2026-05-04');
    const zoomLevel = ref('day');
    const theme = ref('dark');
    const holidays = reactive({});
    
    // UI State
    const showHelpModal = ref(false);
    const showHolidaysModal = ref(false);
    const showKbdPanel = ref(false);
    const newHolidayDate = ref('');
    const newHolidayName = ref('');
    const isFetchingHolidays = ref(false);
    
    // Gantt Data
    const tasks = ref([]);
    const allDays = ref([]);
    const pMin = ref(null);
    const pMax = ref(null);
    
    // Computed Properties for Stats
    const tasksCount = computed(() => tasks.value.length);
    
    const isWorkingDay = (date) => {
      const w = date.getDay();
      if (w === 0 || w === 6) return false;
      const iso = date.toISOString().split('T')[0];
      return !holidays[iso];
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
    
    const daysCount = computed(() => {
      if(!pMin.value || !pMax.value) return 0;
      return getBusinessDayIndex(pMax.value, pMin.value) + 1;
    });
    
    const endDateFormatted = computed(() => {
      return pMax.value ? pMax.value.toLocaleDateString('pt-BR') : '--';
    });
    
    const projectProgress = computed(() => {
      let totalWorkDays = 0, completedWorkDays = 0;
      tasks.value.forEach(t => {
        if(t.duration > 0) {
          totalWorkDays += t.duration;
          completedWorkDays += (t.duration * (t.percent / 100));
        }
      });
      return totalWorkDays > 0 ? Math.round((completedWorkDays / totalWorkDays) * 100) : 0;
    });
    
    const donutBackground = computed(() => {
      const p = projectProgress.value;
      const deg = (p / 100) * 360;
      let color = '#ff6b6b';
      if(p > 70) color = '#00cec9';
      else if(p > 30) color = '#fdcb6e';
      return `conic-gradient(${color} ${deg}deg, var(--surface3) ${deg}deg)`;
    });
    
    const sortedHolidays = computed(() => {
      return Object.keys(holidays).sort().map(date => {
        const parts = date.split('-');
        return {
          date,
          name: holidays[date],
          formatted: `${parts[2]}/${parts[1]}/${parts[0]}`
        };
      });
    });

    // Helper functions
    function parseDate(s){ const d=new Date(s+'T00:00:00'); return isNaN(d)?null:d; }
    function isWeekend(d){ const w=d.getDay(); return w===0||w===6; }
    function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
    
    // Core Logic
    const parseCSV = (text) => {
      const cleanText = text.replace(/^\\ufeff/, "").trim();
      const lines = cleanText.split(/\\r?\\n/);
      if(lines.length<2) return [];
      
      const delim = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(delim).map(h=>h.trim().toLowerCase());
      const result = [];
      
      for(let i=1;i<lines.length;i++){
        if(!lines[i].trim()) continue;
        
        const vals = [];
        let cur = '', inQuote = false;
        for(let c=0; c<lines[i].length; c++){
          const char = lines[i][c];
          if(char === '"') inQuote = !inQuote;
          else if(char === delim && !inQuote) { vals.push(cur.trim()); cur=''; }
          else cur += char;
        }
        vals.push(cur.trim());

        const obj={};
        headers.forEach((h,j)=> obj[h]=vals[j]||'');
        
        const taskId = parseInt(obj.id) || i;
        const taskName = obj.task || obj.tarefa || obj.name || 'Tarefa '+i;
        const taskPercent = parseInt(obj.percent || obj.concluido || obj.percentagem || 0);
        const taskDuration = parseInt(obj.duration || obj.dias || obj.duracao || 0);
        const taskPred = obj.predecessor || obj.predecessora || '';
        
        result.push({
          id: taskId,
          task: taskName,
          percent: isNaN(taskPercent) ? 0 : taskPercent,
          duration: isNaN(taskDuration) ? 0 : taskDuration,
          predecessor: taskPred,
          type: (obj.type || 'FS').toUpperCase()
        });
      }
      return result;
    };

    const processMetadata = (text) => {
      const cleanText = text.replace(/^\\ufeff/, "").trim();
      const lines = cleanText.split(/\\r?\\n/);
      if(lines.length < 2) return;
      const delim = lines[0].includes(';') ? ';' : ',';
      
      for(let i=1; i<lines.length; i++){
        if(!lines[i].trim()) continue;
        const vals = lines[i].split(delim);
        const key = vals[0]?.trim();
        const value = vals[1]?.trim();
        if(key === 'projeto') projectTitle.value = value;
        if(key === 'inicio') startDate.value = value;
        if(key === 'zoom') zoomLevel.value = value;
      }
    };
    
    const processFeriados = (text) => {
      const cleanText = text.replace(/^\\ufeff/, "").trim();
      const lines = cleanText.split(/\\r?\\n/);
      if(lines.length < 2) return;
      const delim = lines[0].includes(';') ? ';' : ',';
      
      for(let i=1; i<lines.length; i++){
        if(!lines[i].trim()) continue;
        const vals = lines[i].split(delim);
        const date = vals[0]?.trim();
        const name = vals[1]?.trim() || 'Feriado';
        if(date) holidays[date] = name;
      }
    };

    const calculateSchedule = (taskList, start) => {
      if(!taskList.length || !start) return;
      const map = {};
      taskList.forEach(t=>{ t.start=null; t.end=null; map[t.id]=t; });
      const stack = new Set();

      function resolve(t){
        if(!t || t.start) return;
        if(stack.has(t.id)){
          t.start = new Date(start);
        } else {
          stack.add(t.id);
          if(!t.predecessor){
            t.start = new Date(start);
          } else {
            const predStrs = String(t.predecessor).match(/\\d+/g) || [];
            let maxStart = new Date(start);
            let hasValidPred = false;
            
            predStrs.forEach(pStr => {
              const predId = parseInt(pStr);
              if(map[predId]) {
                const pred = map[predId];
                resolve(pred);
                const candidateStart = t.type==='SS' ? new Date(pred.start) : addWorkingDays(pred.start, pred.duration);
                if(candidateStart > maxStart) maxStart = candidateStart;
                hasValidPred = true;
              }
            });
            
            t.start = hasValidPred ? maxStart : new Date(start);
          }
          stack.delete(t.id);
        }
        while(!isWorkingDay(t.start)) t.start = addDays(t.start, 1);
        t.end = t.duration <= 0 ? new Date(t.start) : addWorkingDays(t.start, t.duration - 1);
      }
      taskList.forEach(resolve);
    };
    
    const handleFiles = async (e) => {
      const files = e.target.files;
      if(!files || files.length === 0) return;
      
      let metadataText = null;
      let feriadosText = null;
      let tarefasText = null;
      
      folderName.value = files.length > 1 ? `${files.length} arquivos` : files[0].name;
      
      for(let i=0; i<files.length; i++){
        const file = files[i];
        const text = await file.text();
        const name = file.name.toLowerCase();
        
        if(name.includes('metadata')) {
          metadataText = text;
        } else if(name.includes('feriados')) {
          feriadosText = text;
        } else {
          tarefasText = text;
          if(files.length === 1) {
            projectTitle.value = file.name.replace(/\\.[^/.]+$/, "").replace(/[-_]/g, " ");
            projectTitle.value = projectTitle.value.charAt(0).toUpperCase() + projectTitle.value.slice(1);
          }
        }
      }
      
      if(metadataText) processMetadata(metadataText);
      if(feriadosText) processFeriados(feriadosText);
      
      if(tarefasText) {
        localStorage.setItem('gantt_csv', tarefasText);
        reload(tarefasText);
      } else if (metadataText || feriadosText) {
        const savedCsv = localStorage.getItem('gantt_csv');
        if(savedCsv) reload(savedCsv);
      }
      
      saveToStorage();
    };

    const reload = (csvText) => {
      const text = csvText || localStorage.getItem('gantt_csv');
      if(!text) return;
      
      try {
        const parsedTasks = parseCSV(text);
        if(!parsedTasks.length) {
          alert("O arquivo de tarefas está vazio ou inválido.");
          tasks.value = [];
          document.getElementById('ganttWrapper').innerHTML = '';
          return;
        }
        
        const start = parseDate(startDate.value) || new Date();
        calculateSchedule(parsedTasks, start);
        
        let minT = null, maxT = null;
        parsedTasks.forEach(t => {
          if(!minT || t.start < minT) minT = t.start;
          if(!maxT || t.end > maxT) maxT = t.end;
        });
        
        if(!minT || !maxT) throw new Error("Erro nas datas");
        
        pMin.value = minT;
        pMax.value = maxT;
        tasks.value = parsedTasks;
        
        let d = new Date(minT); d = addDays(d, -2);
        let limit = new Date(maxT); limit = addDays(limit, 5);
        
        const days = [];
        let safety = 0;
        while(d <= limit && safety < 2000){
          days.push(new Date(d));
          d = addDays(d, 1);
          safety++;
        }
        allDays.value = days;
        
        nextTick(() => {
          renderGantt();
        });
        
      } catch(e) {
        console.error(e);
        alert("Erro: " + e.message);
      }
    };
    
    // --- Legacy Rendering Functions ---
    const renderGantt = () => {
      const wrapper = document.getElementById('ganttWrapper');
      wrapper.innerHTML = '';
      if(!tasks.value.length) { showEmptyState(); return; }

      let COL_W = zoomLevel.value === 'day' ? 30 : (zoomLevel.value === 'week' ? 60 : 100);

      const getPos = (date) => {
        const dayIdx = allDays.value.findIndex(d => d.getTime() >= date.getTime());
        if(zoomLevel.value === 'day') return dayIdx * COL_W;
        if(zoomLevel.value === 'week') return (dayIdx / 7) * COL_W;
        const startM = allDays.value[0];
        const monthsDiff = (date.getFullYear() - startM.getFullYear()) * 12 + (date.getMonth() - startM.getMonth());
        const dayInMonth = date.getDate();
        return (monthsDiff * COL_W) + (dayInMonth / 30 * COL_W);
      };

      const getBarWidth = (start, end, duration) => {
        if(duration === 0) return 0;
        const s = getPos(start);
        const e = getPos(end) + (zoomLevel.value === 'day' ? COL_W : (COL_W/7));
        return Math.max(18, e - s - 4);
      };

      const tl = document.createElement('div'); tl.className='task-list'; tl.id='taskList';
      const savedW = localStorage.getItem('gantt_tl_width') || '450px';
      tl.style.width = savedW;

      const tlh = document.createElement('div'); tlh.className='tl-header';
      tlh.innerHTML='<span>#</span><span>Tarefa</span><span>%</span><span>Dias</span><span>Pred</span>';
      tl.appendChild(tlh);
      tasks.value.forEach(t=> {
        const r=document.createElement('div'); r.className='tl-row';
        r.dataset.taskId = t.id;
        if(t.duration === 0) r.classList.add('is-milestone');
        r.innerHTML=`<span>${t.id}</span><span class="name" title="${t.task}">${t.task}</span><span>${t.duration===0?'-':t.percent+'%'}</span><span style="color:var(--accent2)">${t.duration}d</span><span>${t.predecessor||'-'}</span>`;
        tl.appendChild(r);
      });

      const resizer = document.createElement('div');
      resizer.className = 'resizer';
      resizer.id = 'resizer';
      resizer.style.left = savedW;

      const ca = document.createElement('div'); ca.className='chart-area';
      const columns = [];
      if(zoomLevel.value === 'day') {
        allDays.value.forEach(d => {
          const iso = d.toISOString().split('T')[0];
          const holName = holidays[iso];
          columns.push({ label: d.getDate(), subLabel: DAYS_PT[d.getDay()].charAt(0), isWeekend: isWeekend(d), isHoliday: !!holName, holidayName: holName, date: d });
        });
      } else if(zoomLevel.value === 'week') {
        for(let i=0; i<allDays.value.length; i+=7) {
          const d = allDays.value[i];
          columns.push({ label: 'S'+(Math.floor(i/7)+1), subLabel: d.getDate()+'/'+(d.getMonth()+1), isWeekend: false, date: d });
        }
      } else {
        let lastM = -1;
        allDays.value.forEach(d => {
          if(d.getMonth() !== lastM) {
            columns.push({ label: MONTHS_PT[d.getMonth()], subLabel: d.getFullYear(), isWeekend: false, date: d });
            lastM = d.getMonth();
          }
        });
      }

      const mRow = document.createElement('div'); mRow.className='ch-month-row';
      if(zoomLevel.value === 'day') {
        let curM = -1, mSpan = null;
        allDays.value.forEach(d=> {
          if(d.getMonth()!==curM){
            if(mSpan) mRow.appendChild(mSpan);
            mSpan=document.createElement('div'); mSpan.className='ch-month';
            mSpan.textContent=MONTHS_PT[d.getMonth()]+' '+d.getFullYear();
            mSpan.style.minWidth=COL_W+'px'; curM=d.getMonth();
          } else { mSpan.style.minWidth=(parseInt(mSpan.style.minWidth)+COL_W)+'px'; }
        });
        if(mSpan) mRow.appendChild(mSpan);
      } else {
        mRow.style.display = 'none';
      }
      ca.appendChild(mRow);

      const dh = document.createElement('div'); dh.className='ch-header';
      if(zoomLevel.value !== 'day') { dh.style.height = 'var(--header-h)'; dh.style.top = '0'; }
      columns.forEach(c => {
        const cell=document.createElement('div'); cell.className='ch-day';
        cell.style.minWidth = COL_W + 'px';
        if(c.isWeekend) cell.classList.add('weekend');
        if(c.isHoliday) { cell.classList.add('holiday'); cell.title = c.holidayName; }
        cell.innerHTML=`<span>${c.subLabel}</span><span>${c.label}</span>`;
        dh.appendChild(cell);
      });
      ca.appendChild(dh);

      const rowsContainer = document.createElement('div'); rowsContainer.style.position='relative';
      
      const showTooltip = (e) => {
        const t = tasks.value[e.target.dataset.idx];
        if(!t) return;
        const tip = document.getElementById('tooltip');
        const bizDays = t.duration > 0 ? t.duration : 0;
        const depType = t.predecessor ? (t.type || 'FS') : '';
        const depBadge = depType ? `<span class="tip-badge">${depType}</span>` : '';
        let pColor = '#ff6b6b';
        if(t.percent > 70) pColor = '#00cec9';
        else if(t.percent > 30) pColor = '#fdcb6e';
        tip.innerHTML=`<h4 style="color:var(--accent2);font-size:13px;margin-bottom:8px;font-weight:700">${t.task}${depBadge}</h4>
          <div class="tip-row"><span class="tip-label">Início:</span><span class="tip-value">${t.start.toLocaleDateString('pt-BR')}</span></div>
          <div class="tip-row"><span class="tip-label">Fim:</span><span class="tip-value">${t.end.toLocaleDateString('pt-BR')}</span></div>
          <div class="tip-row"><span class="tip-label">Duração:</span><span class="tip-value">${bizDays} dia${bizDays!==1?'s':''} útei${bizDays!==1?'s':''}</span></div>
          <div class="tip-row"><span class="tip-label">Progresso:</span><span class="tip-value">${t.percent}%</span></div>
          <div class="tip-progress-track"><div class="tip-progress-fill" style="width:${t.percent}%;background:${pColor}"></div></div>`;
        tip.style.display='block';
        const tipW = tip.offsetWidth || 220; const tipH = tip.offsetHeight || 120;
        let posX = e.clientX + 16; let posY = e.clientY - 10;
        if(posX + tipW > window.innerWidth - 12) posX = e.clientX - tipW - 12;
        if(posY + tipH > window.innerHeight - 12) posY = window.innerHeight - tipH - 12;
        if(posY < 8) posY = 8;
        tip.style.left = posX + 'px'; tip.style.top = posY + 'px';
      };
      const hideTooltip = () => { document.getElementById('tooltip').style.display='none'; };

      tasks.value.forEach((t,i)=> {
        const row=document.createElement('div'); row.className='ch-row';
        row.dataset.taskId = t.id;
        columns.forEach(c => {
          const cDiv=document.createElement('div'); cDiv.className='ch-cell';
          cDiv.style.minWidth = COL_W + 'px';
          if(c.isWeekend) cDiv.classList.add('weekend'); 
          if(c.isHoliday) cDiv.classList.add('holiday');
          if(c.isHoliday) cDiv.title = c.holidayName;
          row.appendChild(cDiv);
        });
        
        const x = getPos(t.start);
        if(t.duration===0){
          const ms=document.createElement('div'); ms.className='milestone';
          ms.style.left=(x + (zoomLevel.value==='day'?COL_W/2:10) - 7)+'px'; 
          ms.dataset.idx = i;
          ms.style.background = '#ff9f43'; ms.style.borderColor = '#fff';
          ms.style.animationDelay = (i * 30) + 'ms';
          ms.addEventListener('mouseenter', showTooltip); ms.addEventListener('mouseleave', hideTooltip);
          row.appendChild(ms);
        } else {
          const w = getBarWidth(t.start, t.end, t.duration);
          const bar=document.createElement('div'); bar.className='bar';
          bar.style.left=(x+2)+'px'; bar.style.width=w+'px';
          bar.style.animationDelay = (i * 30) + 'ms';
          
          let baseColor = BAR_COLORS[i%BAR_COLORS.length];
          if (t.percent >= 100) baseColor = 'var(--success)';
          
          const bg=document.createElement('div');
          bg.style.position='absolute'; bg.style.inset='0';
          bg.style.background = '#3d4457'; bg.style.border = '1px solid var(--border)';
          bg.style.borderRadius = '4px'; bar.appendChild(bg);
          
          if(t.percent > 0) {
            const p=document.createElement('div'); p.className='bar-progress';
            p.style.width=t.percent+'%'; p.style.background=baseColor;
            bar.appendChild(p); 
          }
          const lbl = document.createElement('span'); lbl.className='bar-label';
          lbl.textContent = t.percent + '%'; bar.appendChild(lbl);
          bar.dataset.idx = i;
          bar.addEventListener('mouseenter', showTooltip); bar.addEventListener('mouseleave', hideTooltip);
          row.appendChild(bar);
        }
        rowsContainer.appendChild(row);
      });

      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.classList.add('dep-svg');
      svg.setAttribute('width', allDays.value.length * COL_W);
      svg.setAttribute('height', tasks.value.length * ROW_H);
      
      const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
      const marker = document.createElementNS('http://www.w3.org/2000/svg','marker');
      marker.setAttribute('id','arrow'); marker.setAttribute('viewBox','0 0 10 10');
      marker.setAttribute('refX','8'); marker.setAttribute('refY','5');
      marker.setAttribute('markerWidth','6'); marker.setAttribute('markerHeight','6');
      marker.setAttribute('orient','auto-start-reverse');
      const poly = document.createElementNS('http://www.w3.org/2000/svg','path');
      poly.setAttribute('d','M 0 0 L 10 5 L 0 10 z'); poly.setAttribute('fill','#6c5ce7');
      marker.appendChild(poly); defs.appendChild(marker); svg.appendChild(defs);

      tasks.value.forEach((t,i)=>{
        if(!t.predecessor) return;
        const predStrs = String(t.predecessor).match(/\\d+/g) || [];
        
        predStrs.forEach(pStr => {
          const predIdx = tasks.value.findIndex(x=>x.id===parseInt(pStr));
          if(predIdx<0) return;
          const pred = tasks.value[predIdx];
          
          const pEnd = t.type==='SS' ? getPos(pred.start) + 5 : getPos(pred.end) + (zoomLevel.value==='day'?COL_W:5);
          const tStart = getPos(t.start);
          
          const path = document.createElementNS('http://www.w3.org/2000/svg','path');
          const y1 = predIdx * ROW_H + ROW_H/2, y2 = i * ROW_H + ROW_H/2;
          path.setAttribute('d',`M${pEnd},${y1} C${pEnd+15},${y1} ${tStart-15},${y2} ${tStart},${y2}`);
          path.setAttribute('fill','none'); path.setAttribute('stroke','#6c5ce7');
          path.setAttribute('stroke-width','1.5'); path.setAttribute('marker-end','url(#arrow)');
          path.setAttribute('opacity','0.4');
          svg.appendChild(path);
        });
      });
      rowsContainer.appendChild(svg);

      const today = new Date(); today.setHours(0,0,0,0);
      const todayX = getPos(today);
      if(todayX >= 0 && todayX <= (allDays.value.length * COL_W)){
        const tLine = document.createElement('div');
        tLine.className = 'today-line';
        tLine.style.left = todayX + 'px';
        tLine.style.height = (tasks.value.length * ROW_H) + 'px';
        const badge = document.createElement('div');
        badge.className = 'today-label'; badge.textContent = 'HOJE';
        tLine.appendChild(badge);
        rowsContainer.appendChild(tLine);
      }

      ca.appendChild(rowsContainer); 
      ca.addEventListener('scroll', () => { tl.scrollTop = ca.scrollTop; });

      wrapper.appendChild(tl); 
      wrapper.appendChild(resizer);
      wrapper.appendChild(ca);

      let isResizing = false;
      resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });
      window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const offset = tl.getBoundingClientRect().left;
        const newWidth = e.clientX - offset;
        if (newWidth > 150 && newWidth < 800) {
          tl.style.width = newWidth + 'px';
          resizer.style.left = newWidth + 'px';
        }
      });
      window.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          resizer.classList.remove('active');
          document.body.style.cursor = 'default';
          document.body.style.userSelect = 'auto';
          localStorage.setItem('gantt_tl_width', tl.style.width);
        }
      });

      const allTlRows = document.querySelectorAll('.tl-row[data-task-id]');
      const allChRows = document.querySelectorAll('.ch-row[data-task-id]');
      const highlight = (taskId) => document.querySelectorAll(`[data-task-id="${taskId}"]`).forEach(el => el.classList.add('row-highlight'));
      const unhighlight = (taskId) => document.querySelectorAll(`[data-task-id="${taskId}"]`).forEach(el => el.classList.remove('row-highlight'));
      allTlRows.forEach(row => {
        row.addEventListener('mouseenter', () => highlight(row.dataset.taskId));
        row.addEventListener('mouseleave', () => unhighlight(row.dataset.taskId));
      });
      allChRows.forEach(row => {
        row.addEventListener('mouseenter', () => highlight(row.dataset.taskId));
        row.addEventListener('mouseleave', () => unhighlight(row.dataset.taskId));
      });
    };

    const showEmptyState = () => {
      const wrapper = document.getElementById('ganttWrapper');
      wrapper.innerHTML = `
        <div class="empty-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text3)">
          <h2 style="margin-bottom: 10px;">Nenhum projeto carregado</h2>
          <p style="margin-bottom: 20px;">Selecione um arquivo de tarefas CSV, e opcionalmente os de metadados e feriados.</p>
          <button class="btn" onclick="document.getElementById('csvFile').click()">
            <span>📂</span> Selecionar CSVs
          </button>
        </div>`;
    };

    // Actions
    const updateProjectTitle = (e) => {
      projectTitle.value = e.target.textContent;
      saveToStorage();
    };

    const setZoom = (level) => {
      zoomLevel.value = level;
      saveToStorage();
      renderGantt();
    };

    const toggleTheme = () => {
      theme.value = theme.value === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', theme.value);
      saveToStorage();
    };

    const toggleHelp = (show) => showHelpModal.value = show;
    const toggleHolidaysModal = (show) => showHolidaysModal.value = show;
    const toggleKbdPanel = () => {
        // Prevent toggle off and then immediate open from outside click
        showKbdPanel.value = !showKbdPanel.value;
    };

    const addHolidayManual = () => {
      if(!newHolidayDate.value) { alert("Selecione uma data."); return; }
      holidays[newHolidayDate.value] = newHolidayName.value || 'Feriado';
      newHolidayDate.value = '';
      newHolidayName.value = '';
      saveToStorage();
      reload();
    };

    const removeHoliday = (date) => {
      delete holidays[date];
      saveToStorage();
      reload();
    };

    const fetchNationalHolidays = async () => {
      if(!startDate.value) { alert("Defina uma data de início primeiro."); return; }
      const year = startDate.value.split('-')[0];
      try {
        isFetchingHolidays.value = true;
        const resp = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
        if(!resp.ok) throw new Error();
        const data = await resp.json();
        let added = 0;
        data.forEach(h => {
          if(!holidays[h.date]) { holidays[h.date] = h.name; added++; }
        });
        alert(`${added} novos feriados nacionais importados para ${year}.`);
        saveToStorage();
        reload();
      } catch(e) {
        alert("Erro ao buscar feriados.");
      } finally {
        isFetchingHolidays.value = false;
      }
    };

    const showLoading = (msg) => {
      const overlay = document.createElement('div');
      overlay.className = 'loading-overlay'; overlay.id = 'loadingOverlay';
      overlay.innerHTML = `<div class="loading-content"><div class="loading-spinner"></div><div class="loading-text">${msg}</div></div>`;
      document.body.appendChild(overlay);
    };
    const hideLoading = () => {
      const el = document.getElementById('loadingOverlay');
      if(el) el.remove();
    };

    const exportPNG = (btnTarget) => {
      const chart = document.getElementById('ganttWrapper');
      const originalText = btnTarget.textContent;
      btnTarget.textContent = "Processando...";
      btnTarget.disabled = true;
      showLoading('Gerando imagem...');
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      
      html2canvas(chart, { backgroundColor: bgColor, scale: 2, logging: false, useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Gantt_${projectTitle.value.replace(/\\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        btnTarget.textContent = originalText;
        btnTarget.disabled = false;
        hideLoading();
      }).catch(err => {
        alert("Erro ao gerar imagem.");
        btnTarget.textContent = originalText;
        btnTarget.disabled = false;
        hideLoading();
      });
    };

    // Persistence
    const saveToStorage = () => {
      localStorage.setItem('gantt_title', projectTitle.value);
      localStorage.setItem('gantt_start', startDate.value);
      localStorage.setItem('gantt_holidays', JSON.stringify(holidays));
      localStorage.setItem('gantt_theme', theme.value);
      localStorage.setItem('gantt_zoom', zoomLevel.value);
    };

    const loadFromStorage = () => {
      const stTheme = localStorage.getItem('gantt_theme');
      if(stTheme) {
        theme.value = stTheme;
        document.documentElement.setAttribute('data-theme', stTheme);
      }
      const stTitle = localStorage.getItem('gantt_title');
      if(stTitle) projectTitle.value = stTitle;
      const stStart = localStorage.getItem('gantt_start');
      if(stStart) startDate.value = stStart;
      const stZoom = localStorage.getItem('gantt_zoom');
      if(stZoom) zoomLevel.value = stZoom;
      const stHols = localStorage.getItem('gantt_holidays');
      if(stHols) {
        try {
          const parsed = JSON.parse(stHols);
          for(const [k,v] of Object.entries(parsed)) holidays[k] = v;
        } catch(e){}
      }
      reload();
    };

    watch(startDate, () => { saveToStorage(); reload(); });

    onMounted(() => {
      loadFromStorage();
      
      document.addEventListener('keydown', (e) => {
        const tag = e.target.tagName;
        if(tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
        switch(e.key) {
          case '1': setZoom('day'); break;
          case '2': setZoom('week'); break;
          case '3': setZoom('month'); break;
          case 't': case 'T': toggleTheme(); break;
          case 'h': case 'H': toggleHolidaysModal(!showHolidaysModal.value); break;
          case '?': toggleHelp(!showHelpModal.value); break;
          case 'e': case 'E':
            const exportBtn = document.querySelector('.btn[onclick*="exportPNG"]');
            if(exportBtn && !exportBtn.disabled) exportPNG(exportBtn);
            break;
          case 'Escape':
            showHelpModal.value = false;
            showHolidaysModal.value = false;
            showKbdPanel.value = false;
            break;
        }
      });
      
      // Close kbd panel on click outside
      document.addEventListener('click', (e) => {
        const panel = document.getElementById('kbdPanel');
        const hint = document.getElementById('kbdHint');
        if(showKbdPanel.value && panel && !panel.contains(e.target) && hint && !hint.contains(e.target)) {
          showKbdPanel.value = false;
        }
      });
    });

    return {
      projectTitle, folderName, startDate, zoomLevel,
      showHelpModal, showHolidaysModal, showKbdPanel,
      newHolidayDate, newHolidayName, sortedHolidays, isFetchingHolidays,
      tasksCount, daysCount, projectProgress, endDateFormatted, donutBackground,
      updateProjectTitle, setZoom, toggleTheme, toggleHelp, toggleHolidaysModal, toggleKbdPanel,
      addHolidayManual, removeHoliday, fetchNationalHolidays, handleFiles, exportPNG
    };
  }
}).mount('#app');
"""

content = script_pattern.sub(f'<script>{new_js}</script>', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
