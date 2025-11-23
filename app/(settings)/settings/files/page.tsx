import { FileText, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function FilesPage() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <FileText className="h-8 w-8 text-primary" />
            Context Files
          </h1>
          <p className="text-muted-foreground">
            Context file uploads and management are temporarily unavailable
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Feature temporarily removed</AlertTitle>
        <AlertDescription>
          We&apos;re rebuilding the context file experience and have paused
          uploads and file management in the meantime. A new and improved
          version will be available soon. Existing conversations remain
          accessible, but no new context files can be added right now.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="space-y-3 py-6">
          <p className="font-semibold text-base">What to expect</p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Uploads and file lists are disabled while we upgrade.</li>
            <li>
              You can continue using chat and other settings without
              interruption.
            </li>
            <li>
              We&apos;ll announce when the new context file workflow is ready to
              try.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
