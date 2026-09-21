import { createRouter, createWebHistory } from "vue-router";
import Login from "../pages/Login.vue";
import Dashboard from "../pages/Dashboard.vue";
import Contacts from "../pages/Contacts.vue";
import Clients from "../pages/Clients.vue";
import Deals from "../pages/Deals.vue";
import Activities from "../pages/Activities.vue";
import Projects from "../pages/Projects.vue";
import ProjectDetail from "../pages/ProjectDetail.vue";
import Tasks from "../pages/Tasks.vue";
import Invoices from "../pages/Invoices.vue";
import InvoiceDetail from "../pages/InvoiceDetail.vue";
import Employees from "../pages/Employees.vue";
import Departments from "../pages/Departments.vue";
import Accounting from "../pages/Accounting.vue";
import Settings from "../pages/Settings.vue";
import DefaultLayout from "../layouts/DefaultLayout.vue";

const routes = [
  { path: "/login", component: Login },
  {
    path: "/",
    component: DefaultLayout,
    children: [
      { path: "", component: Dashboard },
      { path: "contacts", component: Contacts },
      { path: "clients", component: Clients },
      { path: "deals", component: Deals },
      { path: "activities", component: Activities },
      { path: "projects", component: Projects },
      { path: "projects/:id", component: ProjectDetail },
      { path: "tasks", component: Tasks },
      { path: "invoices", component: Invoices },
      { path: "invoices/:id", component: InvoiceDetail },
      { path: "employees", component: Employees },
      { path: "departments", component: Departments },
      { path: "accounting", component: Accounting },
      { path: "settings", component: Settings },
    ],
  },
];

const router = createRouter({ history: createWebHistory(), routes });
router.beforeEach((to) => {
  if (to.path !== "/login" && !localStorage.getItem("access_token")) return "/login";
});
export default router;
