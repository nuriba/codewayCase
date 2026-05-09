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
  return new Date(iso).toLocaleString('en-US');
}
</script>

<template>
  <table class="w-full text-sm">
    <thead>
      <tr class="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-[#2d2f4a]">
        <th class="px-6 py-4 font-medium">Parameter Key</th>
        <th class="px-6 py-4 font-medium">Value</th>
        <th class="px-6 py-4 font-medium">Description</th>
        <th class="px-6 py-4 font-medium">Create Date &darr;</th>
        <th class="px-4 py-4 font-medium w-20"></th>
        <th class="px-4 py-4 font-medium w-20"></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="p in items" :key="p.id" class="border-b border-[#2d2f4a]/50 hover:bg-white/5 transition-colors">
        <td class="px-6 py-4 font-medium text-slate-100">{{ p.key }}</td>
        <td class="px-6 py-4 text-slate-200 max-w-[20ch] truncate" :title="preview(p.value)">{{ preview(p.value) }}</td>
        <td class="px-6 py-4 text-slate-300 max-w-[30ch] truncate" :title="p.description">{{ p.description || '—' }}</td>
        <td class="px-6 py-4 text-slate-400 whitespace-nowrap">{{ fmtDate(p.createdAt) }}</td>
        <td class="px-2 py-4">
          <button class="bg-[#8b61f2] hover:bg-[#7852df] text-white px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors" @click="$emit('edit', p)">EDIT</button>
        </td>
        <td class="px-2 py-4">
          <button class="bg-[#f05c6d] hover:bg-[#de5161] text-white px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors" @click="$emit('delete', p)">DELETE</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>
