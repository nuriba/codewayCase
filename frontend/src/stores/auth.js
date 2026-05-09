import { defineStore } from 'pinia';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/services/firebase.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    initialized: false,
    error: '',
  }),
  getters: {
    isAuthenticated: (s) => !!s.user,
  },
  actions: {
    bootstrap() {
      return new Promise((resolve) => {
        onAuthStateChanged(auth, (firebaseUser) => {
          this.user = firebaseUser
            ? { uid: firebaseUser.uid, email: firebaseUser.email }
            : null;
          this.initialized = true;
          resolve();
        });
      });
    },
    async signIn(email, password) {
      this.error = '';
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        this.error = humanizeAuthError(err);
        throw err;
      }
    },
    async signOut() {
      await signOut(auth);
      this.user = null;
    },
  },
});

function humanizeAuthError(err) {
  // Avoid leaking raw Firebase codes to end users.
  const code = err?.code ?? '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Invalid email or password.';
  }
  if (code.includes('too-many-requests')) {
    return 'Too many attempts. Try again later.';
  }
  if (code.includes('network')) {
    return 'Network error — check your connection.';
  }
  return 'Sign in failed. Please try again.';
}
