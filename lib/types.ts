export type TravelMode = "TRAIN" | "FLY" | "DRIVE" | "BUS";

export type TravelPreference = "fastest" | "cheapest" | "most comfortable";

export interface RecommendRequest {
  origin: string;
  destination: string;
  date: string;
  preference: TravelPreference;
  needsWifi: boolean;
}

export interface Recommendation {
  recommendation: TravelMode;
  confidence: number;
  headline: string;
  explanation: string;
  reasons: string[];
  caveat: string | null;
}

export interface RecommendError {
  error: string;
}

export type RecommendResponse = Recommendation | RecommendError;
