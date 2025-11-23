# Layout Patterns

This document describes the consistent layout patterns used across the application for maintainability and visual consistency.

## Components

### 1. PageHeader

A reusable header component for page titles with icons and optional actions.

**Location:** `components/ui/page-header.tsx`

**Props:**
- `icon` (LucideIcon): Icon to display next to the title
- `title` (string): Page title
- `description?` (string): Optional description text
- `actions?` (ReactNode): Optional action buttons/elements

**Example:**
```tsx
<PageHeader
  icon={Files}
  title="File Manager"
  description="Manage your context files"
  actions={
    <Button>New File</Button>
  }
/>
```

### 2. ChatLayout

Standard layout wrapper for pages in the `(chat)` route group.

**Location:** `components/ui/chat-layout.tsx`

**Props:**
- `children` (ReactNode): Page content
- `maxWidth?` ("4xl" | "6xl" | "7xl"): Container max width (default: "6xl")

**Features:**
- Includes ChatHeader with sidebar toggle and theme toggle
- Consistent padding and spacing
- Responsive container width

**Example:**
```tsx
export default function MyPage() {
  return (
    <ChatLayout>
      <PageHeader icon={MyIcon} title="My Page" description="..." />
      <MyContent />
    </ChatLayout>
  );
}
```

### 3. SettingsLayout

Standard layout wrapper for pages in the `(settings)` route group.

**Location:** `components/ui/settings-layout.tsx`

**Props:**
- `children` (ReactNode): Page content
- `maxWidth?` ("4xl" | "6xl" | "7xl"): Container max width (default: "6xl")

**Features:**
- Consistent container and spacing
- Matches settings page patterns

**Example:**
```tsx
export default function MySettingsPage() {
  return (
    <SettingsLayout>
      <PageHeader icon={Settings} title="My Settings" description="..." />
      <MySettingsContent />
    </SettingsLayout>
  );
}
```

### 4. PageContainer

Utility component for consistent content containers.

**Location:** `components/ui/page-container.tsx`

**Props:**
- `children` (ReactNode): Content
- `maxWidth?` ("4xl" | "6xl" | "7xl"): Max width (default: "6xl")
- `className?` (string): Additional CSS classes

**Example:**
```tsx
<PageContainer maxWidth="4xl">
  <YourContent />
</PageContainer>
```

## Usage Patterns

### (chat) Route Group Pages

Pages under `app/(chat)/` should use the `ChatLayout` wrapper:

```tsx
import { ChatLayout } from "@/components/ui/chat-layout";
import { PageHeader } from "@/components/ui/page-header";

export default function MyPage() {
  return (
    <ChatLayout>
      <PageHeader
        icon={MyIcon}
        title="Page Title"
        description="Page description"
      />
      {/* Your page content */}
    </ChatLayout>
  );
}
```

**Examples:**
- `/files` - File Manager page
- Future pages in (chat) route group

### (settings) Route Group Pages

Pages under `app/(settings)/settings/` should use the `SettingsLayout` wrapper:

```tsx
import { SettingsLayout } from "@/components/ui/settings-layout";
import { PageHeader } from "@/components/ui/page-header";

export default function MySettingsPage() {
  return (
    <SettingsLayout>
      <PageHeader
        icon={MyIcon}
        title="Settings Page"
        description="Configure your settings"
      />
      {/* Your settings content */}
    </SettingsLayout>
  );
}
```

**Examples:**
- `/settings/personalisation`
- `/settings/usage`
- `/settings/integrations`

### Agents Pages

Agent pages under `app/agents/` have their own layout file (`app/agents/layout.tsx`) that provides the ChatHeader wrapper.

Agent pages can optionally use `PageHeader` for consistent styling:

```tsx
import { PageHeader } from "@/components/ui/page-header";

export default function MyAgentPage() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <PageHeader
        icon={MyIcon}
        title="Agent Name"
        description="Agent description"
        actions={<Button>Action</Button>}
      />
      {/* Agent content */}
    </div>
  );
}
```

## Container Widths

Choose the appropriate max width based on content:

- **4xl** (`max-w-4xl`): Narrow content like forms and reading material (896px)
- **6xl** (`max-w-6xl`): Standard width for most pages (1152px) - **DEFAULT**
- **7xl** (`max-w-7xl`): Wide content like dashboards and tables (1280px)

## Spacing Guidelines

- **Outer container**: `p-6` for padding
- **Vertical spacing**: `space-y-6` or `space-y-8` between sections
- **Header margin**: Included in layout wrappers
- **Component gaps**: Use `gap-2`, `gap-4`, or `gap-6` based on size

## Best Practices

1. **Always use layout wrappers**: Use `ChatLayout` or `SettingsLayout` for consistency
2. **Reuse PageHeader**: Don't duplicate header markup
3. **Consistent spacing**: Use the provided spacing patterns
4. **Container widths**: Choose appropriate width for your content
5. **Icon consistency**: Always provide an icon for PageHeader
6. **Description text**: Include helpful descriptions where appropriate

## Migration Guide

### Before (Inconsistent)
```tsx
export default function MyPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <ChatHeader chatId="" isReadonly={false} />
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-bold text-3xl">
                <MyIcon className="h-8 w-8 text-primary" />
                My Page
              </h1>
              <p className="text-muted-foreground">Description</p>
            </div>
          </div>
          <MyContent />
        </div>
      </main>
    </div>
  );
}
```

### After (Modular & Consistent)
```tsx
import { ChatLayout } from "@/components/ui/chat-layout";
import { PageHeader } from "@/components/ui/page-header";

export default function MyPage() {
  return (
    <ChatLayout>
      <PageHeader
        icon={MyIcon}
        title="My Page"
        description="Description"
      />
      <MyContent />
    </ChatLayout>
  );
}
```

## Benefits

1. **Consistency**: All pages follow the same visual patterns
2. **Maintainability**: Changes to layout only need to be made in one place
3. **Type Safety**: TypeScript props prevent errors
4. **Developer Experience**: Less boilerplate, clearer intent
5. **Accessibility**: Consistent heading structure and semantics
