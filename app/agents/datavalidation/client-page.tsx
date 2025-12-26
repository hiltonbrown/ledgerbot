"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { ContactComparisonTable } from "@/components/agents/datavalidation/contact-comparison-table";
import { ContactDetailPanel } from "@/components/agents/datavalidation/contact-detail-panel";
import { Input } from "@/components/ui/input";
import type { XeroContactRecord } from "@/types/datavalidation";
import { verifyContactAction } from "./actions";

interface ClientPageProps {
  initialData: {
    stats: any;
    contacts: any[];
  };
  tenantId: string;
}

export function ClientPage({ initialData, tenantId }: ClientPageProps) {
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState(initialData.contacts);
  const [selectedContact, setSelectedContact] =
    useState<XeroContactRecord | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Simple client-side search for MVP. Production should use server search via URL params.
  const filteredContacts = contacts.filter(
    (c) =>
      c.contact.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.taxNumber?.includes(search)
  );

  const handleVerify = async (contactId: string) => {
    // Optimistic update or waiting state could go here
    const result = await verifyContactAction(tenantId, contactId);
    if (result.success && result.data) {
      setContacts((prev) =>
        prev.map((c) =>
          c.contact.contactId === contactId
            ? { ...c, verification: result.data }
            : c
        )
      );

      // Update selected contact if open
      if (selectedContact?.contactId === contactId) {
        // Force re-render of panel?
        // Actually we pass verificationResult to panel, looking up from contacts state is better
      }
    }
  };

  const activeVerification = selectedContact
    ? contacts.find((c) => c.contact.contactId === selectedContact.contactId)
        ?.verification
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            value={search}
          />
        </div>
      </div>

      <ContactComparisonTable
        contacts={filteredContacts}
        onVerify={handleVerify}
        onViewDetails={(contact) => {
          setSelectedContact(contact);
          setIsPanelOpen(true);
        }}
      />

      {selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          onOpenChange={setIsPanelOpen}
          onVerify={handleVerify}
          open={isPanelOpen}
          verificationResult={activeVerification}
        />
      )}
    </div>
  );
}
