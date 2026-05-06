<script setup>
import { inject, computed, ref } from 'vue';

const gantt = inject('gantt');
const openTaskModal = inject('openTaskModal');
const {
  tasks, chartColumns, chartMonths, colWidth, arrowPaths, todayX,
  getBarLeft, getMilestoneLeft, getBarWidthPx, getBarColor,
  getRealBarLeft, getRealBarWidthPx, parseDate
} = gantt;

const ROW_H = 34;

const totalWidth = computed(() => {
  return chartColumns.value.length * colWidth.value;
});

const svgHeight = computed(() => {
  return tasks.value.length * ROW_H;
});

</script>

<template>
  <div class="chart-area d-flex flex-column h-100 position-relative">
    
    <!-- Header: Mêses e Dias -->
    <div class="chart-header sticky-top" style="z-index: 5; background-color: rgb(var(--v-theme-surface)); border-bottom: 2px solid rgba(var(--v-border-color), 0.2);">
      
      <!-- Linha de Meses -->
      <div class="d-flex" v-if="chartMonths.value?.length">
        <div v-for="(m, i) in chartMonths.value" :key="'m'+i"
             class="text-center font-weight-bold py-1 text-caption"
             :style="{ width: m.width + 'px', borderRight: '1px solid rgba(var(--v-border-color), 0.1)' }">
          {{ m.label }}
        </div>
      </div>
      
      <!-- Linha de Dias/Semanas -->
      <div class="d-flex position-relative">
        <div v-for="c in chartColumns.value" :key="c.id"
             class="d-flex flex-column align-center justify-center py-1"
             :class="{ 'bg-grey-lighten-4': c.isWeekend, 'bg-error-lighten-5': c.isHoliday }"
             :style="{ width: colWidth.value + 'px', borderRight: '1px solid rgba(var(--v-border-color), 0.1)', height: '40px' }"
             :title="c.holidayName || c.date.toLocaleDateString()">
          <span class="text-caption font-weight-bold" :class="{'text-error': c.isWeekend || c.isHoliday}">{{ c.label }}</span>
          <span class="text-micro text-medium-emphasis" v-if="c.subLabel">{{ c.subLabel }}</span>
        </div>
      </div>
    </div>

    <!-- Corpo do Gráfico -->
    <div class="chart-body position-relative flex-grow-1" :style="{ width: totalWidth + 'px', minHeight: svgHeight + 'px' }">
      
      <!-- Background Grid -->
      <div class="bg-grid position-absolute w-100 h-100 d-flex pointer-events-none" style="top: 0; left: 0;">
        <div v-for="c in chartColumns.value" :key="'bg'+c.id"
             :class="{ 'bg-grey-lighten-4': c.isWeekend, 'bg-error-lighten-5': c.isHoliday }"
             :style="{ width: colWidth.value + 'px', borderRight: '1px dashed rgba(var(--v-border-color), 0.1)' }">
        </div>
      </div>

      <!-- Linha do Dia de Hoje -->
      <div v-if="todayX.value >= 0" class="position-absolute h-100 pointer-events-none"
           :style="{ left: todayX.value + 'px', width: '2px', backgroundColor: 'rgba(var(--v-theme-error), 0.7)', zIndex: 1 }">
      </div>

      <!-- SVG das Setas de Dependência -->
      <svg class="position-absolute w-100 h-100 pointer-events-none" style="top: 0; left: 0; z-index: 2;">
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="rgba(var(--v-theme-on-surface), 0.4)" />
          </marker>
        </defs>
        <path v-for="(path, idx) in arrowPaths.value" :key="'path'+idx"
              :d="path" fill="none" stroke="rgba(var(--v-theme-on-surface), 0.4)" stroke-width="1.5" marker-end="url(#arrowhead)" />
      </svg>

      <!-- Linhas das Tarefas e Barras -->
      <div class="position-absolute w-100 h-100" style="top: 0; left: 0; z-index: 3;">
        <div v-for="(t, i) in tasks.value" :key="'row'+t.id"
             class="task-row position-relative"
             :style="{ height: ROW_H + 'px', borderBottom: '1px solid rgba(var(--v-border-color), 0.05)' }">
          
          <!-- Milestone -->
          <template v-if="t.duration === 0">
            <div class="milestone-diamond position-absolute"
                 :style="{ left: getMilestoneLeft(t) + 'px', top: '8px' }"
                 :title="t.task"
                 @dblclick="openTaskModal(t)">
            </div>
            <span class="position-absolute text-caption font-weight-bold"
                  :style="{ left: (getMilestoneLeft(t) + 20) + 'px', top: '8px' }">
              {{ parseDate(t.start)?.toLocaleDateString('pt-BR') }}
            </span>
          </template>

          <!-- Task Bar -->
          <template v-else>
            <!-- Barra de Planejado -->
            <div class="bar-planned position-absolute rounded-pill"
                 :style="{ 
                   left: getBarLeft(t) + 'px', 
                   width: getBarWidthPx(t) + 'px',
                   top: '10px',
                   height: '14px',
                   background: getBarColor(t, i),
                   opacity: parseDate(t.realStart) ? 0.4 : 0.8
                 }"
                 :title="'Planejado: ' + t.task"
                 @dblclick="openTaskModal(t)">
              
              <!-- % Label -->
              <span class="bar-label" v-if="t.percent > 0">{{ t.percent }}%</span>
            </div>

            <!-- Barra de Realizado (Nova funcionalidade Fase 3) -->
            <div v-if="parseDate(t.realStart)" class="bar-real position-absolute rounded-pill elevation-1"
                 :style="{ 
                   left: getRealBarLeft(t) + 'px', 
                   width: getRealBarWidthPx(t) + 'px',
                   top: '12px',
                   height: '10px',
                   background: 'rgba(var(--v-theme-on-surface), 0.9)',
                   border: '1px solid rgba(var(--v-theme-surface), 0.5)'
                 }"
                 :title="'Realizado: ' + t.task"
                 @dblclick="openTaskModal(t)">
            </div>
          </template>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.sticky-top {
  position: sticky;
  top: 0;
}
.text-micro {
  font-size: 0.65rem;
}
.pointer-events-none {
  pointer-events: none;
}
.task-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}
.milestone-diamond {
  width: 14px;
  height: 14px;
  background-color: rgb(var(--v-theme-primary));
  transform: rotate(45deg);
  border: 2px solid white;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
.bar-planned {
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding-left: 4px;
}
.bar-planned:hover {
  filter: brightness(1.1);
  box-shadow: 0 3px 6px rgba(0,0,0,0.2);
}
.bar-real {
  cursor: pointer;
  transition: all 0.2s ease;
}
.bar-label {
  font-size: 0.65rem;
  color: white;
  font-weight: bold;
  text-shadow: 0px 0px 2px rgba(0,0,0,0.8);
}
</style>
