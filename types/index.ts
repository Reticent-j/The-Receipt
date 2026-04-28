/** Domain types for The Receipt marketplace */

export type ReputationDimension =
  | "reliability"
  | "communication"
  | "fairness"
  | "follow_through";

export interface PublicReputationSummary {
  userId: string;
  displayName: string;
  /** Aggregate score derived from double-blind mutual ratings */
  overallScore: number;
  ratingCount: number;
  lastUpdated: string;
}
