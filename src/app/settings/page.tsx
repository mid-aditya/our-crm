"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  HiOutlineShieldCheck,
  HiOutlineTag,
  HiOutlineUserAdd,
  HiOutlineViewGridAdd,
} from "react-icons/hi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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

  const { data: pipelineStagesData } = useQuery<any>({
    queryKey: ["settings", "pipeline_stages"],
    queryFn: () => settings.getByKey("pipeline_stages"),
    enabled: !!profile?.team_id,
  });

  const { data: labelsData } = useQuery<any>({
    queryKey: ["settings", "contact_labels"],
    queryFn: () => settings.getByKey("contact_labels"),
    enabled: !!profile?.team_id,
  });

  const tabs = [
    { id: "team", name: "Team & Roles", icon: HiOutlineShieldCheck },
    { id: "pipeline", name: "Pipeline Stages", icon: HiOutlineViewGridAdd },
    { id: "labels", name: "Contact Labels", icon: HiOutlineTag },
  ];

  const roles = [
    { id: "owner", name: "Owner", desc: "Full access to all features" },
    {
      id: "admin",
      name: "Admin (CS)",
      desc: "Manage team members and settings",
    },
    { id: "sales", name: "Sales", desc: "Manage contacts and deals" },
    { id: "support", name: "Support", desc: "Handle tasks and inbox" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your CRM workspace and team.
        </p>
      </div>

      <div className="flex space-x-1 bg-secondary/50 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 min-h-[400px]">
        {/* Team & Roles */}
        {activeTab === "team" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Role Permissions</h3>
            </div>

            <div className="space-y-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {role.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{role.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {role.desc}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-secondary text-muted-foreground capitalize">
                    {role.id}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Your current role:{" "}
                <span className="font-bold text-foreground capitalize">
                  {profile?.role || "loading..."}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Pipeline Stages */}
        {activeTab === "pipeline" && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Pipeline Configuration</h3>
            <div className="space-y-3">
              {(
                (pipelineStagesData?.data?.value as string[]) ?? defaultStages
              ).map((stage: string, i: number) => (
                <div
                  key={stage}
                  className="flex items-center space-x-4 bg-secondary/30 p-4 rounded-xl border border-border group"
                >
                  <span className="text-muted-foreground font-mono text-xs">
                    {i + 1}
                  </span>
                  <div className="flex-1 flex items-center space-x-3">
                    <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                    <span className="font-medium">
                      {stageLabels[stage] || stage}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {stage}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Pipeline stages are stored in the database. Contact support to
              modify.
            </p>
          </div>
        )}

        {/* Contact Labels */}
        {activeTab === "labels" && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Contact Labels</h3>
            <div className="flex flex-wrap gap-3">
              {((labelsData?.data?.value as string[]) ?? defaultLabels).map(
                (label: string) => (
                  <span
                    key={label}
                    className="px-4 py-2 rounded-full bg-secondary text-sm font-bold text-foreground border border-border"
                  >
                    {label}
                  </span>
                ),
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Labels are stored in the database. Contact support to modify.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
