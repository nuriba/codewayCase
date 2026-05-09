<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: null, default: '' },
  type: { type: String, default: 'string' }, // string | number | boolean | json
  showTypeSwitch: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'update:type', 'validity']);

const jsonText = ref('');
const jsonError = ref('');

function inferType(v) {
  if (typeof v === 'string') return 'string';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return 'boolean';
  return 'json';
}

watch(() => props.type, (t) => {
  if (t === 'json') {
    try {
      jsonText.value = JSON.stringify(props.modelValue ?? {}, null, 2);
      jsonError.value = '';
      emit('validity', true);
    } catch {
      jsonText.value = '';
    }
  }
}, { immediate: true });

watch(() => props.modelValue, (v) => {
  if (props.type === 'json') {
    const next = JSON.stringify(v ?? {}, null, 2);
    if (next !== jsonText.value) jsonText.value = next;
  }
});

function onString(e) { emit('update:modelValue', e.target.value); }
function onNumber(e) {
  const n = e.target.value === '' ? '' : Number(e.target.value);
  emit('update:modelValue', Number.isFinite(n) ? n : '');
}
function onBool(checked) { emit('update:modelValue', checked); }
function onJson(e) {
  jsonText.value = e.target.value;
  try {
    const parsed = JSON.parse(e.target.value);
    jsonError.value = '';
    emit('update:modelValue', parsed);
    emit('validity', true);
  } catch (err) {
    jsonError.value = err.message;
    emit('validity', false);
  }
}

function changeType(newType) {
  // Coerce a sensible default for the new type rather than carrying a stale value through.
  if (newType === 'string') emit('update:modelValue', '');
  else if (newType === 'number') emit('update:modelValue', 0);
  else if (newType === 'boolean') emit('update:modelValue', false);
  else if (newType === 'json') emit('update:modelValue', {});
  emit('update:type', newType);
}

const boolValue = computed(() => !!props.modelValue);
defineExpose({ inferType });
</script>

<template>
  <div class="space-y-2">
    <div v-if="showTypeSwitch" class="flex items-center gap-2">
      <label class="label !mb-0">Type</label>
      <select
        :value="type"
        class="input !w-auto !py-1"
        @change="(e) => changeType(e.target.value)"
      >
        <option value="string">string</option>
        <option value="number">number</option>
        <option value="boolean">boolean</option>
        <option value="json">JSON (object/array)</option>
      </select>
    </div>

    <input
      v-if="type === 'string'"
      :value="modelValue"
      class="input"
      type="text"
      @input="onString"
    />
    <input
      v-else-if="type === 'number'"
      :value="modelValue"
      class="input"
      type="number"
      step="any"
      @input="onNumber"
    />
    <label
      v-else-if="type === 'boolean'"
      class="inline-flex items-center gap-3 cursor-pointer select-none"
    >
      <span class="relative inline-block w-11 h-6">
        <input type="checkbox" class="sr-only peer" :checked="boolValue" @change="onBool($event.target.checked)" />
        <span class="absolute inset-0 rounded-full bg-navy-500 peer-checked:bg-indigo-500 transition" />
        <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition peer-checked:translate-x-5" />
      </span>
      <span class="text-sm">{{ boolValue ? 'true' : 'false' }}</span>
    </label>
    <div v-else>
      <textarea
        :value="jsonText"
        class="input font-mono text-xs h-40"
        spellcheck="false"
        @input="onJson"
      />
      <p v-if="jsonError" class="text-coral-500 text-xs mt-1">JSON error: {{ jsonError }}</p>
    </div>
  </div>
</template>
