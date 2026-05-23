"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Contact, Deal } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { useContacts } from "@/lib/hooks/useContacts";
import { useDeals } from "@/lib/hooks/useDeals";
import { activityLogs } from "@/lib/supabase/queries";
import { useState } from "react";
import {
  HiOutlineCurrencyDollar,
  HiOutlineDocumentDownload,
  HiOutlineTrendingUp,
  HiOutlineUsers,
} from "react-icons/hi";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";

export default function ReportsPage() {
  const { profile } = useAuth();
  const teamId = profile?.team_id ?? "";
  const [exporting, setExporting] = useState(false);

  const { data: contactsData } = useContacts(teamId);
  const { data: dealsData } = useDeals(teamId);

  const { data: logsData } = useQuery({
    queryKey: ["activity-logs", teamId],
    queryFn: () => activityLogs.getAll(teamId),
    enabled: !!teamId,
  });

  const contacts: Contact[] = (contactsData?.data ?? []) as Contact[];
  const deals: Deal[] = (dealsData?.data ?? []) as Deal[];
  const logs: any[] = logsData?.data ?? [];

  const totalRevenue = deals
    .filter((d) => d.stage === "deal")
    .reduce((sum, d) => sum + Number(d.value), 0);
  const conversionRate =
    contacts.length > 0
      ? (
          (deals.filter((d) => d.stage === "deal").length /
            deals.filter((d) => d.stage !== "batal").length) *
          100
        ).toFixed(1)
      : "0.0";

  const exportToExcel = () => {
    setExporting(true);
    const data = contacts.map((c) => ({
      Nama: c.name,
      WhatsApp: c.whatsapp_number || "",
      Email: c.email || "",
      Label: c.label?.join(", ") || "",
      "Tanggal Dibuat": formatDate(c.created_at),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CRM Reports");
    XLSX.writeFile(
      workbook,
      `CRM_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    setTimeout(() => setExporting(false), 1000);
  };

  const stats = [
    {
      name: "Total Revenue (Deal)",
      value: totalRevenue,
      icon: HiOutlineCurrencyDollar,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      name: "Active Contacts",
      value: contacts.length,
      icon: HiOutlineUsers,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      name: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: HiOutlineTrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Track business performance and export data.
          </p>
        </div>
        <Button
          onClick={exportToExcel}
          isLoading={exporting}
          className="w-full md:w-auto h-12 shadow-xl"
        >
          {!exporting && <HiOutlineDocumentDownload className="mr-2 w-5 h-5" />}
          Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <Card
            key={i}
            className="group hover:shadow-2xl transition-all border-none bg-gradient-to-br from-card to-secondary/30"
          >
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div
                  className={`${stat.bg} ${stat.color} p-4 rounded-2xl transition-transform group-hover:scale-110`}
                >
                  <stat.icon className="w-8 h-8" />
                </div>
                <Badge variant="outline" className="opacity-50">
                  Total
                </Badge>
              </div>
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-1">
                {stat.name}
              </p>
              <h3 className="text-3xl font-black tracking-tighter">
                {typeof stat.value === "number"
                  ? formatCurrency(stat.value)
                  : stat.value}
              </h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 shadow-xl overflow-hidden">
        <CardHeader className="bg-secondary/20 p-6">
          <CardTitle className="text-xl">Recent Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {logs.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                No activity recorded yet.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center space-x-4 p-6 hover:bg-secondary/10 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {(log as any).actor?.full_name?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-tight">
                      <span className="font-bold text-foreground">
                        {(log as any).actor?.full_name ?? "System"}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        {log.action}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <Badge variant="secondary">ACTIVITY</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
