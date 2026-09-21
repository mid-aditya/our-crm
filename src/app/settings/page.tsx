"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  HiOutlineShieldCheck,
  HiOutlineTag,
  HiOutlineViewGridAdd,
} from "react-icons/hi";
import { Card } from "@/components/ui/Card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { settings } from "@/lib/supabase/queries";

const defaultStages = ["chat_masuk", "tertarik", "ditawar", "deal", "batal"];
const stageLabels: Record<string, string> = {
  chat_masuk: "Chat Masuk",
  tertarik: "Tertarik",
  ditawar: "Ditawar",
  deal: "Deal",
  batal: "Batal",
};

const defaultLabels = ["Hot", "Warm", "Cold", "VIP", "Customer", "Follow Up"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("team");
  const { profile } = useAuth();

  type SettingsRow = { data: { value: unknown } | null } | null;

  const { data: pipelineStagesData } = useQuery<SettingsRow>({
    queryKey: ["settings", "pipeline_stages"],
    queryFn: () => settings.getByKey("pipeline_stages"),
    enabled: !!profile?.team_id,
  });

  const { data: labelsData } = useQuery<SettingsRow>({
    queryKey: ["settings", "contact_labels"],
    queryFn: () => settings.getByKey("contact_labels"),
    enabled: !!profile?.team_id,
  });

  const tabs = [
    { id: "team", name: "Team & Roles", icon: HiOutlineShieldCheck },
    { id: "pipeline", name: "Pipeline", icon: HiOutlineViewGridAdd },
    { id: "labels", name: "Labels", icon: HiOutlineTag },
  ];

  const roles = [
    { id: "owner", name: "Owner", desc: "Akses penuh ke semua fitur" },
    { id: "admin", name: "Admin (CS)", desc: "Kelola anggota tim dan settings" },
    { id: "sales", name: "Sales", desc: "Kelola kontak dan deal" },
    { id: "support", name: "Support", desc: "Tangani task dan inbox" },
  ];

  return (
    <div className="rise space-y-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Atur workspace CRM dan tim Anda.
        </p>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex w-fit gap-px overflow-hidden rounded-lg border border-border bg-border"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold transition-colors",
              activeTab === tab.id
                ? "bg-card text-foreground"
                : "bg-secondary/40 text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.name}</span>
          </button>
        ))}
      </div>

      <Card className="p-4">
        {/* Team & Roles */}
        {activeTab === "team" && (
          <div className="space-y-3">
            <h2 className="font-display text-sm font-bold tracking-tight">
              Role Permissions
            </h2>
            <div className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-secondary/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                      <span className="num text-[11px] font-semibold text-accent-foreground">
                        {role.name[0]}
                      </span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-tight">
                        {role.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {role.desc}
                      </p>
                    </div>
                  </div>
                  <span className="microlabel shrink-0 rounded bg-secondary px-1.5 py-1 text-muted-foreground">
                    {role.id}
                  </span>
                </div>
              ))}
            </div>
            <p className="microlabel text-muted-foreground">
              Role Anda: {profile?.role || "..."}
            </p>
          </div>
        )}

        {/* Pipeline Stages */}
        {activeTab === "pipeline" && (
          <div className="space-y-3">
            <h2 className="font-display text-sm font-bold tracking-tight">
              Pipeline Configuration
            </h2>
            <div className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border">
              {(
                (pipelineStagesData?.data?.value as string[] | undefined) ??
                defaultStages
              ).map((stage: string, i: number) => (
                <div
                  key={stage}
                  className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-secondary/40"
                >
                  <span className="num text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-[13px] font-medium">
                    {stageLabels[stage] || stage}
                  </span>
                  <span className="num ml-auto text-[11px] text-muted-foreground">
                    {stage}
                  </span>
                </div>
              ))}
            </div>
            <p className="microlabel text-muted-foreground">
              Stage tersimpan di database — hubungi support untuk mengubah
            </p>
          </div>
        )}

        {/* Contact Labels */}
        {activeTab === "labels" && (
          <div className="space-y-3">
            <h2 className="font-display text-sm font-bold tracking-tight">
              Contact Labels
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {((labelsData?.data?.value as string[] | undefined) ?? defaultLabels).map(
                (label: string) => (
                  <span
                    key={label}
                    className="microlabel rounded border border-border bg-secondary/50 px-2 py-1.5 text-secondary-foreground"
                  >
                    {label}
                  </span>
                ),
              )}
            </div>
            <p className="microlabel text-muted-foreground">
              Label tersimpan di database — hubungi support untuk mengubah
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
