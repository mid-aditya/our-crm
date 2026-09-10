import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import "./style.css";

const root = document.createElement("div");
root.id = "app";
document.body.appendChild(root);

const app = createApp({ template: "<RouterView />" });
app.use(createPinia());
app.use(router);
app.mount("#app");
