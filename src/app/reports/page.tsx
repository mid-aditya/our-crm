"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn, formatCurrency } from "@/lib/utils";
import { useState } from "react";
import {
  HiOutlineCurrencyDollar,
  HiOutlineDocumentDownload,
  HiOutlineTrendingUp,
  HiOutlineUsers
} from "react-icons/hi";
import * as XLSX from "xlsx";

export default function ReportsPage() {
  const [exporting, setExporting] = useState(false);

  const exportToExcel = () => {
    setExporting(true);
    const data = [
      { Nama: "Ahmad Zaki", WhatsApp: "081234567890", Email: "zaki@example.com", Status: "Hot", Nilai: 5000000 },
      { Nama: "Budi Santoso", WhatsApp: "082234567891", Email: "budi@example.com", Status: "Deal", Nilai: 2000000 },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CRM Reports");
    XLSX.writeFile(workbook, `CRM_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    setTimeout(() => setExporting(false), 1000);
  };

  const stats = [
    { name: "Total Revenue", value: 7000000, icon: HiOutlineCurrencyDollar, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { name: "Active Leads", value: 124, icon: HiOutlineUsers, color: "text-blue-600", bg: "bg-blue-500/10" },
    { name: "Conversion Rate", value: "18.5%", icon: HiOutlineTrendingUp, color: "text-purple-600", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1 text-lg">Pantau performa bisnis dan ekspor data Anda.</p>
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
          <Card key={i} className="group hover:shadow-2xl transition-all border-none bg-gradient-to-br from-card to-secondary/30">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                  <stat.icon className="w-8 h-8" />
                </div>
                <Badge variant="outline" className="opacity-50">Monthly</Badge>
              </div>
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-1">{stat.name}</p>
              <h3 className="text-3xl font-black tracking-tighter">
                {typeof stat.value === 'number' ? formatCurrency(stat.value) : stat.value}
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
            {[
              { user: "Admin CS", action: "Mengubah tahap Ahmad Zaki ke 'Ditawar'", time: "2 jam yang lalu", initial: "A" },
              { user: "Owner", action: "Menambahkan deal baru 'Project Website'", time: "4 jam yang lalu", initial: "O" },
              { user: "Sales A", action: "Menyelesaikan tugas 'Follow up Budi'", time: "Kemarin", initial: "S" },
            ].map((log, i) => (
              <div key={i} className="flex items-center space-x-4 p-6 hover:bg-secondary/10 transition-colors">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {log.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-tight">
                    <span className="font-bold text-foreground">{log.user}</span>
                    <span className="text-muted-foreground"> {log.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{log.time}</p>
                </div>
                <div className="hidden sm:block">
                    <Badge variant="secondary">ACTIVITY</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
