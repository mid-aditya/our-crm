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

function AppContent() {
  const { currentPage } = useApp();

  const pages: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage />,
    campaigns: <CampaignsPage />,
    broadcast: <BroadcastPage />,
    inbox: <InboxPage />,
    complaints: <ComplaintsPage />,
    contacts: <ContactsPage />,
    analytics: <AnalyticsPage />,
    settings: <SettingsPage />,
  };

  return (
    <div className="flex min-h-screen bg-[#0D1117] grid-bg">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {pages[currentPage]}
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
