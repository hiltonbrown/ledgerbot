declare module "@libsql/client" {
  export type Client = {
    execute: (
      query: string,
      params?: Record<string, unknown> | unknown[]
    ) => Promise<{ rows: Record<string, unknown>[] } | undefined>;
  };

  export function createClient(config: {
    url: string;
    authToken?: string;
  }): Client;
}
