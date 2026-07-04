import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Recommendation, TravelMode } from "@/lib/types";

const MODE_STYLES: Record<
  TravelMode,
  { badge: string; bar: string; label: string }
> = {
  TRAIN: {
    badge: "bg-green-600 text-white",
    bar: "bg-green-600",
    label: "Take the train",
  },
  FLY: {
    badge: "bg-blue-600 text-white",
    bar: "bg-blue-600",
    label: "Fly",
  },
  DRIVE: {
    badge: "bg-orange-500 text-white",
    bar: "bg-orange-500",
    label: "Drive",
  },
  BUS: {
    badge: "bg-purple-600 text-white",
    bar: "bg-purple-600",
    label: "Take the bus",
  },
};

export function ResultCard({ result }: { result: Recommendation }) {
  const style = MODE_STYLES[result.recommendation];

  return (
    <Card className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-6 py-2 text-2xl font-bold tracking-tight",
              style.badge
            )}
          >
            {result.recommendation}
          </span>

          <div className="mt-5 w-full">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Confidence</span>
              <span className="font-medium text-foreground">
                {result.confidence}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", style.bar)}
                style={{ width: `${result.confidence}%` }}
              />
            </div>
          </div>
        </div>

        <p className="mt-6 text-[18px] font-bold leading-snug">
          {result.headline}
        </p>

        <p className="mt-2 text-[14px] font-normal text-gray-500">
          {result.explanation}
        </p>

        {result.reasons.length > 0 && (
          <ul className="mt-4 space-y-2">
            {result.reasons.map((reason, index) => (
              <li key={index} className="flex gap-2 text-sm text-foreground">
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    style.bar
                  )}
                />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        )}

        {result.caveat && (
          <p className="mt-4 border-t pt-4 text-xs italic text-muted-foreground">
            {result.caveat}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
