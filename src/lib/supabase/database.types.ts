export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      ad_slots: {
        Row: {
          audience: string;
          config: NonNullable<Json>;
          description: string | null;
          id: string;
          is_enabled: boolean;
          key: string;
          name: string;
          placement: string;
          provider: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          audience?: string;
          config?: NonNullable<Json>;
          description?: string | null;
          id?: string;
          is_enabled?: boolean;
          key: string;
          name: string;
          placement: string;
          provider?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          audience?: string;
          config?: NonNullable<Json>;
          description?: string | null;
          id?: string;
          is_enabled?: boolean;
          key?: string;
          name?: string;
          placement?: string;
          provider?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          audience: Database["public"]["Enums"]["content_audience"];
          body: string;
          category: Database["public"]["Enums"]["announcement_category"];
          cover_path: string | null;
          created_at: string;
          created_by: string | null;
          excerpt: string | null;
          id: string;
          partnership_authorized: boolean;
          pinned: boolean;
          published_at: string | null;
          slug: string;
          status: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          audience?: Database["public"]["Enums"]["content_audience"];
          body?: string;
          category?: Database["public"]["Enums"]["announcement_category"];
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          excerpt?: string | null;
          id?: string;
          partnership_authorized?: boolean;
          pinned?: boolean;
          published_at?: string | null;
          slug: string;
          status?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          audience?: Database["public"]["Enums"]["content_audience"];
          body?: string;
          category?: Database["public"]["Enums"]["announcement_category"];
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          excerpt?: string | null;
          id?: string;
          partnership_authorized?: boolean;
          pinned?: boolean;
          published_at?: string | null;
          slug?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
          ip_address: unknown;
          metadata: NonNullable<Json>;
          user_agent: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
          ip_address?: unknown;
          metadata?: NonNullable<Json>;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
          ip_address?: unknown;
          metadata?: NonNullable<Json>;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      billing_customers: {
        Row: {
          created_at: string;
          provider: string;
          provider_customer_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          provider?: string;
          provider_customer_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          provider?: string;
          provider_customer_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      collection_items: {
        Row: {
          collection_id: string;
          position: number;
          title_id: string;
        };
        ComputedFields: never;
        Insert: {
          collection_id: string;
          position?: number;
          title_id: string;
        };
        Update: {
          collection_id?: string;
          position?: number;
          title_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_items_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
        ];
      };
      collections: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_public: boolean;
          name: string;
          slug: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      consent_logs: {
        Row: {
          anonymous_id: string | null;
          choices: NonNullable<Json>;
          created_at: string;
          id: string;
          policy_version: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          anonymous_id?: string | null;
          choices: NonNullable<Json>;
          created_at?: string;
          id?: string;
          policy_version: string;
          user_id?: string | null;
        };
        Update: {
          anonymous_id?: string | null;
          choices?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          policy_version?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          category: string;
          created_at: string;
          email: string;
          handled_at: string | null;
          handled_by: string | null;
          id: string;
          ip_hash: string | null;
          message: string;
          name: string;
          status: string;
          subject: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          category: string;
          created_at?: string;
          email: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          ip_hash?: string | null;
          message: string;
          name: string;
          status?: string;
          subject: string;
          user_id?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          email?: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          ip_hash?: string | null;
          message?: string;
          name?: string;
          status?: string;
          subject?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      content_claims: {
        Row: {
          action_taken: string | null;
          claim_type: string;
          claimant_email: string;
          claimant_name: string;
          claimant_organization: string | null;
          created_at: string;
          description: string;
          handled_by: string | null;
          id: string;
          ip_hash: string | null;
          resolved_at: string | null;
          status: Database["public"]["Enums"]["claim_status"];
          sworn_statement: boolean;
          title_id: string | null;
          title_reference: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          action_taken?: string | null;
          claim_type: string;
          claimant_email: string;
          claimant_name: string;
          claimant_organization?: string | null;
          created_at?: string;
          description: string;
          handled_by?: string | null;
          id?: string;
          ip_hash?: string | null;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["claim_status"];
          sworn_statement?: boolean;
          title_id?: string | null;
          title_reference?: string | null;
          updated_at?: string;
        };
        Update: {
          action_taken?: string | null;
          claim_type?: string;
          claimant_email?: string;
          claimant_name?: string;
          claimant_organization?: string | null;
          created_at?: string;
          description?: string;
          handled_by?: string | null;
          id?: string;
          ip_hash?: string | null;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["claim_status"];
          sworn_statement?: boolean;
          title_id?: string | null;
          title_reference?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_claims_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
        ];
      };
      content_request_events: {
        Row: {
          changed_by: string | null;
          created_at: string;
          from_status: Database["public"]["Enums"]["request_status"] | null;
          id: string;
          public_note: string | null;
          request_id: string;
          to_status: Database["public"]["Enums"]["request_status"];
        };
        ComputedFields: never;
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["request_status"] | null;
          id?: string;
          public_note?: string | null;
          request_id: string;
          to_status: Database["public"]["Enums"]["request_status"];
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["request_status"] | null;
          id?: string;
          public_note?: string | null;
          request_id?: string;
          to_status?: Database["public"]["Enums"]["request_status"];
        };
        Relationships: [
          {
            foreignKeyName: "content_request_events_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "content_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      content_request_notes: {
        Row: {
          author_id: string | null;
          created_at: string;
          id: string;
          note: string;
          request_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          created_at?: string;
          id?: string;
          note: string;
          request_id: string;
        };
        Update: {
          author_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_request_notes_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "content_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      content_request_votes: {
        Row: {
          created_at: string;
          request_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          request_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          request_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_request_votes_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "content_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      content_requests: {
        Row: {
          comment: string | null;
          content_type: Database["public"]["Enums"]["request_content_type"];
          country: string | null;
          created_at: string;
          director: string | null;
          duplicate_of: string | null;
          id: string;
          info_url: string | null;
          is_hidden: boolean;
          linked_title_id: string | null;
          normalized_key: string;
          normalized_title: string;
          public_note: string | null;
          release_year: number | null;
          status: Database["public"]["Enums"]["request_status"];
          status_changed_at: string;
          title: string;
          updated_at: string;
          user_id: string | null;
          vote_count: number;
        };
        ComputedFields: never;
        Insert: {
          comment?: string | null;
          content_type: Database["public"]["Enums"]["request_content_type"];
          country?: string | null;
          created_at?: string;
          director?: string | null;
          duplicate_of?: string | null;
          id?: string;
          info_url?: string | null;
          is_hidden?: boolean;
          linked_title_id?: string | null;
          normalized_key?: string;
          normalized_title?: string;
          public_note?: string | null;
          release_year?: number | null;
          status?: Database["public"]["Enums"]["request_status"];
          status_changed_at?: string;
          title: string;
          updated_at?: string;
          user_id?: string | null;
          vote_count?: number;
        };
        Update: {
          comment?: string | null;
          content_type?: Database["public"]["Enums"]["request_content_type"];
          country?: string | null;
          created_at?: string;
          director?: string | null;
          duplicate_of?: string | null;
          id?: string;
          info_url?: string | null;
          is_hidden?: boolean;
          linked_title_id?: string | null;
          normalized_key?: string;
          normalized_title?: string;
          public_note?: string | null;
          release_year?: number | null;
          status?: Database["public"]["Enums"]["request_status"];
          status_changed_at?: string;
          title?: string;
          updated_at?: string;
          user_id?: string | null;
          vote_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "content_requests_duplicate_of_fkey";
            columns: ["duplicate_of"];
            isOneToOne: false;
            referencedRelation: "content_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_requests_linked_title_id_fkey";
            columns: ["linked_title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
        ];
      };
      credits: {
        Row: {
          character_name: string | null;
          id: string;
          person_id: string;
          position: number;
          role: Database["public"]["Enums"]["credit_role"];
          title_id: string;
        };
        ComputedFields: never;
        Insert: {
          character_name?: string | null;
          id?: string;
          person_id: string;
          position?: number;
          role: Database["public"]["Enums"]["credit_role"];
          title_id: string;
        };
        Update: {
          character_name?: string | null;
          id?: string;
          person_id?: string;
          position?: number;
          role?: Database["public"]["Enums"]["credit_role"];
          title_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credits_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credits_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
        ];
      };
      data_requests: {
        Row: {
          completed_at: string | null;
          created_at: string;
          details: string | null;
          handled_by: string | null;
          id: string;
          request_type: Database["public"]["Enums"]["data_request_type"];
          response: string | null;
          status: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          details?: string | null;
          handled_by?: string | null;
          id?: string;
          request_type: Database["public"]["Enums"]["data_request_type"];
          response?: string | null;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          details?: string | null;
          handled_by?: string | null;
          id?: string;
          request_type?: Database["public"]["Enums"]["data_request_type"];
          response?: string | null;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      email_outbox: {
        Row: {
          created_at: string;
          error: string | null;
          id: string;
          notification_id: string | null;
          preview_text: string | null;
          provider: string;
          provider_message_id: string | null;
          status: string;
          subject: string;
          template: string;
          to_email: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          error?: string | null;
          id?: string;
          notification_id?: string | null;
          preview_text?: string | null;
          provider: string;
          provider_message_id?: string | null;
          status: string;
          subject: string;
          template: string;
          to_email: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          id?: string;
          notification_id?: string | null;
          preview_text?: string | null;
          provider?: string;
          provider_message_id?: string | null;
          status?: string;
          subject?: string;
          template?: string;
          to_email?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_outbox_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          },
        ];
      };
      episodes: {
        Row: {
          created_at: string;
          credits_start_seconds: number | null;
          deleted_at: string | null;
          episode_number: number;
          id: string;
          intro_end_seconds: number | null;
          intro_start_seconds: number | null;
          main_asset_id: string | null;
          name: string;
          published_at: string | null;
          runtime_minutes: number | null;
          season_id: string;
          status: Database["public"]["Enums"]["publication_status"];
          still_path: string | null;
          synopsis: string | null;
          title_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          credits_start_seconds?: number | null;
          deleted_at?: string | null;
          episode_number: number;
          id?: string;
          intro_end_seconds?: number | null;
          intro_start_seconds?: number | null;
          main_asset_id?: string | null;
          name: string;
          published_at?: string | null;
          runtime_minutes?: number | null;
          season_id: string;
          status?: Database["public"]["Enums"]["publication_status"];
          still_path?: string | null;
          synopsis?: string | null;
          title_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          credits_start_seconds?: number | null;
          deleted_at?: string | null;
          episode_number?: number;
          id?: string;
          intro_end_seconds?: number | null;
          intro_start_seconds?: number | null;
          main_asset_id?: string | null;
          name?: string;
          published_at?: string | null;
          runtime_minutes?: number | null;
          season_id?: string;
          status?: Database["public"]["Enums"]["publication_status"];
          still_path?: string | null;
          synopsis?: string | null;
          title_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "episodes_main_asset_fk";
            columns: ["main_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "episodes_season_id_title_id_fkey";
            columns: ["season_id", "title_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id", "title_id"];
          },
          {
            foreignKeyName: "episodes_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
        ];
      };
      finance_entries: {
        Row: {
          amount_cents: number;
          category: Database["public"]["Enums"]["finance_category"];
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string | null;
          id: string;
          period_month: string;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          category: Database["public"]["Enums"]["finance_category"];
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          id?: string;
          period_month: string;
          source?: string;
        };
        Update: {
          amount_cents?: number;
          category?: Database["public"]["Enums"]["finance_category"];
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          id?: string;
          period_month?: string;
          source?: string;
        };
        Relationships: [];
      };
      genres: {
        Row: {
          id: number;
          labels: NonNullable<Json>;
          position: number;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          id?: never;
          labels: NonNullable<Json>;
          position?: number;
          slug: string;
        };
        Update: {
          id?: never;
          labels?: NonNullable<Json>;
          position?: number;
          slug?: string;
        };
        Relationships: [];
      };
      home_banners: {
        Row: {
          audience: string;
          created_at: string;
          cta_href: string | null;
          cta_label: string | null;
          ends_at: string | null;
          headline: string;
          id: string;
          image_path: string | null;
          is_active: boolean;
          position: number;
          starts_at: string | null;
          subheadline: string | null;
          title_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          audience?: string;
          created_at?: string;
          cta_href?: string | null;
          cta_label?: string | null;
          ends_at?: string | null;
          headline: string;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          position?: number;
          starts_at?: string | null;
          subheadline?: string | null;
          title_id?: string | null;
          updated_at?: string;
        };
        Update: {
          audience?: string;
          created_at?: string;
          cta_href?: string | null;
          cta_label?: string | null;
          ends_at?: string | null;
          headline?: string;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          position?: number;
          starts_at?: string | null;
          subheadline?: string | null;
          title_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "home_banners_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
        ];
      };
      home_sections: {
        Row: {
          audience: string;
          config: NonNullable<Json>;
          created_at: string;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          layout: string;
          max_items: number;
          position: number;
          slug: string;
          source: Database["public"]["Enums"]["home_section_source"];
          starts_at: string | null;
          title: string;
          title_i18n: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          audience?: string;
          config?: NonNullable<Json>;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          layout?: string;
          max_items?: number;
          position?: number;
          slug: string;
          source: Database["public"]["Enums"]["home_section_source"];
          starts_at?: string | null;
          title: string;
          title_i18n?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          audience?: string;
          config?: NonNullable<Json>;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          layout?: string;
          max_items?: number;
          position?: number;
          slug?: string;
          source?: Database["public"]["Enums"]["home_section_source"];
          starts_at?: string | null;
          title?: string;
          title_i18n?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [];
      };
      hq_api_keys: {
        Row: {
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          key_hash: string;
          key_prefix: string;
          last_used_at: string | null;
          name: string;
          revoked_at: string | null;
          scopes: string[];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          key_hash: string;
          key_prefix: string;
          last_used_at?: string | null;
          name: string;
          revoked_at?: string | null;
          scopes?: string[];
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          key_hash?: string;
          key_prefix?: string;
          last_used_at?: string | null;
          name?: string;
          revoked_at?: string | null;
          scopes?: string[];
        };
        Relationships: [];
      };
      incidents: {
        Row: {
          component: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          resolved_at: string | null;
          severity: string;
          started_at: string;
          status: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          component?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          resolved_at?: string | null;
          severity?: string;
          started_at?: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          component?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          resolved_at?: string | null;
          severity?: string;
          started_at?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          amount_due_cents: number;
          amount_paid_cents: number;
          amount_refunded_cents: number;
          billing_reason: string | null;
          created_at: string;
          currency: string;
          fee_cents: number | null;
          hosted_invoice_url: string | null;
          id: string;
          invoice_pdf_url: string | null;
          number: string | null;
          paid_at: string | null;
          period_end: string | null;
          period_start: string | null;
          provider: string;
          provider_invoice_id: string;
          status: string;
          subscription_id: string | null;
          tax_cents: number;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_due_cents?: number;
          amount_paid_cents?: number;
          amount_refunded_cents?: number;
          billing_reason?: string | null;
          created_at?: string;
          currency: string;
          fee_cents?: number | null;
          hosted_invoice_url?: string | null;
          id?: string;
          invoice_pdf_url?: string | null;
          number?: string | null;
          paid_at?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          provider: string;
          provider_invoice_id: string;
          status: string;
          subscription_id?: string | null;
          tax_cents?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          amount_due_cents?: number;
          amount_paid_cents?: number;
          amount_refunded_cents?: number;
          billing_reason?: string | null;
          created_at?: string;
          currency?: string;
          fee_cents?: number | null;
          hosted_invoice_url?: string | null;
          id?: string;
          invoice_pdf_url?: string | null;
          number?: string | null;
          paid_at?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          provider?: string;
          provider_invoice_id?: string;
          status?: string;
          subscription_id?: string | null;
          tax_cents?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      license_documents: {
        Row: {
          created_at: string;
          document_type: string;
          file_name: string;
          id: string;
          license_id: string;
          mime_type: string | null;
          size_bytes: number | null;
          storage_path: string;
          uploaded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          document_type?: string;
          file_name: string;
          id?: string;
          license_id: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          document_type?: string;
          file_name?: string;
          id?: string;
          license_id?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "license_documents_license_id_fkey";
            columns: ["license_id"];
            isOneToOne: false;
            referencedRelation: "licenses";
            referencedColumns: ["id"];
          },
        ];
      };
      license_territories: {
        Row: {
          country_code: string;
          is_excluded: boolean;
          license_id: string;
        };
        ComputedFields: never;
        Insert: {
          country_code: string;
          is_excluded?: boolean;
          license_id: string;
        };
        Update: {
          country_code?: string;
          is_excluded?: boolean;
          license_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "license_territories_license_id_fkey";
            columns: ["license_id"];
            isOneToOne: false;
            referencedRelation: "licenses";
            referencedColumns: ["id"];
          },
        ];
      };
      licenses: {
        Row: {
          contract_reference: string | null;
          created_at: string;
          created_by: string | null;
          ends_at: string | null;
          exploitation_modes: string[];
          fee_terms: string | null;
          id: string;
          is_exclusive: boolean;
          license_type: Database["public"]["Enums"]["license_type"];
          max_quality: string | null;
          notes: string | null;
          restrictions: string | null;
          rights_holder_id: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["license_status"];
          supports: string[];
          title_id: string;
          updated_at: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          contract_reference?: string | null;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          exploitation_modes?: string[];
          fee_terms?: string | null;
          id?: string;
          is_exclusive?: boolean;
          license_type: Database["public"]["Enums"]["license_type"];
          max_quality?: string | null;
          notes?: string | null;
          restrictions?: string | null;
          rights_holder_id?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["license_status"];
          supports?: string[];
          title_id: string;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          contract_reference?: string | null;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          exploitation_modes?: string[];
          fee_terms?: string | null;
          id?: string;
          is_exclusive?: boolean;
          license_type?: Database["public"]["Enums"]["license_type"];
          max_quality?: string | null;
          notes?: string | null;
          restrictions?: string | null;
          rights_holder_id?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["license_status"];
          supports?: string[];
          title_id?: string;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "licenses_rights_holder_id_fkey";
            columns: ["rights_holder_id"];
            isOneToOne: false;
            referencedRelation: "rights_holders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "licenses_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
        ];
      };
      media_assets: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          duration_seconds: number | null;
          episode_id: string | null;
          error_message: string | null;
          height: number | null;
          id: string;
          kind: Database["public"]["Enums"]["media_kind"];
          metadata: NonNullable<Json>;
          original_filename: string | null;
          provider: Database["public"]["Enums"]["media_provider"];
          provider_asset_id: string | null;
          qualities: string[];
          ready_at: string | null;
          rights_attestation: Json | null;
          size_bytes: number | null;
          status: Database["public"]["Enums"]["media_status"];
          title_id: string | null;
          updated_at: string;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          duration_seconds?: number | null;
          episode_id?: string | null;
          error_message?: string | null;
          height?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["media_kind"];
          metadata?: NonNullable<Json>;
          original_filename?: string | null;
          provider: Database["public"]["Enums"]["media_provider"];
          provider_asset_id?: string | null;
          qualities?: string[];
          ready_at?: string | null;
          rights_attestation?: Json | null;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["media_status"];
          title_id?: string | null;
          updated_at?: string;
          width?: number | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          duration_seconds?: number | null;
          episode_id?: string | null;
          error_message?: string | null;
          height?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["media_kind"];
          metadata?: NonNullable<Json>;
          original_filename?: string | null;
          provider?: Database["public"]["Enums"]["media_provider"];
          provider_asset_id?: string | null;
          qualities?: string[];
          ready_at?: string | null;
          rights_attestation?: Json | null;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["media_status"];
          title_id?: string | null;
          updated_at?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_assets_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_assets_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          data: NonNullable<Json>;
          email_attempts: number;
          email_status: string;
          id: string;
          link: string | null;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          email_attempts?: number;
          email_status?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          email_attempts?: number;
          email_status?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      payment_events: {
        Row: {
          attempts: number;
          error: string | null;
          event_created_at: string | null;
          event_id: string;
          event_type: string;
          id: string;
          livemode: boolean;
          payload: NonNullable<Json>;
          processed_at: string | null;
          processing_started_at: string | null;
          provider: string;
          received_at: string;
          related_subscription_id: string | null;
          related_user_id: string | null;
          status: Database["public"]["Enums"]["payment_event_status"];
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          error?: string | null;
          event_created_at?: string | null;
          event_id: string;
          event_type: string;
          id?: string;
          livemode?: boolean;
          payload: NonNullable<Json>;
          processed_at?: string | null;
          processing_started_at?: string | null;
          provider: string;
          received_at?: string;
          related_subscription_id?: string | null;
          related_user_id?: string | null;
          status?: Database["public"]["Enums"]["payment_event_status"];
        };
        Update: {
          attempts?: number;
          error?: string | null;
          event_created_at?: string | null;
          event_id?: string;
          event_type?: string;
          id?: string;
          livemode?: boolean;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          processing_started_at?: string | null;
          provider?: string;
          received_at?: string;
          related_subscription_id?: string | null;
          related_user_id?: string | null;
          status?: Database["public"]["Enums"]["payment_event_status"];
        };
        Relationships: [];
      };
      people: {
        Row: {
          bio: string | null;
          created_at: string;
          full_name: string;
          id: string;
          is_demo: boolean;
          original_name: string | null;
          photo_path: string | null;
          slug: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          bio?: string | null;
          created_at?: string;
          full_name: string;
          id?: string;
          is_demo?: boolean;
          original_name?: string | null;
          photo_path?: string | null;
          slug: string;
          updated_at?: string;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          is_demo?: boolean;
          original_name?: string | null;
          photo_path?: string | null;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      plan_prices: {
        Row: {
          amount_cents: number;
          billing_interval: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          id: string;
          is_current: boolean;
          plan_id: string;
          provider: string;
          provider_price_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          billing_interval?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          is_current?: boolean;
          plan_id: string;
          provider?: string;
          provider_price_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          billing_interval?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          is_current?: boolean;
          plan_id?: string;
          provider?: string;
          provider_price_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "plan_prices_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_settings: {
        Row: {
          description: string | null;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          description?: string | null;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string | null;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          autoplay_next: boolean;
          avatar_key: string;
          country_code: string | null;
          created_at: string;
          display_name: string | null;
          founder_number: number | null;
          founder_since: string | null;
          id: string;
          last_seen_at: string | null;
          marketing_opt_in: boolean;
          notification_preferences: NonNullable<Json>;
          personalized_recommendations: boolean;
          preferred_locale: string;
          search_history_enabled: boolean;
          subtitle_locale: string | null;
          suspended_at: string | null;
          suspension_reason: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          autoplay_next?: boolean;
          avatar_key?: string;
          country_code?: string | null;
          created_at?: string;
          display_name?: string | null;
          founder_number?: number | null;
          founder_since?: string | null;
          id: string;
          last_seen_at?: string | null;
          marketing_opt_in?: boolean;
          notification_preferences?: NonNullable<Json>;
          personalized_recommendations?: boolean;
          preferred_locale?: string;
          search_history_enabled?: boolean;
          subtitle_locale?: string | null;
          suspended_at?: string | null;
          suspension_reason?: string | null;
          updated_at?: string;
        };
        Update: {
          autoplay_next?: boolean;
          avatar_key?: string;
          country_code?: string | null;
          created_at?: string;
          display_name?: string | null;
          founder_number?: number | null;
          founder_since?: string | null;
          id?: string;
          last_seen_at?: string | null;
          marketing_opt_in?: boolean;
          notification_preferences?: NonNullable<Json>;
          personalized_recommendations?: boolean;
          preferred_locale?: string;
          search_history_enabled?: boolean;
          subtitle_locale?: string | null;
          suspended_at?: string | null;
          suspension_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          hits: number;
          key: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          hits?: number;
          key: string;
          window_start: string;
        };
        Update: {
          hits?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          amount_cents: number;
          created_at: string;
          created_by: string | null;
          currency: string;
          id: string;
          invoice_id: string | null;
          provider: string;
          provider_refund_id: string | null;
          reason: string;
          status: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          invoice_id?: string | null;
          provider: string;
          provider_refund_id?: string | null;
          reason: string;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          invoice_id?: string | null;
          provider?: string;
          provider_refund_id?: string | null;
          reason?: string;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      rights_holders: {
        Row: {
          address: string | null;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          country_code: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          kind: string;
          legal_name: string | null;
          name: string;
          notes: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          country_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: string;
          legal_name?: string | null;
          name: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          country_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: string;
          legal_name?: string | null;
          name?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      roadmap_items: {
        Row: {
          category: string;
          completed_at: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_public: boolean;
          position: number;
          progress: number;
          status: string;
          target_label: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          category?: string;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          position?: number;
          progress?: number;
          status?: string;
          target_label?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          position?: number;
          progress?: number;
          status?: string;
          target_label?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          permission: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        ComputedFields: never;
        Insert: {
          permission: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          permission?: string;
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [];
      };
      search_history: {
        Row: {
          account_id: string;
          created_at: string;
          id: string;
          query: string;
          viewer_profile_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          created_at?: string;
          id?: string;
          query: string;
          viewer_profile_id?: string | null;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          id?: string;
          query?: string;
          viewer_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "search_history_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "search_history_viewer_profile_id_fkey";
            columns: ["viewer_profile_id"];
            isOneToOne: false;
            referencedRelation: "viewer_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          created_at: string;
          id: string;
          name: string | null;
          poster_path: string | null;
          release_year: number | null;
          season_number: number;
          synopsis: string | null;
          title_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name?: string | null;
          poster_path?: string | null;
          release_year?: number | null;
          season_number: number;
          synopsis?: string | null;
          title_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string | null;
          poster_path?: string | null;
          release_year?: number | null;
          season_number?: number;
          synopsis?: string | null;
          title_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seasons_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_plans: {
        Row: {
          available_in_phases: string[];
          billing_interval: string;
          code: string;
          created_at: string;
          currency: string;
          description: string | null;
          features: NonNullable<Json>;
          id: string;
          includes_ads: boolean;
          is_active: boolean;
          is_public: boolean;
          max_profiles: number;
          max_quality: string;
          max_streams: number;
          name: string;
          price_cents: number;
          sort_order: number;
          tagline: string | null;
          tier: Database["public"]["Enums"]["plan_tier"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          available_in_phases?: string[];
          billing_interval?: string;
          code: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          features?: NonNullable<Json>;
          id?: string;
          includes_ads?: boolean;
          is_active?: boolean;
          is_public?: boolean;
          max_profiles?: number;
          max_quality?: string;
          max_streams?: number;
          name: string;
          price_cents: number;
          sort_order?: number;
          tagline?: string | null;
          tier: Database["public"]["Enums"]["plan_tier"];
          updated_at?: string;
        };
        Update: {
          available_in_phases?: string[];
          billing_interval?: string;
          code?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          features?: NonNullable<Json>;
          id?: string;
          includes_ads?: boolean;
          is_active?: boolean;
          is_public?: boolean;
          max_profiles?: number;
          max_quality?: string;
          max_streams?: number;
          name?: string;
          price_cents?: number;
          sort_order?: number;
          tagline?: string | null;
          tier?: Database["public"]["Enums"]["plan_tier"];
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          current_period_end: string | null;
          current_period_start: string | null;
          ended_at: string | null;
          id: string;
          is_founder_rate: boolean;
          metadata: NonNullable<Json>;
          note: string | null;
          plan_id: string;
          plan_price_id: string | null;
          provider: string;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          provider_updated_at: string | null;
          status: Database["public"]["Enums"]["subscription_status"];
          trial_end: string | null;
          unit_amount_cents: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          ended_at?: string | null;
          id?: string;
          is_founder_rate?: boolean;
          metadata?: NonNullable<Json>;
          note?: string | null;
          plan_id: string;
          plan_price_id?: string | null;
          provider: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          provider_updated_at?: string | null;
          status: Database["public"]["Enums"]["subscription_status"];
          trial_end?: string | null;
          unit_amount_cents: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          ended_at?: string | null;
          id?: string;
          is_founder_rate?: boolean;
          metadata?: NonNullable<Json>;
          note?: string | null;
          plan_id?: string;
          plan_price_id?: string | null;
          provider?: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          provider_updated_at?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          trial_end?: string | null;
          unit_amount_cents?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_plan_price_id_fkey";
            columns: ["plan_price_id"];
            isOneToOne: false;
            referencedRelation: "plan_prices";
            referencedColumns: ["id"];
          },
        ];
      };
      subtitles: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          is_default: boolean;
          is_machine_generated: boolean;
          kind: string;
          label: string;
          language: string;
          media_asset_id: string;
          storage_path: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_default?: boolean;
          is_machine_generated?: boolean;
          kind?: string;
          label: string;
          language: string;
          media_asset_id: string;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_default?: boolean;
          is_machine_generated?: boolean;
          kind?: string;
          label?: string;
          language?: string;
          media_asset_id?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subtitles_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      title_genres: {
        Row: {
          genre_id: number;
          title_id: string;
        };
        ComputedFields: never;
        Insert: {
          genre_id: number;
          title_id: string;
        };
        Update: {
          genre_id?: number;
          title_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "title_genres_genre_id_fkey";
            columns: ["genre_id"];
            isOneToOne: false;
            referencedRelation: "genres";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "title_genres_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
        ];
      };
      titles: {
        Row: {
          age_rating: number;
          alternative_titles: string[];
          audio_languages: string[];
          availability_notified_at: string | null;
          backdrop_path: string | null;
          content_warnings: string[];
          countries: string[];
          created_at: string;
          created_by: string | null;
          credits_start_seconds: number | null;
          deleted_at: string | null;
          description_long: string | null;
          id: string;
          intro_end_seconds: number | null;
          intro_start_seconds: number | null;
          is_demo: boolean;
          is_featured: boolean;
          is_original: boolean;
          kind: Database["public"]["Enums"]["title_kind"];
          logo_path: string | null;
          main_asset_id: string | null;
          min_tier: Database["public"]["Enums"]["plan_tier"];
          original_languages: string[];
          original_title: string | null;
          popularity_score: number;
          poster_path: string | null;
          published_at: string | null;
          release_year: number | null;
          runtime_minutes: number | null;
          search_vector: unknown;
          slug: string;
          status: Database["public"]["Enums"]["publication_status"];
          structure: Database["public"]["Enums"]["title_structure"];
          synopsis_short: string | null;
          tagline: string | null;
          tags: string[];
          takedown_at: string | null;
          takedown_reason: string | null;
          title: string;
          trailer_asset_id: string | null;
          updated_at: string;
          updated_by: string | null;
          view_count: number;
        };
        ComputedFields: never;
        Insert: {
          age_rating?: number;
          alternative_titles?: string[];
          audio_languages?: string[];
          availability_notified_at?: string | null;
          backdrop_path?: string | null;
          content_warnings?: string[];
          countries?: string[];
          created_at?: string;
          created_by?: string | null;
          credits_start_seconds?: number | null;
          deleted_at?: string | null;
          description_long?: string | null;
          id?: string;
          intro_end_seconds?: number | null;
          intro_start_seconds?: number | null;
          is_demo?: boolean;
          is_featured?: boolean;
          is_original?: boolean;
          kind: Database["public"]["Enums"]["title_kind"];
          logo_path?: string | null;
          main_asset_id?: string | null;
          min_tier?: Database["public"]["Enums"]["plan_tier"];
          original_languages?: string[];
          original_title?: string | null;
          popularity_score?: number;
          poster_path?: string | null;
          published_at?: string | null;
          release_year?: number | null;
          runtime_minutes?: number | null;
          search_vector?: unknown;
          slug: string;
          status?: Database["public"]["Enums"]["publication_status"];
          structure?: Database["public"]["Enums"]["title_structure"];
          synopsis_short?: string | null;
          tagline?: string | null;
          tags?: string[];
          takedown_at?: string | null;
          takedown_reason?: string | null;
          title: string;
          trailer_asset_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          view_count?: number;
        };
        Update: {
          age_rating?: number;
          alternative_titles?: string[];
          audio_languages?: string[];
          availability_notified_at?: string | null;
          backdrop_path?: string | null;
          content_warnings?: string[];
          countries?: string[];
          created_at?: string;
          created_by?: string | null;
          credits_start_seconds?: number | null;
          deleted_at?: string | null;
          description_long?: string | null;
          id?: string;
          intro_end_seconds?: number | null;
          intro_start_seconds?: number | null;
          is_demo?: boolean;
          is_featured?: boolean;
          is_original?: boolean;
          kind?: Database["public"]["Enums"]["title_kind"];
          logo_path?: string | null;
          main_asset_id?: string | null;
          min_tier?: Database["public"]["Enums"]["plan_tier"];
          original_languages?: string[];
          original_title?: string | null;
          popularity_score?: number;
          poster_path?: string | null;
          published_at?: string | null;
          release_year?: number | null;
          runtime_minutes?: number | null;
          search_vector?: unknown;
          slug?: string;
          status?: Database["public"]["Enums"]["publication_status"];
          structure?: Database["public"]["Enums"]["title_structure"];
          synopsis_short?: string | null;
          tagline?: string | null;
          tags?: string[];
          takedown_at?: string | null;
          takedown_reason?: string | null;
          title?: string;
          trailer_asset_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "titles_main_asset_fk";
            columns: ["main_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "titles_trailer_asset_fk";
            columns: ["trailer_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      viewer_profiles: {
        Row: {
          account_id: string;
          avatar_key: string;
          created_at: string;
          id: string;
          is_default: boolean;
          is_kids: boolean;
          max_age_rating: number | null;
          name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          avatar_key?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          is_kids?: boolean;
          max_age_rating?: number | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          avatar_key?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          is_kids?: boolean;
          max_age_rating?: number | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "viewer_profiles_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      watch_history: {
        Row: {
          account_id: string;
          completed: boolean;
          counted_view: boolean;
          country_code: string | null;
          device_label: string | null;
          ended_at: string | null;
          episode_id: string | null;
          id: string;
          last_heartbeat_at: string;
          last_position_seconds: number;
          media_asset_id: string | null;
          started_at: string;
          title_id: string;
          viewer_profile_id: string;
          watched_seconds: number;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          completed?: boolean;
          counted_view?: boolean;
          country_code?: string | null;
          device_label?: string | null;
          ended_at?: string | null;
          episode_id?: string | null;
          id?: string;
          last_heartbeat_at?: string;
          last_position_seconds?: number;
          media_asset_id?: string | null;
          started_at?: string;
          title_id: string;
          viewer_profile_id: string;
          watched_seconds?: number;
        };
        Update: {
          account_id?: string;
          completed?: boolean;
          counted_view?: boolean;
          country_code?: string | null;
          device_label?: string | null;
          ended_at?: string | null;
          episode_id?: string | null;
          id?: string;
          last_heartbeat_at?: string;
          last_position_seconds?: number;
          media_asset_id?: string | null;
          started_at?: string;
          title_id?: string;
          viewer_profile_id?: string;
          watched_seconds?: number;
        };
        Relationships: [
          {
            foreignKeyName: "watch_history_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watch_history_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watch_history_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watch_history_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watch_history_viewer_profile_id_fkey";
            columns: ["viewer_profile_id"];
            isOneToOne: false;
            referencedRelation: "viewer_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      watch_progress: {
        Row: {
          account_id: string;
          completed: boolean;
          duration_seconds: number | null;
          episode_id: string | null;
          id: string;
          position_seconds: number;
          title_id: string;
          updated_at: string;
          viewer_profile_id: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          completed?: boolean;
          duration_seconds?: number | null;
          episode_id?: string | null;
          id?: string;
          position_seconds?: number;
          title_id: string;
          updated_at?: string;
          viewer_profile_id: string;
        };
        Update: {
          account_id?: string;
          completed?: boolean;
          duration_seconds?: number | null;
          episode_id?: string | null;
          id?: string;
          position_seconds?: number;
          title_id?: string;
          updated_at?: string;
          viewer_profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "watch_progress_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watch_progress_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watch_progress_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watch_progress_viewer_profile_id_fkey";
            columns: ["viewer_profile_id"];
            isOneToOne: false;
            referencedRelation: "viewer_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      watchlist_items: {
        Row: {
          account_id: string;
          created_at: string;
          title_id: string;
          viewer_profile_id: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          created_at?: string;
          title_id: string;
          viewer_profile_id: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          title_id?: string;
          viewer_profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "watchlist_items_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watchlist_items_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watchlist_items_viewer_profile_id_fkey";
            columns: ["viewer_profile_id"];
            isOneToOne: false;
            referencedRelation: "viewer_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_end_manual_subscription: { Args: { p_subscription: string }; Returns: undefined };
      admin_get_entitlements: {
        Args: { p_user: string };
        Returns: {
          access_until: string;
          cancel_at_period_end: boolean;
          currency: string;
          current_period_end: string;
          founder_number: number;
          founder_since: string;
          in_grace: boolean;
          includes_ads: boolean;
          is_founder_rate: boolean;
          launch_phase: string;
          max_profiles: number;
          max_quality: string;
          max_streams: number;
          plan_code: string;
          plan_name: string;
          plan_tier: Database["public"]["Enums"]["plan_tier"];
          provider: string;
          status: Database["public"]["Enums"]["subscription_status"];
          subscription_id: string;
          suspended: boolean;
          tier: Database["public"]["Enums"]["plan_tier"];
          unit_amount_cents: number;
        }[];
      };
      admin_grant_manual_subscription: {
        Args: { p_note: string; p_plan: string; p_until: string; p_user: string };
        Returns: string;
      };
      admin_set_plan_price: { Args: { p_amount_cents: number; p_plan: string }; Returns: string };
      admin_set_suspension: {
        Args: { p_reason?: string; p_suspended: boolean; p_user: string };
        Returns: undefined;
      };
      can_view_audience: {
        Args: { p_audience: Database["public"]["Enums"]["content_audience"] };
        Returns: boolean;
      };
      check_playback: {
        Args: {
          p_country: string;
          p_episode: string;
          p_kind?: string;
          p_title: string;
          p_user: string;
          p_viewer_profile: string;
        };
        Returns: {
          allowed: boolean;
          credits_start_seconds: number;
          duration_seconds: number;
          episode_id: string;
          intro_end_seconds: number;
          intro_start_seconds: number;
          max_quality: string;
          media_asset_id: string;
          provider: Database["public"]["Enums"]["media_provider"];
          provider_asset_id: string;
          reason: string;
          required_tier: Database["public"]["Enums"]["plan_tier"];
          viewer_profile_id: string;
        }[];
      };
      claim_payment_event: {
        Args: {
          p_event_created_at: string;
          p_event_id: string;
          p_event_type: string;
          p_livemode: boolean;
          p_payload: Json;
          p_provider: string;
        };
        Returns: {
          event_row_id: string;
          previous_status: Database["public"]["Enums"]["payment_event_status"];
          should_process: boolean;
        }[];
      };
      close_stale_watch_sessions: { Args: Record<PropertyKey, never>; Returns: number };
      complete_payment_event: {
        Args: {
          p_error?: string;
          p_event_row_id: string;
          p_related_subscription?: string;
          p_related_user?: string;
          p_status: Database["public"]["Enums"]["payment_event_status"];
        };
        Returns: undefined;
      };
      compute_title_search_vector: { Args: { p_title: string }; Returns: unknown };
      continue_watching: {
        Args: { p_limit?: number; p_viewer_profile: string };
        Returns: {
          duration_seconds: number;
          episode_id: string;
          is_next_episode: boolean;
          position_seconds: number;
          title_id: string;
          updated_at: string;
        }[];
      };
      current_tier: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["plan_tier"];
      };
      find_similar_requests: {
        Args: { p_title: string; p_year?: number };
        Returns: {
          id: string;
          release_year: number;
          similarity: number;
          status: Database["public"]["Enums"]["request_status"];
          title: string;
          vote_count: number;
        }[];
      };
      get_entitlements_internal: {
        Args: { p_user: string };
        Returns: {
          access_until: string;
          cancel_at_period_end: boolean;
          currency: string;
          current_period_end: string;
          founder_number: number;
          founder_since: string;
          in_grace: boolean;
          includes_ads: boolean;
          is_founder_rate: boolean;
          launch_phase: string;
          max_profiles: number;
          max_quality: string;
          max_streams: number;
          plan_code: string;
          plan_name: string;
          plan_tier: Database["public"]["Enums"]["plan_tier"];
          provider: string;
          status: Database["public"]["Enums"]["subscription_status"];
          subscription_id: string;
          suspended: boolean;
          tier: Database["public"]["Enums"]["plan_tier"];
          unit_amount_cents: number;
        }[];
      };
      get_my_entitlements: {
        Args: Record<PropertyKey, never>;
        Returns: {
          access_until: string;
          cancel_at_period_end: boolean;
          currency: string;
          current_period_end: string;
          founder_number: number;
          founder_since: string;
          in_grace: boolean;
          includes_ads: boolean;
          is_founder_rate: boolean;
          launch_phase: string;
          max_profiles: number;
          max_quality: string;
          max_streams: number;
          plan_code: string;
          plan_name: string;
          plan_tier: Database["public"]["Enums"]["plan_tier"];
          provider: string;
          status: Database["public"]["Enums"]["subscription_status"];
          subscription_id: string;
          suspended: boolean;
          tier: Database["public"]["Enums"]["plan_tier"];
          unit_amount_cents: number;
        }[];
      };
      get_setting: { Args: { p_key: string }; Returns: Json };
      has_permission: { Args: { p_permission: string }; Returns: boolean };
      has_role: { Args: { p_role: Database["public"]["Enums"]["app_role"] }; Returns: boolean };
      is_title_visible: { Args: { p_title: string }; Returns: boolean };
      license_covers_country: { Args: { p_country: string; p_license: string }; Returns: boolean };
      list_catalog: {
        Args: {
          p_collection?: string;
          p_country?: string;
          p_genre?: string;
          p_is_original?: boolean;
          p_kind?: Database["public"]["Enums"]["title_kind"];
          p_language?: string;
          p_limit?: number;
          p_max_age?: number;
          p_offset?: number;
          p_origin_country?: string;
          p_sort?: string;
          p_status?: string;
          p_tag?: string;
          p_year_max?: number;
          p_year_min?: number;
        };
        Returns: {
          age_rating: number;
          alternative_titles: string[];
          audio_languages: string[];
          availability_notified_at: string | null;
          backdrop_path: string | null;
          content_warnings: string[];
          countries: string[];
          created_at: string;
          created_by: string | null;
          credits_start_seconds: number | null;
          deleted_at: string | null;
          description_long: string | null;
          id: string;
          intro_end_seconds: number | null;
          intro_start_seconds: number | null;
          is_demo: boolean;
          is_featured: boolean;
          is_original: boolean;
          kind: Database["public"]["Enums"]["title_kind"];
          logo_path: string | null;
          main_asset_id: string | null;
          min_tier: Database["public"]["Enums"]["plan_tier"];
          original_languages: string[];
          original_title: string | null;
          popularity_score: number;
          poster_path: string | null;
          published_at: string | null;
          release_year: number | null;
          runtime_minutes: number | null;
          search_vector: unknown;
          slug: string;
          status: Database["public"]["Enums"]["publication_status"];
          structure: Database["public"]["Enums"]["title_structure"];
          synopsis_short: string | null;
          tagline: string | null;
          tags: string[];
          takedown_at: string | null;
          takedown_reason: string | null;
          title: string;
          trailer_asset_id: string | null;
          updated_at: string;
          updated_by: string | null;
          view_count: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "titles";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      log_audit: {
        Args: {
          p_action: string;
          p_actor: string;
          p_entity_id?: string;
          p_entity_type: string;
          p_ip?: unknown;
          p_metadata?: Json;
          p_user_agent?: string;
        };
        Returns: undefined;
      };
      merge_content_requests: {
        Args: { p_duplicate: string; p_target: string };
        Returns: undefined;
      };
      moderate_content_request: {
        Args: { p_hidden: boolean; p_note?: string; p_request: string };
        Returns: undefined;
      };
      my_staff_context: { Args: Record<PropertyKey, never>; Returns: Json };
      next_episode: { Args: { p_episode: string }; Returns: string };
      normalize_text: { Args: { p: string }; Returns: string };
      notify: {
        Args: {
          p_body?: string;
          p_data?: Json;
          p_email?: boolean;
          p_link?: string;
          p_title: string;
          p_type: string;
          p_user: string;
        };
        Returns: string;
      };
      notify_due_publications: { Args: Record<PropertyKey, never>; Returns: number };
      notify_staff: {
        Args: {
          p_body?: string;
          p_data?: Json;
          p_link?: string;
          p_permission: string;
          p_title: string;
          p_type: string;
        };
        Returns: number;
      };
      notify_title_available: { Args: { p_title: string }; Returns: number };
      prefix_tsquery: { Args: { p_query: string }; Returns: unknown };
      purge_rate_limits: { Args: Record<PropertyKey, never>; Returns: number };
      rate_limit_hit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: {
          allowed: boolean;
          remaining: number;
          reset_at: string;
        }[];
      };
      record_watch_progress: {
        Args: {
          p_duration_seconds: number;
          p_event?: string;
          p_played_delta_seconds: number;
          p_position_seconds: number;
          p_session: string;
        };
        Returns: {
          is_completed: boolean;
          ok: boolean;
        }[];
      };
      refresh_popularity: { Args: Record<PropertyKey, never>; Returns: number };
      restore_title: { Args: { p_note: string; p_title: string }; Returns: undefined };
      search_titles: {
        Args: { p_country?: string; p_limit?: number; p_max_age?: number; p_query: string };
        Returns: {
          backdrop_path: string;
          id: string;
          kind: Database["public"]["Enums"]["title_kind"];
          original_title: string;
          poster_path: string;
          rank: number;
          release_year: number;
          slug: string;
          status: Database["public"]["Enums"]["publication_status"];
          title: string;
        }[];
      };
      set_request_status: {
        Args: {
          p_internal_note?: string;
          p_linked_title?: string;
          p_public_note?: string;
          p_request: string;
          p_status: Database["public"]["Enums"]["request_status"];
        };
        Returns: undefined;
      };
      setting_bool: { Args: { p_default: boolean; p_key: string }; Returns: boolean };
      setting_int: { Args: { p_default: number; p_key: string }; Returns: number };
      staff_mfa_satisfied: { Args: Record<PropertyKey, never>; Returns: boolean };
      start_watch_session: {
        Args: {
          p_asset: string;
          p_country: string;
          p_device_label: string;
          p_episode: string;
          p_max_streams: number;
          p_title: string;
          p_user: string;
          p_viewer_profile: string;
        };
        Returns: {
          active_streams: number;
          allowed: boolean;
          resume_position_seconds: number;
          session_id: string;
        }[];
      };
      takedown_title: {
        Args: { p_claim?: string; p_reason: string; p_title: string };
        Returns: undefined;
      };
      title_is_available: { Args: { p_country: string; p_title: string }; Returns: boolean };
      title_required_modes: {
        Args: { p_min_tier: Database["public"]["Enums"]["plan_tier"] };
        Returns: string[];
      };
      title_rights_status: {
        Args: { p_country: string; p_modes: string[]; p_support?: string; p_title: string };
        Returns: string;
      };
      unpublish_titles_without_rights: {
        Args: Record<PropertyKey, never>;
        Returns: {
          title: string;
          title_id: string;
        }[];
      };
      upsert_provider_subscription: {
        Args: {
          p_cancel_at: string;
          p_cancel_at_period_end: boolean;
          p_canceled_at: string;
          p_currency: string;
          p_current_period_end: string;
          p_current_period_start: string;
          p_ended_at: string;
          p_metadata?: Json;
          p_provider: string;
          p_provider_customer_id: string;
          p_provider_price_id: string;
          p_provider_subscription_id: string;
          p_state_at: string;
          p_status: Database["public"]["Enums"]["subscription_status"];
          p_trial_end: string;
          p_unit_amount_cents: number;
          p_user: string;
        };
        Returns: {
          applied: boolean;
          plan_code: string;
          previous_status: Database["public"]["Enums"]["subscription_status"];
          subscription_id: string;
        }[];
      };
    };
    Enums: {
      announcement_category: "news" | "roadmap" | "partnership" | "feature" | "launch" | "catalog";
      app_role: "admin" | "catalog_editor" | "rights_manager";
      claim_status: "received" | "reviewing" | "content_disabled" | "rejected" | "resolved";
      content_audience: "public" | "members" | "subscribers" | "founders";
      credit_role:
        | "director"
        | "actor"
        | "writer"
        | "producer"
        | "composer"
        | "cinematographer"
        | "editor"
        | "presenter"
        | "guest";
      data_request_type:
        "access" | "export" | "rectification" | "erasure" | "restriction" | "objection";
      finance_category:
        | "subscription_revenue"
        | "ad_revenue"
        | "other_revenue"
        | "payment_fees"
        | "hosting"
        | "streaming"
        | "storage"
        | "email"
        | "tools"
        | "other_cost";
      home_section_source:
        | "popular"
        | "new"
        | "collection"
        | "filter"
        | "continue_watching"
        | "watchlist"
        | "recommended"
        | "coming_soon";
      license_status: "draft" | "pending_signature" | "signed" | "suspended" | "terminated";
      license_type:
        | "owned_production"
        | "exclusive_license"
        | "non_exclusive_license"
        | "public_domain_verified"
        | "open_license"
        | "promotional";
      media_kind: "main" | "trailer" | "extra";
      media_provider: "cloudflare_stream" | "dev_local";
      media_status: "pending_upload" | "processing" | "ready" | "error" | "deleted";
      payment_event_status: "received" | "processing" | "processed" | "ignored" | "failed";
      plan_tier: "free" | "founder" | "standard" | "premium";
      publication_status:
        "draft" | "in_review" | "announced" | "published" | "unpublished" | "archived";
      request_content_type: "film" | "series" | "documentary" | "short" | "show" | "other";
      request_status:
        | "received"
        | "under_review"
        | "rights_search"
        | "negotiation"
        | "acquisition_confirmed"
        | "publication_planned"
        | "available"
        | "rejected"
        | "impossible";
      subscription_status:
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "paused";
      title_kind: "film" | "series" | "documentary" | "short" | "show" | "interview";
      title_structure: "single" | "episodic";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      announcement_category: ["news", "roadmap", "partnership", "feature", "launch", "catalog"],
      app_role: ["admin", "catalog_editor", "rights_manager"],
      claim_status: ["received", "reviewing", "content_disabled", "rejected", "resolved"],
      content_audience: ["public", "members", "subscribers", "founders"],
      credit_role: [
        "director",
        "actor",
        "writer",
        "producer",
        "composer",
        "cinematographer",
        "editor",
        "presenter",
        "guest",
      ],
      data_request_type: [
        "access",
        "export",
        "rectification",
        "erasure",
        "restriction",
        "objection",
      ],
      finance_category: [
        "subscription_revenue",
        "ad_revenue",
        "other_revenue",
        "payment_fees",
        "hosting",
        "streaming",
        "storage",
        "email",
        "tools",
        "other_cost",
      ],
      home_section_source: [
        "popular",
        "new",
        "collection",
        "filter",
        "continue_watching",
        "watchlist",
        "recommended",
        "coming_soon",
      ],
      license_status: ["draft", "pending_signature", "signed", "suspended", "terminated"],
      license_type: [
        "owned_production",
        "exclusive_license",
        "non_exclusive_license",
        "public_domain_verified",
        "open_license",
        "promotional",
      ],
      media_kind: ["main", "trailer", "extra"],
      media_provider: ["cloudflare_stream", "dev_local"],
      media_status: ["pending_upload", "processing", "ready", "error", "deleted"],
      payment_event_status: ["received", "processing", "processed", "ignored", "failed"],
      plan_tier: ["free", "founder", "standard", "premium"],
      publication_status: [
        "draft",
        "in_review",
        "announced",
        "published",
        "unpublished",
        "archived",
      ],
      request_content_type: ["film", "series", "documentary", "short", "show", "other"],
      request_status: [
        "received",
        "under_review",
        "rights_search",
        "negotiation",
        "acquisition_confirmed",
        "publication_planned",
        "available",
        "rejected",
        "impossible",
      ],
      subscription_status: [
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "paused",
      ],
      title_kind: ["film", "series", "documentary", "short", "show", "interview"],
      title_structure: ["single", "episodic"],
    },
  },
} as const;
