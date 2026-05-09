<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import ValueEditor from './ValueEditor.vue';
import AudiencesTab from './AudiencesTab.vue';
import AISuggestModal from './AISuggestModal.vue';
import { useParametersStore } from '@/stores/parameters.js';
import { apiErrorMessage } from '@/services/api.js';

const props = defineProps({
  parameter: { type: Object, required: true }, // when id is empty string → create mode
});
const emit = defineEmits(['close', 'saved', 'conflict']);

const store = useParametersStore();

const isCreate = computed(() => !props.parameter.id);
const tab = ref('default');
const valid = ref(true);
const saving = ref(false);
const error = ref('');

function inferType(v) {
  if (typeof v === 'string') return 'string';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return 'boolean';
  return 'json';
}

const form = ref({
  key: props.parameter.key ?? '',
  description: props.parameter.description ?? '',
  value: props.parameter.value ?? '',
  type: inferType(props.parameter.value ?? ''),
  countryOverrides: { ...(props.parameter.countryOverrides ?? {}) },
  expectedVersion: props.parameter.version ?? 1,
});

watch(() => form.value.type, () => { /* type changes already coerce value in ValueEditor */ });

const showAi = ref(false);

onMounted(() => store.fetchCountries().catch(() => { /* non-fatal */ }));

async function save() {
  if (!valid.value) return;
  saving.value = true;
  error.value = '';
  try {
    if (isCreate.value) {
      const created = await store.create({
        key: form.value.key.trim(),
        value: form.value.value,
        description: form.value.description,
        countryOverrides: form.value.countryOverrides,
      });
      emit('saved', created);
    } else {
      const result = await store.update(props.parameter.id, {
        expectedVersion: form.value.expectedVersion,
        value: form.value.value,
        description: form.value.description,
        countryOverrides: form.value.countryOverrides,
      });
      if (!result.ok && result.conflict) {
        emit('conflict', { pending: { ...form.value }, current: result.current });
      } else {
        emit('saved', result.parameter);
      }
    }
  } catch (err) {
    error.value = apiErrorMessage(err, 'Save failed.');
  } finally {
    saving.value = false;
  }
}

// Called by parent after the user clicks "Reapply on top" in ConflictModal.
function reapplyOnTop(currentFromServer) {
  form.value.expectedVersion = currentFromServer.version;
  // Keep the user's edited fields intact; just bump expectedVersion to retry.
}
defineExpose({ reapplyOnTop });

function applyAi(picked) {
  form.value.countryOverrides = { ...form.value.countryOverrides, ...picked };
  showAi.value = false;
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4" @click.self="$emit('close')">
    <div class="card w-full max-w-2xl max-h-[90vh] flex flex-col">
      <div class="px-5 py-4 border-b border-navy-500/40 flex items-center justify-between">
        <h2 class="text-lg font-semibold">
          {{ isCreate ? 'New parameter' : `Edit ${parameter.key}` }}
        </h2>
        <button class="text-slate-400 hover:text-white" @click="$emit('close')">✕</button>
      </div>

      <div class="px-5 pt-4 border-b border-navy-500/40">
        <nav class="flex gap-1">
          <button
            class="px-3 py-2 text-sm rounded-t-md border-b-2"
            :class="tab === 'default' ? 'border-indigo-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
            @click="tab = 'default'"
          >Default</button>
          <button
            v-if="!isCreate"
            class="px-3 py-2 text-sm rounded-t-md border-b-2"
            :class="tab === 'audiences' ? 'border-indigo-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
            @click="tab = 'audiences'"
          >Audiences <span v-if="Object.keys(form.countryOverrides).length" class="ml-1 text-xs text-slate-400">({{ Object.keys(form.countryOverrides).length }})</span></button>
        </nav>
      </div>

      <div class="px-5 py-4 overflow-auto flex-1 space-y-4">
        <template v-if="tab === 'default'">
          <div v-if="isCreate">
            <label class="label" for="p-key">Key</label>
            <input id="p-key" v-model="form.key" class="input" placeholder="e.g. latestVersion" />
          </div>

          <div>
            <label class="label">Value</label>
            <ValueEditor
              v-model="form.value"
              v-model:type="form.type"
              :show-type-switch="isCreate"
              @validity="valid = $event"
            />
          </div>

          <div>
            <label class="label" for="p-desc">Description</label>
            <textarea
              id="p-desc"
              v-model="form.description"
              class="input h-20"
              placeholder="Optional description"
            />
          </div>
        </template>

        <template v-else-if="tab === 'audiences'">
          <AudiencesTab
            :default-value="form.value"
            :type="form.type"
            v-model="form.countryOverrides"
            @open-ai="showAi = true"
          />
        </template>
      </div>

      <p v-if="error" class="px-5 py-2 text-sm text-coral-500">{{ error }}</p>

      <div class="px-5 py-4 border-t border-navy-500/40 flex justify-end gap-2">
        <button class="btn-ghost" @click="$emit('close')">Cancel</button>
        <button class="btn-primary" :disabled="saving || !valid" @click="save">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>

    <AISuggestModal
      v-if="showAi"
      :parameter-id="parameter.id"
      :default-value="form.value"
      @close="showAi = false"
      @apply="applyAi"
    />
  </div>
</template>
