"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ResultCard } from "@/components/result-card";
import type {
  Recommendation,
  RecommendResponse,
  TravelPreference,
} from "@/lib/types";

const EXAMPLE_ROUTES = [
  { from: "NYC", to: "DC", mode: "Train" },
  { from: "Boston", to: "Philadelphia", mode: "Train" },
  { from: "LA", to: "SF", mode: "Fly / Drive" },
  { from: "Chicago", to: "Detroit", mode: "Drive" },
];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function Home() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [preference, setPreference] = useState<TravelPreference>("fastest");
  const [needsWifi, setNeedsWifi] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const minDate = todayISO();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          date,
          preference,
          needsWifi,
        }),
      });

      const data: RecommendResponse = await res.json();

      if (!res.ok || "error" in data) {
        setError(
          "error" in data
            ? data.error
            : "Could not get recommendation, try again"
        );
        return;
      }

      setResult(data);
    } catch {
      setError("Could not get recommendation, try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[480px]">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Should you fly or take the train?
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Stop opening ten Google Flights tabs. Get one clear answer for how
            to travel between two US cities.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="origin">Origin city</Label>
            <Input
              id="origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. New York, Boston, Philadelphia"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="destination">Destination city</Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Washington DC, Chicago, Los Angeles"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Travel date</Label>
            <Input
              id="date"
              type="date"
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Travel preference</Label>
            <RadioGroup
              value={preference}
              onValueChange={(v) => setPreference(v as TravelPreference)}
              className="flex flex-col gap-2 sm:flex-row sm:gap-4"
            >
              {(
                [
                  ["fastest", "Fastest"],
                  ["cheapest", "Cheapest"],
                  ["most comfortable", "Most comfortable"],
                ] as const
              ).map(([value, label]) => (
                <div key={value} className="flex items-center gap-2">
                  <RadioGroupItem id={`pref-${value}`} value={value} />
                  <Label
                    htmlFor={`pref-${value}`}
                    className="cursor-pointer font-normal"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="wifi"
              checked={needsWifi}
              onCheckedChange={setNeedsWifi}
            />
            <Label htmlFor="wifi" className="cursor-pointer font-normal">
              Do you need wifi?
            </Label>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </>
            ) : (
              "Find the best way to travel"
            )}
          </Button>
        </form>

        {error && (
          <p className="mt-6 rounded-md bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        {result && <ResultCard result={result} />}

        <section className="mt-12 border-t pt-8">
          <h2 className="text-sm font-semibold text-gray-900">
            What I know about
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            This tool has curated knowledge of routes like these:
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EXAMPLE_ROUTES.map((route) => (
              <li
                key={`${route.from}-${route.to}`}
                className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-sm"
              >
                <span className="text-gray-900">
                  {route.from} → {route.to}
                </span>
                <span className="text-xs text-gray-500">{route.mode}</span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-12 border-t pt-6 text-center text-xs text-gray-500">
          Built by{" "}
          <a
            href="https://akshatshah.netlify.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-900 underline underline-offset-2"
          >
            Akshat Shah
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/akshatshahh"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-900 underline underline-offset-2"
          >
            GitHub
          </a>
        </footer>
      </div>
    </main>
  );
}
