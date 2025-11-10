import { expect, test } from "../fixtures";

/**
 * AP Agent Route Tests
 *
 * Tests the /api/agents/ap endpoint for accounts payable agent functionality.
 * These tests validate authentication, tool execution, and response streaming.
 */

test.describe.serial("/api/agents/ap", () => {
  test("Unauthenticated user cannot access AP agent", async ({ page }) => {
    const response = await page.request.post("/api/agents/ap", {
      data: {
        messages: [
          {
            role: "user",
            content: "Validate ABN 51 824 753 556",
          },
        ],
      },
    });

    expect(response.status()).toBe(401);
  });

  test("Ada can invoke AP agent for ABN validation", async ({
    adaContext,
  }) => {
    const response = await adaContext.request.post("/api/agents/ap", {
      data: {
        messages: [
          {
            role: "user",
            content: "Validate this ABN: 51 824 753 556",
          },
        ],
        settings: {
          model: "anthropic-claude-sonnet-4-5",
          requireABN: true,
          gstValidation: true,
        },
      },
    });

    expect(response.status()).toBe(200);

    // Response should be a stream
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("text/event-stream");
  });

  test("Ada can request bill coding suggestions", async ({ adaContext }) => {
    const response = await adaContext.request.post("/api/agents/ap", {
      data: {
        messages: [
          {
            role: "user",
            content: `Suggest coding for these line items:
              1. Microsoft 365 Business Standard - $25/month
              2. Office stationery supplies - $156.80
              3. Professional consulting fees - $2,500`,
          },
        ],
        settings: {
          model: "anthropic-claude-sonnet-4-5",
          gstValidation: true,
        },
      },
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("text/event-stream");
  });

  test("Ada can generate payment proposal", async ({ adaContext }) => {
    const response = await adaContext.request.post("/api/agents/ap", {
      data: {
        messages: [
          {
            role: "user",
            content: "Generate a payment run proposal for next Wednesday",
          },
        ],
        settings: {
          model: "anthropic-claude-sonnet-4-5",
        },
      },
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("text/event-stream");
  });

  test("Ada can generate email draft for vendor", async ({ adaContext }) => {
    const response = await adaContext.request.post("/api/agents/ap", {
      data: {
        messages: [
          {
            role: "user",
            content:
              "Draft a follow-up email to Officeworks requesting their tax invoice for bill INV-12345 dated 2024-11-05 for $450.50",
          },
        ],
        settings: {
          model: "anthropic-claude-sonnet-4-5",
        },
      },
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("text/event-stream");
  });

  test("Ada can check for duplicate bills", async ({ adaContext }) => {
    const response = await adaContext.request.post("/api/agents/ap", {
      data: {
        messages: [
          {
            role: "user",
            content:
              "Check if this bill is a duplicate: Officeworks, $450.50, dated 2024-11-05",
          },
        ],
        settings: {
          model: "anthropic-claude-sonnet-4-5",
          duplicateCheckDays: 90,
        },
      },
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("text/event-stream");
  });

  test("Ada can assess payment risk", async ({ adaContext }) => {
    const response = await adaContext.request.post("/api/agents/ap", {
      data: {
        messages: [
          {
            role: "user",
            content: `Assess payment risk for this bill:
              Vendor: New Supplier Pty Ltd
              Amount: $5,000
              Has ABN: No
              Has tax invoice: No
              Is approved: No
              Vendor status: pending`,
          },
        ],
        settings: {
          model: "anthropic-claude-sonnet-4-5",
          requireABN: true,
        },
      },
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("text/event-stream");
  });
});
