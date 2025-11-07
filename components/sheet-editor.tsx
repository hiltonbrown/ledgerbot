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
const CSV_LOOKAHEAD_WINDOW = 6;

const hasSentenceLikeSegments = (line: string) => {
  const cells = line.split(",");

  return cells.some((cell) => cell.trim().split(/\s+/).length > 8);
};

const findCsvStartIndex = (lines: string[]) => {
  let fallbackIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const trimmedLine = lines[index].trim();

    if (!trimmedLine || !trimmedLine.includes(",")) {
      continue;
    }

    const cells = trimmedLine.split(",");
    const nonEmptyCells = cells.filter((cell) => cell.trim().length > 0);

    if (nonEmptyCells.length < 2) {
      continue;
    }

    if (hasSentenceLikeSegments(trimmedLine)) {
      continue;
    }

    let consistentRows = 0;

    for (
      let lookAheadIndex = index + 1;
      lookAheadIndex < lines.length && lookAheadIndex <= index + CSV_LOOKAHEAD_WINDOW;
      lookAheadIndex += 1
    ) {
      const lookAheadLine = lines[lookAheadIndex].trim();

      if (!lookAheadLine || !lookAheadLine.includes(",")) {
        continue;
      }

      const lookAheadCells = lookAheadLine.split(",");
      const lookAheadNonEmptyCells = lookAheadCells.filter((cell) => cell.trim().length > 0);

      if (lookAheadNonEmptyCells.length < 2) {
        continue;
      }

      if (Math.abs(lookAheadCells.length - cells.length) <= 1) {
        consistentRows += 1;
        break;
      }
    }

    if (consistentRows > 0) {
      return index;
    }

    if (fallbackIndex === -1) {
      fallbackIndex = index;
    }
  }

  return fallbackIndex;
};

const sanitizeCsvContent = (rawContent: string) => {
  if (!rawContent) {
    return rawContent;
  }

  const lines = rawContent.split("\n");

  const csvStartIndex = findCsvStartIndex(lines);

  if (csvStartIndex === -1) {
    return rawContent;
  }

  const trimmedLines = lines
    .slice(csvStartIndex)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (trimmedLines.length === 0) {
    return rawContent;
  }

  const expectedColumns = trimmedLines[0].split(",").length;

  const normalizedLines = trimmedLines.filter((line) => {
    const trimmed = line.trim();

    if (!trimmed.includes(",")) {
      return false;
    }

    const cells = trimmed.split(",");
    const nonEmptyCells = cells.filter((cell) => cell.trim().length > 0);

    if (nonEmptyCells.length === 0) {
      return false;
    }

    return Math.abs(cells.length - expectedColumns) <= 1;
  });

  if (normalizedLines.length === 0) {
    return rawContent;
  }

  return normalizedLines.join("\n");
};

const PureSpreadsheetEditor = ({ content, saveContent }: SheetEditorProps) => {
  const { resolvedTheme } = useTheme();

  const parseData = useMemo(() => {
    if (!content) {
      return new Array(MIN_ROWS).fill(new Array(MIN_COLS).fill(""));
    }

    const cleanedContent = sanitizeCsvContent(content);
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
