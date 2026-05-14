<script setup>
import { ref, computed, inject } from 'vue';

const dialog = ref(false);
const gantt = inject('gantt');

const open = () => {
  dialog.value = true;
};

defineExpose({ open });

const allTasks = computed(() => {
  // Pega todas as tarefas originais
  return gantt.allTasks ? gantt.allTasks.value : gantt.tasks.value;
});

const statsData = computed(() => {
  const list = allTasks.value || [];
  const total = list.length;
  if (total === 0) {
    return { total: 0, completed: 0, inProgress: 0, delayed: 0, onTime: 0, avgProgress: 0, criticalTasks: [] };
  }

  let completed = 0;
  let inProgress = 0;
  let delayed = 0;
  let onTime = 0;
  let sumPercent = 0;
  const criticalTasks = [];

  list.forEach(t => {
    sumPercent += t.percent || 0;
    
    // Status e Desvio
    let desvioDias = 0;
    if (t.plannedEndDate && t.end) {
      const diffTime = t.end.getTime() - t.plannedEndDate.getTime();
      desvioDias = Math.round(diffTime / (1000 * 3600 * 24));
    }

    if (t.percent === 100) {
      completed++;
    } else if (t.percent > 0) {
      inProgress++;
    }

    if (desvioDias > 0 && t.percent < 100) {
      delayed++;
      criticalTasks.push({ ...t, desvio: desvioDias, reason: `Atrasada em ${desvioDias} dias` });
    } else {
      onTime++;
      // Checa se está com prazo muito curto e progresso baixo
      if (t.plannedEndDate && t.percent < 50) {
        const diffToToday = Math.round((t.plannedEndDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        if (diffToToday >= 0 && diffToToday <= 3) {
          criticalTasks.push({ ...t, desvio: 0, reason: `Prazo encerra em ${diffToToday}d com progresso baixo` });
        }
      }
    }
  });

  const avgProgress = Math.round(sumPercent / total);
  // Ordena tarefas críticas pelos maiores atrasos/urgência
  criticalTasks.sort((a, b) => b.desvio - a.desvio);

  return {
    total, completed, inProgress, delayed, onTime, avgProgress, criticalTasks
  };
});
</script>

<template>
  <v-dialog v-model="dialog" max-width="900px" transition="dialog-bottom-transition">
    <v-card class="rounded-xl overflow-hidden elevation-24">
      <v-toolbar color="primary" class="px-4" elevation="0">
        <v-icon icon="mdi-view-dashboard-analytics" class="mr-3" size="large"></v-icon>
        <v-toolbar-title class="font-weight-bold text-h6">Dashboard Analítico & KPI Gerencial</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="dialog = false"></v-btn>
      </v-toolbar>

      <v-card-text class="pa-6 bg-background">
        <!-- KPI Cards -->
        <v-row dense class="mb-6">
          <v-col cols="12" sm="6" md="3">
            <v-card variant="elevated" elevation="2" class="rounded-lg pa-4 border-l-4" style="border-left: 5px solid #1976d2 !important;">
              <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Total de Tarefas</div>
              <div class="d-flex align-center justify-space-between mt-1">
                <span class="text-h4 font-weight-black text-primary">{{ statsData.total }}</span>
                <v-avatar color="primary-lighten-4" size="40">
                  <v-icon icon="mdi-format-list-checks" color="primary"></v-icon>
                </v-avatar>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card variant="elevated" elevation="2" class="rounded-lg pa-4 border-l-4" style="border-left: 5px solid #2e7d32 !important;">
              <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Concluídas</div>
              <div class="d-flex align-center justify-space-between mt-1">
                <span class="text-h4 font-weight-black text-success">{{ statsData.completed }}</span>
                <v-avatar color="success-lighten-4" size="40">
                  <v-icon icon="mdi-check-all" color="success"></v-icon>
                </v-avatar>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card variant="elevated" elevation="2" class="rounded-lg pa-4 border-l-4" style="border-left: 5px solid #ed6c02 !important;">
              <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Em Andamento</div>
              <div class="d-flex align-center justify-space-between mt-1">
                <span class="text-h4 font-weight-black text-warning">{{ statsData.inProgress }}</span>
                <v-avatar color="warning-lighten-4" size="40">
                  <v-icon icon="mdi-progress-clock" color="warning"></v-icon>
                </v-avatar>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card variant="elevated" elevation="2" class="rounded-lg pa-4 border-l-4" style="border-left: 5px solid #d32f2f !important;">
              <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Atrasadas</div>
              <div class="d-flex align-center justify-space-between mt-1">
                <span class="text-h4 font-weight-black text-error">{{ statsData.delayed }}</span>
                <v-avatar color="error-lighten-4" size="40">
                  <v-icon icon="mdi-alert-circle" color="error"></v-icon>
                </v-avatar>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Seção de Progresso e Distribuição -->
        <v-row dense class="mb-6">
          <v-col cols="12" md="5">
            <v-card variant="outlined" class="rounded-lg pa-5 h-100 d-flex flex-column justify-center align-center">
              <div class="text-h6 font-weight-bold mb-4 w-100 text-center text-primary">Progresso Médio do Projeto</div>
              <v-progress-circular
                :model-value="statsData.avgProgress"
                :color="statsData.avgProgress > 70 ? 'success' : statsData.avgProgress > 30 ? 'warning' : 'error'"
                size="150"
                width="16"
                class="my-4 font-weight-bold text-h4"
              >
                {{ statsData.avgProgress }}%
              </v-progress-circular>
              <div class="text-caption text-medium-emphasis mt-2 text-center">Baseado no avanço ponderado de todas as tarefas cadastradas</div>
            </v-card>
          </v-col>

          <v-col cols="12" md="7">
            <v-card variant="outlined" class="rounded-lg pa-5 h-100">
              <div class="text-h6 font-weight-bold mb-4 text-primary">Distribuição de Status de Prazos</div>
              
              <div class="mb-4">
                <div class="d-flex justify-space-between text-caption font-weight-bold mb-1">
                  <span>No Prazo / Concluído</span>
                  <span class="text-success">{{ statsData.onTime }} de {{ statsData.total }} ({{ Math.round((statsData.onTime / (statsData.total || 1)) * 100) }}%)</span>
                </div>
                <v-progress-linear :model-value="(statsData.onTime / (statsData.total || 1)) * 100" color="success" height="12" rounded></v-progress-linear>
              </div>

              <div class="mb-4">
                <div class="d-flex justify-space-between text-caption font-weight-bold mb-1">
                  <span>Atrasadas</span>
                  <span class="text-error">{{ statsData.delayed }} de {{ statsData.total }} ({{ Math.round((statsData.delayed / (statsData.total || 1)) * 100) }}%)</span>
                </div>
                <v-progress-linear :model-value="(statsData.delayed / (statsData.total || 1)) * 100" color="error" height="12" rounded></v-progress-linear>
              </div>

              <div class="mt-6 bg-primary-lighten-5 pa-4 rounded-lg d-flex align-center">
                <v-icon icon="mdi-information" color="primary" class="mr-3" size="large"></v-icon>
                <div class="text-caption">
                  O desvio é calculado automaticamente comparando a <strong>Data de Fim Planejada</strong> com a <strong>Data de Fim Real</strong> ou a data calculada baseada na duração e dependências.
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Lista de Tarefas Críticas -->
        <v-card variant="outlined" class="rounded-lg overflow-hidden">
          <v-card-title class="bg-surface-variant text-white px-4 py-3 d-flex align-center">
            <v-icon icon="mdi-alert-octagon" color="error" class="mr-2"></v-icon>
            <span class="text-subtitle-1 font-weight-bold">Atenção Gerencial: Tarefas Críticas / Atrasadas ({{ statsData.criticalTasks.length }})</span>
          </v-card-title>
          
          <v-list v-if="statsData.criticalTasks.length > 0" density="compact" class="pa-0">
            <v-list-item v-for="(item, i) in statsData.criticalTasks" :key="i" class="border-b py-3">
              <template v-slot:prepend>
                <v-chip size="small" :color="item.desvio > 0 ? 'error' : 'warning'" class="mr-3 font-weight-bold">
                  ID: {{ item.id }}
                </v-chip>
              </template>

              <v-list-item-title class="font-weight-bold">{{ item.task }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption mt-1">
                <span class="text-error font-weight-medium mr-2">{{ item.reason }}</span> | 
                <span class="ml-2">Progresso: {{ item.percent }}%</span>
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-chip size="small" variant="flat" :color="item.percent < 20 ? 'error' : 'warning'">
                  {{ item.percent }}% Concluído
                </v-chip>
              </template>
            </v-list-item>
          </v-list>

          <v-card-text v-else class="pa-6 text-center text-medium-emphasis">
            <v-icon icon="mdi-shield-check" color="success" size="60" class="mb-2"></v-icon>
            <div class="text-subtitle-1 font-weight-bold">Excelente! Nenhuma tarefa em estado crítico ou com atraso pendente.</div>
          </v-card-text>
        </v-card>

      </v-card-text>

      <v-card-actions class="pa-4 bg-surface border-t justify-end">
        <v-btn color="primary" variant="flat" @click="dialog = false" class="px-6 font-weight-bold">Fechar Dashboard</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
