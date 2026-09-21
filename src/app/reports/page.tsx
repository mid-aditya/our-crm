"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Contact, Deal } from "@/types";
import type { ActivityLog } from "@/types/database";
import { useAuth } from "@/lib/hooks/useAuth";
import { useContacts } from "@/lib/hooks/useContacts";
import { useDeals } from "@/lib/hooks/useDeals";
import { activityLogs } from "@/lib/supabase/queries";
import { useState } from "react";
import { HiOutlineDocumentDownload } from "react-icons/hi";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";

/* ActivityLog dari query select include relasi actor (profiles) */
type ActivityLogWithActor = ActivityLog & {
  actor?: { full_name: string } | null;
};

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
  const logs = (logsData?.data ?? []) as ActivityLogWithActor[];

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
    { name: "Total Revenue", value: formatCurrency(totalRevenue) },
    { name: "Active Contacts", value: String(contacts.length) },
    { name: "Conversion Rate", value: `${conversionRate}%` },
    { name: "Open Deals", value: String(deals.filter((d) => d.stage !== "deal" && d.stage !== "batal").length) },
  ];

  return (
    <div className="rise space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Performa bisnis dan aktivitas tim dari data real.
          </p>
        </div>
        <Button
          onClick={exportToExcel}
          isLoading={exporting}
          className="w-full md:w-auto"
        >
          {!exporting && <HiOutlineDocumentDownload className="h-4 w-4" />}
          Export Excel
        </Button>
      </div>

      {/* Stat strip — satu blok, garis pembagi, angka mono */}
      <Card className="overflow-hidden p-0">
        <dl className="grid grid-cols-2 divide-border md:grid-cols-4 md:divide-x">
          {stats.map((stat, i) => (
            <div
              key={stat.name}
              className={
                "px-4 py-3.5 " +
                (i < stats.length - 1
                  ? "border-b border-border md:border-b-0 "
                  : "") +
                (i % 2 === 0 ? "border-r md:border-r-0 " : "")
              }
            >
              <dt className="microlabel text-muted-foreground">{stat.name}</dt>
              <dd className="num mt-1.5 text-lg font-semibold tracking-tight">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Activity log */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-display text-sm font-bold tracking-tight">
            Activity Log
          </h2>
        </div>
        <div className="divide-y divide-border/70">
          {logs.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Belum ada aktivitas tercatat.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/40"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                  <span className="num text-[11px] font-semibold text-accent-foreground">
                    {log.actor?.full_name?.charAt(0) ?? "?"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] leading-tight">
                    <span className="font-semibold">
                      {log.actor?.full_name ?? "System"}
                    </span>{" "}
                    <span className="text-muted-foreground">{log.action}</span>
                  </p>
                  <p className="num mt-0.5 text-[11px] text-muted-foreground">
                    {formatDate(log.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
