<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';
import logoMark from '@/assets/logo-mark.png';
import logoFull from '@/assets/logo-full.png';

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
  <div class="min-h-screen flex flex-col items-center justify-center px-4">
    <form class="card w-full max-w-md p-8 space-y-6" @submit.prevent="submit">
      <div class="flex flex-col items-center gap-3">
        <img :src="logoFull" alt="Codeway" class=" h-14" />
        <h1 class="text-xl font-semibold">Please sign in</h1>
      </div>

      <div class="space-y-4">
        <div>
          <label class="label" for="email">Email</label>
          <input id="email" v-model="email" type="email" class="input" autocomplete="email" required />
        </div>
        <div>
          <label class="label" for="password">Password</label>
          <input id="password" v-model="password" type="password" class="input" autocomplete="current-password" required />
        </div>
      </div>

      <p v-if="auth.error" class="text-coral-500 text-sm" role="alert">{{ auth.error }}</p>

      <button class="btn-primary w-full" :disabled="submitting" type="submit">
        {{ submitting ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>

    <p class="mt-6 text-xs text-slate-500">Codeway © 2025</p>
  </div>
</template>
