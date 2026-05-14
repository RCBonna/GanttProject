<script setup>
import { ref, onMounted, computed, provide } from 'vue';
import { useTheme } from 'vuetify';
import { useGantt } from './composables/useGantt';
import html2canvas from 'html2canvas';

// Imports de componentes (que ainda vamos criar/migrar)
import TaskList from './components/TaskList.vue';
import ChartArea from './components/ChartArea.vue';
import TaskModal from './components/TaskModal.vue';

const theme = useTheme();

const {
  hasFolder, directoryHandle, zoomLevel,
  projectMetadata, tasks, holidaysMap,
  chartColumns, chartMonths, colWidth, arrowPaths, todayX,
  stats,
  projectOptions, showProjectSelector,
  openProjectFolder, setZoom, loadProject, saveTasksToDisk,
  getPlannedBarLeft, getPlannedBarWidthPx, getActualBarLeft, getActualBarWidthPx,
  getMilestoneLeft, getBarColor, isDelayed, parseDate,
  loadSelectedProject, recalculateTasks
} = useGantt();

// Provide state to child components
provide('gantt', {
  hasFolder, zoomLevel,
  projectMetadata, tasks, holidaysMap,
  chartColumns, chartMonths, colWidth, arrowPaths, todayX,
  getPlannedBarLeft, getPlannedBarWidthPx, getActualBarLeft, getActualBarWidthPx,
  getMilestoneLeft, getBarColor, isDelayed, parseDate,
  saveTasksToDisk, loadProject, recalculateTasks
});

const taskListWidth = ref(450);
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

const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark';
};

const exportPNG = () => {
  const chart = document.getElementById('ganttWrapper');
  if (!chart) return;
  const bgColor = theme.global.current.value.dark ? '#1e1e1e' : '#ffffff';
  html2canvas(chart, { backgroundColor: bgColor, scale: 2, logging: false }).then(canvas => {
    const link = document.createElement('a');
    const name = projectMetadata.value.name.replace(/\s+/g, '_');
    link.download = `Gantt_${name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
};

const syncScroll = (e) => {
  const tl = document.getElementById('taskList');
  if (tl) tl.scrollTop = e.target.scrollTop;
};

// Modal ref
const taskModalRef = ref(null);
const openTaskModal = (task) => {
  if (taskModalRef.value) {
    taskModalRef.value.open(task);
  }
};
provide('openTaskModal', openTaskModal);

const progressColor = computed(() => {
  const p = stats.value.progress;
  if(p > 70) return 'success';
  if(p > 30) return 'warning';
  return 'error';
});

</script>

<template>
  <v-app>
    <v-app-bar flat border>
      <v-toolbar-title class="font-weight-bold d-flex align-center">
        <v-icon icon="mdi-chart-timeline" class="mr-2" color="primary"></v-icon>
        ProjectGantt
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn
        v-if="!hasFolder"
        color="primary"
        variant="flat"
        prepend-icon="mdi-folder-open"
        @click="openProjectFolder"
      >
        Abrir Pasta
      </v-btn>

      <template v-else>
        <v-btn-toggle v-model="zoomLevel" @update:modelValue="setZoom" class="mr-4" mandatory density="compact">
          <v-btn value="day">Dia</v-btn>
          <v-btn value="week">Sem</v-btn>
          <v-btn value="month">Mês</v-btn>
        </v-btn-toggle>

        <v-btn icon="mdi-image-multiple" @click="exportPNG" title="Exportar PNG"></v-btn>
        <v-btn icon="mdi-calculator" @click="recalculateTasks" title="Recalcular Cronograma"></v-btn>
        <v-btn icon="mdi-content-save" @click="saveTasksToDisk" title="Salvar Alterações"></v-btn>
        <v-btn icon="mdi-sync" @click="loadProject" title="Recarregar"></v-btn>
      </template>
      
      <v-btn :icon="theme.global.current.value.dark ? 'mdi-weather-night' : 'mdi-weather-sunny'" @click="toggleTheme"></v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid class="fill-height align-start pa-4" v-if="hasFolder">
        <v-card class="w-100 mb-4" variant="outlined">
          <v-card-text class="d-flex align-center justify-space-between py-2">
            <div>
              <h2 class="text-h6 font-weight-bold">{{ projectMetadata.name }}</h2>
              <div class="text-caption text-medium-emphasis">
                <v-icon icon="mdi-account" size="small"></v-icon> {{ projectMetadata.manager || 'N/A' }} | 
                <v-icon icon="mdi-calendar" size="small"></v-icon> Início: {{ projectMetadata.startDate }}
              </div>
            </div>
            
            <div class="d-flex align-center gap-4">
              <div class="text-center">
                <div class="text-caption">Dias Corridos</div>
                <div class="text-h6 font-weight-bold">{{ stats.days }}</div>
              </div>
              <v-divider vertical class="mx-2"></v-divider>
              <div class="text-center">
                <div class="text-caption">Conclusão Estimada</div>
                <div class="text-h6 font-weight-bold">{{ stats.endDate }}</div>
              </div>
              <v-divider vertical class="mx-2"></v-divider>
              <div class="d-flex align-center gap-2">
                <v-progress-circular
                  :model-value="stats.progress"
                  :color="progressColor"
                  size="40"
                  width="4"
                >
                  <span class="text-caption font-weight-bold">{{ stats.progress }}%</span>
                </v-progress-circular>
                <span class="text-button">Progresso</span>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="w-100 flex-grow-1 overflow-hidden" elevation="0" border id="ganttWrapper">
          <div class="d-flex h-100">
            
            <!-- Painel Esquerdo: Lista de Tarefas -->
            <div id="taskList" class="d-flex flex-column" :style="{ width: taskListWidth + 'px', minWidth: '150px' }" style="overflow-y: hidden; overflow-x: auto; border-right: 1px solid rgba(var(--v-border-color), 0.2);">
              <TaskList />
            </div>

            <!-- Resizer -->
            <div class="resizer" @mousedown="startResize" style="width: 5px; cursor: col-resize; background: rgba(var(--v-border-color), 0.1); z-index: 10;"></div>

            <!-- Painel Direito: Gráfico de Gantt -->
            <div id="chartContainer" class="flex-grow-1 position-relative" style="overflow: auto;" @scroll="syncScroll">
              <ChartArea />
            </div>

          </div>
        </v-card>
      </v-container>

      <v-container fluid class="fill-height align-center justify-center" v-else>
        <v-empty-state
          icon="mdi-folder-open-outline"
          title="Nenhum Projeto Carregado"
          text="Selecione a pasta contendo os arquivos portfolio.json, tarefas.csv e feriados.json para começar."
        >
          <v-btn color="primary" @click="openProjectFolder" class="mt-4" size="x-large">
            Selecionar Pasta do Projeto
          </v-btn>
        </v-empty-state>
      </v-container>
    </v-main>

    <!-- Modals -->
    <TaskModal ref="taskModalRef" />

    <!-- Modal de Seleção de Projeto -->
    <v-dialog v-model="showProjectSelector" max-width="550px" persistent>
      <v-card class="rounded-lg overflow-hidden">
        <v-card-title class="bg-primary text-white px-6 py-4 d-flex align-center">
          <v-icon icon="mdi-folder-multiple" class="mr-3" size="large"></v-icon>
          <span class="text-h6 font-weight-bold">Selecione o Projeto</span>
          <v-spacer></v-spacer>
          <!-- Só permite fechar se já houver um projeto carregado -->
          <v-btn v-if="tasks.length" icon="mdi-close" variant="text" size="small" @click="showProjectSelector = false"></v-btn>
        </v-card-title>

        <v-card-text class="pa-6">
          <div class="text-body-1 text-medium-emphasis mb-4">
            Escolha um dos projetos cadastrados no arquivo <code class="bg-grey-lighten-4 px-1 rounded">portfolio.json</code>:
          </div>

          <v-list class="bg-transparent pa-0" density="comfortable">
            <v-list-item
              v-for="(proj, idx) in projectOptions"
              :key="idx"
              @click="loadSelectedProject(idx)"
              class="mb-3 rounded-lg cursor-pointer hover-card"
              elevation="0"
              variant="flat"
            >
              <template v-slot:prepend>
                <v-avatar color="primary" class="mr-3 text-white">
                  <v-icon icon="mdi-file-chart" size="small"></v-icon>
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-bold text-subtitle-1 text-primary">
                {{ proj.name }}
              </v-list-item-title>
              
              <v-list-item-subtitle class="text-caption mt-1">
                <v-row dense class="mt-1">
                  <v-col cols="6" class="d-flex align-center">
                    <v-icon icon="mdi-account" size="14" class="mr-1 text-medium-emphasis"></v-icon>
                    <span class="text-truncate"><strong>Gerente:</strong> {{ proj.manager || 'Não definido' }}</span>
                  </v-col>
                  <v-col cols="6" class="d-flex align-center">
                    <v-icon icon="mdi-calendar" size="14" class="mr-1 text-medium-emphasis"></v-icon>
                    <span><strong>Início:</strong> {{ proj.startDate }}</span>
                  </v-col>
                </v-row>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<style scoped>
.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }
.resizer:hover { background: rgba(var(--v-border-color), 0.5) !important; }
.hover-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  border: 1px solid rgba(var(--v-border-color), 0.12) !important;
}
.hover-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  border-color: rgb(var(--v-theme-primary)) !important;
}
</style>
