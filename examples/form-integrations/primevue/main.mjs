import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import App from './App.vue';
createApp(App).use(PrimeVue, { unstyled: true }).mount('#app');
