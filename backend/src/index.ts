import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import dayjs from "dayjs";
import { getEvent, getEvents, getSourceStatuses } from "./db.js";
import { startScheduler, refreshAll } from "./scheduler.js";
import type { Event, Source } from "./types.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

const sourceSet = new Set<Source>(["forex", "oil", "earnings"]);

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  sources: z.string().optional(),
  mag7Only: z
    .union([z.literal("1"), z.literal("true")])
    .optional(),
  highOnly: z
    .union([z.literal("1"), z.literal("true")])
    .optional(),
});

app.get("/healthz", async () => ({ ok: true }));

app.get("/api/status", async () => ({ sources: getSourceStatuses() }));

app.get("/api/events", async (req, reply) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    reply.code(400);
    return { error: parsed.error.flatten() };
  }
  const q = parsed.data;
  const from = q.from ?? dayjs().subtract(1, "day").format("YYYY-MM-DD");
  const to = q.to ?? dayjs(from).add(14, "day").format("YYYY-MM-DD");

  const requested = (q.sources?.split(",").map((s) => s.trim()) ?? [
    "forex",
    "oil",
    "earnings",
  ]).filter((s): s is Source => sourceSet.has(s as Source));

  let events: Event[] = getEvents(from, to).filter((e) => {
    if (!requested.includes(e.source)) return false;
    // For earnings: keep only Mag 7 or companies with an EPS estimate
    if (e.source === "earnings" && !e.isMag7 && e.epsEstimate === undefined) {
      return false;
    }
    return true;
  });
  if (q.mag7Only) events = events.filter((e) => e.isMag7);
  if (q.highOnly) events = events.filter((e) => e.impact === "high");

  return { events, count: events.length };
});

app.get("/api/events/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const e = getEvent(id);
  if (!e) {
    reply.code(404);
    return { error: "not found" };
  }
  return e;
});

app.post("/api/refresh", async () => {
  void refreshAll();
  return { ok: true, queued: true };
});

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port: PORT, host: HOST });
  startScheduler();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
