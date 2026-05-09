import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import { router } from './router/index.js';
import { useAuthStore } from './stores/auth.js';
import { setUnauthorizedHandler } from './services/api.js';
import './assets/styles.css';

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.use(router);

  const auth = useAuthStore();
  await auth.bootstrap();

  setUnauthorizedHandler(async () => {
    await auth.signOut();
    if (router.currentRoute.value.name !== 'signin') {
      router.replace({ name: 'signin' });
    }
  });

  app.mount('#app');
}

bootstrap();
