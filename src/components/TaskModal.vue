<script setup>
import { ref, inject } from 'vue';

const dialog = ref(false);
const taskData = ref({});
const saveTasksToDisk = inject('gantt').saveTasksToDisk;
const loadProject = inject('gantt').loadProject;

// Helper function to format dates to YYYY-MM-DD
const formatDateForInput = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

const open = (task) => {
  taskData.value = { ...task };
  // format dates if they exist
  if (taskData.value.realStart) {
    taskData.value.realStart = formatDateForInput(taskData.value.realStart);
  }
  if (taskData.value.realEnd) {
    taskData.value.realEnd = formatDateForInput(taskData.value.realEnd);
  }
  dialog.value = true;
};

defineExpose({ open });

const gantt = inject('gantt');

const save = () => {
  // Update the task object in the array
  const index = gantt.tasks.value.findIndex(t => t.id === taskData.value.id);
  if (index !== -1) {
    gantt.tasks.value[index] = { ...gantt.tasks.value[index], ...taskData.value };
  }
  
  // Re-calculate dates
  // Em uma aplicação complexa, o ideal é re-rodar toda a lógica de dependências
  // Mas por enquanto, vamos recarregar ou salvar e recarregar.
  
  saveTasksToDisk().then(() => {
    // Recarregar o projeto para recalcular as datas usando PapaParse etc.
    loadProject();
  });
  
  dialog.value = false;
};

const cancel = () => {
  dialog.value = false;
};
</script>

<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card>
      <v-card-title class="bg-primary text-white d-flex justify-space-between align-center">
        <span>Editar Tarefa #{{ taskData.id }}</span>
        <v-btn icon="mdi-close" variant="text" size="small" @click="cancel"></v-btn>
      </v-card-title>

      <v-card-text class="pt-4">
        <v-form @submit.prevent="save">
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="taskData.task"
                label="Nome da Tarefa"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
            
            <v-col cols="6">
              <v-text-field
                v-model.number="taskData.duration"
                label="Duração Planejada (dias)"
                type="number"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>

            <v-col cols="6">
              <v-text-field
                v-model.number="taskData.percent"
                label="Progresso (%)"
                type="number"
                min="0"
                max="100"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="taskData.predecessor"
                label="Predecessoras (ex: 1, 2FS)"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>

            <v-col cols="12">
              <v-divider class="my-2"></v-divider>
              <div class="text-subtitle-2 mb-2">Execução Real</div>
            </v-col>

            <v-col cols="6">
              <v-text-field
                v-model="taskData.realStart"
                label="Data Inicial Real"
                type="date"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>

            <v-col cols="6">
              <v-text-field
                v-model="taskData.realEnd"
                label="Data Final Real"
                type="date"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4 bg-grey-lighten-4">
        <v-spacer></v-spacer>
        <v-btn color="grey-darken-1" variant="text" @click="cancel">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" @click="save">Salvar Alterações</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
