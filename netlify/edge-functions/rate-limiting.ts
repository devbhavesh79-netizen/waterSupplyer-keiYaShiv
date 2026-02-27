import type { Context } from "@netlify/edge-functions";

// Simple in-memory store for rate limiting
// Note: This is reset when the Edge Function instance restarts
const rateLimitStore = new Map<string, { count: number; lastReset: number }>();

const LIMIT = 200; // max requests
const WINDOW = 60 * 1000; // 1 minute in milliseconds

export default async (request: Request, context: Context) => {
  const ip = context.ip || "unknown";
  const now = Date.now();
  
  let record = rateLimitStore.get(ip);
  
  if (!record || now - record.lastReset > WINDOW) {
    record = { count: 1, lastReset: now };
    rateLimitStore.set(ip, record);
  } else {
    record.count++;
  }
  
  if (record.count > LIMIT) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": Math.ceil((record.lastReset + WINDOW - now) / 1000).toString(),
      },
    });
  }
  
  // Continue to the next function or the requested resource
  return context.next();
};
