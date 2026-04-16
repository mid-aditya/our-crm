"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import {
    HiOutlineBell,
    HiOutlineShieldCheck,
    HiOutlineTag,
    HiOutlineUserAdd,
    HiOutlineViewGridAdd
} from "react-icons/hi";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("team");

  const tabs = [
    { id: "team", name: "Team & Roles", icon: HiOutlineShieldCheck },
    { id: "pipeline", name: "Pipeline Stages", icon: HiOutlineViewGridAdd },
    { id: "labels", name: "Contact Labels", icon: HiOutlineTag },
    { id: "notifications", name: "Notifications", icon: HiOutlineBell },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your CRM workspace and team.</p>
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
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 min-h-[400px]">
        {activeTab === "team" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Team Members</h3>
              <button className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
                <HiOutlineUserAdd className="w-4 h-4" />
                <span>Invite Member</span>
              </button>
            </div>
            
            <div className="divide-y divide-border">
              {[
                { name: "Admin CS", role: "admin", email: "cs@ourcrm.com" },
                { name: "Sales Regular", role: "sales", email: "sales@ourcrm.com" },
                { name: "Followup Specialist", role: "sales", email: "followup@ourcrm.com" },
              ].map((member, i) => (
                <div key={i} className="py-4 flex items-center justify-between group">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">
                      {member.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <select className="bg-secondary border-none text-xs font-bold rounded-lg px-2 py-1 outline-none">
                      <option value="owner">Owner</option>
                      <option value="admin" selected={member.role === 'admin'}>Admin (CS)</option>
                      <option value="sales" selected={member.role === 'sales'}>Sales</option>
                    </select>
                    <button className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold px-2">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "pipeline" && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Pipeline Configuration</h3>
            <div className="space-y-3">
              {["Chat Masuk", "Tertarik", "Ditawar", "Deal", "Batal"].map((stage, i) => (
                <div key={i} className="flex items-center space-x-4 bg-secondary/30 p-4 rounded-xl border border-border group">
                  <span className="text-muted-foreground font-mono text-xs">{i + 1}</span>
                  <input 
                    type="text" 
                    defaultValue={stage} 
                    className="flex-1 bg-transparent font-medium focus:outline-none" 
                  />
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100">
                    <button className="text-muted-foreground hover:text-foreground">↑</button>
                    <button className="text-muted-foreground hover:text-foreground">↓</button>
                  </div>
                </div>
              ))}
              <button className="w-full py-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-primary hover:border-primary transition-all font-medium">
                + Add Stage
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
