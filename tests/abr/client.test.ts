import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AbrClient, AbrError } from "@/lib/abr/client";

// Mock config to ensure enabled
vi.mock("@/lib/abr/config", () => ({
  abnLookupConfig: {
    enabled: true,
    guid: "test-guid",
    baseUrl: "https://mock-abr.com",
  },
}));

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("AbrClient", () => {
  let client: AbrClient;

  beforeEach(() => {
    client = new AbrClient();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("searchByAbn: strips JSONP and parses result", async () => {
    const mockJsonp = `callback({
      "Abn": "12345678901",
      "AbnStatus": "Active",
      "EntityName": "Test Corp",
      "Gst": { "EffectiveFrom": "2020-01-01" },
      "Message": ""
    })`;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => mockJsonp,
    });

    // Valid ABN (checksum pass: 10*1 + 1*2 + ... must be divisible by 89)
    // 51 824 753 556 is a valid ABN.
    // 10*4 + 1*1 + 3*8 + 5*2 + 7*4 + 9*7 + 11*5 + 13*3 + 15*5 + 17*5 + 19*6
    // Use a known valid ABN for testing logic, or mock validateAbnChecksum if needed.
    // But since I import real utils, I should use a valid one or mock the util.
    // I'll use a valid one: 51824753556
    const result = await client.searchByAbn("51824753556");

    expect(result).toBeDefined();
    expect(result?.entityName).toBe("Test Corp");
    expect(result?.rawResponse).toBe(mockJsonp);
    expect(result?.gst.status).toBe("Registered");
  });

  test("searchByAbn: handles pure JSON response", async () => {
    const mockJson = JSON.stringify({
      Abn: "51824753556",
      AbnStatus: "Active",
      Gst: null,
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => mockJson,
    });

    const result = await client.searchByAbn("51824753556");
    expect(result?.gst.status).toBe("Never Registered");
    expect(result?.rawResponse).toBe(mockJson);
  });

  test("searchByAbn: validates checksum locally", async () => {
    // 11111111111 is invalid
    await expect(client.searchByAbn("11111111111")).rejects.toThrow(AbrError);
    await expect(client.searchByAbn("11111111111")).rejects.toHaveProperty(
      "code",
      "INVALID_FORMAT"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("searchByAbn: handles NOT_FOUND from API", async () => {
    const mockJson = JSON.stringify({
      Message: "No record found for this ABN",
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => mockJson,
    });

    // Use valid ABN for checksum pass
    await expect(client.searchByAbn("51824753556")).rejects.toHaveProperty(
      "code",
      "NOT_FOUND"
    );
  });

  test("searchByAbn: GST Logic - Currently Registered", async () => {
    const mockJson = JSON.stringify({
      Abn: "51824753556",
      AbnStatus: "Active",
      Gst: { EffectiveFrom: "2020-01-01", EffectiveTo: null },
    });
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => mockJson });

    const result = await client.searchByAbn("51824753556");
    expect(result?.gst.status).toBe("Registered");
  });

  test("searchByAbn: GST Logic - Previously Registered", async () => {
    const mockJson = JSON.stringify({
      Abn: "51824753556",
      AbnStatus: "Active",
      Gst: [{ EffectiveFrom: "2010-01-01", EffectiveTo: "2015-01-01" }],
    });
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => mockJson });

    const result = await client.searchByAbn("51824753556");
    expect(result?.gst.status).toBe("Previously Registered");
    expect(result?.gst.effectiveTo).toBe("2015-01-01");
  });

  test("searchByAbn: GST Logic - History Array with Current", async () => {
    const mockJson = JSON.stringify({
      Abn: "51824753556",
      AbnStatus: "Active",
      Gst: [
        { EffectiveFrom: "2010-01-01", EffectiveTo: "2015-01-01" },
        { EffectiveFrom: "2020-01-01", EffectiveTo: "" }, // Current
      ],
    });
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => mockJson });

    const result = await client.searchByAbn("51824753556");
    expect(result?.gst.status).toBe("Registered");
    expect(result?.gst.effectiveFrom).toBe("2020-01-01");
  });
});
