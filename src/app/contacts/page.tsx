"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Contact } from "@/types";
import { Card } from "@/components/ui/Card";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Input";
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Contacts</h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Manage prospects and customers.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
            className="w-full md:w-auto"
          >
            <HiOutlineUpload className="mr-2 w-5 h-5" />
            Import
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto"
          >
            <HiOutlinePlus className="mr-2 w-5 h-5" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="p-1">
        <div className="relative group">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            type="text"
            placeholder="Search (name, email, WA)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 h-14 pl-12 bg-transparent"
          />
        </div>
      </Card>

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
          <p className="font-medium">
            Failed to load contacts: {(error as any).message}
          </p>
        </Card>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <Card className="overflow-hidden bg-card/50 backdrop-blur-sm">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-secondary/30 text-muted-foreground text-xs font-bold uppercase tracking-wider border-b border-border">
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4">WhatsApp</th>
                  <th className="px-6 py-4">Label</th>
                  <th className="px-6 py-4 hidden md:table-cell">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contacts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-16 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <HiOutlineUserCircle className="w-12 h-12 opacity-30" />
                        <p className="font-medium">No contacts found</p>
                        <p className="text-sm">
                          Add your first contact or import from CSV.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="hover:bg-secondary/20 transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <HiOutlineUserCircle className="w-7 h-7" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">
                              {contact.name}
                            </span>
                            {contact.email && (
                              <span className="text-xs text-muted-foreground">
                                {contact.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {contact.whatsapp_number && (
                          <code className="text-sm font-semibold bg-secondary px-2 py-1 rounded-md text-muted-foreground">
                            {contact.whatsapp_number}
                          </code>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {contact.label && contact.label.length > 0 ? (
                          <Badge variant={labelVariant(contact.label[0])}>
                            {contact.label[0]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-sm text-muted-foreground hidden md:table-cell">
                        {formatDate(contact.created_at)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:bg-primary/10"
                          >
                            <HiOutlineLightningBolt className="w-5 h-5" />
                          </Button>
                          <Dropdown
                            trigger={
                              <Button variant="ghost" size="icon">
                                <HiOutlineDotsHorizontal className="w-5 h-5" />
                              </Button>
                            }
                          >
                            <DropdownItem>View Details</DropdownItem>
                            <DropdownItem>Edit Contact</DropdownItem>
                            <DropdownItem
                              variant="destructive"
                              onClick={() => handleDelete(contact.id)}
                            >
                              <HiOutlineTrash className="mr-2 w-4 h-4" />
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
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">Full Name *</label>
            <Input
              placeholder="e.g. Ahmad Zaki"
              value={newContact.name}
              onChange={(e) =>
                setNewContact({ ...newContact, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">WhatsApp Number</label>
            <Input
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
          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">Email</label>
            <Input
              type="email"
              placeholder="email@example.com"
              value={newContact.email}
              onChange={(e) =>
                setNewContact({ ...newContact, email: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">Notes</label>
            <textarea
              className="flex h-24 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
              placeholder="Optional notes..."
              value={newContact.notes}
              onChange={(e) =>
                setNewContact({ ...newContact, notes: e.target.value })
              }
            />
          </div>
          <Button
            className="w-full h-12 mt-4"
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
        <div className="space-y-6">
          <div className="bg-secondary/30 rounded-xl p-6 text-center">
            <HiOutlineUpload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-2">
              Upload Excel file (.xlsx, .xls) or CSV
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Columns: <code className="bg-secondary px-1 rounded">Nama</code>,{" "}
              <code className="bg-secondary px-1 rounded">WhatsApp</code>,{" "}
              <code className="bg-secondary px-1 rounded">Email</code>,{" "}
              <code className="bg-secondary px-1 rounded">Catatan</code>
            </p>
            <label className="cursor-pointer">
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
        </div>
      </Modal>
    </div>
  );
}
