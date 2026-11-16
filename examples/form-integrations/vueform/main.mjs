import { createApp } from "vue";
import Vueform from "@vueform/vueform";
import theme from "@vueform/vueform/themes/vueform";
import en from "@vueform/vueform/locales/en";
import "@vueform/vueform/dist/vueform.css";
import App from "./App.vue";
createApp(App)
  .use(Vueform, { theme, locales: { en }, locale: "en" })
  .mount("#app");
