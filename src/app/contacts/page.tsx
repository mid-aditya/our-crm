"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { Contact } from "@/types";
import { useState } from "react";
import {
  HiOutlineDotsHorizontal,
  HiOutlineLightningBolt,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineUserCircle
} from "react-icons/hi";

// Mock data
const mockContacts: Contact[] = [
  {
    id: "1",
    name: "Ahmad Zaki",
    whatsapp_number: "081234567890",
    email: "zaki@example.com",
    label: "Hot",
    notes: "Interesed in premium plan",
    created_at: "2026-04-16T11:00:00.000Z",
  },
  {
    id: "2",
    name: "Budi Santoso",
    whatsapp_number: "082234567891",
    email: "budi@example.com",
    label: "Follow Up",
    notes: "Needs demo next week",
    created_at: "2026-04-16T11:00:00.000Z",
  },
];

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Contacts</h1>
          <p className="text-muted-foreground mt-1 text-lg">Kelola prospek dan pelanggan potensial Anda.</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="w-full md:w-auto"
        >
          <HiOutlinePlus className="mr-2 w-5 h-5" />
          Quick Add
        </Button>
      </div>

      <Card className="p-1">
        <div className="relative group">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            type="text"
            placeholder="Cari cepat (nama, email, no wa)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 h-14 pl-12 bg-transparent"
          />
        </div>
      </Card>

      <Card className="overflow-hidden bg-card/50 backdrop-blur-sm">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-secondary/30 text-muted-foreground text-xs font-bold uppercase tracking-wider border-b border-border">
                <th className="px-6 py-4">Informasi Kontak</th>
                <th className="px-6 py-4">WhatsApp</th>
                <th className="px-6 py-4">Label</th>
                <th className="px-6 py-4 hidden md:table-cell">Created</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <HiOutlineUserCircle className="w-7 h-7" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{contact.name}</span>
                        <span className="text-xs text-muted-foreground">{contact.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <code className="text-sm font-semibold bg-secondary px-2 py-1 rounded-md text-muted-foreground">
                      {contact.whatsapp_number}
                    </code>
                  </td>
                  <td className="px-6 py-5">
                    <Badge variant={contact.label === 'Hot' ? "destructive" : "warning"}>
                      {contact.label}
                    </Badge>
                  </td>
                  <td className="px-6 py-5 text-sm text-muted-foreground hidden md:table-cell">
                    {formatDate(contact.created_at)}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
                        <HiOutlineLightningBolt className="w-5 h-5" />
                      </Button>
                      <Dropdown trigger={
                        <Button variant="ghost" size="icon">
                          <HiOutlineDotsHorizontal className="w-5 h-5" />
                        </Button>
                      }>
                        <DropdownItem>Detail Progres</DropdownItem>
                        <DropdownItem>Edit Informasi</DropdownItem>
                        <DropdownItem variant="destructive">
                          <HiOutlineTrash className="mr-2 w-4 h-4" />
                          Hapus Kontak
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        title="Quick Add Contact"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">Nama Lengkap</label>
            <Input placeholder="Contoh: Ahmad Zaki" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">WhatsApp</label>
            <Input placeholder="08123456789" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">Label</label>
            <select className="flex h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all">
              <option>Cold</option>
              <option>Warm</option>
              <option>Hot</option>
            </select>
          </div>
          <Button className="w-full h-12 mt-4" onClick={() => setShowAddModal(false)}>
            Tambah Kontak
          </Button>
        </div>
      </Modal>
    </div>
  );
}
