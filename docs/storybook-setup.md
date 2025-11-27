# Storybook Setup Guide

## Installation

To add Storybook to the LedgerBot project, run:

```bash
pnpm add -D @storybook/nextjs @storybook/react @storybook/addon-essentials @storybook/addon-interactions @storybook/addon-links @storybook/addon-onboarding @storybook/addon-a11y @storybook/test
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

## Configuration Files

Two files have been created in `.storybook/`:

### 1. `.storybook/main.ts`
Configures Storybook to:
- Find story files in `components/` and `app/` directories
- Use Next.js framework integration
- Enable accessibility addon
- Generate auto-documentation

### 2. `.storybook/preview.ts`
Configures:
- Global Tailwind CSS import
- Next.js App Router support
- Default story parameters

## Running Storybook

```bash
# Development mode
pnpm storybook

# Build static storybook
pnpm build-storybook

# Preview built storybook
npx http-server storybook-static
```

Access at: `http://localhost:6006`

## Story Files Created

### AR Component Stories

1. **`components/ar/ageing-report-table.stories.tsx`**
   - Empty state
   - Few customers
   - Many customers (pagination test)
   - High risk customers
   - Mixed risk levels

2. **`components/ar/customer-details-sheet.stories.tsx`**  
   - Closed (default)
   - Low/Medium/High risk customers
   - Large outstanding amounts

3. **`components/ar/stale-data-banner.stories.tsx`**
   - No sync
   - Failed sync
   - Stale data (>24 hours)
   - Fresh data
   - Very stale data

## Using Storybook

### Viewing Components
1. Start Storybook: `pnpm storybook`
2. Navigate sidebar to find components
3. Use Controls panel to modify props
4. View Accessibility tab for WCAG compliance

### Testing Interactions
- Click components to test handlers
- Use keyboard navigation
- Switch between stories to see different states

### Visual Regression Testing
```bash
# Install Chromatic (optional)
pnpm add -D chromatic

# Run visual tests
npx chromatic --project-token=<your-token>
```

## Benefits

✅ **Component Isolation** - Test components without full app context  
✅ **Visual Documentation** - Auto-generated docs from component props  
✅ **Accessibility Testing** - Built-in a11y addon  
✅ **Interaction Testing** - Test user flows without E2E tests  
✅ **Design System** - Maintain consistent component library

## Next Steps

1. Add stories for remaining components
2. Configure Chromatic for visual regression
3. Add interaction tests with `@storybook/test`
4. Document component API with JSDoc comments
