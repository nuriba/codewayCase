<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { useRouter } from 'vue-router';
import logoFull from '@/assets/logo-full.png';
import logoMark from '@/assets/logo-mark.png';

const auth = useAuthStore();
const router = useRouter();
const open = ref(false);
const menuRef = ref(null);

const initials = computed(() => {
  const e = auth.user?.email ?? '';
  return e ? e[0].toUpperCase() : '?';
});

function handleClickOutside(e) {
  if (menuRef.value && !menuRef.value.contains(e.target)) open.value = false;
}
onMounted(() => document.addEventListener('click', handleClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside));

async function signOut() {
  await auth.signOut();
  router.replace({ name: 'signin' });
}
</script>

<template>
  <header class="bg-navy-800 border-b border-navy-500/40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <img :src="logoFull" alt="Codeway" class="h-8 hidden sm:block" />
        <img :src="logoMark" alt="Codeway" class="h-8 sm:hidden" />
        <span class="text-slate-400 text-sm font-medium hidden sm:inline">Configuration</span>
      </div>

      <div ref="menuRef" class="relative">
        <button
          class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium"
          @click="open = !open"
          aria-haspopup="true"
          :aria-expanded="open"
        >
          {{ initials }}
        </button>
        <div
          v-if="open"
          class="absolute right-0 mt-2 w-56 card p-2 z-30"
        >
          <p class="text-xs text-slate-400 px-2 py-1 truncate">{{ auth.user?.email }}</p>
          <button class="w-full text-left px-2 py-2 text-sm rounded hover:bg-navy-600" @click="signOut">
            Sign out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
