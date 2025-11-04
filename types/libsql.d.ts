declare module "@libsql/client" {
  export type Client = {
    execute: (
      query: string,
      params?: Record<string, unknown> | Array<unknown>
    ) => Promise<{ rows: Array<Record<string, unknown>> } | void>;
  };

  export function createClient(config: {
    url: string;
    authToken?: string;
  }): Client;
}
