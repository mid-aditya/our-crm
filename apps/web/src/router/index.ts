import { createRouter, createWebHistory } from "vue-router";
import Login from "../pages/Login.vue";
import Dashboard from "../pages/Dashboard.vue";
import Contacts from "../pages/Contacts.vue";
import Deals from "../pages/Deals.vue";
import Activities from "../pages/Activities.vue";
import DefaultLayout from "../layouts/DefaultLayout.vue";

const routes = [
  { path: "/login", component: Login },
  {
    path: "/",
    component: DefaultLayout,
    children: [
      { path: "", component: Dashboard },
      { path: "contacts", component: Contacts },
      { path: "deals", component: Deals },
      { path: "activities", component: Activities },
    ],
  },
];

const router = createRouter({ history: createWebHistory(), routes });
router.beforeEach((to) => {
  if (to.path !== "/login" && !localStorage.getItem("access_token")) return "/login";
});
export default router;
