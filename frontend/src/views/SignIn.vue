<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';
import logoMark from '@/assets/logo-mark.png';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const submitting = ref(false);

async function submit() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await auth.signIn(email.value.trim(), password.value);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    router.replace(redirect);
  } catch {
    // store sets `auth.error`
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4 bg-[#1a1b2e]">
    <form class="w-full max-w-sm flex flex-col gap-6" @submit.prevent="submit">
      <div class="flex flex-col items-center gap-6 mb-2">
        <img :src="logoMark" alt="Codeway" class="h-20 object-contain" />
        <h1 class="text-xl font-medium text-slate-400">Please sign in</h1>

      </div>

      <div class="space-y-4">
        <div>
          <input
            id="email"
            v-model="email"
            type="email"
            class="w-full px-4 py-3 rounded-md bg-[#16182c] border border-fuchsia-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="E-mail address"
            autocomplete="email"
            required
          />
        </div>
        <div>
          <input
            id="password"
            v-model="password"
            type="password"
            class="w-full px-4 py-3 rounded-md bg-[#16182c] border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Password"
            autocomplete="current-password"
            required
          />
        </div>
      </div>

      <p v-if="auth.error" class="text-coral-500 text-sm text-center" role="alert">{{ auth.error }}</p>

      <button
        class="w-full py-3 rounded-md text-white font-medium bg-[#5b73e8] hover:bg-[#4b63d8] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1b2e] focus:ring-[#5b73e8] disabled:opacity-50"
        :disabled="submitting"
        type="submit"
      >
        {{ submitting ? 'Signing in…' : 'Sign in' }}
      </button>

      <p class="mt-8 text-xs text-slate-500 text-center">Codeway © 2026</p>
    </form>
  </div>
</template>
