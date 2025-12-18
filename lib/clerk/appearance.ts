/**
 * Shared Clerk appearance configuration for consistent styling
 * across all Clerk components (SignIn, SignUp, UserProfile, etc.)
 *
 * Uses dedicated Clerk CSS variables that adapt with light/dark themes
 * so the components stay aligned with the app design tokens.
 */
const clerkColor = (token: string) => `var(${token})`;

export const clerkAppearance = {
  variables: {
    colorPrimary: clerkColor("--clerk-color-primary"),
    colorBackground: clerkColor("--clerk-color-background"),
    colorInputBackground: clerkColor("--clerk-color-input"),
    colorInputText: clerkColor("--clerk-color-input-foreground"),
    colorText: clerkColor("--clerk-color-foreground"),
    colorTextSecondary: clerkColor("--clerk-color-muted-foreground"),
    colorDanger: clerkColor("--clerk-color-danger"),
    colorSuccess: clerkColor("--clerk-color-success"),
    colorWarning: clerkColor("--clerk-color-warning"),
    colorNeutral: clerkColor("--clerk-color-neutral"),
    colorTextOnPrimaryBackground: clerkColor("--clerk-color-primary-foreground"),
    colorAlphaShade: clerkColor("--clerk-color-muted"),
    fontFamily: "var(--font-geist, Inter, system-ui, sans-serif)",
    fontSize: "0.875rem",
    fontWeight: { normal: 400, medium: 500, bold: 600 },
    borderRadius: clerkColor("--clerk-border-radius"),
    spacingUnit: clerkColor("--clerk-spacing"),
  },
  elements: {
    // Card styling
    card: "shadow-lg border border-border bg-card",
    rootBox: "bg-background",
    // Button styling
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors shadow-sm",
    formButtonReset:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium transition-colors",
    // Input styling
    formFieldInput:
      "bg-input border-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-colors",
    formFieldLabel: "text-foreground font-medium",
    formFieldHintText: "text-muted-foreground text-sm",
    // Text styling
    headerTitle: "text-foreground font-semibold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButton:
      "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
    socialButtonsBlockButtonText: "font-medium",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground text-sm",
    identityPreviewText: "text-foreground",
    identityPreviewEditButton:
      "text-primary hover:text-primary/80 transition-colors",
    // Footer styling
    footerActionText: "text-muted-foreground",
    footerActionLink:
      "text-primary hover:text-primary/80 font-medium transition-colors",
    // Alert styling
    alert: "border border-border bg-card text-card-foreground",
    alertText: "text-sm",
    // UserButton and UserProfile styling
    userButtonAvatarBox: "border-2 border-border shadow-sm",
    userButtonPopoverCard:
      "bg-popover text-popover-foreground border border-border shadow-lg",
    userButtonPopoverActionButton:
      "hover:bg-accent hover:text-accent-foreground transition-colors",
    userButtonPopoverActionButtonText: "text-foreground",
    userButtonPopoverActionButtonIcon: "text-foreground",
    userButtonPopoverFooter: "border-t border-border",
    // Profile page specific styling
    profileSectionPrimaryButton:
      "bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors shadow-sm",
    profileSectionContent: "bg-card border border-border",
    profileSection: "bg-background",
    // Page
    page: "bg-background",
    pageScrollBox: "bg-background",
    // Navbar for profile page
    navbar: "bg-card border-b border-border",
    navbarButton:
      "text-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
    navbarButtonIcon: "text-foreground",
    // Badge
    badge: "bg-primary/10 text-primary border border-primary/20",
    // Form
    formResendCodeLink: "text-primary hover:text-primary/80 transition-colors",
    // Modal
    modalContent: "bg-card border border-border",
    modalCloseButton: "text-muted-foreground hover:text-foreground",
    // Accordion
    accordionTriggerButton: "text-foreground hover:bg-accent transition-colors",
    accordionContent: "text-foreground",
  },
} as const;

/**
 * Sidebar-specific appearance overrides for the UserButton trigger/popover
 * so it matches the navigation chrome and uses sidebar-aware tokens.
 */
export const sidebarUserButtonAppearance = {
  ...clerkAppearance,
  elements: {
    ...clerkAppearance.elements,
    userButtonBox:
      "bg-sidebar border border-sidebar-border text-sidebar-foreground shadow-sm transition-all hover:border-sidebar-ring/80 hover:shadow-md rounded-lg",
    userButtonTrigger:
      "w-full rounded-lg px-2 py-1.5 text-sm font-medium leading-tight data-[state=open]:ring-2 data-[state=open]:ring-sidebar-ring data-[state=open]:ring-offset-2 data-[state=open]:ring-offset-sidebar",
    userButtonAvatarBox:
      "border-2 border-sidebar-ring/40 bg-sidebar text-sidebar-foreground shadow-sm",
    userButtonPopoverCard:
      "bg-sidebar text-sidebar-foreground border border-sidebar-border shadow-xl",
    userButtonPopoverActionButton:
      "text-sm font-medium hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors",
    userButtonPopoverActionButtonText:
      "text-sidebar-foreground text-sm font-medium leading-tight",
    userButtonPopoverActionButtonIcon: "text-sidebar-foreground",
    userButtonPopoverFooter: "border-t border-sidebar-border bg-sidebar",
  },
} as const;
