<script setup>
defineProps({ item: { type: Object, required: true } });
defineEmits(['edit', 'delete']);

function preview(v) {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}
function fmtDate(iso) { 
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
</script>

<template>
  <div class="p-4 rounded-lg border border-slate-600 bg-[#22243e]">
    <div class="space-y-1 text-sm">
      <p class="text-slate-200">
        <span class="font-bold text-white">Parameter Key:</span> {{ item.key }}
      </p>
      <p class="text-slate-200">
        <span class="font-bold text-white">Value:</span> {{ preview(item.value) }}
      </p>
      <p class="text-slate-200" v-if="item.description">
        <span class="font-bold text-white">Description:</span> {{ item.description }}
      </p>
      <p class="text-slate-200">
        <span class="font-bold text-white">Create Date:</span> {{ fmtDate(item.createdAt) }}
      </p>
    </div>
    
    <div class="flex justify-center gap-3 mt-4">
      <button class="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-1.5 rounded text-sm font-semibold transition-colors" @click="$emit('edit', item)">Edit</button>
      <button class="bg-[#ef4444] hover:bg-[#dc2626] text-white px-4 py-1.5 rounded text-sm font-semibold transition-colors" @click="$emit('delete', item)">Del</button>
    </div>
  </div>
</template>
