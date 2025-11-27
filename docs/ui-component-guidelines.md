# UI Component Development Guidelines

## Introduction

This guide provides standards and best practices for developing UI components in the LedgerBot project, with focus on the AR (Accounts Receivable) module.

## Component Structure Philosophy

### Separation of Concerns

Components should follow the **Container/Presentational** pattern:

#### **Container Components** (Smart Components)
Located in: `app/` directories

**Responsibilities**:
- Data fetching (Server Actions, API calls)
- State management
- Business logic
- Routing

**Example**: `app/agents/ar/page.tsx`
```typescript
// Server Component - Data fetching
export default async function AgeingReportPage() {
  const data = await getAgeingReportData(); // Server Action
  return <AgeingReportTable initialData={data} />;
}
```

#### **Presentational Components** (Dumb Components)
Located in: `components/` directories

**Responsibilities**:
- UI rendering
- User interactions (clicks, inputs)
- Local UI state (modals, dropdowns)
- Prop-based data display

**Example**: `components/ar/ageing-report-table.tsx`
```typescript
// Client Component - Pure UI
export function AgeingReportTable({ initialData }: Props) {
  const [sortField, setSortField] = useState("totalOutstanding");
  // Render UI based on props and local state
}
```

---

## Component Naming Conventions

### File Names
- **PascalCase** for component files: `CustomerDetailsSheet.tsx`
- **kebab-case** for utility files: `use-customer-data.ts`
- **Test files**: `component-name.test.tsx`
- **Story files**: `component-name.stories.tsx`

### Component Names
```typescript
// ✅ Good
export function CustomerDetailsSheet() { }
export function AgeingReportTable() { }

// ❌ Bad
export function customerSheet() { }  // Not PascalCase
export const Details = () => { }    // Too generic
```

---

## Directory Structure

```
app/
└── agents/ar/
    └── page.tsx              # Route component (Server)

components/
└── ar/
    ├── ageing-report-table.tsx         # Main component
    ├── ageing-report-table.stories.tsx # Storybook stories
    ├── ageing-report-table.test.tsx    # Unit tests
    ├── customer-details-sheet.tsx      # Sub-component
    └── stale-data-banner.tsx          # Reusable component

lib/
├── actions/
│   └── ar.ts                 # Server Actions
├── hooks/
│   └── use-customer-data.ts  # Custom hooks
├── logic/
│   └── ar.ts                 # Pure business logic
└── utils/
    └── format-currency.ts    # Utility functions
```

---

## Creating a New Component

### Step 1: Determine Component Type

**Is it a page/route?**
→ Create in `app/` as Server Component

**Is it interactive UI?**
→ Create in `components/` as Client Component

**Does it fetch data?**
→ Use Server Action or custom hook

### Step 2: Create Component File

```bash
# For AR-related components
touch components/ar/my-new-component.tsx
```

### Step 3: Write Component

```typescript
"use client"; // Only if it needs interactivity

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MyNewComponentProps {
  data: string[];
  onItemClick: (item: string) => void;
}

export function MyNewComponent({ data, onItemClick }: MyNewComponentProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <Button
          key={item}
          onClick={() => {
            setSelectedItem(item);
            onItemClick(item);
          }}
          variant={selectedItem === item ? "default" : "outline"}
        >
          {item}
        </Button>
      ))}
    </div>
  );
}
```

### Step 4: Add TypeScript Types

```typescript
// Always define prop interfaces
interface MyNewComponentProps {
  data: string[];
  onItemClick: (item: string) => void;
  className?: string; // Optional props with ?
}

// Export types if used elsewhere
export type { MyNewComponentProps };
```

### Step 5: Create Storybook Story

```typescript
// components/ar/my-new-component.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyNewComponent } from "./my-new-component";

const meta = {
  title: "AR/MyNewComponent",
  component: MyNewComponent,
  tags: ["autodocs"],
} satisfies Meta<typeof MyNewComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: ["Item 1", "Item 2", "Item 3"],
    onItemClick: (item) => console.log(`Clicked: ${item}`),
  },
};

export const Empty: Story = {
  args: {
    data: [],
    onItemClick: () => {},
  },
};
```

### Step 6: Write Tests

```typescript
// components/ar/my-new-component.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MyNewComponent } from "./my-new-component";

describe("MyNewComponent", () => {
  it("renders all items", () => {
    render(
      <MyNewComponent
        data={["Item 1", "Item 2"]}
        onItemClick={vi.fn()}
      />
    );

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });

  it("calls onItemClick when item is clicked", () => {
    const handleClick = vi.fn();
    render(
      <MyNewComponent
        data={["Item 1"]}
        onItemClick={handleClick}
      />
    );

    fireEvent.click(screen.getByText("Item 1"));
    expect(handleClick).toHaveBeenCalledWith("Item 1");
  });
});
```

---

## State Management Best Practices

### Local State (useState)
Use for UI-only state:
```typescript
const [isOpen, setIsOpen] = useState(false);
const [selectedId, setSelectedId] = useState<string | null>(null);
```

### Props
Pass data down from parent:
```typescript
<CustomerDetails customerId={id} onClose={() => setId(null)} />
```

### Server Actions
For data fetching in Server Components:
```typescript
// lib/actions/ar.ts
export async function getCustomerData(id: string) {
  "use server";
  return db.query.customers.findFirst({ where: eq(customers.id, id) });
}

// app/page.tsx
const data = await getCustomerData(id);
```

### Custom Hooks
For reusable stateful logic:
```typescript
// lib/hooks/use-customer-invoices.ts
export function useCustomerInvoices(customerId: string) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customerId) {
      setLoading(true);
      fetchInvoices(customerId)
        .then(setInvoices)
        .finally(() => setLoading(false));
    }
  }, [customerId]);

  return { invoices, loading };
}
```

---

## Performance Optimization

### Memoization

**useMemo** for expensive computations:
```typescript
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.amount - b.amount);
}, [data]);
```

**useCallback** for event handlers passed to child components:
```typescript
const handleClick = useCallback((id: string) => {
  setSelectedId(id);
}, []);
```

### Code Splitting

Lazy load heavy components:
```typescript
import dynamic from "next/dynamic";

const HeavyModal = dynamic(() => import("./heavy-modal"), {
  loading: () => <Spinner />,
  ssr: false,
});
```

### Conditional Rendering

Only render when needed:
```typescript
{isOpen && <Modal />}  // ✅ Good
<Modal isOpen={isOpen} />  // ❌ Always mounted
```

---

## Accessibility

### Always Include

1. **Semantic HTML**
```typescript
<button>Click me</button>  // ✅ Good
<div onClick={...}>Click me</div>  // ❌ Bad
```

2. **ARIA Labels**
```typescript
<button aria-label="Close modal" onClick={onClose}>
  <X />
</button>
```

3. **Keyboard Navigation**
```typescript
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === "Enter" && onClick()}
  onClick={onClick}
>
  Click me
</div>
```

4. **Focus Management**
```typescript
useEffect(() => {
  if (isOpen) {
    modalRef.current?.focus();
  }
}, [isOpen]);
```

---

## Styling Guidelines

### Use Tailwind CSS

```typescript
// ✅ Good
<div className="flex items-center gap-4 rounded-lg border p-4">

// ❌ Bad
<div style={{ display: "flex", gap: "1rem" }}>
```

### Responsive Design

```typescript
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid */}
</div>
```

### Conditional Classes

```typescript
<div className={`rounded p-4 ${isActive ? "bg-blue-500" : "bg-gray-100"}`}>
```

Or use `cn` helper:
```typescript
import { cn } from "@/lib/utils";

<div className={cn("rounded p-4", isActive && "bg-blue-500")}>
```

---

## Testing Strategy

### Unit Tests
Test individual component behavior:
```bash
pnpm test components/ar/my-component.test.tsx
```

### Integration Tests
Test component interactions:
```bash
pnpm test:integration
```

### E2E Tests
Test full user flows with Playwright:
```bash
pnpm test:e2e tests/e2e/ar-flow.spec.ts
```

### Storybook Visual Testing
```bash
pnpm storybook
# Manually verify visual appearance
```

---

## Documentation Requirements

### Component Documentation

Every component should have:

1. **JSDoc comment**
```typescript
/**
 * Displays a list of customers with ageing buckets
 * Supports filtering, sorting, and clicking for details
 */
export function AgeingReportTable({ initialData }: Props) { }
```

2. **Props documentation**
```typescript
interface AgeingReportTableProps {
  /** Initial customer data to display */
  initialData: AgeingReportItem[];
  /** Optional CSS class name */
  className?: string;
  /** Callback when customer is selected */
  onCustomerSelect?: (id: string) => void;
}
```

3. **Storybook stories** (multiple states)

4. **README if complex**: `components/ar/README.md`

---

## Code Review Checklist

Before submitting a component for review:

- [ ] Component follows naming conventions
- [ ] TypeScript types are complete
- [ ] Accessibility requirements met
- [ ] Responsive design tested
- [ ] Storybook story created
- [ ] Unit tests written (if applicable)
- [ ] Performance optimized (memoization if needed)
- [ ] Props documented
- [ ] No console.logs or debug code
- [ ] Tailwind classes used (not inline styles)
- [ ] Error states handled
- [ ] Loading states handled

---

## Common Patterns

### Modal/Sheet Pattern
```typescript
const [isOpen, setIsOpen] = useState(false);
const [selectedId, setSelectedId] = useState<string | null>(null);

return (
  <>
    <Button onClick={() => setIsOpen(true)}>Open</Button>
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Sheet content */}
    </Sheet>
  </>
);
```

### Data Fetching Pattern
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  setLoading(true);
  fetchData()
    .then(setData)
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, []);

if (loading) return <Spinner />;
if (error) return <ErrorMessage message={error} />;
return <DataDisplay data={data} />;
```

### Filter/Sort Pattern
```typescript
const [filters, setFilters] = useState({ minAmount: 0, status: "all" });
const [sortField, setSortField] = useState<SortField>("date");

const filteredData = useMemo(
  () => data.filter((item) => item.amount >= filters.minAmount),
  [data, filters]
);

const sortedData = useMemo(
  () => [...filteredData].sort((a, b) => a[sortField] - b[sortField]),
  [filteredData, sortField]
);
```

---

## Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev/)
- [Storybook for Next.js](https://storybook.js.org/docs/get-started/nextjs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn UI Components](https://ui.shadcn.com/)
- [Web Accessibility (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Getting Help

- Check existing AR components for patterns
- Review component stories in Storybook
- Ask in #frontend Slack channel
- Consult [`docs/ar-ui-components.md`](./ar-ui-components.md)
