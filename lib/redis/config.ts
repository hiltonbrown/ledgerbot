import { createClient, type RedisClientType } from "redis";

const STREAM_BUFFER_TTL_SECONDS = 15;
const MAX_RECONNECT_RETRIES = 5;

const redisUrl = process.env.REDIS_URL;
const shouldUseTls = process.env.NODE_ENV === "production";

const reconnectStrategy = (retries: number) => {
  if (retries > MAX_RECONNECT_RETRIES) {
    return new Error("Redis reconnect attempts exhausted");
  }

  return Math.min(retries * 50, 500);
};

const resolveEndpointLabel = () => {
  if (!redisUrl) {
    return "unconfigured";
  }

  try {
    const { host } = new URL(redisUrl);
    return host;
  } catch (_) {
    return "configured endpoint";
  }
};

const logPrefix = "[redis]";

const logConnectionSuccess = () => {
  console.log(
    `${logPrefix} Connected to Redis (${resolveEndpointLabel()}) with TLS=${shouldUseTls}`
  );
};

const logConnectionFailure = (error: unknown) => {
  console.warn(
    `${logPrefix} Connection failed (${resolveEndpointLabel()})`,
    error
  );
};

const logMissingUrl = () => {
  console.log(
    `${logPrefix} REDIS_URL not configured - resumable streams disabled`
  );
};

type RedisClient = RedisClientType;

type RedisClients = {
  publisher: RedisClient;
  subscriber: RedisClient;
};

let cachedClients: RedisClients | null = null;
let initializePromise: Promise<RedisClients | null> | null = null;
let notifiedMissingUrl = false;

const createRedisClient = (label: "publisher" | "subscriber"): RedisClient => {
  const client = createClient({
    url: redisUrl,
    socket: {
      tls: shouldUseTls,
      reconnectStrategy,
    },
  });

  client.on("error", (error: unknown) => {
    console.error(`${logPrefix} ${label} error`, error);
  });

  client.on("end", () => {
    console.warn(`${logPrefix} ${label} connection closed`);
    cachedClients = null;
    initializePromise = null;
  });

  return client as RedisClient;
};

const establishClients = async (): Promise<RedisClients | null> => {
  if (!redisUrl) {
    if (!notifiedMissingUrl) {
      logMissingUrl();
      notifiedMissingUrl = true;
    }

    return null;
  }

  const publisher = createRedisClient("publisher");
  const subscriber = createRedisClient("subscriber");

  try {
    await Promise.all([publisher.connect(), subscriber.connect()]);
    await Promise.all([publisher.ping(), subscriber.ping()]);

    logConnectionSuccess();

    cachedClients = { publisher, subscriber };
    return cachedClients;
  } catch (error) {
    logConnectionFailure(error);

    await Promise.allSettled([publisher.disconnect(), subscriber.disconnect()]);

    return null;
  }
};

/**
 * Resolves the shared Redis clients used for resumable streaming.
 *
 * Attempts to connect on first call and reuses the connection thereafter.
 * Returns null when Redis is not configured or the connection attempt fails.
 */
export async function getRedisClients(): Promise<RedisClients | null> {
  if (cachedClients) {
    return cachedClients;
  }

  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = establishClients();

  const result = await initializePromise;

  if (!result) {
    initializePromise = null;
  }

  return result;
}

export const streamBufferTtlSeconds = STREAM_BUFFER_TTL_SECONDS;

/**
 * Wraps a Redis publisher to enforce the configured TTL on buffered stream data.
 */
export const createPublisherWithTtl = (publisher: RedisClient) => ({
  connect: async () => {
    if (!publisher.isOpen) {
      await publisher.connect();
    }
  },
  publish: publisher.publish.bind(publisher),
  set: async (key: string, value: string, options?: { EX?: number }) => {
    await publisher.set(key, value, {
      ...options,
      EX: STREAM_BUFFER_TTL_SECONDS,
    });
  },
  get: publisher.get.bind(publisher),
  incr: publisher.incr.bind(publisher),
});

/**
 * Wraps a Redis subscriber with lazy connection semantics for resumable streams.
 */
export const createSubscriberWrapper = (subscriber: RedisClient) => ({
  connect: async () => {
    if (!subscriber.isOpen) {
      await subscriber.connect();
    }
  },
  subscribe: subscriber.subscribe.bind(subscriber),
  unsubscribe: subscriber.unsubscribe.bind(subscriber),
});
