import { defineStore } from "pinia";
import { api } from "../api/client";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: localStorage.getItem("access_token") ?? "",
    companies: [] as { company_id: string }[],
  }),
  actions: {
    async login(email: string, password: string, company_id?: string) {
      const data = await api.login(email, password, company_id);
      if ("requires_company_selection" in (data as object)) {
        this.companies = (data as { companies: { company_id: string }[] }).companies;
        return "choose" as const;
      }
      const t = data as { access_token: string; refresh_token: string };
      this.accessToken = t.access_token;
      localStorage.setItem("access_token", t.access_token);
      localStorage.setItem("refresh_token", t.refresh_token);
      return "ok" as const;
    },
    logout() {
      this.accessToken = "";
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    },
  },
});
