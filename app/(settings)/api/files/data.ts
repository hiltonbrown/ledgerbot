export type FileRecord = {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
  owner: string;
  status: "synced" | "processing" | "failed";
};

export type FileSummary = {
  usage: {
    used: number;
    capacity: number;
  };
  files: FileRecord[];
};

const FILE_SUMMARY: FileSummary = {
  usage: {
    used: 2.3,
    capacity: 10,
  },
  files: [
    {
      id: "file_1",
      name: "Quarterly Forecast.xlsx",
      type: "Spreadsheet",
      size: "1.2 MB",
      uploadedAt: "2024-05-14T09:00:00.000Z",
      owner: "alex.rivers@example.com",
      status: "synced",
    },
    {
      id: "file_2",
      name: "Product Strategy.pdf",
      type: "Document",
      size: "3.4 MB",
      uploadedAt: "2024-05-11T16:45:00.000Z",
      owner: "morgan.lee@example.com",
      status: "processing",
    },
    {
      id: "file_3",
      name: "Support Transcript.txt",
      type: "Text",
      size: "864 KB",
      uploadedAt: "2024-05-09T12:10:00.000Z",
      owner: "sasha.wong@example.com",
      status: "synced",
    },
  ],
};

export function getFileSummary(): FileSummary {
  return FILE_SUMMARY;
}
