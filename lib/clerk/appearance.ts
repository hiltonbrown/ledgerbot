/**
 * Shared Clerk appearance configuration for consistent styling
 * across all Clerk components (SignIn, SignUp, UserProfile, etc.)
 *
 * Uses CSS variables that automatically adapt to light/dark themes
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "hsl(var(--primary))",
    colorBackground: "hsl(var(--background))",
    colorInputBackground: "hsl(var(--input))",
    colorInputText: "hsl(var(--foreground))",
    colorText: "hsl(var(--foreground))",
    colorTextSecondary: "hsl(var(--muted-foreground))",
    colorDanger: "hsl(var(--destructive))",
    colorSuccess: "hsl(142 76% 36%)",
    colorWarning: "hsl(38 92% 50%)",
    colorNeutral: "hsl(var(--muted))",
    colorTextOnPrimaryBackground: "hsl(var(--primary-foreground))",
    colorAlphaShade: "hsl(var(--muted))",
    fontSize: "1rem",
    borderRadius: "var(--radius)",
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
