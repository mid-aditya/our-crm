import { createRouter, createWebHistory } from "vue-router";
import Login from "../pages/Login.vue";
import Dashboard from "../pages/Dashboard.vue";
import Contacts from "../pages/Contacts.vue";
import Deals from "../pages/Deals.vue";
import Activities from "../pages/Activities.vue";
import Conversations from "../pages/Conversations.vue";
import Campaigns from "../pages/Campaigns.vue";
import Tickets from "../pages/Tickets.vue";
import TicketDetail from "../pages/TicketDetail.vue";
import Reports from "../pages/Reports.vue";
import Performance from "../pages/Performance.vue";
import Channels from "../pages/Channels.vue";
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
      { path: "deals", component: Deals },
      { path: "activities", component: Activities },
      { path: "conversations", component: Conversations },
      { path: "campaigns", component: Campaigns },
      { path: "tickets", component: Tickets },
      { path: "tickets/new", component: TicketDetail, props: { isNew: true } },
      { path: "tickets/:id", component: TicketDetail },
      { path: "reports", component: Reports },
      { path: "performance", component: Performance },
      { path: "channels", component: Channels },
      { path: "settings", component: Settings },
    ],
  },
];

const router = createRouter({ history: createWebHistory(), routes });
router.beforeEach((to) => {
  if (to.path !== "/login" && !localStorage.getItem("access_token")) return "/login";
});
export default router;
