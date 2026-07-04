# Northeast Corridor vs Fly Decider

Tells you the smartest way to travel between two US cities — train, fly, drive, or bus — in one clear answer.

## The problem it solves

Planning a trip between two US cities usually means opening ten tabs in Google Flights, another handful for Amtrak, and then squinting at bus fares — only to forget that a 200-mile hop makes no sense to fly. This app collapses all of that into a single recommendation with a confidence score and plain-English reasoning.

## Live URL

Deployed on Vercel: **https://your-project.vercel.app** _(update after deploy)_

## Stack

- **Next.js** (App Router) — frontend + API routes in one deployable app
- **TypeScript** — end to end
- **Tailwind CSS + Shadcn UI** — clean, minimal styling
- **Google Gemini API** (`gemini-2.5-flash`, free tier) — the reasoning engine, called server-side
- **Vercel** — zero-config hosting

The Gemini call happens inside a Next.js API route (`/api/recommend`) so the API key never reaches the client.

## How it works

You enter an origin city, destination city, travel date, a preference (fastest / cheapest / most comfortable), and whether you need wifi. The app sends this to Gemini along with a curated travel knowledge base and gets back a structured recommendation:

- `recommendation`: `TRAIN` | `FLY` | `DRIVE` | `BUS`
- `confidence`: 0–100
- `headline`, `explanation`, three `reasons`, and an optional `caveat`

## Run locally

```bash
# 1. Install dependencies
npm install

# 2. Add your Gemini API key
cp .env.local.example .env.local
# then edit .env.local and paste your key

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Get a free Gemini API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

## Environment variables

| Variable         | Description                              |
| ---------------- | ---------------------------------------- |
| `GEMINI_API_KEY` | Your Google Gemini API key (free tier).  |

## Deployment

1. Push this repo to GitHub.
2. Import the repo into [Vercel](https://vercel.com/new).
3. Add `GEMINI_API_KEY` as an environment variable in the Vercel project settings.
4. Deploy.

## About the knowledge base

The travel knowledge base is curated from public sources including Amtrak schedules, FAA data, and travel community knowledge. It captures non-obvious tradeoffs — like the fact that flying rarely beats the Northeast Corridor train between NYC, Philadelphia, Boston, and Washington DC, or that flying makes no sense for trips under 250 miles door to door.

## Built by

[Akshat Shah](https://akshatshah.netlify.app) · [GitHub](https://github.com/akshatshahh)
