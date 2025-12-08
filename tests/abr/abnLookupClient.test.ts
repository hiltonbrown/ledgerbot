/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AbnLookupClient } from "@/lib/abr/abnLookupClient";

declare const global: typeof globalThis & { fetch: typeof fetch };

const mockFetch = vi.fn();

global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
  process.env.ABN_LOOKUP_ENABLED = "true";
  process.env.ABN_LOOKUP_GUID = "test-guid";
  process.env.ABN_LOOKUP_BASE_URL = "https://abr.example/json";
});

describe("AbnLookupClient", () => {
  it("strips JSONP wrappers from responses", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'callback({"value":true});',
    });

    const client = new AbnLookupClient();
    const result = await client.getByAbn("51824753556");

    expect(result).toEqual({ value: true });
  });

  it("throws on non-200 responses", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "",
    });

    const client = new AbnLookupClient();
    await expect(client.getByAbn("51824753556")).rejects.toThrow(
      expect.stringContaining("status 500")
    );
  });

  it("formats URLs with normalized identifiers", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "({})",
    });

    const client = new AbnLookupClient("guid-123", "https://api.example/json/");
    await client.getByAcn("123 456 789");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example/json/SearchByASIC.aspx?asic=123456789&guid=guid-123"
    );
  });
});
