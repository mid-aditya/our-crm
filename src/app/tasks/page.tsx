"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { cn, formatDate } from "@/lib/utils";
import type { Task } from "@/types";
import {
  useTasks,
  useCreateTask,
  useToggleTaskStatus,
  useDeleteTask,
} from "@/lib/hooks/useTasks";
import { useAuth } from "@/lib/hooks/useAuth";
import { useState } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlinePlus,
  HiOutlineUser,
  HiOutlineExclamationCircle,
} from "react-icons/hi";

export default function TasksPage() {
  const { profile } = useAuth();
  const teamId = profile?.team_id ?? "";
  const { data: tasksData, isLoading, error } = useTasks(teamId);
  const createTask = useCreateTask(teamId);
  const toggleStatus = useToggleTaskStatus(teamId);
  const deleteTask = useDeleteTask(teamId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as const,
  });

  const tasks: Task[] = (tasksData?.data ?? []) as Task[];

  async function handleCreate() {
    if (!newTask.title) return;
    await createTask.mutateAsync({
      team_id: teamId,
      title: newTask.title,
      description: newTask.description || null,
      priority: newTask.priority,
      status: "todo",
    });
    setNewTask({ title: "", description: "", priority: "medium" });
    setShowAddModal(false);
  }

  async function handleToggle(id: string, currentStatus: string) {
    await toggleStatus.mutateAsync({
      id,
      status: currentStatus === "done" ? "todo" : "done",
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">
            Tasks & Ticketing
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Track team actions and responsibilities.
          </p>
        </div>
        <Button
          className="w-full md:w-auto"
          onClick={() => setShowAddModal(true)}
        >
          <HiOutlinePlus className="mr-2 w-5 h-5" />
          Add Task
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

      {/* Tasks */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-6">
          {tasks.length === 0 && (
            <Card className="p-12 text-center text-muted-foreground">
              <p className="font-medium">No tasks yet</p>
              <p className="text-sm mt-1">
                Create your first task to get started.
              </p>
            </Card>
          )}

          {tasks.map((task) => {
            const isDone = task.status === "done";
            return (
              <Card
                key={task.id}
                className={cn(
                  "group relative overflow-hidden transition-all hover:shadow-xl hover:border-primary/30",
                  isDone && "opacity-60 grayscale-[0.5]",
                )}
              >
                <div
                  className={cn(
                    "absolute top-0 left-0 w-2 h-full transition-colors",
                    isDone
                      ? "bg-emerald-500"
                      : task.priority === "urgent"
                        ? "bg-destructive"
                        : "bg-amber-500",
                  )}
                />

                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant={
                            isDone
                              ? "success"
                              : task.priority === "urgent"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {isDone ? "DONE" : task.priority.toUpperCase()}
                        </Badge>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          Created {formatDate(task.created_at)}
                        </span>
                      </div>

                      <h3
                        className={cn(
                          "text-xl font-bold tracking-tight",
                          isDone && "line-through text-muted-foreground",
                        )}
                      >
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-6 items-center">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 bg-primary/10 rounded-xl text-primary">
                            <HiOutlineUser className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">
                              Contact
                            </p>
                            <p className="text-xs font-bold">
                              {(task as any).contact?.name ?? "-"}
                            </p>
                          </div>
                        </div>
                        {task.due_date && (
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
                              <HiOutlineClock className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">
                                Due Date
                              </p>
                              <p className="text-xs font-bold">
                                {formatDate(task.due_date)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggle(task.id, task.status)}
                      className={cn(
                        "p-4 rounded-2xl transition-all self-center md:self-auto",
                        isDone
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-secondary text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600",
                      )}
                    >
                      <HiOutlineCheckCircle className="w-10 h-10" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Task"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">Title *</label>
            <Input
              placeholder="e.g. Follow up proposal"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">Description</label>
            <textarea
              className="flex h-24 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
              placeholder="Optional description..."
              value={newTask.description}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">Priority</label>
            <select
              className="flex h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
              value={newTask.priority}
              onChange={(e) =>
                setNewTask({ ...newTask, priority: e.target.value as any })
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <Button
            className="w-full h-12 mt-4"
            onClick={handleCreate}
            isLoading={createTask.isPending}
          >
            Create Task
          </Button>
        </div>
      </Modal>
    </div>
  );
}
