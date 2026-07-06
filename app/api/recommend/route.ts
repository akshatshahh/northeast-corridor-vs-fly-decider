import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import type {
  Recommendation,
  RecommendRequest,
  TravelMode,
} from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are an expert travel advisor with deep knowledge of US transportation options.
You know the following facts:
- Amtrak Acela and Northeast Regional connect Boston, Providence, New Haven, New York Penn, Newark, Philadelphia, Wilmington, Baltimore, and Washington DC. This corridor is almost always better than flying when both endpoints are on it.
- Flying makes no sense for trips under 250 miles door to door because security, boarding, and baggage add 2-3 hours minimum.
- CDG is the worst major hub in Europe for connections. ATL, ORD, and DFW are the best US hubs for connections.
- Some United and American flights now have Starlink wifi. Delta SkyMiles flights on newer A321neo and B737 MAX have wifi. Spirit and Frontier almost never have reliable wifi.
- Driving beats flying for trips under 4 hours by car when traveling with family or luggage.
- Bus (Greyhound, FlixBus, BoltBus) beats all options on price for NEC corridor trips under $30 fare.
- Red-eye flights save a hotel night but destroy the next day for most people.
- Train is always better than flying between: NYC and Washington DC, NYC and Philadelphia, NYC and Boston, Philadelphia and Washington DC, Philadelphia and Boston.

Given the origin, destination, travel date, preference (fastest/cheapest/most comfortable), and wifi need, return ONLY a JSON object with this exact shape and nothing else:
{
  "recommendation": "TRAIN" | "FLY" | "DRIVE" | "BUS",
  "confidence": 0-100,
  "headline": "one sentence summary under 15 words",
  "explanation": "one paragraph 2-4 sentences plain English",
  "reasons": ["reason 1", "reason 2", "reason 3"],
  "caveat": "one sentence edge case or exception, or null if none"
}`;

const VALID_MODES: TravelMode[] = ["TRAIN", "FLY", "DRIVE", "BUS"];

const VALID_PREFERENCES = ["fastest", "cheapest", "most comfortable"];

const ERROR_RESPONSE = { error: "Could not get recommendation, try again" };

// Abuse limits: this endpoint spends the owner's Gemini quota, so cap input
// size and request rate before ever calling the model.
const MAX_BODY_BYTES = 2000;
const MAX_CITY_LENGTH = 120;
const MAX_DATE_LENGTH = 40;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

// Best-effort, per-instance rate limiter. On serverless this only protects a
// single warm instance; a shared store (e.g. Vercel KV / Upstash) is needed for
// strict global limits. It still blocks casual hammering from one client.
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function sanitizeField(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  // Collapse whitespace/newlines to blunt prompt-injection formatting tricks.
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function extractJson(text: string): unknown {
  // Strip markdown code fences if Gemini wraps the JSON.
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in Gemini response");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function validate(data: unknown): Recommendation {
  if (typeof data !== "object" || data === null) {
    throw new Error("Response is not an object");
  }
  const obj = data as Record<string, unknown>;

  if (!VALID_MODES.includes(obj.recommendation as TravelMode)) {
    throw new Error("Invalid recommendation value");
  }

  const confidence = Number(obj.confidence);
  if (Number.isNaN(confidence)) {
    throw new Error("Invalid confidence value");
  }

  const reasons = Array.isArray(obj.reasons)
    ? obj.reasons.map((r) => String(r))
    : [];

  return {
    recommendation: obj.recommendation as TravelMode,
    confidence: Math.max(0, Math.min(100, Math.round(confidence))),
    headline: String(obj.headline ?? ""),
    explanation: String(obj.explanation ?? ""),
    reasons,
    caveat:
      obj.caveat === null || obj.caveat === undefined || obj.caveat === ""
        ? null
        : String(obj.caveat),
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return NextResponse.json(ERROR_RESPONSE, { status: 500 });
  }

  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { error: "Too many requests, please slow down" },
      { status: 429 }
    );
  }

  // Reject oversized payloads before parsing to avoid wasting work/tokens.
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(ERROR_RESPONSE, { status: 413 });
  }

  let body: Partial<RecommendRequest>;
  try {
    body = JSON.parse(raw) as Partial<RecommendRequest>;
  } catch {
    return NextResponse.json(ERROR_RESPONSE, { status: 400 });
  }

  const origin = sanitizeField(body?.origin, MAX_CITY_LENGTH);
  const destination = sanitizeField(body?.destination, MAX_CITY_LENGTH);
  const date = sanitizeField(body?.date, MAX_DATE_LENGTH);
  const preference = VALID_PREFERENCES.includes(body?.preference as string)
    ? (body?.preference as string)
    : "fastest";
  const needsWifi = body?.needsWifi === true;

  if (!origin || !destination) {
    return NextResponse.json(ERROR_RESPONSE, { status: 400 });
  }

  const userPrompt = `Origin: ${origin}
Destination: ${destination}
Travel date: ${date || "not specified"}
Preference: ${preference}
Needs wifi: ${needsWifi ? "yes" : "no"}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      // gemini-1.5-flash has been retired; 2.5-flash is the current free-tier fast model.
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    const result = await model.generateContent(userPrompt);
    const text = result.response.text();

    const recommendation = validate(extractJson(text));
    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("Gemini recommendation failed:", error);
    return NextResponse.json(ERROR_RESPONSE, { status: 502 });
  }
}
