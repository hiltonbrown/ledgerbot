import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/agents/ap/sync/route";

// Mock dependencies
vi.mock("@/lib/auth/clerk-helpers", () => ({
  getAuthUser: vi.fn(),
}));

vi.mock("@/lib/ai/xero-mcp-client", () => ({
  executeXeroMCPTool: vi.fn(),
}));

vi.mock("@/lib/db/queries", () => ({
  getActiveXeroConnection: vi.fn(),
  updateConnectionLastSyncedAt: vi.fn(),
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/db/queries/ap", () => ({
  upsertContacts: vi.fn(),
  upsertBills: vi.fn(),
  createCommsArtefact: vi.fn(),
}));

vi.mock("@/lib/ai/providers", () => ({
  myProvider: {
    languageModel: vi.fn().mockReturnValue({}),
  },
}));

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({ text: "Generated commentary" }),
}));

import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";
// Import mocks to configure them
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getActiveXeroConnection,
  updateConnectionLastSyncedAt,
} from "@/lib/db/queries";
import { upsertBills, upsertContacts } from "@/lib/db/queries/ap";

describe("AP Agent Sync Logic", () => {
  const mockUser = { id: "user_123" };
  const mockConnection = {
    id: "conn_123",
    tenantId: "tenant_abc",
    lastSyncedAt: new Date("2023-01-01T00:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getAuthUser as any).mockResolvedValue(mockUser);
    (getActiveXeroConnection as any).mockResolvedValue(mockConnection);
  });

  it("should perform incremental sync with correct parameters", async () => {
    // Mock Xero Contacts response
    (executeXeroMCPTool as any).mockResolvedValueOnce({
      content: [
        {
          text: JSON.stringify([
            {
              contactID: "contact_1",
              name: "Supplier A",
              isSupplier: true,
              updatedDateUTC: "2023-01-02T00:00:00Z",
            },
          ]),
        },
      ],
    });

    // Mock Upsert Contacts response
    (upsertContacts as any).mockResolvedValue([
      { id: "internal_contact_1", externalRef: "contact_1" },
    ]);

    // Mock Xero Invoices response
    (executeXeroMCPTool as any).mockResolvedValueOnce({
      content: [
        {
          text: JSON.stringify([
            {
              invoiceID: "inv_1",
              contact: { contactID: "contact_1" },
              invoiceNumber: "INV-001",
              total: 100,
              date: "2023-01-02T00:00:00Z",
              dueDate: "2023-01-10T00:00:00Z",
              updatedDateUTC: "2023-01-02T00:00:00Z",
            },
          ]),
        },
      ],
    });

    // Mock Upsert Bills response
    (upsertBills as any).mockResolvedValue([
      { id: "internal_bill_1", externalRef: "inv_1" },
    ]);

    // Mock fallback contact fetch (not needed if contact found in upsert)

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify fetching contacts with ifModifiedSince
    expect(executeXeroMCPTool).toHaveBeenCalledWith(
      mockUser.id,
      "xero_list_contacts",
      expect.objectContaining({
        ifModifiedSince: mockConnection.lastSyncedAt.toISOString(),
      })
    );

    // Verify fetching invoices with ifModifiedSince
    expect(executeXeroMCPTool).toHaveBeenCalledWith(
      mockUser.id,
      "xero_list_invoices",
      expect.objectContaining({
        invoiceType: "ACCPAY",
        ifModifiedSince: mockConnection.lastSyncedAt.toISOString(),
      })
    );

    // Verify upserts used tenantId
    expect(upsertContacts).toHaveBeenCalledWith(
      mockUser.id,
      mockConnection.tenantId,
      expect.any(Array)
    );

    expect(upsertBills).toHaveBeenCalledWith(
      mockUser.id,
      mockConnection.tenantId,
      expect.any(Array)
    );

    // Verify lastSyncedAt update
    expect(updateConnectionLastSyncedAt).toHaveBeenCalledWith(
      mockConnection.id,
      expect.any(Date)
    );
  });

  it("should handle full sync when lastSyncedAt is null", async () => {
    (getActiveXeroConnection as any).mockResolvedValue({
      ...mockConnection,
      lastSyncedAt: null,
    });

    // Mock empty responses for simplicity
    (executeXeroMCPTool as any).mockResolvedValue({
      content: [{ text: "[]" }],
    });
    (upsertContacts as any).mockResolvedValue([]);
    (upsertBills as any).mockResolvedValue([]);

    await POST();

    // Verify no ifModifiedSince passed
    expect(executeXeroMCPTool).toHaveBeenCalledWith(
      mockUser.id,
      "xero_list_contacts",
      expect.not.objectContaining({
        ifModifiedSince: expect.anything(),
      })
    );
  });
});
