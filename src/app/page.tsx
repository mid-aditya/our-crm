"use client";

import { AppProvider, useApp } from "@/context/AppContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastContainer } from "@/components/ui/ToastContainer";
import DashboardPage from "@/views/DashboardPage";
import CampaignsPage from "@/views/CampaignsPage";
import BroadcastPage from "@/views/BroadcastPage";
import InboxPage from "@/views/InboxPage";
import ComplaintsPage from "@/views/ComplaintsPage";
import ContactsPage from "@/views/ContactsPage";
import AnalyticsPage from "@/views/AnalyticsPage";
import SettingsPage from "@/views/SettingsPage";

const pages: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  campaigns: CampaignsPage,
  broadcast: BroadcastPage,
  inbox: InboxPage,
  complaints: ComplaintsPage,
  contacts: ContactsPage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
};

function AppContent() {
  const { currentPage } = useApp();
  const ActivePage = pages[currentPage] || DashboardPage;

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden relative">
        <ActivePage />
      </main>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
