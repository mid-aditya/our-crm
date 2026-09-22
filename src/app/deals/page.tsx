"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, inputClass } from "@/components/ui/Input";
import { cn, formatCurrency } from "@/lib/utils";
import type { Deal, Contact, DealStage } from "@/types";
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
  HiOutlineExclamationCircle,
  HiOutlinePlus,
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

/* Warna rail per stage: netral -> hangat -> hijau penuh -> mati */
const stageRail: Record<string, string> = {
  chat_masuk: "bg-muted-foreground/40",
  tertarik: "bg-warning",
  ditawar: "bg-warning",
  deal: "bg-primary",
  batal: "bg-destructive/60",
};

export default function DealsPage() {
  const { profile } = useAuth();
  const teamId = profile?.team_id ?? "";
  const { data: dealsData, isLoading, error } = useDeals(teamId);
  const { data: contactsData } = useContacts(teamId);
  const createDeal = useCreateDeal(teamId);
  const updateStage = useUpdateDealStage(teamId);

  const [showNewModal, setShowNewModal] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [newDeal, setNewDeal] = useState<{
    title: string;
    contact_id: string;
    value: number;
    stage: DealStage;
  }>({
    title: "",
    contact_id: "",
    value: 0,
    stage: "chat_masuk",
  });

  const deals: Deal[] = (dealsData?.data ?? []) as Deal[];
  const contacts: Contact[] = (contactsData?.data ?? []) as Contact[];

  const stageValue = (stage: string) =>
    deals
      .filter((d) => d.stage === stage)
      .reduce((sum, d) => sum + Number(d.value), 0);

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
      stage: newDeal.stage,
    });
    setNewDeal({ title: "", contact_id: "", value: 0, stage: "chat_masuk" });
    setShowNewModal(false);
  }

  return (
    <div className="rise space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            Deals Pipeline
          </h1>
          <p className="text-sm text-muted-foreground">
            Tarik kartu antar kolom untuk memindahkan stage.
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="w-full md:w-auto">
          <HiOutlinePlus className="h-4 w-4" />
          New Deal
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="flex items-center justify-center gap-2 p-6 text-destructive">
          <HiOutlineExclamationCircle className="h-5 w-5" />
          <p className="text-sm font-medium">
            {error instanceof Error ? error.message : "Terjadi kesalahan"}
          </p>
        </Card>
      )}

      {/* Kanban */}
      {!isLoading && !error && (
        <div className="scroll-slim -mx-4 flex gap-3 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0">
          {defaultStages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage);
            return (
              <section
                key={stage}
                className="flex w-[260px] shrink-0 flex-col"
                aria-label={stageLabels[stage]}
              >
                {/* Column header */}
                <div className="flex items-baseline justify-between border-b border-border px-0.5 pb-2">
                  <h3 className="microlabel flex items-center gap-2 text-foreground">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        stageRail[stage] ?? "bg-muted-foreground/40",
                      )}
                    />
                    {stageLabels[stage]}
                  </h3>
                  <span className="num text-xs text-muted-foreground">
                    {stageDeals.length}
                  </span>
                </div>
                <p className="num mt-1.5 px-0.5 text-[11px] text-muted-foreground">
                  {formatCurrency(stageValue(stage))}
                </p>

                {/* Cards */}
                <div
                  className={cn(
                    "mt-2 flex-1 space-y-2 rounded-lg bg-secondary/40 p-2 transition-colors",
                    dragOverStage === stage &&
                      "bg-primary/10 ring-1 ring-inset ring-primary/40",
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverStage !== stage) setDragOverStage(stage);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverStage(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverStage(null);
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
                      className="group cursor-grab overflow-hidden p-0 transition-shadow hover:shadow-md active:cursor-grabbing"
                    >
                      <div className="flex">
                        {/* Stage rail */}
                        <div
                          className={cn(
                            "w-1 shrink-0 self-stretch",
                            stageRail[stage] ?? "bg-muted-foreground/40",
                          )}
                        />
                        <div className="min-w-0 flex-1 p-2.5">
                          <h4 className="truncate text-[13px] font-semibold leading-tight">
                            {deal.title}
                          </h4>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {deal.contact?.name ?? "No contact"}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="num text-[13px] font-semibold text-primary">
                              {formatCurrency(deal.value)}
                            </span>
                            {deal.reminder_at && (
                              <span className="microlabel flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-warning">
                                <HiOutlineCalendar className="h-3 w-3" />
                                Follow up
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="microlabel flex h-14 items-center justify-center rounded-md border border-dashed border-border/70 text-muted-foreground/60">
                      Kosong
                    </div>
                  )}
                </div>
              </section>
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
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="deal-title" className="microlabel text-muted-foreground">
              Deal title *
            </label>
            <Input
              id="deal-title"
              placeholder="e.g. Premium Subscription"
              value={newDeal.title}
              onChange={(e) =>
                setNewDeal({ ...newDeal, title: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="deal-contact" className="microlabel text-muted-foreground">
              Contact
            </label>
            <select
              id="deal-contact"
              className={inputClass}
              value={newDeal.contact_id}
              onChange={(e) =>
                setNewDeal({ ...newDeal, contact_id: e.target.value })
              }
            >
              <option value="">Pilih kontak...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="deal-value" className="microlabel text-muted-foreground">
                Value (IDR)
              </label>
              <Input
                id="deal-value"
                type="number"
                min={0}
                placeholder="0"
                value={newDeal.value}
                onChange={(e) =>
                  setNewDeal({ ...newDeal, value: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="deal-stage" className="microlabel text-muted-foreground">
                Stage
              </label>
              <select
                id="deal-stage"
                className={inputClass}
                value={newDeal.stage}
                onChange={(e) =>
                  setNewDeal({
                    ...newDeal,
                    stage: e.target.value as DealStage,
                  })
                }
              >
                {defaultStages.map((s) => (
                  <option key={s} value={s}>
                    {stageLabels[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            className="w-full"
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
