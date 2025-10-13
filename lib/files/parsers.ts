import { inflateRawSync, inflateSync } from "node:zlib";

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function decodePdfString(content: string): string {
  let result = "";
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === "\\") {
      const next = content[index + 1];
      switch (next) {
        case "n":
          result += "\n";
          index += 1;
          break;
        case "r":
          result += "\r";
          index += 1;
          break;
        case "t":
          result += "\t";
          index += 1;
          break;
        case "f":
          result += "\f";
          index += 1;
          break;
        case "b":
          result += "\b";
          index += 1;
          break;
        case "(":
        case ")":
        case "\\":
          result += next;
          index += 1;
          break;
        case undefined:
          break;
        default: {
          if (/[0-7]/.test(next ?? "")) {
            let octal = next ?? "";
            for (let offset = 2; offset <= 3; offset += 1) {
              const digit = content[index + offset];
              if (digit && /[0-7]/.test(digit)) {
                octal += digit;
              } else {
                break;
              }
            }
            result += String.fromCharCode(Number.parseInt(octal, 8));
            index += octal.length;
          } else {
            result += next ?? "";
            index += 1;
          }
        }
      }
    } else {
      result += char;
    }
  }
  return result;
}

function extractTextFromPdfBuffer(buffer: Buffer): string {
  const textParts: string[] = [];
  const decoded = buffer.toString("latin1");

  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let streamMatch: RegExpExecArray | null;

  const tryExtract = (raw: Buffer | string) => {
    const source = Buffer.isBuffer(raw) ? raw : Buffer.from(raw, "latin1");
    let content: string;
    try {
      content = inflateSync(source).toString("utf8");
    } catch (_) {
      try {
        content = inflateRawSync(source).toString("utf8");
      } catch (_) {
        content = source.toString("latin1");
      }
    }

    const textRegex = /\(([^)]*?)\)\s*T[Jj]/g;
    let match: RegExpExecArray | null;
    while ((match = textRegex.exec(content)) !== null) {
      textParts.push(decodePdfString(match[1] ?? ""));
    }
  };

  while ((streamMatch = streamRegex.exec(decoded)) !== null) {
    const streamContent = streamMatch[1] ?? "";
    tryExtract(streamContent);
  }

  const inlineRegex = /\(([^)]*?)\)\s*T[Jj]/g;
  let inlineMatch: RegExpExecArray | null;
  while ((inlineMatch = inlineRegex.exec(decoded)) !== null) {
    textParts.push(decodePdfString(inlineMatch[1] ?? ""));
  }

  return textParts
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

const CENTRAL_DIRECTORY_SIGNATURE = 0x02_01_4b_50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04_03_4b_50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06_05_4b_50;

type ZipEntry = {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
  localHeaderOffset: number;
};

function findEndOfCentralDirectory(buffer: Buffer): number {
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return index;
    }
  }
  throw new Error("ZIP: End of central directory not found");
}

function parseZipEntries(buffer: Buffer): ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  const entries: ZipEntry[] = [];
  let cursor = centralDirectoryOffset;

  for (let i = 0; i < totalEntries; i += 1) {
    if (buffer.readUInt32LE(cursor) !== CENTRAL_DIRECTORY_SIGNATURE) {
      break;
    }

    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraFieldLength = buffer.readUInt16LE(cursor + 30);
    const fileCommentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + fileNameLength;
    const name = buffer.subarray(nameStart, nameEnd).toString("utf8");

    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      compressionMethod,
      localHeaderOffset,
    });

    cursor = nameEnd + extraFieldLength + fileCommentLength;
  }

  return entries;
}

function extractZipEntry(buffer: Buffer, entryName: string): Buffer | null {
  const entries = parseZipEntries(buffer);
  const entry = entries.find((item) => item.name === entryName);
  if (!entry) {
    return null;
  }

  const localHeaderOffset = entry.localHeaderOffset;
  if (buffer.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_HEADER_SIGNATURE) {
    throw new Error("ZIP: Invalid local file header");
  }

  const fileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
  const extraFieldLength = buffer.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + fileNameLength + extraFieldLength;
  const dataEnd = dataStart + entry.compressedSize;

  const slice = buffer.subarray(dataStart, dataEnd);

  if (entry.compressionMethod === 0) {
    return Buffer.from(slice);
  }
  if (entry.compressionMethod === 8) {
    return inflateRawSync(slice);
  }
  throw new Error("ZIP: Unsupported compression method");
}

function parseDocxXml(xml: string): string {
  const texts = Array.from(xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)).map(
    (match) => decodeXmlEntities(match[1] ?? "")
  );

  return texts.join(" ").replace(/\s+/g, " ").trim();
}

function columnLabelToIndex(label: string): number {
  let index = 0;
  for (let i = 0; i < label.length; i += 1) {
    index = index * 26 + (label.charCodeAt(i) - 64);
  }
  return index - 1;
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const matches = xml.matchAll(
    /<si>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/si>/g
  );
  for (const match of matches) {
    strings.push(decodeXmlEntities((match[1] ?? "").trim()));
  }
  return strings;
}

function parseWorksheet(xml: string, sharedStrings: string[]): string {
  const rows: string[][] = [];
  const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rowContent = rowMatch[1] ?? "";
    const cells: string[] = [];
    const cellRegex =
      /<c[^>]*r="([A-Z]+)\d+"[^>]*?(t="([a-z])")?[^>]*>([\s\S]*?)<\/c>/g;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const columnLabel = cellMatch[1] ?? "A";
      const type = cellMatch[3];
      const valueMatch = /<v>([\s\S]*?)<\/v>/.exec(cellMatch[4] ?? "");
      const inlineStringMatch =
        /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/.exec(
          cellMatch[4] ?? ""
        );
      const columnIndex = columnLabelToIndex(columnLabel);

      let cellValue = "";
      if (type === "s") {
        const sharedIndex = Number(valueMatch?.[1] ?? "");
        cellValue = sharedStrings[sharedIndex] ?? "";
      } else if (inlineStringMatch) {
        cellValue = decodeXmlEntities((inlineStringMatch[1] ?? "").trim());
      } else if (valueMatch) {
        cellValue = decodeXmlEntities((valueMatch[1] ?? "").trim());
      }

      cells[columnIndex] = cellValue;
    }

    rows.push(cells.map((cell) => cell ?? ""));
  }

  return rows.map((row) => row.join(",")).join("\n");
}

function extractSheetNames(buffer: Buffer): { name: string; path: string }[] {
  const workbookBuffer = extractZipEntry(buffer, "xl/workbook.xml");
  if (!workbookBuffer) {
    return [];
  }

  const workbookXml = workbookBuffer.toString("utf8");
  const sheetMatches = workbookXml.matchAll(
    /<sheet[^>]*name="([^"]+)"[^>]*sheetId="(\d+)"/g
  );
  const sheets: { name: string; path: string }[] = [];
  for (const match of sheetMatches) {
    const sheetName = match[1];
    const sheetId = match[2];
    const path = `xl/worksheets/sheet${sheetId}.xml`;
    sheets.push({ name: sheetName, path });
  }

  if (sheets.length === 0) {
    const entryNames = parseZipEntries(buffer)
      .map((entry) => entry.name)
      .filter(
        (name) =>
          name.startsWith("xl/worksheets/sheet") && name.endsWith(".xml")
      );
    entryNames.forEach((name) => {
      const baseName = name.split("/").at(-1) ?? "Sheet";
      sheets.push({ name: baseName.replace(/\.xml$/, ""), path: name });
    });
  }

  return sheets;
}

export async function extractPdfText(blob: Blob): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return extractTextFromPdfBuffer(buffer);
}

export async function extractDocxText(blob: Blob): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const documentBuffer = extractZipEntry(buffer, "word/document.xml");
  if (!documentBuffer) {
    return "";
  }
  return parseDocxXml(documentBuffer.toString("utf8"));
}

export async function extractXlsxData(blob: Blob): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const sharedStringsBuffer = extractZipEntry(buffer, "xl/sharedStrings.xml");
  const sharedStrings = sharedStringsBuffer
    ? parseSharedStrings(sharedStringsBuffer.toString("utf8"))
    : [];

  const sheets = extractSheetNames(buffer);
  if (sheets.length === 0) {
    return "";
  }

  const sheetOutputs = sheets.map(({ name, path }) => {
    const worksheetBuffer = extractZipEntry(buffer, path);
    if (!worksheetBuffer) {
      return `Sheet: ${name}\n`;
    }
    const csv = parseWorksheet(worksheetBuffer.toString("utf8"), sharedStrings);
    return `Sheet: ${name}\n${csv}`.trim();
  });

  return sheetOutputs.join("\n\n");
}
