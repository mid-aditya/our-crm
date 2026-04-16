"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { Deal } from "@/types";
import { useState } from "react";
import {
  HiOutlineCalendar,
  HiOutlineChevronRight,
    HiOutlineCurrencyDollar,
  HiOutlinePlus
} from "react-icons/hi";

const defaultStages = ["chat_masuk", "tertarik", "ditawar", "deal", "batal"];
const stageLabels: Record<string, string> = {
  chat_masuk: "Chat Masuk",
  tertarik: "Tertarik",
  ditawar: "Ditawar",
  deal: "Deal",
  batal: "Batal",
};

const mockDeals: Deal[] = [
  {
    id: "d1",
    contact_id: "1",
    title: "Project Website",
    value: 5000000,
    stage: "chat_masuk",
    reminder_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: { id: "1", name: "Ahmad Zaki", email: "zaki@ex.com", whatsapp_number: "081", label: "Hot", notes: "", created_at: "" }
  },
  {
    id: "d2",
    contact_id: "2",
    title: "Maintenance Server",
    value: 2000000,
    stage: "tertarik",
    reminder_at: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: { id: "2", name: "Budi Santoso", email: "budi@ex.com", whatsapp_number: "082", label: "Follow Up", notes: "", created_at: "" }
  }
];

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>(mockDeals);

  const moveStage = (dealId: string, newStage: string) => {
    setDeals(deals.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Deals Pipeline</h1>
          <p className="text-muted-foreground mt-1 text-lg">Kelola pipeline penjualan dan pantau progres deal Anda.</p>
        </div>
        <Button className="w-full md:w-auto shadow-xl">
          <HiOutlinePlus className="mr-2 w-5 h-5" />
          New Deal
        </Button>
      </div>

      <div className="flex overflow-x-auto pb-8 space-x-6 min-h-[calc(100vh-280px)] -mx-4 px-4 md:mx-0 md:px-0">
        {defaultStages.map((stage) => {
          const stageDeals = deals.filter(d => d.stage === stage);
          return (
            <div key={stage} className="flex-shrink-0 w-[300px] md:w-80 flex flex-col group/stage">
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
                onDragOver={(e: React.DragEvent) => e.preventDefault()}
                onDrop={(e: React.DragEvent) => {
                  const id = e.dataTransfer.getData("dealId");
                  moveStage(id, stage);
                }}
              >
                {stageDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    draggable
                    onDragStart={(e: React.DragEvent) => e.dataTransfer.setData("dealId", deal.id)}
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
                        {deal.contact?.name.charAt(0)}
                      </div>
                      <span className="font-medium text-muted-foreground">{deal.contact?.name}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center text-primary font-black text-sm">
                        <span className="text-[10px] mr-1 opacity-70">Rp</span>
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
    </div>
  );
}
