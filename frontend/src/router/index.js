import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';

const routes = [
  { path: '/signin', name: 'signin', component: () => import('@/views/SignIn.vue') },
  {
    path: '/',
    name: 'parameters',
    component: () => import('@/views/Parameters.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/:catchAll(.*)', redirect: '/' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'signin', query: { redirect: to.fullPath } };
  }
  if (to.name === 'signin' && auth.isAuthenticated) {
    return { name: 'parameters' };
  }
});
