import "server-only";

import { AsyncLocalStorage } from "async_hooks";

export interface XeroRequestContext {
  userId: string;
  tenantId?: string;
  requestId: string;
  timestamp: number;
}

const storage = new AsyncLocalStorage<XeroRequestContext>();

export function withXeroContext<T>(context: XeroRequestContext, fn: () => T): T {
  return storage.run({ ...context, timestamp: Date.now() }, fn);
}

export function getXeroContext(): XeroRequestContext | undefined {
  return storage.getStore();
}

export function validateTenantAccess(tenantId: string) {
  const context = storage.getStore();

  if (!context) {
    throw new Error("No Xero request context available");
  }

  if (context.tenantId && context.tenantId !== tenantId) {
    throw new Error(
      `Tenant mismatch: expected ${context.tenantId}, received ${tenantId}`
    );
  }
}
