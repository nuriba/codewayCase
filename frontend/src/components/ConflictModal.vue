<script setup>
defineProps({
  pending: { type: Object, required: true }, // user's working state
  current: { type: Object, required: true }, // server's latest
});
defineEmits(['discard', 'reapply', 'close']);

function preview(v) {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
    <div class="card w-full max-w-3xl">
      <div class="px-5 py-4 border-b border-navy-500/40">
        <h2 class="text-lg font-semibold">Conflict detected</h2>
        <p class="text-sm text-slate-400 mt-1">
          Someone else has updated this parameter while you were editing. Review the differences below.
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-4 p-5">
        <section>
          <p class="label">Your pending changes</p>
          <pre class="bg-navy-700 rounded p-3 text-xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-auto">{{ preview(pending) }}</pre>
        </section>
        <section>
          <p class="label">Current server value (v{{ current.version }})</p>
          <pre class="bg-navy-700 rounded p-3 text-xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-auto">{{ preview(current) }}</pre>
        </section>
      </div>

      <div class="px-5 py-4 border-t border-navy-500/40 flex flex-wrap justify-end gap-2">
        <button class="btn-ghost" @click="$emit('discard')">Discard my changes</button>
        <button class="btn-primary" @click="$emit('reapply')">Reapply on top</button>
      </div>
    </div>
  </div>
</template>
