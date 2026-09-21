"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, inputClass } from "@/components/ui/Input";
import { cn, formatDate } from "@/lib/utils";
import type { Task } from "@/types";
import type { TaskPriority } from "@/types/database";
import {
  useTasks,
  useCreateTask,
  useToggleTaskStatus,
  useDeleteTask,
} from "@/lib/hooks/useTasks";
import { useAuth } from "@/lib/hooks/useAuth";
import { useState } from "react";
import {
  HiOutlineCheck,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineUser,
  HiOutlinePlus,
  HiOutlineTrash,
} from "react-icons/hi";

/* Task dari query select include relasi contact */
type TaskWithContact = Task & { contact?: { name: string } | null };

const priorityVariant: Record<
  Task["priority"],
  "destructive" | "warning" | "secondary"
> = {
  urgent: "destructive",
  medium: "warning",
  low: "secondary",
};

export default function TasksPage() {
  const { profile } = useAuth();
  const teamId = profile?.team_id ?? "";
  const { data: tasksData, isLoading, error } = useTasks(teamId);
  const createTask = useCreateTask(teamId);
  const toggleStatus = useToggleTaskStatus(teamId);
  const deleteTask = useDeleteTask(teamId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    priority: TaskPriority;
  }>({
    title: "",
    description: "",
    priority: "medium",
  });

  const tasks: TaskWithContact[] = (tasksData?.data ?? []) as TaskWithContact[];
  const doneCount = tasks.filter((t) => t.status === "done").length;

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
    <div className="rise space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="num">{doneCount}</span>/{tasks.length ?? 0}{" "}
            selesai — pantau tindak lanjut tim.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-full md:w-auto">
          <HiOutlinePlus className="h-4 w-4" />
          Add Task
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

      {/* Task list */}
      {!isLoading && !error && (
        <Card className="divide-y divide-border/70 overflow-hidden p-0">
          {tasks.length === 0 && (
            <div className="px-4 py-12 text-center text-muted-foreground">
              <p className="text-sm font-medium">Belum ada task</p>
              <p className="mt-1 text-xs">
                Buat task pertama untuk mulai memantau follow-up.
              </p>
            </div>
          )}

          {tasks.map((task) => {
            const isDone = task.status === "done";
            return (
              <div
                key={task.id}
                className={cn(
                  "group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/40",
                  isDone && "opacity-60",
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggle(task.id, task.status)}
                  aria-label={isDone ? "Mark as todo" : "Mark as done"}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                    isDone
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-card hover:border-primary",
                  )}
                >
                  {isDone && <HiOutlineCheck className="h-3.5 w-3.5" />}
                </button>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={cn(
                        "text-sm font-semibold leading-tight",
                        isDone && "line-through",
                      )}
                    >
                      {task.title}
                    </h3>
                    <Badge variant={priorityVariant[task.priority] ?? "secondary"} micro>
                      {task.priority}
                    </Badge>
                  </div>

                  {task.description && (
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {task.description}
                    </p>
                  )}

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <HiOutlineUser className="h-3.5 w-3.5" />
                      {task.contact?.name ?? "—"}
                    </span>
                    {task.due_date && (
                      <span className="num flex items-center gap-1">
                        <HiOutlineClock className="h-3.5 w-3.5" />
                        {formatDate(task.due_date)}
                      </span>
                    )}
                    <span className="num">dibuat {formatDate(task.created_at)}</span>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteTask.mutate(task.id)}
                  aria-label="Delete task"
                  className="rounded-md p-1.5 text-muted-foreground/50 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </Card>
      )}

      {/* Add Task Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Task"
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="microlabel text-muted-foreground">
              Title *
            </label>
            <Input
              id="task-title"
              placeholder="e.g. Follow up proposal"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="task-desc" className="microlabel text-muted-foreground">
              Description
            </label>
            <textarea
              id="task-desc"
              className={`${inputClass} h-20 resize-none`}
              placeholder="Deskripsi opsional..."
              value={newTask.description}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="task-priority" className="microlabel text-muted-foreground">
              Priority
            </label>
            <select
              id="task-priority"
              className={inputClass}
              value={newTask.priority}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  priority: e.target.value as TaskPriority,
                })
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <Button
            className="w-full"
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
