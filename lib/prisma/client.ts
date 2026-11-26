import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

function createPrismaClient(pool: { max: number; idleTimeoutMillis?: number }) {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
      connectionTimeoutMillis: 30_000,
      ...pool,
    }),
  });
}

// Node (Vercel, local dev): one client with a shared connection pool,
// reused across hot reloads in development.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getNodeClient() {
  globalForPrisma.prisma ??= createPrismaClient({ max: 10, idleTimeoutMillis: 30_000 });
  return globalForPrisma.prisma;
}

// Cloudflare Workers: a socket opened while handling one request cannot be
// used by another, so a shared pool makes later or concurrent requests hang.
// Each request gets its own client, keyed on the per-request context object
// that OpenNext stores (via AsyncLocalStorage) for the current request.
const isCloudflareWorker =
  typeof navigator !== "undefined" &&
  navigator.userAgent === "Cloudflare-Workers";

const cloudflareContextSymbol = Symbol.for("__cloudflare-context__");
const requestClients = new WeakMap<object, PrismaClient>();

function getWorkerClient() {
  const requestContext = (globalThis as Record<symbol, unknown>)[cloudflareContextSymbol];
  if (!requestContext || typeof requestContext !== "object") {
    throw new Error("Database access on Cloudflare Workers must happen while handling a request.");
  }
  let client = requestClients.get(requestContext);
  if (!client) {
    client = createPrismaClient({ max: 5 });
    requestClients.set(requestContext, client);
  }
  return client;
}

function getClient(): PrismaClient {
  return isCloudflareWorker ? getWorkerClient() : getNodeClient();
}

// `prisma` forwards to the right client for the current environment, so the
// rest of the code keeps using `prisma.booking.findMany(...)` as before.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
