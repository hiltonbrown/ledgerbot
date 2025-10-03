"use client";

import { useMemo, useState } from "react";
import type { FileRecord } from "@/app/(settings)/api/files/data";
import { Button } from "@/components/ui/button";
import { toast } from "../toast";

export function FileList({ files }: { files: FileRecord[] }) {
  const [records, setRecords] = useState(files);

  const grouped = useMemo(() => {
    return records.reduce<Record<string, FileRecord[]>>((acc, file) => {
      acc[file.status] = acc[file.status] || [];
      acc[file.status].push(file);
      return acc;
    }, {});
  }, [records]);

  const handleDelete = (id: string) => {
    setRecords((items) => items.filter((item) => item.id !== id));
    toast({
      type: "success",
      description: "File removed from workspace.",
    });
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([status, items]) => (
        <div className="space-y-3" key={status}>
          <h3 className="font-semibold text-foreground text-sm capitalize">
            {status}
          </h3>
          <ul className="space-y-2">
            {items.map((file) => (
              <li
                className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                key={file.id}
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground text-sm">
                    {file.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {file.type} • {file.size} • Uploaded{" "}
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Owner: {file.owner}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost">
                    View details
                  </Button>
                  <Button
                    onClick={() => handleDelete(file.id)}
                    type="button"
                    variant="destructive"
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {records.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          You have removed all files from this workspace.
        </p>
      ) : null}
    </div>
  );
}
