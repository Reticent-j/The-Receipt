/**
 * Aligns with `supabase/migrations/20260428120000_initial_schema.sql`.
 * Regenerate with: `npx supabase gen types typescript --project-id <id>`
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ListingCategory =
  | "roommate"
  | "selling"
  | "gig"
  | "dating"
  | "other";

export type ListingStatus = "active" | "closed" | "pending";

export type RelationshipType =
  | "romantic"
  | "roommate"
  | "coworker"
  | "friend"
  | "transaction";

export type NotificationType =
  | "new_rating"
  | "rating_unlocked"
  | "new_message"
  | "listing_inquiry";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          phone_number: string | null;
          overall_score: number;
          total_ratings: number;
          sms_notify_new_rating: boolean;
          sms_notify_rating_unlocked: boolean;
          sms_notify_listing_inquiry: boolean;
          sms_notify_new_message: boolean;
          who_can_rate: string;
          score_public: boolean;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string;
          subscription_current_period_end: string | null;
          premium_boost_month_used: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          phone_number?: string | null;
          overall_score?: number;
          total_ratings?: number;
          sms_notify_new_rating?: boolean;
          sms_notify_rating_unlocked?: boolean;
          sms_notify_listing_inquiry?: boolean;
          sms_notify_new_message?: boolean;
          who_can_rate?: string;
          score_public?: boolean;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string;
          subscription_current_period_end?: string | null;
          premium_boost_month_used?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          phone_number?: string | null;
          overall_score?: number;
          total_ratings?: number;
          sms_notify_new_rating?: boolean;
          sms_notify_rating_unlocked?: boolean;
          sms_notify_listing_inquiry?: boolean;
          sms_notify_new_message?: boolean;
          who_can_rate?: string;
          score_public?: boolean;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string;
          subscription_current_period_end?: string | null;
          premium_boost_month_used?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: ListingCategory;
          price: number | null;
          location: string | null;
          status: ListingStatus;
          images: string[];
          boost_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          category: ListingCategory;
          price?: number | null;
          location?: string | null;
          status?: ListingStatus;
          images?: string[];
          boost_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          category?: ListingCategory;
          price?: number | null;
          location?: string | null;
          status?: ListingStatus;
          images?: string[];
          boost_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ratings: {
        Row: {
          id: string;
          rater_id: string;
          rated_id: string;
          relationship_type: RelationshipType;
          scores: Json;
          review_text: string | null;
          rater_submitted: boolean;
          rated_submitted: boolean;
          rater_score_data: Json | null;
          rated_score_data: Json | null;
          both_submitted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rater_id: string;
          rated_id: string;
          relationship_type: RelationshipType;
          scores?: Json;
          review_text?: string | null;
          rater_submitted?: boolean;
          rated_submitted?: boolean;
          rater_score_data?: Json | null;
          rated_score_data?: Json | null;
          both_submitted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rater_id?: string;
          rated_id?: string;
          relationship_type?: RelationshipType;
          scores?: Json;
          review_text?: string | null;
          rater_submitted?: boolean;
          rated_submitted?: boolean;
          rater_score_data?: Json | null;
          rated_score_data?: Json | null;
          both_submitted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          content: string | null;
          read: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          content?: string | null;
          read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          content?: string | null;
          read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      profile_views: {
        Row: {
          id: string;
          profile_id: string;
          viewer_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          viewer_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          viewer_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          contact_phone: string | null;
          contact_name: string | null;
          matched_profile_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_phone?: string | null;
          contact_name?: string | null;
          matched_profile_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_phone?: string | null;
          contact_name?: string | null;
          matched_profile_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    /** Must not be `Record<string, never>` — that makes `keyof Views` include `string` and breaks `.from("listings")` (resolves to Views overload → `insert` is `never`). */
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_initiate_rating: {
        Args: { p_rated: string; p_rater: string };
        Returns: boolean;
      };
      touch_profile_view: {
        Args: { p_profile_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      listing_category: ListingCategory;
      listing_status: ListingStatus;
      relationship_type: RelationshipType;
      notification_type: NotificationType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
