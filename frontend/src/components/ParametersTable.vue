<script setup>
defineProps({
  items: { type: Array, required: true },
});
defineEmits(['edit', 'delete']);

function preview(v) {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}
</script>

<template>
  <table class="w-full text-sm">
    <thead>
      <tr class="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-navy-500/40">
        <th class="px-4 py-3 font-medium">Parameter Key</th>
        <th class="px-4 py-3 font-medium">Value</th>
        <th class="px-4 py-3 font-medium">Description</th>
        <th class="px-4 py-3 font-medium">Create Date ↓</th>
        <th class="px-4 py-3 font-medium w-20"></th>
        <th class="px-4 py-3 font-medium w-20"></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="p in items" :key="p.id" class="border-b border-navy-500/20 hover:bg-navy-700/40">
        <td class="px-4 py-3 font-medium text-slate-100">{{ p.key }}</td>
        <td class="px-4 py-3 text-slate-200 max-w-[20ch] truncate" :title="preview(p.value)">{{ preview(p.value) }}</td>
        <td class="px-4 py-3 text-slate-300 max-w-[30ch] truncate" :title="p.description">{{ p.description || '—' }}</td>
        <td class="px-4 py-3 text-slate-400 whitespace-nowrap">{{ fmtDate(p.createdAt) }}</td>
        <td class="px-4 py-3">
          <button class="btn-primary !px-3 !py-1 text-xs" @click="$emit('edit', p)">EDIT</button>
        </td>
        <td class="px-4 py-3">
          <button class="btn-danger !px-3 !py-1 text-xs" @click="$emit('delete', p)">DELETE</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>
