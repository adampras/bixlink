export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      bix_allocations: {
        Row: {
          amount_bix: number
          created_at: string
          created_by: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount_bix: number
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount_bix?: number
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bix_announcements: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bix_buyback_details: {
        Row: {
          contact_method: string
          contact_value: string
          created_at: string
          review_note: string | null
          reviewed_by: string | null
          source: Json
          swap_id: string
          user_id: string
        }
        Insert: {
          contact_method: string
          contact_value: string
          created_at?: string
          review_note?: string | null
          reviewed_by?: string | null
          source?: Json
          swap_id: string
          user_id: string
        }
        Update: {
          contact_method?: string
          contact_value?: string
          created_at?: string
          review_note?: string | null
          reviewed_by?: string | null
          source?: Json
          swap_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bix_buyback_details_swap_id_fkey"
            columns: ["swap_id"]
            isOneToOne: true
            referencedRelation: "swap_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      bix_clone_accounts: {
        Row: {
          created_at: string
          created_by: string
          email: string
          label: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          label: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_growth_control: {
        Row: {
          activity_enabled: boolean
          circuit_enabled: boolean
          flash_enabled: boolean
          flash_ends_at: string | null
          flash_title: string
          freeze_reason: string | null
          frozen: boolean
          id: number
          radar_enabled: boolean
          threshold_usd: number
          updated_at: string
          window_minutes: number
        }
        Insert: {
          activity_enabled?: boolean
          circuit_enabled?: boolean
          flash_enabled?: boolean
          flash_ends_at?: string | null
          flash_title?: string
          freeze_reason?: string | null
          frozen?: boolean
          id?: number
          radar_enabled?: boolean
          threshold_usd?: number
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          activity_enabled?: boolean
          circuit_enabled?: boolean
          flash_enabled?: boolean
          flash_ends_at?: string | null
          flash_title?: string
          freeze_reason?: string | null
          frozen?: boolean
          id?: number
          radar_enabled?: boolean
          threshold_usd?: number
          updated_at?: string
          window_minutes?: number
        }
        Relationships: []
      }
      bix_leaders: {
        Row: {
          created_at: string
          loan_package_id: string | null
          require_turnover: boolean
          reviewed_at: string | null
          scope: string
          status: string
          support_kind: string
          turnover_multiple: number
          user_id: string
          virtual_usd: number
        }
        Insert: {
          created_at?: string
          loan_package_id?: string | null
          require_turnover?: boolean
          reviewed_at?: string | null
          scope?: string
          status?: string
          support_kind?: string
          turnover_multiple?: number
          user_id: string
          virtual_usd?: number
        }
        Update: {
          created_at?: string
          loan_package_id?: string | null
          require_turnover?: boolean
          reviewed_at?: string | null
          scope?: string
          status?: string
          support_kind?: string
          turnover_multiple?: number
          user_id?: string
          virtual_usd?: number
        }
        Relationships: []
      }
      bix_loan_devices: {
        Row: {
          created_at: string
          device_label: string
          fingerprint: string
          ip_address: string | null
          last_ip: string | null
          last_seen_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string
          fingerprint: string
          ip_address?: string | null
          last_ip?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string
          fingerprint?: string
          ip_address?: string | null
          last_ip?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bix_member_products: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          order_url: string | null
          price_usd: number
          review_note: string | null
          reviewed_at: string | null
          seller_tier: string
          status: string
          studio: string
          terms_accepted_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          order_url?: string | null
          price_usd: number
          review_note?: string | null
          reviewed_at?: string | null
          seller_tier?: string
          status?: string
          studio?: string
          terms_accepted_at?: string | null
          title: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          order_url?: string | null
          price_usd?: number
          review_note?: string | null
          reviewed_at?: string | null
          seller_tier?: string
          status?: string
          studio?: string
          terms_accepted_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_mining_accounts: {
        Row: {
          settled_at: string
          started_at: string
          user_id: string
        }
        Insert: {
          settled_at?: string
          started_at?: string
          user_id: string
        }
        Update: {
          settled_at?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_mining_conversions: {
        Row: {
          allocation_id: string
          amount_bix: number
          amount_vbix: number
          created_at: string
          id: string
          user_id: string
          vbix_per_bix: number
        }
        Insert: {
          allocation_id: string
          amount_bix: number
          amount_vbix: number
          created_at?: string
          id?: string
          user_id: string
          vbix_per_bix: number
        }
        Update: {
          allocation_id?: string
          amount_bix?: number
          amount_vbix?: number
          created_at?: string
          id?: string
          user_id?: string
          vbix_per_bix?: number
        }
        Relationships: [
          {
            foreignKeyName: "bix_mining_conversions_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "bix_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      bix_network_leaders: {
        Row: {
          assigned_by: string
          created_at: string
          kind: string
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          kind: string
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          kind?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_nft_cards: {
        Row: {
          artwork_id: string | null
          artwork_image_path: string | null
          created_at: string
          id: string
          lock_days: number
          package_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          sale_bix: number | null
          sale_price_usd: number | null
          sale_requested_at: string | null
          serial: number
          stake_id: string
          status: string
          tier: string
          user_id: string
          value_usd: number
        }
        Insert: {
          artwork_id?: string | null
          artwork_image_path?: string | null
          created_at?: string
          id?: string
          lock_days: number
          package_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_bix?: number | null
          sale_price_usd?: number | null
          sale_requested_at?: string | null
          serial?: number
          stake_id: string
          status?: string
          tier: string
          user_id: string
          value_usd: number
        }
        Update: {
          artwork_id?: string | null
          artwork_image_path?: string | null
          created_at?: string
          id?: string
          lock_days?: number
          package_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_bix?: number | null
          sale_price_usd?: number | null
          sale_requested_at?: string | null
          serial?: number
          stake_id?: string
          status?: string
          tier?: string
          user_id?: string
          value_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "bix_nft_cards_stake_id_fkey"
            columns: ["stake_id"]
            isOneToOne: true
            referencedRelation: "stakes"
            referencedColumns: ["id"]
          },
        ]
      }
      bix_notify_log: {
        Row: {
          created_at: string
          event_key: string
        }
        Insert: {
          created_at?: string
          event_key: string
        }
        Update: {
          created_at?: string
          event_key?: string
        }
        Relationships: []
      }
      bix_owner_deposit_wallets: {
        Row: {
          address: string
          asset: string
          code: string
          enabled: boolean
          label: string
          network: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          address?: string
          asset?: string
          code: string
          enabled?: boolean
          label?: string
          network?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          asset?: string
          code?: string
          enabled?: boolean
          label?: string
          network?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      bix_owner_revenue: {
        Row: {
          address: string | null
          amount_usd: number
          created_at: string
          id: string
          member_id: string
          network: string | null
          owner_id: string | null
          tx_hash: string | null
          tx_id: string
          wallet_code: string | null
        }
        Insert: {
          address?: string | null
          amount_usd: number
          created_at?: string
          id?: string
          member_id: string
          network?: string | null
          owner_id?: string | null
          tx_hash?: string | null
          tx_id: string
          wallet_code?: string | null
        }
        Update: {
          address?: string | null
          amount_usd?: number
          created_at?: string
          id?: string
          member_id?: string
          network?: string | null
          owner_id?: string | null
          tx_hash?: string | null
          tx_id?: string
          wallet_code?: string | null
        }
        Relationships: []
      }
      bix_p2p_fills: {
        Row: {
          amount_bix: number
          buyer_id: string
          created_at: string
          id: string
          offer_id: string
          price_usd: number
          seller_id: string
          total_usd: number
        }
        Insert: {
          amount_bix: number
          buyer_id: string
          created_at?: string
          id?: string
          offer_id: string
          price_usd: number
          seller_id: string
          total_usd: number
        }
        Update: {
          amount_bix?: number
          buyer_id?: string
          created_at?: string
          id?: string
          offer_id?: string
          price_usd?: number
          seller_id?: string
          total_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "bix_p2p_fills_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "bix_p2p_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      bix_p2p_offers: {
        Row: {
          amount_bix: number
          created_at: string
          id: string
          price_usd: number
          remaining_bix: number
          side: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_bix: number
          created_at?: string
          id?: string
          price_usd: number
          remaining_bix: number
          side: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_bix?: number
          created_at?: string
          id?: string
          price_usd?: number
          remaining_bix?: number
          side?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_presale_orders: {
        Row: {
          bix_amount: number
          bonus_bix: number
          created_at: string
          dividend_daily_usd: number
          genesis_serial: number
          id: string
          package_usd: number
          release_days: number
          sponsor_bix: number
          sponsor_id: string | null
          status: string
          strategy: string
          user_id: string
        }
        Insert: {
          bix_amount: number
          bonus_bix?: number
          created_at?: string
          dividend_daily_usd?: number
          genesis_serial?: number
          id?: string
          package_usd: number
          release_days: number
          sponsor_bix?: number
          sponsor_id?: string | null
          status?: string
          strategy?: string
          user_id: string
        }
        Update: {
          bix_amount?: number
          bonus_bix?: number
          created_at?: string
          dividend_daily_usd?: number
          genesis_serial?: number
          id?: string
          package_usd?: number
          release_days?: number
          sponsor_bix?: number
          sponsor_id?: string | null
          status?: string
          strategy?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_profit_claims: {
        Row: {
          bix_amount: number
          created_at: string
          id: string
          price_usd: number
          profit_usd: number
          stake_id: string
          usdt_amount: number
          user_id: string
        }
        Insert: {
          bix_amount: number
          created_at?: string
          id?: string
          price_usd: number
          profit_usd: number
          stake_id: string
          usdt_amount: number
          user_id: string
        }
        Update: {
          bix_amount?: number
          created_at?: string
          id?: string
          price_usd?: number
          profit_usd?: number
          stake_id?: string
          usdt_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bix_profit_claims_stake_id_fkey"
            columns: ["stake_id"]
            isOneToOne: false
            referencedRelation: "stakes"
            referencedColumns: ["id"]
          },
        ]
      }
      bix_quest_claims: {
        Row: {
          amount_vbix: number
          created_at: string
          id: string
          period_key: string
          quest_key: string
          user_id: string
        }
        Insert: {
          amount_vbix: number
          created_at?: string
          id?: string
          period_key: string
          quest_key: string
          user_id: string
        }
        Update: {
          amount_vbix?: number
          created_at?: string
          id?: string
          period_key?: string
          quest_key?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_referral_bonuses: {
        Row: {
          amount_bix: number
          created_at: string
          id: string
          member_id: string
          rate_pct: number
          referrer_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          stake_id: string
          status: string
        }
        Insert: {
          amount_bix: number
          created_at?: string
          id?: string
          member_id: string
          rate_pct: number
          referrer_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          stake_id: string
          status?: string
        }
        Update: {
          amount_bix?: number
          created_at?: string
          id?: string
          member_id?: string
          rate_pct?: number
          referrer_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          stake_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bix_referral_bonuses_stake_id_fkey"
            columns: ["stake_id"]
            isOneToOne: true
            referencedRelation: "bix_stakes"
            referencedColumns: ["id"]
          },
        ]
      }
      bix_season_prizes: {
        Row: {
          amount_bix: number
          created_at: string
          id: string
          points: number
          rank: number
          reviewed_at: string | null
          reviewed_by: string | null
          season: string
          status: string
          user_id: string
        }
        Insert: {
          amount_bix: number
          created_at?: string
          id?: string
          points: number
          rank: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          season: string
          status?: string
          user_id: string
        }
        Update: {
          amount_bix?: number
          created_at?: string
          id?: string
          points?: number
          rank?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          season?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_shop_orders: {
        Row: {
          address: string
          city: string
          country: string
          courier: string
          created_at: string
          id: string
          items: Json
          phone: string
          postal_code: string
          recipient: string
          region: string
          shipping_usd: number
          status: string
          subtotal_usd: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          city: string
          country: string
          courier: string
          created_at?: string
          id?: string
          items: Json
          phone: string
          postal_code: string
          recipient: string
          region: string
          shipping_usd: number
          status?: string
          subtotal_usd: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          city?: string
          country?: string
          courier?: string
          created_at?: string
          id?: string
          items?: Json
          phone?: string
          postal_code?: string
          recipient?: string
          region?: string
          shipping_usd?: number
          status?: string
          subtotal_usd?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_stake_profit_withdrawals: {
        Row: {
          amount_bix: number
          amount_usdt: number
          asset: string
          created_at: string
          id: string
          price_usd: number
          stake_id: string
          user_id: string
        }
        Insert: {
          amount_bix: number
          amount_usdt?: number
          asset: string
          created_at?: string
          id?: string
          price_usd: number
          stake_id: string
          user_id: string
        }
        Update: {
          amount_bix?: number
          amount_usdt?: number
          asset?: string
          created_at?: string
          id?: string
          price_usd?: number
          stake_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bix_stake_profit_withdrawals_stake_id_fkey"
            columns: ["stake_id"]
            isOneToOne: false
            referencedRelation: "bix_stakes"
            referencedColumns: ["id"]
          },
        ]
      }
      bix_stakes: {
        Row: {
          amount_bix: number
          apy: number
          created_at: string
          ended_at: string | null
          id: string
          lock_days: number
          penalty_bix: number
          status: string
          user_id: string
        }
        Insert: {
          amount_bix: number
          apy: number
          created_at?: string
          ended_at?: string | null
          id?: string
          lock_days: number
          penalty_bix?: number
          status?: string
          user_id: string
        }
        Update: {
          amount_bix?: number
          apy?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          lock_days?: number
          penalty_bix?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_studio_config: {
        Row: {
          costs: Json
          credit_usd: number
          daily_limit: number
          enabled: boolean
          features: Json
          id: number
          members_enabled: boolean
          prices: Json
          updated_at: string
        }
        Insert: {
          costs?: Json
          credit_usd?: number
          daily_limit?: number
          enabled?: boolean
          features?: Json
          id?: number
          members_enabled?: boolean
          prices?: Json
          updated_at?: string
        }
        Update: {
          costs?: Json
          credit_usd?: number
          daily_limit?: number
          enabled?: boolean
          features?: Json
          id?: number
          members_enabled?: boolean
          prices?: Json
          updated_at?: string
        }
        Relationships: []
      }
      bix_studio_ledger: {
        Row: {
          cost_credits: number
          created_at: string
          created_by: string | null
          credits: number
          feature: string | null
          id: string
          kind: string
          note: string | null
          paid_usd: number
          ref_id: string | null
          user_id: string
        }
        Insert: {
          cost_credits?: number
          created_at?: string
          created_by?: string | null
          credits: number
          feature?: string | null
          id?: string
          kind: string
          note?: string | null
          paid_usd?: number
          ref_id?: string | null
          user_id: string
        }
        Update: {
          cost_credits?: number
          created_at?: string
          created_by?: string | null
          credits?: number
          feature?: string | null
          id?: string
          kind?: string
          note?: string | null
          paid_usd?: number
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bix_team_accounts: {
        Row: {
          active: boolean
          created_at: string
          email: string
          label: string
          region: string
          sponsor_id: string | null
          team_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          label: string
          region?: string
          sponsor_id?: string | null
          team_role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          label?: string
          region?: string
          sponsor_id?: string | null
          team_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_transfers: {
        Row: {
          amount_bix: number
          created_at: string
          id: string
          note: string | null
          recipient_code: string
          recipient_id: string
          reversed_at: string | null
          sender_code: string
          sender_id: string
          status: string
        }
        Insert: {
          amount_bix: number
          created_at?: string
          id?: string
          note?: string | null
          recipient_code: string
          recipient_id: string
          reversed_at?: string | null
          sender_code: string
          sender_id: string
          status?: string
        }
        Update: {
          amount_bix?: number
          created_at?: string
          id?: string
          note?: string | null
          recipient_code?: string
          recipient_id?: string
          reversed_at?: string | null
          sender_code?: string
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      bix_usdt_network_bonuses: {
        Row: {
          base_usd: number
          bix_amount: number
          bix_price_usd: number
          bonus_date: string
          created_at: string
          id: string
          kind: string
          level: number
          member_id: string
          rate_pct: number
          source_stake_id: string
          total_usd: number
          usdt_amount: number
          user_id: string
        }
        Insert: {
          base_usd: number
          bix_amount: number
          bix_price_usd: number
          bonus_date?: string
          created_at?: string
          id?: string
          kind: string
          level?: number
          member_id: string
          rate_pct: number
          source_stake_id: string
          total_usd: number
          usdt_amount: number
          user_id: string
        }
        Update: {
          base_usd?: number
          bix_amount?: number
          bix_price_usd?: number
          bonus_date?: string
          created_at?: string
          id?: string
          kind?: string
          level?: number
          member_id?: string
          rate_pct?: number
          source_stake_id?: string
          total_usd?: number
          usdt_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bix_usdt_network_bonuses_source_stake_id_fkey"
            columns: ["source_stake_id"]
            isOneToOne: false
            referencedRelation: "stakes"
            referencedColumns: ["id"]
          },
        ]
      }
      bix_vbix_ledger: {
        Row: {
          amount_vbix: number
          created_at: string
          id: string
          kind: string
          level: number
          source_user: string
          user_id: string
        }
        Insert: {
          amount_vbix: number
          created_at?: string
          id?: string
          kind: string
          level?: number
          source_user: string
          user_id: string
        }
        Update: {
          amount_vbix?: number
          created_at?: string
          id?: string
          kind?: string
          level?: number
          source_user?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_vip_rewards: {
        Row: {
          amount_bix: number
          created_at: string
          id: string
          level: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_usd: number
          team_sales_usd: number
          user_id: string
        }
        Insert: {
          amount_bix: number
          created_at?: string
          id?: string
          level: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_usd: number
          team_sales_usd: number
          user_id: string
        }
        Update: {
          amount_bix?: number
          created_at?: string
          id?: string
          level?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_usd?: number
          team_sales_usd?: number
          user_id?: string
        }
        Relationships: []
      }
      bix_wallet_challenges: {
        Row: {
          address: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          message: string
          origin: string
          purpose: string
          referral_code: string | null
          user_id: string | null
        }
        Insert: {
          address: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id: string
          message: string
          origin: string
          purpose: string
          referral_code?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          message?: string
          origin?: string
          purpose?: string
          referral_code?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bix_wallet_identities: {
        Row: {
          address: string
          chain_id: number
          created_at: string
          user_id: string
        }
        Insert: {
          address: string
          chain_id?: number
          created_at?: string
          user_id: string
        }
        Update: {
          address?: string
          chain_id?: number
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_zoom_claims: {
        Row: {
          amount_bix: number
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          session_key: string
          status: string
          user_id: string
        }
        Insert: {
          amount_bix: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_key: string
          status?: string
          user_id: string
        }
        Update: {
          amount_bix?: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_key?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_zoom_config: {
        Row: {
          enabled: boolean
          id: number
          passcode: string | null
          reward_bix: number
          schedule: string | null
          session_key: string
          terms: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          enabled?: boolean
          id?: number
          passcode?: string | null
          reward_bix?: number
          schedule?: string | null
          session_key?: string
          terms?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          enabled?: boolean
          id?: number
          passcode?: string | null
          reward_bix?: number
          schedule?: string | null
          session_key?: string
          terms?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      deposit_intents: {
        Row: {
          address: string
          amount_exact: number
          claim_tx_id: string | null
          claimed_at: string | null
          created_at: string
          credited_at: string | null
          expires_at: string
          id: string
          network: string
          status: string
          tx_hash: string | null
          user_id: string
          wallet_code: string
        }
        Insert: {
          address: string
          amount_exact: number
          claim_tx_id?: string | null
          claimed_at?: string | null
          created_at?: string
          credited_at?: string | null
          expires_at?: string
          id?: string
          network: string
          status?: string
          tx_hash?: string | null
          user_id: string
          wallet_code: string
        }
        Update: {
          address?: string
          amount_exact?: number
          claim_tx_id?: string | null
          claimed_at?: string | null
          created_at?: string
          credited_at?: string | null
          expires_at?: string
          id?: string
          network?: string
          status?: string
          tx_hash?: string | null
          user_id?: string
          wallet_code?: string
        }
        Relationships: []
      }
      income_sources: {
        Row: {
          amount_usd: number
          category: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          amount_usd?: number
          category: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          amount_usd?: number
          category?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          country: string
          created_at: string
          document_last4: string
          document_type: string
          full_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country: string
          created_at?: string
          document_last4: string
          document_type: string
          full_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string
          created_at?: string
          document_last4?: string
          document_type?: string
          full_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      owner_bix_vault: {
        Row: {
          balance_bix: number
          generated_at: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          balance_bix?: number
          generated_at?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          balance_bix?: number
          generated_at?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          apy: number
          clone_of: string | null
          daily_profit_enabled: boolean
          duration_apys: Json
          enabled: boolean
          id: string
          lock_days: number
          price_usd: number
          retired: boolean
        }
        Insert: {
          apy: number
          clone_of?: string | null
          daily_profit_enabled?: boolean
          duration_apys?: Json
          enabled?: boolean
          id: string
          lock_days: number
          price_usd: number
          retired?: boolean
        }
        Update: {
          apy?: number
          clone_of?: string | null
          daily_profit_enabled?: boolean
          duration_apys?: Json
          enabled?: boolean
          id?: string
          lock_days?: number
          price_usd?: number
          retired?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          user_id: string
          username: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          user_id: string
          username: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          user_id?: string
          username?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          referred_by: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          referred_by?: string | null
          user_id?: string
        }
        Update: {
          code?: string
          created_at?: string
          referred_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stakes: {
        Row: {
          activated_at: string | null
          amount_usd: number
          apy: number
          bix_paid: number
          bix_price_usd: number | null
          compound: boolean
          created_at: string
          funded_vusdt: boolean
          id: string
          lock_days: number
          package_id: string
          payment_mode: string
          penalty_pct: number
          refund_usd: number
          status: string
          unstaked_at: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          amount_usd: number
          apy: number
          bix_paid?: number
          bix_price_usd?: number | null
          compound?: boolean
          created_at?: string
          funded_vusdt?: boolean
          id?: string
          lock_days: number
          package_id: string
          payment_mode?: string
          penalty_pct?: number
          refund_usd?: number
          status?: string
          unstaked_at?: string | null
          user_id?: string
        }
        Update: {
          activated_at?: string | null
          amount_usd?: number
          apy?: number
          bix_paid?: number
          bix_price_usd?: number | null
          compound?: boolean
          created_at?: string
          funded_vusdt?: boolean
          id?: string
          lock_days?: number
          package_id?: string
          payment_mode?: string
          penalty_pct?: number
          refund_usd?: number
          status?: string
          unstaked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakes_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      swap_requests: {
        Row: {
          amount_in: number
          amount_out: number
          channel: string
          created_at: string
          direction: string
          id: string
          price_usd: number
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_in: number
          amount_out: number
          channel?: string
          created_at?: string
          direction: string
          id?: string
          price_usd?: number
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Update: {
          amount_in?: number
          amount_out?: number
          channel?: string
          created_at?: string
          direction?: string
          id?: string
          price_usd?: number
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      vusdt_transfers: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          note: string | null
          recipient_code: string
          recipient_id: string
          sender_code: string
          sender_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          note?: string | null
          recipient_code: string
          recipient_id: string
          sender_code: string
          sender_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          note?: string | null
          recipient_code?: string
          recipient_id?: string
          sender_code?: string
          sender_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          address: string | null
          amount_usd: number
          created_at: string
          fee_usd: number
          id: string
          net_usd: number
          network: string | null
          note: string | null
          reviewed_at: string | null
          reward_rate_pct: number | null
          source_stake_id: string | null
          status: string
          tx_hash: string | null
          type: string
          user_id: string
          verified_at: string | null
          wallet_code: string | null
        }
        Insert: {
          address?: string | null
          amount_usd: number
          created_at?: string
          fee_usd?: number
          id?: string
          net_usd: number
          network?: string | null
          note?: string | null
          reviewed_at?: string | null
          reward_rate_pct?: number | null
          source_stake_id?: string | null
          status?: string
          tx_hash?: string | null
          type: string
          user_id?: string
          verified_at?: string | null
          wallet_code?: string | null
        }
        Update: {
          address?: string | null
          amount_usd?: number
          created_at?: string
          fee_usd?: number
          id?: string
          net_usd?: number
          network?: string | null
          note?: string | null
          reviewed_at?: string | null
          reward_rate_pct?: number | null
          source_stake_id?: string | null
          status?: string
          tx_hash?: string | null
          type?: string
          user_id?: string
          verified_at?: string | null
          wallet_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_source_stake_id_fkey"
            columns: ["source_stake_id"]
            isOneToOne: false
            referencedRelation: "stakes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_bix_leader: {
        Args: {
          p_code: string
          p_require: boolean
          p_scope: string
          p_virtual: number
        }
        Returns: string
      }
      admin_review_bix_leader: {
        Args: {
          p_require: boolean
          p_status: string
          p_user: string
          p_virtual: number
        }
        Returns: undefined
      }
      apply_bix_leader: { Args: never; Returns: undefined }
      assign_bix_referrer: { Args: { p_code: string }; Returns: boolean }
      bix_arena_admin_config: { Args: never; Returns: Json }
      bix_arena_config: { Args: never; Returns: Json }
      bix_arena_save: { Args: { p_config: Json }; Returns: undefined }
      bix_arena_streak: { Args: { p_user: string }; Returns: number }
      bix_asset_balances: {
        Args: { p_user: string }
        Returns: {
          bix_balance: number
          usdt_balance: number
        }[]
      }
      bix_booster_withdraw_config: { Args: never; Returns: Json }
      bix_buyback_request: {
        Args: { p_amount: number; p_contact: string; p_method: string }
        Returns: string
      }
      bix_buyback_review: {
        Args: { p_approve: boolean; p_id: string; p_note: string }
        Returns: undefined
      }
      bix_buyback_source: { Args: { p_user: string }; Returns: Json }
      bix_can_manage_packages: { Args: never; Returns: boolean }
      bix_claim_conditional_leader: {
        Args: { p_days: number; p_package: string }
        Returns: Json
      }
      bix_claim_stake_profit: { Args: never; Returns: Json }
      bix_claim_vip: { Args: { p_level: number }; Returns: string }
      bix_consume_wallet_challenge: {
        Args: {
          p_id: string
          p_origin: string
          p_purpose: string
          p_user_id?: string
        }
        Returns: {
          address: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          message: string
          origin: string
          purpose: string
          referral_code: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "bix_wallet_challenges"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      bix_content_published: { Args: { p_name: string }; Returns: boolean }
      bix_deposit_owner: { Args: { p_user: string }; Returns: string }
      bix_edit_duration_package: {
        Args: {
          p_apys: Json
          p_enabled: boolean
          p_id: string
          p_price: number
        }
        Returns: undefined
      }
      bix_feature_enabled: { Args: { p_feature: string }; Returns: boolean }
      bix_find_user_by_email: { Args: { p_email: string }; Returns: string }
      bix_grant_welcome: { Args: { p_user: string }; Returns: undefined }
      bix_growth_excluded: { Args: { p_user: string }; Returns: boolean }
      bix_growth_radar: { Args: never; Returns: Json }
      bix_growth_scope_report: { Args: never; Returns: Json }
      bix_growth_snapshot: { Args: never; Returns: Json }
      bix_has_real_verified_email: {
        Args: { p_user: string }
        Returns: boolean
      }
      bix_in_owner1_network: { Args: never; Returns: boolean }
      bix_leader_status: { Args: { p_user: string }; Returns: Json }
      bix_leaderboard: {
        Args: { p_season?: string }
        Returns: {
          is_me: boolean
          member: string
          points: number
          rank: number
        }[]
      }
      bix_loan_device_check: {
        Args: {
          p_bind: boolean
          p_fp: string
          p_ip: string
          p_label: string
          p_ua: string
        }
        Returns: Json
      }
      bix_loan_device_reset: { Args: { p_user: string }; Returns: undefined }
      bix_loan_package_config: { Args: never; Returns: Json }
      bix_loan_package_save: { Args: { p_config: Json }; Returns: Json }
      bix_loan_quota: { Args: { p_sponsor: string }; Returns: Json }
      bix_member_shop_slots: { Args: { p_user: string }; Returns: number }
      bix_merchant_tier: { Args: { p_user: string }; Returns: string }
      bix_mining_conversion_status: { Args: never; Returns: Json }
      bix_mining_convert: { Args: never; Returns: Json }
      bix_mining_rate: { Args: { p_user: string }; Returns: number }
      bix_mining_settle: { Args: never; Returns: Json }
      bix_mining_start: { Args: never; Returns: Json }
      bix_mining_status: { Args: never; Returns: Json }
      bix_my_deposit_wallets: { Args: never; Returns: Json }
      bix_network_bix_metrics: { Args: never; Returns: Json }
      bix_network_bonus_split: {
        Args: { p_total: number }
        Returns: Record<string, unknown>
      }
      bix_nft_review: {
        Args: { p_approve: boolean; p_card: string }
        Returns: undefined
      }
      bix_nft_sell: { Args: { p_card: string }; Returns: Json }
      bix_nft_tier: { Args: { p_days: number; p_usd: number }; Returns: string }
      bix_owner_vault: { Args: never; Returns: Json }
      bix_owner_wallet_save: {
        Args: {
          p_address: string
          p_asset: string
          p_enabled: boolean
          p_label: string
          p_network: string
        }
        Returns: string
      }
      bix_p2p_bix_delta: { Args: { p_user: string }; Returns: number }
      bix_p2p_cancel: { Args: { p_offer: string }; Returns: undefined }
      bix_p2p_post: {
        Args: { p_amount: number; p_price: number; p_side: string }
        Returns: string
      }
      bix_p2p_take: {
        Args: { p_amount: number; p_offer: string }
        Returns: string
      }
      bix_p2p_usdt_delta: { Args: { p_user: string }; Returns: number }
      bix_pay_lookup: { Args: { p_code: string }; Returns: boolean }
      bix_pay_send: {
        Args: { p_amount: number; p_code: string; p_note: string }
        Returns: string
      }
      bix_presale_buy: { Args: { p_usd: number }; Returns: Json }
      bix_presale_buy_strategy: {
        Args: { p_strategy: string; p_usd: number }
        Returns: Json
      }
      bix_presale_config: { Args: never; Returns: Json }
      bix_presale_dividend: { Args: { p_user: string }; Returns: number }
      bix_presale_paid: { Args: { p_user: string }; Returns: number }
      bix_presale_save: { Args: { p_config: Json }; Returns: Json }
      bix_presale_status: { Args: never; Returns: Json }
      bix_profit_claimed: {
        Args: never
        Returns: {
          profit_usd: number
          stake_id: string
        }[]
      }
      bix_provision_wallet_member: {
        Args: { p_address: string; p_referral?: string; p_user: string }
        Returns: undefined
      }
      bix_public_activity: {
        Args: never
        Returns: {
          amount_usd: number
          created_at: string
          dial: string
          kind: string
        }[]
      }
      bix_public_home_stats: { Args: never; Returns: Json }
      bix_quest_claim: {
        Args: { p_answer?: number; p_key: string }
        Returns: Json
      }
      bix_quest_status: { Args: never; Returns: Json }
      bix_referral_tree: {
        Args: never
        Returns: {
          depth: number
          parent_id: string
          user_id: string
        }[]
      }
      bix_referral_tree_metrics: {
        Args: never
        Returns: {
          depth: number
          full_name: string
          member_code: string
          parent_id: string
          stake_value_usd: number
          top_package: string
          total_turnover_usd: number
          user_id: string
          username: string
          weekly_direct_count: number
          weekly_qualified: boolean
          weekly_reward_usd: number
          weekly_stake_usd: number
          weekly_turnover_usd: number
        }[]
      }
      bix_review_referral_bonus: {
        Args: { p_approve: boolean; p_bonus: string }
        Returns: undefined
      }
      bix_review_season_prize: {
        Args: { p_approve: boolean; p_id: string }
        Returns: undefined
      }
      bix_review_vip: {
        Args: { p_approve: boolean; p_reward: string }
        Returns: undefined
      }
      bix_reviewer_can: { Args: { p_section: string }; Returns: boolean }
      bix_reviewer_save_wallet: { Args: { p_wallet: Json }; Returns: undefined }
      bix_reviewer_update_setting: {
        Args: { p_key: string; p_value: Json }
        Returns: undefined
      }
      bix_season_close: { Args: { p_season: string }; Returns: number }
      bix_set_stake_compound: {
        Args: { p_on: boolean; p_stake: string }
        Returns: undefined
      }
      bix_settle_matching_daily: { Args: { p_day?: string }; Returns: number }
      bix_stake_apy: {
        Args: { p_amount: number; p_days: number }
        Returns: number
      }
      bix_stake_bix: {
        Args: { p_amount: number; p_days: number }
        Returns: string
      }
      bix_staking_skin_admin: { Args: never; Returns: Json }
      bix_staking_skin_for_me: { Args: never; Returns: boolean }
      bix_staking_skin_save: {
        Args: { p_codes: string[]; p_enabled: boolean }
        Returns: Json
      }
      bix_studio_grant: {
        Args: {
          p_code: string
          p_credits: number
          p_note: string
          p_paid_usd: number
        }
        Returns: string
      }
      bix_studio_refund: { Args: { p_entry: string }; Returns: undefined }
      bix_studio_report: { Args: never; Returns: Json }
      bix_studio_save: { Args: { p: Json }; Returns: undefined }
      bix_studio_spend: { Args: { p_feature: string }; Returns: Json }
      bix_studio_status: { Args: never; Returns: Json }
      bix_team_sales_usd: { Args: { p_user: string }; Returns: number }
      bix_unstake: { Args: { p_stake: string }; Returns: Json }
      bix_unstake_bix: { Args: { p_stake: string }; Returns: number }
      bix_unstake_penalty: {
        Args: { p_days: number; p_lock: number }
        Returns: number
      }
      bix_username_available: { Args: { p_username: string }; Returns: boolean }
      bix_vip_status: { Args: never; Returns: Json }
      bix_vip_tiers: {
        Args: never
        Returns: {
          level: number
          reward_bix: number
          target_usd: number
        }[]
      }
      bix_vusdt_balance: { Args: { p_user: string }; Returns: number }
      bix_vusdt_component: { Args: { p_user: string }; Returns: number }
      bix_vusdt_send: {
        Args: { p_amount: number; p_code: string; p_note: string }
        Returns: string
      }
      bix_wallet_balance: { Args: { p_user: string }; Returns: number }
      bix_withdraw_stake_profit: {
        Args: { p_asset: string; p_stake: string }
        Returns: Json
      }
      bix_zoom_admin: { Args: never; Returns: Json }
      bix_zoom_claim: { Args: { p_code: string }; Returns: string }
      bix_zoom_public: { Args: never; Returns: Json }
      bix_zoom_review: {
        Args: { p_approve: boolean; p_claim: string }
        Returns: undefined
      }
      bix_zoom_save: { Args: { p: Json }; Returns: undefined }
      ensure_bix_profile: { Args: never; Returns: undefined }
      is_bix_admin: { Args: never; Returns: boolean }
      request_bix_deposit: {
        Args: { p_amount: number; p_tx_hash: string }
        Returns: string
      }
      request_bix_duration_stake: {
        Args: { p_days: number; p_package: string }
        Returns: string
      }
      request_bix_duration_stake_mode: {
        Args: { p_days: number; p_mode: string; p_package: string }
        Returns: string
      }
      request_bix_stake: { Args: { p_package: string }; Returns: string }
      request_bix_swap: {
        Args: { p_amount: number; p_direction: string }
        Returns: string
      }
      request_bix_withdraw: {
        Args: { p_address: string; p_amount: number }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
