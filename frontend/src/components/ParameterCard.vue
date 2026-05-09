<script setup>
defineProps({ item: { type: Object, required: true } });
defineEmits(['edit', 'delete']);

function preview(v) {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}
function fmtDate(iso) { return iso ? new Date(iso).toLocaleString() : '—'; }
</script>

<template>
  <div class="card p-4 space-y-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="font-semibold text-slate-100 truncate">{{ item.key }}</p>
        <p class="text-xs text-slate-400 mt-0.5">{{ fmtDate(item.createdAt) }}</p>
      </div>
      <div class="flex flex-col gap-2 shrink-0">
        <button class="btn-primary !px-3 !py-1 text-xs" @click="$emit('edit', item)">EDIT</button>
        <button class="btn-danger !px-3 !py-1 text-xs" @click="$emit('delete', item)">DELETE</button>
      </div>
    </div>
    <div>
      <p class="label">Value</p>
      <p class="text-sm text-slate-200 break-all">{{ preview(item.value) }}</p>
    </div>
    <div v-if="item.description">
      <p class="label">Description</p>
      <p class="text-sm text-slate-300">{{ item.description }}</p>
    </div>
  </div>
</template>
