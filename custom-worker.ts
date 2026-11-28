// Cloudflare Worker entry point. It wraps the worker that OpenNext generates
// at build time (.open-next/worker.js) to add a Cron Trigger handler, as
// described in OpenNext's "Custom Worker" guide. `wrangler.jsonc` points
// `main` at this file.

// `.open-next/worker.js` only exists after `opennextjs-cloudflare build`, so
// it may or may not resolve during type checking: @ts-ignore covers both.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as handler } from "./.open-next/worker.js";

type WorkerEnv = {
  CRON_SECRET?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  [binding: string]: unknown;
};

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

type ScheduledController = {
  cron: string;
  scheduledTime: number;
};

type OpenNextHandler = {
  fetch(request: Request, env: WorkerEnv, ctx: WorkerExecutionContext): Promise<Response>;
};

const openNext = handler as OpenNextHandler;

const worker = {
  fetch: openNext.fetch,

  // Runs on the schedule in wrangler.jsonc ("triggers.crons"). It calls the
  // app's own /api/cron/expire-bookings route in-process through the
  // OpenNext handler, so it runs exactly that route's logic (including its
  // CRON_SECRET check) with the request context the database client needs.
  // Nothing is sent over the network.
  async scheduled(controller: ScheduledController, env: WorkerEnv, ctx: WorkerExecutionContext) {
    if (!env.CRON_SECRET) {
      throw new Error("Scheduled booking expiry skipped: CRON_SECRET is not configured.");
    }

    const siteUrl = env.NEXT_PUBLIC_SITE_URL || "https://ethiopianbooking.com";
    const request = new Request(new URL("/api/cron/expire-bookings", siteUrl), {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });

    const response = await openNext.fetch(request, env, ctx);
    const body = await response.text();

    if (!response.ok) {
      // Throwing marks this Cron Trigger run as failed in the dashboard.
      throw new Error(
        `Scheduled booking expiry failed (${controller.cron}): HTTP ${response.status} ${body.slice(0, 500)}`
      );
    }

    console.log(`Scheduled booking expiry (${controller.cron}): ${body.slice(0, 500)}`);
  },
};

export default worker;
