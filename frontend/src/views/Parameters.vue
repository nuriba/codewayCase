<script setup>
import { ref, onMounted, computed } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import ParametersTable from '@/components/ParametersTable.vue';
import ParameterCard from '@/components/ParameterCard.vue';
import EditParameterModal from '@/components/EditParameterModal.vue';
import ConflictModal from '@/components/ConflictModal.vue';
import { useParametersStore } from '@/stores/parameters.js';
import { apiErrorMessage } from '@/services/api.js';

const store = useParametersStore();

const editing = ref(null);          // parameter object or { id: '', ... } for create
const editorRef = ref(null);
const conflict = ref(null);          // { pending, current }
const deleteTarget = ref(null);
const newKey = ref('');
const newValue = ref('');
const newDescription = ref('');
const inlineError = ref('');
const inlineSaving = ref(false);
const toast = ref('');

const sorted = computed(() =>
  [...store.items].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
);

onMounted(async () => {
  try {
    await Promise.all([store.fetchAll(), store.fetchCountries()]);
  } catch (err) {
    toast.value = apiErrorMessage(err, 'Failed to load.');
  }
});

function startEdit(p) { editing.value = { ...p }; conflict.value = null; }

function openCreate() {
  editing.value = { id: '', key: '', value: '', description: '', countryOverrides: {}, version: 1 };
}

function onEditSaved() {
  editing.value = null;
  conflict.value = null;
  toast.value = 'Saved.';
  setTimeout(() => (toast.value = ''), 2000);
}

function onConflict(payload) {
  conflict.value = payload;
}

async function reapplyOnTop() {
  if (!conflict.value) return;
  // Pull the latest from list to be sure version is current.
  await store.fetchAll();
  const latest = store.items.find((p) => p.id === editing.value?.id) ?? conflict.value.current;
  editorRef.value?.reapplyOnTop(latest);
  conflict.value = null;
}

function discardChanges() {
  conflict.value = null;
  editing.value = null;
  store.fetchAll();
}

async function inlineCreate() {
  if (!newKey.value.trim()) {
    inlineError.value = 'Key is required.';
    return;
  }
  inlineSaving.value = true;
  inlineError.value = '';
  try {
    await store.create({
      key: newKey.value.trim(),
      value: newValue.value,
      description: newDescription.value,
    });
    newKey.value = newValue.value = newDescription.value = '';
    toast.value = 'Created.';
    setTimeout(() => (toast.value = ''), 2000);
  } catch (err) {
    inlineError.value = apiErrorMessage(err, 'Create failed.');
  } finally {
    inlineSaving.value = false;
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  const target = deleteTarget.value;
  deleteTarget.value = null;
  try {
    const result = await store.remove(target.id, target.version);
    if (!result.ok && result.conflict) {
      toast.value = `Cannot delete: parameter was modified (now v${result.current.version}).`;
      await store.fetchAll();
    } else {
      toast.value = 'Deleted.';
    }
    setTimeout(() => (toast.value = ''), 2500);
  } catch (err) {
    toast.value = apiErrorMessage(err, 'Delete failed.');
    setTimeout(() => (toast.value = ''), 3000);
  }
}
</script>

<template>
  <div>
    <AppHeader />

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">Parameters</h2>
        <button class="btn-primary md:hidden" @click="openCreate">+ New</button>
      </div>

      <p v-if="store.error" class="text-coral-500 text-sm">{{ store.error }}</p>
      <p v-if="store.loading && !store.items.length" class="text-slate-400 text-sm">Loading…</p>

      <!-- Desktop table -->
      <div class="card hidden md:block overflow-x-auto">
        <ParametersTable
          :items="sorted"
          @edit="startEdit"
          @delete="(p) => (deleteTarget = p)"
        />
        <!-- Inline new-parameter row -->
        <div class="border-t border-navy-500/40 px-4 py-3 grid grid-cols-12 gap-2 items-start">
          <input v-model="newKey" class="input col-span-3" placeholder="Key" />
          <input v-model="newValue" class="input col-span-3" placeholder="Value" />
          <input v-model="newDescription" class="input col-span-4" placeholder="Description" />
          <button class="btn-add col-span-2" :disabled="inlineSaving" @click="inlineCreate">
            {{ inlineSaving ? 'Adding…' : 'Add' }}
          </button>
          <p v-if="inlineError" class="col-span-12 text-coral-500 text-xs">{{ inlineError }}</p>
        </div>
      </div>

      <!-- Mobile cards -->
      <div class="md:hidden space-y-3">
        <ParameterCard
          v-for="p in sorted"
          :key="p.id"
          :item="p"
          @edit="startEdit"
          @delete="(it) => (deleteTarget = it)"
        />
        <p v-if="!sorted.length" class="text-slate-400 text-sm">No parameters yet.</p>
      </div>
    </main>

    <EditParameterModal
      v-if="editing"
      ref="editorRef"
      :parameter="editing"
      @close="editing = null"
      @saved="onEditSaved"
      @conflict="onConflict"
    />

    <ConflictModal
      v-if="conflict"
      :pending="conflict.pending"
      :current="conflict.current"
      @close="conflict = null"
      @discard="discardChanges"
      @reapply="reapplyOnTop"
    />

    <!-- Delete confirmation -->
    <div
      v-if="deleteTarget"
      class="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
      @click.self="deleteTarget = null"
    >
      <div class="card w-full max-w-md p-5 space-y-4">
        <h3 class="text-lg font-semibold">Delete parameter?</h3>
        <p class="text-sm text-slate-300">
          This will permanently remove <span class="font-mono">{{ deleteTarget.key }}</span>.
        </p>
        <div class="flex justify-end gap-2">
          <button class="btn-ghost" @click="deleteTarget = null">Cancel</button>
          <button class="btn-danger" @click="confirmDelete">Delete</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div
      v-if="toast"
      class="fixed bottom-6 right-6 bg-navy-800 border border-navy-500 px-4 py-2 rounded shadow-lg text-sm z-50"
    >
      {{ toast }}
    </div>
  </div>
</template>
