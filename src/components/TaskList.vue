<script setup>
import { inject } from 'vue';

const gantt = inject('gantt');
const { tasks } = gantt;
const openTaskModal = inject('openTaskModal');

const headers = [
  { title: 'ID', align: 'start', key: 'id', width: '60px' },
  { title: 'Tarefa', align: 'start', key: 'task', minWidth: '150px' },
  { title: 'Duração', align: 'center', key: 'duration', width: '80px' },
  { title: '%', align: 'center', key: 'percent', width: '60px' }
];

const getRowClass = (item) => {
  if (item.duration === 0) return 'text-primary font-weight-bold bg-primary-lighten-5'; // Milestone
  if (item.percent === 100) return 'text-success bg-success-lighten-5';
  return '';
};
</script>

<template>
  <div class="task-list h-100">
    <v-data-table
      :headers="headers"
      :items="tasks"
      density="compact"
      hover
      hide-default-footer
      :items-per-page="-1"
      class="elevation-0 bg-transparent h-100"
      fixed-header
      height="100%"
      style="min-width: max-content;"
    >
      <template v-slot:item="{ item }">
        <tr 
          :class="getRowClass(item)" 
          style="height: 34px; cursor: pointer;"
          @dblclick="openTaskModal(item)"
        >
          <td class="px-2">{{ item.id }}</td>
          <td class="px-2 text-truncate" style="max-width: 200px;" :title="item.task">
            <v-icon v-if="item.duration === 0" icon="mdi-flag-variant" size="small" color="primary" class="mr-1"></v-icon>
            {{ item.task }}
          </td>
          <td class="px-2 text-center">{{ item.duration }}</td>
          <td class="px-2 text-center">{{ item.percent }}%</td>
        </tr>
      </template>
    </v-data-table>
  </div>
</template>

<style scoped>
.task-list :deep(.v-data-table__wrapper) {
  border-radius: 0;
}
.task-list :deep(th) {
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  background-color: rgba(var(--v-theme-surface-variant), 0.1) !important;
  border-bottom: 2px solid rgba(var(--v-border-color), 0.2) !important;
}
.task-list :deep(td) {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1) !important;
  white-space: nowrap;
}
</style>
