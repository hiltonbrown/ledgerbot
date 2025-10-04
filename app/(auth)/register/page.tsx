import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-background shadow-lg border border-border rounded-2xl",
            headerTitle: "text-foreground text-xl font-semibold",
            headerSubtitle: "text-muted-foreground text-sm",
            formButtonPrimary:
              "bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium",
            formFieldInput:
              "bg-muted border-border text-foreground rounded-md",
            footerActionLink:
              "text-primary hover:underline font-semibold",
            formFieldLabel: "text-foreground text-sm",
            dividerLine: "bg-border",
            dividerText: "text-muted-foreground text-sm",
            socialButtonsBlockButton:
              "border-border text-foreground hover:bg-muted",
            formFieldInputShowPasswordButton: "text-muted-foreground",
          },
        }}
        routing="path"
        path="/register"
        signInUrl="/login"
      />
    </div>
  );
}
