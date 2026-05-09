<script setup>
import { ref, onMounted, computed } from 'vue';
import { useParametersStore } from '@/stores/parameters.js';
import { apiErrorMessage } from '@/services/api.js';

const props = defineProps({
  parameterId: { type: String, required: true },
  defaultValue: { type: null, default: null },
});
const emit = defineEmits(['close', 'apply']);

const store = useParametersStore();
const loading = ref(true);
const error = ref('');
const suggestions = ref({}); // { CODE: value }
const rationale = ref({});
const selected = ref({}); // { CODE: bool }

const codes = computed(() => Object.keys(suggestions.value));

function flag(code) {
  return code.toUpperCase().split('')
    .map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))).join('');
}

function previewValue(v) {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

onMounted(async () => {
  try {
    const data = await store.aiSuggest(props.parameterId);
    suggestions.value = data.suggestions ?? {};
    rationale.value = data.rationale ?? {};
    // Per spec: all unchecked by default, user must opt-in to each.
    selected.value = Object.fromEntries(Object.keys(suggestions.value).map((c) => [c, false]));
  } catch (err) {
    error.value = apiErrorMessage(err, 'AI suggestion failed.');
  } finally {
    loading.value = false;
  }
});

function applySelected() {
  const out = {};
  for (const code of codes.value) {
    if (selected.value[code]) out[code] = suggestions.value[code];
  }
  emit('apply', out);
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4" @click.self="$emit('close')">
    <div class="card w-full max-w-2xl max-h-[90vh] flex flex-col">
      <div class="px-5 py-4 border-b border-navy-500/40 flex items-center justify-between">
        <h2 class="text-lg font-semibold">AI Suggestions</h2>
        <button class="text-slate-400 hover:text-white" @click="$emit('close')">✕</button>
      </div>

      <div class="px-5 py-4 overflow-auto flex-1">
        <p v-if="loading" class="text-slate-400 text-sm">Generating suggestions…</p>
        <p v-else-if="error" class="text-coral-500 text-sm">{{ error }}</p>
        <p v-else-if="!codes.length" class="text-slate-400 text-sm">
          No country-specific suggestions for this parameter.
        </p>

        <ul v-else class="space-y-2">
          <li
            v-for="code in codes"
            :key="code"
            class="flex items-start gap-3 p-3 rounded-md bg-navy-700/60 border border-navy-500/40"
          >
            <input
              :id="`ai-${code}`"
              v-model="selected[code]"
              type="checkbox"
              class="mt-1 w-4 h-4 rounded"
            />
            <label :for="`ai-${code}`" class="flex-1 cursor-pointer space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ flag(code) }}</span>
                <span class="font-mono text-xs">{{ code }}</span>
                <span class="text-sm font-medium">→ {{ previewValue(suggestions[code]) }}</span>
              </div>
              <p class="text-xs text-slate-400">
                Default: <span class="font-mono">{{ previewValue(defaultValue) }}</span>
              </p>
              <p v-if="rationale[code]" class="text-xs text-slate-300 italic">
                {{ rationale[code] }}
              </p>
            </label>
          </li>
        </ul>
      </div>

      <div class="px-5 py-4 border-t border-navy-500/40 flex justify-end gap-2">
        <button class="btn-ghost" @click="$emit('close')">Cancel</button>
        <button class="btn-primary" :disabled="loading || !!error" @click="applySelected">
          Apply selected
        </button>
      </div>
    </div>
  </div>
</template>
