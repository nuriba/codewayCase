<script setup>
import { useAuthStore } from '@/stores/auth.js';
const auth = useAuthStore();
</script>

<template>
  <div class="min-h-screen bg-navy-700 text-slate-100">
    <router-view v-if="auth.initialized" />
    <div v-else class="flex items-center justify-center h-screen text-slate-400">Loading…</div>
  </div>
</template>
