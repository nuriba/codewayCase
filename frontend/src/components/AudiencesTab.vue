<script setup>
import { ref, computed } from 'vue';
import ValueEditor from './ValueEditor.vue';
import { useParametersStore } from '@/stores/parameters.js';

const props = defineProps({
  defaultValue: { type: null, default: '' },
  type: { type: String, default: 'string' },
  modelValue: { type: Object, required: true }, // { [code]: value }
});
const emit = defineEmits(['update:modelValue', 'open-ai']);

const store = useParametersStore();
const search = ref('');

const usedCodes = computed(() => Object.keys(props.modelValue));
const remainingCountries = computed(() => {
  const used = new Set(usedCodes.value);
  const q = search.value.trim().toUpperCase();
  return store.countries.filter((c) => {
    if (used.has(c.code)) return false;
    if (!q) return true;
    return c.code.includes(q) || c.name.toUpperCase().includes(q);
  });
});

function flag(code) {
  // Convert ISO-2 to Unicode flag emoji.
  return code
    .toUpperCase()
    .split('')
    .map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
    .join('');
}

function addCountry(code) {
  // Seed override with a typed default so the editor renders sanely.
  let seed;
  if (props.type === 'string') seed = '';
  else if (props.type === 'number') seed = 0;
  else if (props.type === 'boolean') seed = false;
  else seed = {};
  emit('update:modelValue', { ...props.modelValue, [code]: seed });
  search.value = '';
}

function setOverride(code, value) {
  emit('update:modelValue', { ...props.modelValue, [code]: value });
}

function removeCountry(code) {
  const next = { ...props.modelValue };
  delete next[code];
  emit('update:modelValue', next);
}

function nameOf(code) {
  return store.countries.find((c) => c.code === code)?.name ?? code;
}

function defaultPreview() {
  const v = props.defaultValue;
  if (typeof v === 'string') return v || '(empty string)';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

const showPicker = ref(false);
</script>

<template>
  <div class="space-y-4">
    <div class="card p-3">
      <p class="label">Default value (read-only reference)</p>
      <p class="text-sm font-mono text-slate-200 break-all">{{ defaultPreview() }}</p>
    </div>

    <div class="space-y-3">
      <div
        v-for="code in usedCodes"
        :key="code"
        class="card p-3 flex flex-col md:flex-row md:items-start gap-3"
      >
        <div class="md:w-44 shrink-0 flex items-center gap-2">
          <span class="text-xl">{{ flag(code) }}</span>
          <div>
            <p class="text-sm font-medium">{{ code }}</p>
            <p class="text-xs text-slate-400">{{ nameOf(code) }}</p>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <ValueEditor
            :model-value="modelValue[code]"
            :type="type"
            @update:modelValue="(v) => setOverride(code, v)"
          />
        </div>
        <button class="btn-ghost !px-3 !py-1 text-xs self-start" @click="removeCountry(code)">Remove</button>
      </div>

      <p v-if="!usedCodes.length" class="text-sm text-slate-400">No country overrides yet.</p>
    </div>

    <div class="flex items-center gap-2 flex-wrap">
      <button class="btn-ghost text-sm" @click="showPicker = !showPicker">
        {{ showPicker ? 'Close' : 'Add country' }}
      </button>
      <button class="btn-primary text-sm" type="button" @click="$emit('open-ai')">
        🪄 AI Suggest
      </button>
    </div>

    <div v-if="showPicker" class="card p-3 space-y-2">
      <input v-model="search" class="input" placeholder="Search by code or name…" />
      <div class="max-h-56 overflow-auto divide-y divide-navy-500/30">
        <button
          v-for="c in remainingCountries"
          :key="c.code"
          class="w-full text-left px-2 py-2 text-sm flex items-center gap-2 hover:bg-navy-700"
          @click="addCountry(c.code); showPicker = false"
        >
          <span>{{ flag(c.code) }}</span>
          <span class="font-mono text-xs w-8">{{ c.code }}</span>
          <span class="text-slate-300">{{ c.name }}</span>
        </button>
        <p v-if="!remainingCountries.length" class="text-sm text-slate-500 px-2 py-3">No matches.</p>
      </div>
    </div>
  </div>
</template>
