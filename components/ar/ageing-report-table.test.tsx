import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AgeingReportItem } from "@/lib/actions/ar";
import { AgeingReportTable } from "./ageing-report-table";

// Mock data
const mockData: AgeingReportItem[] = [
  {
    contactId: "1",
    customerName: "Alice Corp",
    email: "alice@example.com",
    totalOutstanding: 1000,
    ageingCurrent: 500,
    ageing1_30: 500,
    ageing31_60: 0,
    ageing61_90: 0,
    ageing90Plus: 0,
    riskScore: 0.2,
    lastPaymentDate: new Date(),
    creditTermsDays: 30,
    lastUpdated: new Date(),
  },
  {
    contactId: "2",
    customerName: "Bob Inc",
    email: "bob@example.com",
    totalOutstanding: 5000,
    ageingCurrent: 0,
    ageing1_30: 0,
    ageing31_60: 0,
    ageing61_90: 0,
    ageing90Plus: 5000,
    riskScore: 0.9,
    lastPaymentDate: new Date(),
    creditTermsDays: 14,
    lastUpdated: new Date(),
  },
];

// Mock components that might cause issues in test env
vi.mock("./customer-details-sheet", () => ({
  CustomerDetailsSheet: () => <div data-testid="customer-details-sheet" />,
}));

describe("AgeingReportTable", () => {
  it("renders table with data", () => {
    render(<AgeingReportTable initialData={mockData} />);
    expect(screen.getByText("Alice Corp")).toBeDefined();
    expect(screen.getByText("Bob Inc")).toBeDefined();
    expect(screen.getByText("$1,000.00")).toBeDefined();
    expect(screen.getByText("$5,000.00")).toBeDefined();
  });

  it("filters by min outstanding", () => {
    render(<AgeingReportTable initialData={mockData} />);
    const input = screen.getByPlaceholderText("0.00"); // Min Outstanding input
    fireEvent.change(input, { target: { value: "2000" } });

    expect(screen.queryByText("Alice Corp")).toBeNull();
    expect(screen.getByText("Bob Inc")).toBeDefined();
  });

  it("filters by min risk score", () => {
    render(<AgeingReportTable initialData={mockData} />);
    // There are two inputs with placeholder 0.00, need to be specific
    // The second one is risk score
    const inputs = screen.getAllByPlaceholderText("0.00");
    const riskInput = inputs[1];

    fireEvent.change(riskInput, { target: { value: "0.5" } });

    expect(screen.queryByText("Alice Corp")).toBeNull();
    expect(screen.getByText("Bob Inc")).toBeDefined();
  });

  // Note: Sorting and other interactions would also be tested here
});
