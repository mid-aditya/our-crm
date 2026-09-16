import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import "./style.css";

const app = createApp({ template: "<RouterView />" });
app.use(createPinia());
app.use(router);
app.mount("#app");
