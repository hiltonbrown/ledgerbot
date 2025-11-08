import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ValidationWarningProps = {
  undefinedVariables: string[];
  className?: string;
};

export function VariableValidationWarning({
  undefinedVariables,
  className,
}: ValidationWarningProps) {
  if (undefinedVariables.length === 0) {
    return null;
  }

  return (
    <Alert className={className} variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-xs">
        <strong>Undefined variables found:</strong>{" "}
        {undefinedVariables.map((varName, index) => (
          <span key={varName}>
            <code className="rounded bg-destructive/20 px-1 py-0.5">
              {`{{${varName}}}`}
            </code>
            {index < undefinedVariables.length - 1 ? ", " : ""}
          </span>
        ))}
        <br />
        These variables are not defined. Make sure to define them as custom
        variables or check for typos.
      </AlertDescription>
    </Alert>
  );
}
