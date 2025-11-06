"use client";

import { useTheme } from "next-themes";
import { parse, unparse } from "papaparse";
import { memo, useEffect, useMemo, useState } from "react";
import DataGrid, { textEditor } from "react-data-grid";
import { cn } from "@/lib/utils";

import "react-data-grid/lib/styles.css";

type SheetEditorProps = {
  content: string;
  saveContent: (content: string, isCurrentVersion: boolean) => void;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  status: string;
};

const MIN_ROWS = 50;
const MIN_COLS = 26;

// Pattern to detect instruction-like lines (not CSV data)
const INSTRUCTION_PATTERN =
  /^(create|here|this|the|you|i|use|format|based|with|following|data|prompt|csv)/i;

const PureSpreadsheetEditor = ({ content, saveContent }: SheetEditorProps) => {
  const { resolvedTheme } = useTheme();

  const parseData = useMemo(() => {
    if (!content) {
      return new Array(MIN_ROWS).fill(new Array(MIN_COLS).fill(""));
    }

    // Clean the content to remove any non-CSV text
    // Look for CSV pattern: lines with commas that look like data
    const lines = content.split("\n");
    const csvLines: string[] = [];
    let foundCsvStart = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        continue;
      }

      // Skip lines that look like instructions or descriptions
      // (lines without commas, or lines that start with common instruction words)
      if (foundCsvStart) {
        // Once we've found the CSV start, include all subsequent non-empty lines
        csvLines.push(line);
      } else {
        const hasComma = trimmedLine.includes(",");

        // Start CSV extraction when we find a line with commas
        if (hasComma && !INSTRUCTION_PATTERN.test(trimmedLine)) {
          foundCsvStart = true;
          csvLines.push(line);
        }
      }
    }

    const cleanedContent = csvLines.join("\n");
    const result = parse<string[]>(cleanedContent || content, {
      skipEmptyLines: true,
    });

    const paddedData = result.data.map((row) => {
      const paddedRow = [...row];
      while (paddedRow.length < MIN_COLS) {
        paddedRow.push("");
      }
      return paddedRow;
    });

    while (paddedData.length < MIN_ROWS) {
      paddedData.push(new Array(MIN_COLS).fill(""));
    }

    return paddedData;
  }, [content]);

  const columns = useMemo(() => {
    const rowNumberColumn = {
      key: "rowNumber",
      name: "",
      frozen: true,
      width: 50,
      renderCell: ({ rowIdx }: { rowIdx: number }) => rowIdx + 1,
      cellClass: "border-t border-r dark:bg-zinc-950 dark:text-zinc-50",
      headerCellClass: "border-t border-r dark:bg-zinc-900 dark:text-zinc-50",
    };

    const dataColumns = Array.from({ length: MIN_COLS }, (_, i) => ({
      key: i.toString(),
      name: String.fromCharCode(65 + i),
      renderEditCell: textEditor,
      width: 120,
      cellClass: cn("border-t dark:bg-zinc-950 dark:text-zinc-50", {
        "border-l": i !== 0,
      }),
      headerCellClass: cn("border-t dark:bg-zinc-900 dark:text-zinc-50", {
        "border-l": i !== 0,
      }),
    }));

    return [rowNumberColumn, ...dataColumns];
  }, []);

  const initialRows = useMemo(() => {
    return parseData.map((row, rowIndex) => {
      const rowData: any = {
        id: rowIndex,
        rowNumber: rowIndex + 1,
      };

      columns.slice(1).forEach((col, colIndex) => {
        rowData[col.key] = row[colIndex] || "";
      });

      return rowData;
    });
  }, [parseData, columns]);

  const [localRows, setLocalRows] = useState(initialRows);

  useEffect(() => {
    setLocalRows(initialRows);
  }, [initialRows]);

  const generateCsv = (data: any[][]) => {
    return unparse(data);
  };

  const handleRowsChange = (newRows: any[]) => {
    setLocalRows(newRows);

    const updatedData = newRows.map((row) => {
      return columns.slice(1).map((col) => row[col.key] || "");
    });

    const newCsvContent = generateCsv(updatedData);
    saveContent(newCsvContent, true);
  };

  return (
    <DataGrid
      className={resolvedTheme === "dark" ? "rdg-dark" : "rdg-light"}
      columns={columns}
      defaultColumnOptions={{
        resizable: true,
        sortable: true,
      }}
      enableVirtualization
      onCellClick={(args) => {
        if (args.column.key !== "rowNumber") {
          args.selectCell(true);
        }
      }}
      onRowsChange={handleRowsChange}
      rows={localRows}
      style={{ height: "100%" }}
    />
  );
};

function areEqual(prevProps: SheetEditorProps, nextProps: SheetEditorProps) {
  return (
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === "streaming" && nextProps.status === "streaming") &&
    prevProps.content === nextProps.content &&
    prevProps.saveContent === nextProps.saveContent
  );
}

export const SpreadsheetEditor = memo(PureSpreadsheetEditor, areEqual);
