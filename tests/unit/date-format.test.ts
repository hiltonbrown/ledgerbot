import { describe, expect, it } from "vitest";
import { mapAbrEntity, parseAbrDate } from "../../lib/abr/helpers";

describe("ABR Date Parsing", () => {
  it("should parse Microsoft JSON date format", () => {
    // Example: /Date(1183248000000+1000)/ -> 2007-07-01
    const msDate = "/Date(1183248000000+1000)/";
    // This often comes as string in JSON deserialization if not handled

    // We expect mapAbrEntity or parseAbrDate to handle this
    const parsed = parseAbrDate(msDate);
    expect(parsed).toBeDefined();
    expect(parsed?.getFullYear()).toBe(2007);
  });

  it("should format GST date from Microsoft format correctly", () => {
    const raw = {
      Abn: "35672804143",
      GoodsAndServicesTax: {
        Status: "Active",
        EffectiveFrom: "/Date(1711929600000+1100)/", // 2024-04-01 roughly
      },
    };

    // 1711929600000 is 2024-04-01T00:00:00 UTC approx?
    // Actually 1711929600000 / 1000 = 1711929600.
    // GMT: Monday, April 1, 2024 12:00:00 AM

    const result = mapAbrEntity(raw);
    expect(result.gstStatusFrom).toBe("01 Apr 2024");
  });
});
