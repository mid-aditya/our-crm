"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn, formatDate } from "@/lib/utils";
import { Task } from "@/types";
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlinePlus,
  HiOutlineShieldCheck,
  HiOutlineUser
} from "react-icons/hi";

const mockTasks: Task[] = [
  {
    id: "t1",
    contact_id: "1",
    deal_id: "d1",
    practitioner_id: "s1",
    pic_id: "o1",
    description: "Follow up proposal after project website chat",
    due_date: new Date(Date.now() + 3600000 * 5).toISOString(),
    status: "pending",
    created_at: new Date().toISOString(),
  },
  {
    id: "t2",
    contact_id: "2",
    deal_id: "d2",
    practitioner_id: "s2",
    pic_id: "o1",
    description: "Prepare maintenance contract for Budi",
    due_date: new Date(Date.now() + 86400000).toISOString(),
    status: "completed",
    created_at: new Date().toISOString(),
  },
];

export default function TasksPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Tasks & Ticketing</h1>
          <p className="text-muted-foreground mt-1 text-lg">Pantau aksi dan tanggung jawab tim Anda.</p>
        </div>
        <Button className="w-full md:w-auto">
          <HiOutlinePlus className="mr-2 w-5 h-5" />
          Add Task
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {mockTasks.map((task) => (
          <Card 
            key={task.id} 
            className={cn(
              "group relative overflow-hidden transition-all hover:shadow-xl hover:border-primary/30",
              task.status === 'completed' && "opacity-60 grayscale-[0.5]"
            )}
          >
            <div className={cn(
                "absolute top-0 left-0 w-2 h-full transition-colors",
                task.status === 'pending' ? "bg-amber-500" : "bg-emerald-500"
            )} />
            
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center space-x-3">
                    <Badge variant={task.status === 'pending' ? "warning" : "success"}>
                      {task.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Created {formatDate(task.created_at)}
                    </span>
                  </div>
                  
                  <h3 className={cn(
                    "text-xl font-bold tracking-tight",
                    task.status === 'completed' && "line-through text-muted-foreground"
                  )}>
                    {task.description}
                  </h3>
                  
                  <div className="flex flex-wrap gap-6 items-center">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary">
                        <HiOutlineUser className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Practitioner</p>
                        <p className="text-xs font-bold">Sales Team A</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-purple-500/10 rounded-xl text-purple-600">
                        <HiOutlineShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">PIC</p>
                        <p className="text-xs font-bold">Owner</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
                        <HiOutlineClock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Due Date</p>
                        <p className="text-xs font-bold">{task.due_date ? formatDate(task.due_date) : '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button className={cn(
                  "p-4 rounded-2xl transition-all self-center md:self-auto",
                  task.status === 'pending' 
                    ? "bg-secondary text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600" 
                    : "bg-emerald-500/10 text-emerald-600"
                )}>
                  <HiOutlineCheckCircle className="w-10 h-10" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
