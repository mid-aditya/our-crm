"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import type { Deal, Contact } from "@/types";
import {
  useDeals,
  useCreateDeal,
  useUpdateDealStage,
} from "@/lib/hooks/useDeals";
import { useContacts } from "@/lib/hooks/useContacts";
import { useAuth } from "@/lib/hooks/useAuth";
import { useState } from "react";
import {
  HiOutlineCalendar,
  HiOutlineChevronRight,
  HiOutlinePlus,
  HiOutlineExclamationCircle,
} from "react-icons/hi";

const defaultStages = [
  "chat_masuk",
  "tertarik",
  "ditawar",
  "deal",
  "batal",
] as const;
const stageLabels: Record<string, string> = {
  chat_masuk: "Chat Masuk",
  tertarik: "Tertarik",
  ditawar: "Ditawar",
  deal: "Deal",
  batal: "Batal",
};

export default function DealsPage() {
  const { profile } = useAuth();
  const teamId = profile?.team_id ?? "";
  const { data: dealsData, isLoading, error } = useDeals(teamId);
  const { data: contactsData } = useContacts(teamId);
  const createDeal = useCreateDeal(teamId);
  const updateStage = useUpdateDealStage(teamId);

  const [showNewModal, setShowNewModal] = useState(false);
  const [newDeal, setNewDeal] = useState({
    title: "",
    contact_id: "",
    value: 0,
    stage: "chat_masuk",
  });

  const deals: Deal[] = (dealsData?.data ?? []) as Deal[];
  const contacts: Contact[] = (contactsData?.data ?? []) as Contact[];

  async function moveStage(dealId: string, newStage: string) {
    await updateStage.mutateAsync({ id: dealId, stage: newStage });
  }

  async function handleCreateDeal() {
    if (!newDeal.title) return;
    await createDeal.mutateAsync({
      team_id: teamId,
      title: newDeal.title,
      contact_id: newDeal.contact_id || null,
      value: Number(newDeal.value) || 0,
      stage: newDeal.stage as any,
    });
    setNewDeal({ title: "", contact_id: "", value: 0, stage: "chat_masuk" });
    setShowNewModal(false);
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Deals Pipeline</h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Manage your sales pipeline.
          </p>
        </div>
        <Button
          className="w-full md:w-auto shadow-xl"
          onClick={() => setShowNewModal(true)}
        >
          <HiOutlinePlus className="mr-2 w-5 h-5" />
          New Deal
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="p-8 flex items-center justify-center space-x-3 text-destructive">
          <HiOutlineExclamationCircle className="w-6 h-6" />
          <p className="font-medium">{(error as any).message}</p>
        </Card>
      )}

      {/* Kanban */}
      {!isLoading && !error && (
        <div className="flex overflow-x-auto pb-8 space-x-6 min-h-[calc(100vh-280px)] -mx-4 px-4 md:mx-0 md:px-0">
          {defaultStages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage);
            return (
              <div
                key={stage}
                className="flex-shrink-0 w-[300px] md:w-80 flex flex-col group/stage"
              >
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center space-x-3">
                    <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                    <h3 className="font-black text-foreground uppercase tracking-wider text-sm">
                      {stageLabels[stage]}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="px-2 py-0.5">
                    {stageDeals.length}
                  </Badge>
                </div>

                <div
                  className="flex-1 rounded-3xl bg-secondary/20 border-2 border-dashed border-border/50 p-3 space-y-4 transition-colors group-hover/stage:bg-secondary/30 group-hover/stage:border-primary/20"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData("dealId");
                    moveStage(id, stage);
                  }}
                >
                  {stageDeals.map((deal) => (
                    <Card
                      key={deal.id}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("dealId", deal.id)
                      }
                      className="p-4 shadow-sm hover:shadow-xl hover:scale-[1.02] hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing border-border/80 group/card relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary transform -translate-x-full group-hover/card:translate-x-0 transition-transform" />

                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-sm leading-tight group-hover/card:text-primary transition-colors pr-4">
                          {deal.title}
                        </h4>
                        <HiOutlineChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-all" />
                      </div>

                      <div className="flex items-center space-x-2 text-xs mb-4">
                        <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                          {(deal as any).contact?.name?.charAt(0) ?? "?"}
                        </div>
                        <span className="font-medium text-muted-foreground">
                          {(deal as any).contact?.name ?? "No contact"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div className="flex items-center text-primary font-black text-sm">
                          <span className="text-[10px] mr-1 opacity-70">
                            Rp
                          </span>
                          {formatCurrency(deal.value).replace("Rp", "").trim()}
                        </div>
                        {deal.reminder_at && (
                          <div className="flex items-center text-orange-500 text-[10px] font-bold uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-full">
                            <HiOutlineCalendar className="w-3 h-3 mr-1" />
                            Follow Up
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="h-32 flex items-center justify-center text-muted-foreground/30 text-xs font-bold uppercase tracking-widest italic">
                      Drag items here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Deal Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="New Deal"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">Deal Title *</label>
            <Input
              placeholder="e.g. Premium Subscription"
              value={newDeal.title}
              onChange={(e) =>
                setNewDeal({ ...newDeal, title: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">Contact</label>
            <select
              className="flex h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
              value={newDeal.contact_id}
              onChange={(e) =>
                setNewDeal({ ...newDeal, contact_id: e.target.value })
              }
            >
              <option value="">Select contact...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">Value (IDR)</label>
            <Input
              type="number"
              placeholder="0"
              value={newDeal.value}
              onChange={(e) =>
                setNewDeal({ ...newDeal, value: Number(e.target.value) })
              }
            />
          </div>
          <Button
            className="w-full h-12 mt-4"
            onClick={handleCreateDeal}
            isLoading={createDeal.isPending}
          >
            Create Deal
          </Button>
        </div>
      </Modal>
    </div>
  );
}
