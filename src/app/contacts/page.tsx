"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Contact } from "@/types";
import { Card } from "@/components/ui/Card";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { Input, inputClass } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import {
  useContacts,
  useCreateContact,
  useDeleteContact,
} from "@/lib/hooks/useContacts";
import { useAuth } from "@/lib/hooks/useAuth";
import { useState } from "react";
import {
  HiOutlineDotsHorizontal,
  HiOutlineLightningBolt,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineUserCircle,
  HiOutlineExclamationCircle,
  HiOutlineUpload,
} from "react-icons/hi";
import * as XLSX from "xlsx";

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    whatsapp_number: "",
    email: "",
    notes: "",
  });
  const [importing, setImporting] = useState(false);

  const { profile } = useAuth();
  const teamId = profile?.team_id ?? "";
  const {
    data: contactsData,
    isLoading,
    error,
  } = useContacts(teamId, { search: searchTerm || undefined });
  const createContact = useCreateContact(teamId);
  const deleteContact = useDeleteContact(teamId);

  const contacts: Contact[] = (contactsData?.data ?? []) as Contact[];

  async function handleCreate() {
    if (!newContact.name) return;
    await createContact.mutateAsync({
      team_id: teamId,
      name: newContact.name,
      whatsapp_number: newContact.whatsapp_number || null,
      email: newContact.email || null,
      notes: newContact.notes || null,
    });
    setNewContact({ name: "", whatsapp_number: "", email: "", notes: "" });
    setShowAddModal(false);
  }

  async function handleDelete(id: string) {
    if (window.confirm("Delete this contact?")) {
      await deleteContact.mutateAsync(id);
    }
  }

  function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<{
          Nama?: string;
          WhatsApp?: string;
          Email?: string;
          Catatan?: string;
        }>(sheet);

        json.forEach((row) => {
          if (row.Nama) {
            createContact.mutate({
              team_id: teamId,
              name: row.Nama,
              whatsapp_number: row.WhatsApp || null,
              email: row.Email || null,
              notes: row.Catatan || null,
            });
          }
        });
        setShowImportModal(false);
      } catch {
        alert("Error reading file. Make sure it's a valid Excel/CSV file.");
      }
      setImporting(false);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  const labelVariant = (label: string | null) => {
    if (!label) return "secondary" as const;
    const map: Record<
      string,
      "success" | "warning" | "destructive" | "secondary"
    > = {
      Hot: "destructive",
      VIP: "destructive",
      "Follow Up": "warning",
      Warm: "warning",
      New: "secondary",
      Cold: "secondary",
      Customer: "success",
      Deal: "success",
    };
    return map[label] || "secondary";
  };

  return (
    <div className="rise space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            Contacts
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola prospek dan pelanggan Anda.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
            className="w-full md:w-auto"
          >
            <HiOutlineUpload className="h-4 w-4" />
            Import
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto"
          >
            <HiOutlinePlus className="h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Toolbar: search + count */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <HiOutlineSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari nama, email, nomor WA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <span className="microlabel shrink-0 rounded-md border border-border bg-card px-2 py-1.5 text-muted-foreground">
          {contacts.length} kontak
        </span>
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
            Gagal memuat kontak: {error instanceof Error ? error.message : "Terjadi kesalahan"}
          </p>
        </Card>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <Card className="overflow-hidden">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="microlabel px-4 py-2.5 font-normal">Kontak</th>
                  <th className="microlabel px-4 py-2.5 font-normal">WhatsApp</th>
                  <th className="microlabel px-4 py-2.5 font-normal">Label</th>
                  <th className="microlabel hidden px-4 py-2.5 font-normal md:table-cell">
                    Dibuat
                  </th>
                  <th className="px-4 py-2.5 text-right">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <HiOutlineUserCircle className="h-10 w-10 opacity-30" />
                        <p className="text-sm font-medium">Belum ada kontak</p>
                        <p className="text-xs">
                          Tambah kontak pertama atau import dari CSV.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="group transition-colors hover:bg-secondary/40"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                            <span className="num text-[11px] font-semibold">
                              {contact.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {contact.name}
                            </p>
                            {contact.email && (
                              <p className="truncate text-xs text-muted-foreground">
                                {contact.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="num px-4 py-2.5 text-muted-foreground">
                        {contact.whatsapp_number || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {contact.label && contact.label.length > 0 ? (
                          <Badge variant={labelVariant(contact.label[0])}>
                            {contact.label[0]}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">
                            —
                          </span>
                        )}
                      </td>
                      <td className="num hidden px-4 py-2.5 text-xs text-muted-foreground md:table-cell">
                        {formatDate(contact.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Quick action"
                            className="text-primary hover:bg-primary/10 hover:text-primary"
                          >
                            <HiOutlineLightningBolt className="h-4 w-4" />
                          </Button>
                          <Dropdown
                            trigger={
                              <Button variant="ghost" size="icon-sm" aria-label="More actions">
                                <HiOutlineDotsHorizontal className="h-4 w-4" />
                              </Button>
                            }
                          >
                            <DropdownItem>View Details</DropdownItem>
                            <DropdownItem>Edit Contact</DropdownItem>
                            <DropdownItem
                              variant="destructive"
                              onClick={() => handleDelete(contact.id)}
                            >
                              <HiOutlineTrash className="mr-2 h-3.5 w-3.5" />
                              Delete Contact
                            </DropdownItem>
                          </Dropdown>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Contact Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Contact"
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="contact-name" className="microlabel text-muted-foreground">
              Full name *
            </label>
            <Input
              id="contact-name"
              placeholder="e.g. Ahmad Zaki"
              value={newContact.name}
              onChange={(e) =>
                setNewContact({ ...newContact, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-wa" className="microlabel text-muted-foreground">
              WhatsApp number
            </label>
            <Input
              id="contact-wa"
              inputMode="tel"
              placeholder="08123456789"
              value={newContact.whatsapp_number}
              onChange={(e) =>
                setNewContact({
                  ...newContact,
                  whatsapp_number: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-email" className="microlabel text-muted-foreground">
              Email
            </label>
            <Input
              id="contact-email"
              type="email"
              placeholder="email@example.com"
              value={newContact.email}
              onChange={(e) =>
                setNewContact({ ...newContact, email: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-notes" className="microlabel text-muted-foreground">
              Notes
            </label>
            <textarea
              id="contact-notes"
              className={`${inputClass} h-20 resize-none`}
              placeholder="Catatan opsional..."
              value={newContact.notes}
              onChange={(e) =>
                setNewContact({ ...newContact, notes: e.target.value })
              }
            />
          </div>
          <Button
            className="w-full"
            onClick={handleCreate}
            isLoading={createContact.isPending}
          >
            Add Contact
          </Button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Contacts"
      >
        <div className="rounded-lg border border-dashed border-border bg-secondary/40 p-5 text-center">
          <HiOutlineUpload className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            Upload file Excel (.xlsx, .xls) atau CSV
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Kolom:{" "}
            {["Nama", "WhatsApp", "Email", "Catatan"].map((col) => (
              <code
                key={col}
                className="num mr-1 rounded bg-secondary px-1 py-0.5 text-[11px] text-foreground"
              >
                {col}
              </code>
            ))}
          </p>
          <label className="mt-4 block cursor-pointer">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportCSV}
              disabled={importing}
            />
            <Button
              variant="outline"
              isLoading={importing}
              className="w-full"
            >
              {importing ? "Importing..." : "Select File"}
            </Button>
          </label>
        </div>
      </Modal>
    </div>
  );
}
