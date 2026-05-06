import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
style_content = style_match.group(1) if style_match else ''

html_template = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gantt Chart - Vue 3 + File System</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
<style>
{style_content}
[v-cloak] { display: none; }
</style>
</head>
<body>
<div id="app" v-cloak>
  <div class="header">
    <div class="header-left">
      <h1 title="Nome do projeto">{{ projectMetadata.name || 'Gantt Project' }}</h1>
      <p>Gerente: {{ projectMetadata.manager || '-' }} | Início: {{ projectMetadata.startDate || '-' }}</p>
    </div>
    <div class="controls">
      <button class="btn" @click="openProjectFolder">📂 Abrir Pasta do Projeto</button>
      
      <div class="control-group" v-if="hasFolder">
        <label>Zoom</label>
        <div style="display:flex; background:var(--surface3); border-radius:6px; padding:2px; border:1px solid var(--border); height:36px">
          <button @click="setZoom('day')" :class="['btn-zoom', zoomLevel==='day'?'active':'']">Dia</button>
          <button @click="setZoom('week')" :class="['btn-zoom', zoomLevel==='week'?'active':'']">Sem</button>
          <button @click="setZoom('month')" :class="['btn-zoom', zoomLevel==='month'?'active':'']">Mês</button>
        </div>
      </div>
      
      <button class="btn-theme" @click="toggleTheme" title="Alternar entre tema Claro e Escuro">🌓</button>
      <!-- <button class="btn-theme" @click="showHolidaysModal=true" title="Gerenciar Feriados" style="font-size:14px" v-if="hasFolder">📅</button> -->
      <button class="btn" @click="exportPNG" v-if="hasFolder">Exportar Imagem</button>
    </div>
  </div>

  <div class="stats-bar" v-if="hasFolder">
    <div class="stat"><div class="stat-icon purple">📋</div><div class="stat-info"><span class="stat-val">{{ tasks.length }}</span><span class="stat-lbl">Tarefas</span></div></div>
    <div class="stat"><div class="stat-icon pink">📅</div><div class="stat-info"><span class="stat-val">{{ stats.days }}</span><span class="stat-lbl">Dias</span></div></div>
    <div class="stat"><div class="progress-donut" :style="{background: donutBg}"><span class="donut-val">{{ stats.progress }}%</span></div><div class="stat-info"><span class="stat-lbl" style="margin-top:4px">Progresso</span></div></div>
    <div class="stat"><div class="stat-icon teal">🏁</div><div class="stat-info"><span class="stat-val">{{ stats.endDate }}</span><span class="stat-lbl">Fim</span></div></div>
  </div>

  <!-- Gantt Wrapper -->
  <div class="gantt-wrapper" id="ganttWrapper" v-if="hasFolder">
    <!-- Task List -->
    <div class="task-list" :style="{ width: taskListWidth + 'px' }" id="taskList">
      <div class="tl-header">
        <span>#</span><span>Tarefa</span><span>%</span><span>Dias</span><span>Pred</span>
      </div>
      <div v-for="t in tasks" :key="t.id" :class="['tl-row', t.duration===0?'is-milestone':'', hoverTaskId===t.id?'row-highlight':'']" @mouseenter="hoverTaskId=t.id" @mouseleave="hoverTaskId=null">
        <span>{{ t.id }}</span>
        <span class="name" :title="t.task">{{ t.task }}</span>
        <span>{{ t.duration===0?'-':t.percent+'%' }}</span>
        <span style="color:var(--accent2)">{{ t.duration }}d</span>
        <span>{{ t.predecessor || '-' }}</span>
      </div>
    </div>
    
    <div class="resizer" @mousedown="startResize"></div>

    <!-- Chart Area -->
    <div class="chart-area" id="chartArea" @scroll="syncScroll">
      <div class="ch-month-row" v-if="zoomLevel==='day'">
        <div v-for="m in chartMonths" :key="m.label" class="ch-month" :style="{minWidth: m.width+'px'}">{{ m.label }}</div>
      </div>
      <div class="ch-header" :style="zoomLevel!=='day' ? {height:'var(--header-h)', top:0} : {}">
        <div v-for="c in chartColumns" :key="c.id" :class="['ch-day', c.isWeekend?'weekend':'', c.isHoliday?'holiday':'']" :title="c.holidayName" :style="{minWidth: colWidth+'px', maxWidth: colWidth+'px'}">
          <span>{{ c.subLabel }}</span>
          <span>{{ c.label }}</span>
        </div>
      </div>
      
      <div style="position:relative">
        <div v-for="(t, i) in tasks" :key="t.id" :class="['ch-row', hoverTaskId===t.id?'row-highlight':'']" @mouseenter="hoverTaskId=t.id" @mouseleave="hoverTaskId=null">
           <div v-for="c in chartColumns" :key="c.id" :class="['ch-cell', c.isWeekend?'weekend':'', c.isHoliday?'holiday':'']" :title="c.holidayName" :style="{minWidth: colWidth+'px', maxWidth: colWidth+'px'}"></div>
           
           <div v-if="t.duration===0" class="milestone" :style="{left: getMilestoneLeft(t, i) + 'px', background: '#ff9f43', borderColor: '#fff'}" @mouseenter="showTooltip($event, t)" @mouseleave="hideTooltip"></div>
           
           <div v-else class="bar" :style="{left: getBarLeft(t, i) + 'px', width: getBarWidthPx(t) + 'px'}" @mouseenter="showTooltip($event, t)" @mouseleave="hideTooltip">
              <div style="position:absolute; inset:0; background:#3d4457; border:1px solid var(--border); border-radius:4px;"></div>
              <div v-if="t.percent > 0" class="bar-progress" :style="{width: t.percent+'%', background: getBarColor(t, i)}"></div>
              <span class="bar-label">{{ t.percent }}%</span>
           </div>
        </div>
        
        <!-- Arrows SVG -->
        <svg class="dep-svg" :width="chartColumns.length * colWidth" :height="tasks.length * 34" style="pointer-events:none; z-index:0; position:absolute; top:0; left:0;">
           <defs>
             <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
               <path d="M 0 0 L 10 5 L 0 10 z" fill="#6c5ce7"></path>
             </marker>
           </defs>
           <path v-for="(path, idx) in arrowPaths" :key="idx" :d="path" fill="none" stroke="#6c5ce7" stroke-width="1.5" marker-end="url(#arrow)" opacity="0.4"></path>
        </svg>

        <!-- Today Line -->
        <div v-if="todayX >= 0" class="today-line" :style="{left: todayX+'px', height: (tasks.length * 34) + 'px'}">
           <div class="today-label">HOJE</div>
        </div>
      </div>
    </div>
  </div>

  <div class="empty-state" v-else>
    <h2>Nenhum projeto carregado</h2>
    <p>Clique no botão acima para selecionar a pasta do seu projeto contendo os arquivos CSV (projeto.csv, feriados.csv, tarefas.csv).</p>
  </div>
</div>

<script src="./vue_app.js"></script>
</body>
</html>
"""

new_html = html_template.replace('{style_content}', style_content)

with open('index_vue.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Created index_vue.html")
