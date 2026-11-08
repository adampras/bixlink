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
      bix_agency_applications: {
        Row: {
          city: string | null
          commitment_usd: number
          contact: string
          country: string
          created_at: string
          id: string
          license_no: string | null
          note: string | null
          reviewed_at: string | null
          status: string
          tier: string
          user_id: string
        }
        Insert: {
          city?: string | null
          commitment_usd: number
          contact: string
          country: string
          created_at?: string
          id?: string
          license_no?: string | null
          note?: string | null
          reviewed_at?: string | null
          status?: string
          tier: string
          user_id: string
        }
        Update: {
          city?: string | null
          commitment_usd?: number
          contact?: string
          country?: string
          created_at?: string
          id?: string
          license_no?: string | null
          note?: string | null
          reviewed_at?: string | null
          status?: string
          tier?: string
          user_id?: string
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
      bix_call_rooms: {
        Row: {
          code: string
          created_at: string
          host_id: string
          id: string
          status: string
          title: string
          video: boolean
        }
        Insert: {
          code: string
          created_at?: string
          host_id: string
          id?: string
          status?: string
          title: string
          video?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          host_id?: string
          id?: string
          status?: string
          title?: string
          video?: boolean
        }
        Relationships: []
      }
      bix_calls: {
        Row: {
          answered_at: string | null
          callee_id: string
          caller_id: string
          created_at: string
          ended_at: string | null
          id: string
          kind: string
          rang_at: string | null
          status: string
        }
        Insert: {
          answered_at?: string | null
          callee_id: string
          caller_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          kind?: string
          rang_at?: string | null
          status?: string
        }
        Update: {
          answered_at?: string | null
          callee_id?: string
          caller_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          kind?: string
          rang_at?: string | null
          status?: string
        }
        Relationships: []
      }
      bix_chat_presence: {
        Row: {
          last_seen: string
          typing_at: string | null
          typing_to: string | null
          user_id: string
        }
        Insert: {
          last_seen?: string
          typing_at?: string | null
          typing_to?: string | null
          user_id: string
        }
        Update: {
          last_seen?: string
          typing_at?: string | null
          typing_to?: string | null
          user_id?: string
        }
        Relationships: []
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
      bix_deposit_owner1_lock: {
        Row: {
          created_at: string
          locked_by: string
          user_id: string
        }
        Insert: {
          created_at?: string
          locked_by: string
          user_id: string
        }
        Update: {
          created_at?: string
          locked_by?: string
          user_id?: string
        }
        Relationships: []
      }
      bix_deposit_quota_routes: {
        Row: {
          created_at: string
          created_by: string
          max_direct: number
          sponsor_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          max_direct?: number
          sponsor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          max_direct?: number
          sponsor_id?: string
        }
        Relationships: []
      }
      bix_fleet_orders: {
        Row: {
          address: string
          bix: number
          created_at: string
          credited_at: string | null
          id: string
          merchant: string
          note: string | null
          price: number
          status: string
          tx_hash: string
          usdt: number
          user_id: string
          wallet_code: string
        }
        Insert: {
          address: string
          bix?: number
          created_at?: string
          credited_at?: string | null
          id?: string
          merchant: string
          note?: string | null
          price: number
          status?: string
          tx_hash: string
          usdt?: number
          user_id: string
          wallet_code: string
        }
        Update: {
          address?: string
          bix?: number
          created_at?: string
          credited_at?: string | null
          id?: string
          merchant?: string
          note?: string | null
          price?: number
          status?: string
          tx_hash?: string
          usdt?: number
          user_id?: string
          wallet_code?: string
        }
        Relationships: []
      }
      bix_group_members: {
        Row: {
          group_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bix_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "bix_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      bix_group_messages: {
        Row: {
          body: string
          created_at: string
          group_id: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          group_id: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bix_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "bix_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      bix_groups: {
        Row: {
          about: string
          code: string
          created_at: string
          id: string
          live_code: string | null
          name: string
          owner_id: string
        }
        Insert: {
          about?: string
          code: string
          created_at?: string
          id?: string
          live_code?: string | null
          name: string
          owner_id: string
        }
        Update: {
          about?: string
          code?: string
          created_at?: string
          id?: string
          live_code?: string | null
          name?: string
          owner_id?: string
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
      bix_leader_challenge_claims: {
        Row: {
          challenge: string
          created_at: string
          id: string
          note: string | null
          reviewed_at: string | null
          reward_bix: number
          status: string
          user_id: string
          verified_count: number
        }
        Insert: {
          challenge?: string
          created_at?: string
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reward_bix: number
          status?: string
          user_id: string
          verified_count: number
        }
        Update: {
          challenge?: string
          created_at?: string
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reward_bix?: number
          status?: string
          user_id?: string
          verified_count?: number
        }
        Relationships: []
      }
      bix_leaders: {
        Row: {
          created_at: string
          expired_at: string | null
          loan_package_id: string | null
          owner_access: string
          owner_access_at: string | null
          owner_access_note: string | null
          require_turnover: boolean
          reviewed_at: string | null
          scope: string
          sponsored_stake_used: boolean
          status: string
          support_kind: string
          turnover_multiple: number
          user_id: string
          virtual_usd: number
        }
        Insert: {
          created_at?: string
          expired_at?: string | null
          loan_package_id?: string | null
          owner_access?: string
          owner_access_at?: string | null
          owner_access_note?: string | null
          require_turnover?: boolean
          reviewed_at?: string | null
          scope?: string
          sponsored_stake_used?: boolean
          status?: string
          support_kind?: string
          turnover_multiple?: number
          user_id: string
          virtual_usd?: number
        }
        Update: {
          created_at?: string
          expired_at?: string | null
          loan_package_id?: string | null
          owner_access?: string
          owner_access_at?: string | null
          owner_access_note?: string | null
          require_turnover?: boolean
          reviewed_at?: string | null
          scope?: string
          sponsored_stake_used?: boolean
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
      bix_messages: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          forwarded: boolean
          hidden_by: string[]
          id: string
          kind: string
          media_path: string | null
          meta: Json | null
          pinned_at: string | null
          pinned_by: string | null
          reactions: Json
          read_at: string | null
          recipient_id: string
          reply_body: string | null
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          forwarded?: boolean
          hidden_by?: string[]
          id?: string
          kind?: string
          media_path?: string | null
          meta?: Json | null
          pinned_at?: string | null
          pinned_by?: string | null
          reactions?: Json
          read_at?: string | null
          recipient_id: string
          reply_body?: string | null
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          forwarded?: boolean
          hidden_by?: string[]
          id?: string
          kind?: string
          media_path?: string | null
          meta?: Json | null
          pinned_at?: string | null
          pinned_by?: string | null
          reactions?: Json
          read_at?: string | null
          recipient_id?: string
          reply_body?: string | null
          reply_to?: string | null
          sender_id?: string
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
      bix_mining_preorders: {
        Row: {
          created_at: string
          hashrate_th: number
          id: string
          price_usd: number
          reviewed_at: string | null
          rig_id: string
          status: string
          units: number
          user_id: string
        }
        Insert: {
          created_at?: string
          hashrate_th: number
          id?: string
          price_usd: number
          reviewed_at?: string | null
          rig_id: string
          status?: string
          units: number
          user_id: string
        }
        Update: {
          created_at?: string
          hashrate_th?: number
          id?: string
          price_usd?: number
          reviewed_at?: string | null
          rig_id?: string
          status?: string
          units?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bix_mining_preorders_rig_id_fkey"
            columns: ["rig_id"]
            isOneToOne: false
            referencedRelation: "bix_mining_rigs"
            referencedColumns: ["id"]
          },
        ]
      }
      bix_mining_rigs: {
        Row: {
          enabled: boolean
          hashrate_th: number
          id: string
          name: string
          note: string
          price_usd: number
          quota: number
          reserved: number
          sort: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          hashrate_th: number
          id: string
          name: string
          note?: string
          price_usd: number
          quota?: number
          reserved?: number
          sort?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          hashrate_th?: number
          id?: string
          name?: string
          note?: string
          price_usd?: number
          quota?: number
          reserved?: number
          sort?: number
          updated_at?: string
        }
        Relationships: []
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
      bix_network_moves: {
        Row: {
          action: string
          created_at: string
          id: string
          member_id: string
          moved_by: string
          new_sponsor: string | null
          old_sponsor: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          member_id: string
          moved_by: string
          new_sponsor?: string | null
          old_sponsor?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          member_id?: string
          moved_by?: string
          new_sponsor?: string | null
          old_sponsor?: string | null
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
          extra_wallets: Json
          label: string
          network: string
          owner_id: string
          unique_address: string
          unique_asset: string
          unique_code: string | null
          unique_enabled: boolean
          unique_label: string
          unique_network: string
          updated_at: string
        }
        Insert: {
          address?: string
          asset?: string
          code: string
          enabled?: boolean
          extra_wallets?: Json
          label?: string
          network?: string
          owner_id: string
          unique_address?: string
          unique_asset?: string
          unique_code?: string | null
          unique_enabled?: boolean
          unique_label?: string
          unique_network?: string
          updated_at?: string
        }
        Update: {
          address?: string
          asset?: string
          code?: string
          enabled?: boolean
          extra_wallets?: Json
          label?: string
          network?: string
          owner_id?: string
          unique_address?: string
          unique_asset?: string
          unique_code?: string | null
          unique_enabled?: boolean
          unique_label?: string
          unique_network?: string
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
      bix_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
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
      bix_stories: {
        Row: {
          bg: string
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          kind: string
          media_path: string | null
          user_id: string
        }
        Insert: {
          bg?: string
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          media_path?: string | null
          user_id: string
        }
        Update: {
          bg?: string
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          media_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bix_story_views: {
        Row: {
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bix_story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "bix_stories"
            referencedColumns: ["id"]
          },
        ]
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
      bix_surprise_attempts: {
        Row: {
          amount: number
          answered_at: string | null
          created_at: string
          device_id: string | null
          id: string
          qids: number[]
          result: string | null
          round: number
          user_id: string
        }
        Insert: {
          amount?: number
          answered_at?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          qids: number[]
          result?: string | null
          round: number
          user_id: string
        }
        Update: {
          amount?: number
          answered_at?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          qids?: number[]
          result?: string | null
          round?: number
          user_id?: string
        }
        Relationships: []
      }
      bix_surprise_bank: {
        Row: {
          answer: number
          id: number
          options: Json
          q: string
        }
        Insert: {
          answer: number
          id?: number
          options: Json
          q: string
        }
        Update: {
          answer?: number
          id?: number
          options?: Json
          q?: string
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
      bix_vusdt_clawbacks: {
        Row: {
          amount_usd: number
          created_at: string
          created_by: string
          from_leader: number
          from_transfer: number
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          created_by: string
          from_leader?: number
          from_transfer?: number
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          created_by?: string
          from_leader?: number
          from_transfer?: number
          id?: string
          note?: string | null
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
      bix_wd_matching: {
        Row: {
          base_usd: number
          created_at: string
          id: string
          member_id: string
          rate_pct: number
          upline_id: string
          usdt_amount: number
          withdraw_id: string
        }
        Insert: {
          base_usd: number
          created_at?: string
          id?: string
          member_id: string
          rate_pct: number
          upline_id: string
          usdt_amount: number
          withdraw_id: string
        }
        Update: {
          base_usd?: number
          created_at?: string
          id?: string
          member_id?: string
          rate_pct?: number
          upline_id?: string
          usdt_amount?: number
          withdraw_id?: string
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
      bixcare_orders: {
        Row: {
          buyer_id: string
          completed_at: string | null
          created_at: string
          fare_bix: number
          fare_usdt: number
          fee_bix: number
          fee_rate: number
          fee_usdt: number
          held_at: string | null
          id: string
          items: Json
          merchant_bix: number
          merchant_id: string
          merchant_usdt: number
          next_service_at: string | null
          note: string
          outlet_id: string
          owner_user_id: string | null
          paid_at: string | null
          pay_method: string
          pay_ref: string
          proof_path: string | null
          rated_at: string | null
          rating: number | null
          ref_bix: number
          ref_usdt: number
          ref_user: string | null
          review: string
          schedule_at: string | null
          service_note: string
          stage: string
          status: string
          total_idr: number
        }
        Insert: {
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          fare_bix?: number
          fare_usdt?: number
          fee_bix?: number
          fee_rate?: number
          fee_usdt?: number
          held_at?: string | null
          id?: string
          items?: Json
          merchant_bix?: number
          merchant_id: string
          merchant_usdt?: number
          next_service_at?: string | null
          note?: string
          outlet_id: string
          owner_user_id?: string | null
          paid_at?: string | null
          pay_method?: string
          pay_ref?: string
          proof_path?: string | null
          rated_at?: string | null
          rating?: number | null
          ref_bix?: number
          ref_usdt?: number
          ref_user?: string | null
          review?: string
          schedule_at?: string | null
          service_note?: string
          stage?: string
          status?: string
          total_idr?: number
        }
        Update: {
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          fare_bix?: number
          fare_usdt?: number
          fee_bix?: number
          fee_rate?: number
          fee_usdt?: number
          held_at?: string | null
          id?: string
          items?: Json
          merchant_bix?: number
          merchant_id?: string
          merchant_usdt?: number
          next_service_at?: string | null
          note?: string
          outlet_id?: string
          owner_user_id?: string | null
          paid_at?: string | null
          pay_method?: string
          pay_ref?: string
          proof_path?: string | null
          rated_at?: string | null
          rating?: number | null
          ref_bix?: number
          ref_usdt?: number
          ref_user?: string | null
          review?: string
          schedule_at?: string | null
          service_note?: string
          stage?: string
          status?: string
          total_idr?: number
        }
        Relationships: [
          {
            foreignKeyName: "bixcare_orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "bixcare_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      bixcare_outlets: {
        Row: {
          accept_bix: boolean
          accept_usdt: boolean
          address: string
          bank_account: string
          bank_holder: string
          bank_name: string
          break_until: string | null
          city: string
          close_time: string
          created_at: string
          description: string
          division: string
          id: string
          is_open: boolean
          logo_path: string | null
          name: string
          open_time: string
          owner_id: string
          phone: string
          qris_path: string | null
          review_note: string
          status: string
        }
        Insert: {
          accept_bix?: boolean
          accept_usdt?: boolean
          address?: string
          bank_account?: string
          bank_holder?: string
          bank_name?: string
          break_until?: string | null
          city?: string
          close_time?: string
          created_at?: string
          description?: string
          division: string
          id?: string
          is_open?: boolean
          logo_path?: string | null
          name: string
          open_time?: string
          owner_id: string
          phone?: string
          qris_path?: string | null
          review_note?: string
          status?: string
        }
        Update: {
          accept_bix?: boolean
          accept_usdt?: boolean
          address?: string
          bank_account?: string
          bank_holder?: string
          bank_name?: string
          break_until?: string | null
          city?: string
          close_time?: string
          created_at?: string
          description?: string
          division?: string
          id?: string
          is_open?: boolean
          logo_path?: string | null
          name?: string
          open_time?: string
          owner_id?: string
          phone?: string
          qris_path?: string | null
          review_note?: string
          status?: string
        }
        Relationships: []
      }
      bixcare_services: {
        Row: {
          available: boolean
          created_at: string
          duration_min: number
          id: string
          name: string
          outlet_id: string
          owner_id: string
          price_idr: number
          unit: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          duration_min?: number
          id?: string
          name: string
          outlet_id: string
          owner_id?: string
          price_idr: number
          unit?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          duration_min?: number
          id?: string
          name?: string
          outlet_id?: string
          owner_id?: string
          price_idr?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "bixcare_services_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "bixcare_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      bixgo_bookings: {
        Row: {
          cancel_note: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          city: string
          completed_at: string | null
          created_at: string
          driver_bix: number
          driver_lat: number | null
          driver_lng: number | null
          driver_location_at: string | null
          driver_name: string
          driver_phone: string
          driver_usdt: number
          driver_user_id: string | null
          dropoff: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          fare_bix: number
          fare_idr: number
          fare_usdt: number
          gas_bix: number
          held_at: string | null
          id: string
          km: number
          operator_note: string
          owner_bix: number
          owner_usdt: number
          owner_user_id: string | null
          paid_at: string | null
          paid_confirmed_at: string | null
          pay_method: string
          pay_ref: string
          pickup: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_note: string
          plate: string
          rating: number | null
          rating_note: string
          ref_driver_bix: number
          ref_driver_usdt: number
          ref_driver_user: string | null
          ref_rider_bix: number
          ref_rider_usdt: number
          ref_rider_user: string | null
          service: string
          status: string
          total_idr: number
          updated_at: string
          user_id: string
          vehicle: string
        }
        Insert: {
          cancel_note?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          city?: string
          completed_at?: string | null
          created_at?: string
          driver_bix?: number
          driver_lat?: number | null
          driver_lng?: number | null
          driver_location_at?: string | null
          driver_name?: string
          driver_phone?: string
          driver_usdt?: number
          driver_user_id?: string | null
          dropoff?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          fare_bix?: number
          fare_idr?: number
          fare_usdt?: number
          gas_bix?: number
          held_at?: string | null
          id?: string
          km?: number
          operator_note?: string
          owner_bix?: number
          owner_usdt?: number
          owner_user_id?: string | null
          paid_at?: string | null
          paid_confirmed_at?: string | null
          pay_method?: string
          pay_ref?: string
          pickup?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_note?: string
          plate?: string
          rating?: number | null
          rating_note?: string
          ref_driver_bix?: number
          ref_driver_usdt?: number
          ref_driver_user?: string | null
          ref_rider_bix?: number
          ref_rider_usdt?: number
          ref_rider_user?: string | null
          service: string
          status?: string
          total_idr?: number
          updated_at?: string
          user_id?: string
          vehicle?: string
        }
        Update: {
          cancel_note?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          city?: string
          completed_at?: string | null
          created_at?: string
          driver_bix?: number
          driver_lat?: number | null
          driver_lng?: number | null
          driver_location_at?: string | null
          driver_name?: string
          driver_phone?: string
          driver_usdt?: number
          driver_user_id?: string | null
          dropoff?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          fare_bix?: number
          fare_idr?: number
          fare_usdt?: number
          gas_bix?: number
          held_at?: string | null
          id?: string
          km?: number
          operator_note?: string
          owner_bix?: number
          owner_usdt?: number
          owner_user_id?: string | null
          paid_at?: string | null
          paid_confirmed_at?: string | null
          pay_method?: string
          pay_ref?: string
          pickup?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_note?: string
          plate?: string
          rating?: number | null
          rating_note?: string
          ref_driver_bix?: number
          ref_driver_usdt?: number
          ref_driver_user?: string | null
          ref_rider_bix?: number
          ref_rider_usdt?: number
          ref_rider_user?: string | null
          service?: string
          status?: string
          total_idr?: number
          updated_at?: string
          user_id?: string
          vehicle?: string
        }
        Relationships: []
      }
      bixgo_driver_licenses: {
        Row: {
          accept_bank: boolean
          accept_bix: boolean
          accept_cash: boolean
          accept_qris: boolean
          bank_account: string
          bank_holder: string
          bank_name: string
          city: string
          created_at: string
          full_name: string
          id: string
          mode: string
          online: boolean
          operator_note: string
          phone: string
          plate: string
          qris_path: string | null
          rate_adj_pct: number
          status: string
          updated_at: string
          user_id: string
          vehicle_model: string
          vehicle_type: string
        }
        Insert: {
          accept_bank?: boolean
          accept_bix?: boolean
          accept_cash?: boolean
          accept_qris?: boolean
          bank_account?: string
          bank_holder?: string
          bank_name?: string
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          mode?: string
          online?: boolean
          operator_note?: string
          phone?: string
          plate?: string
          qris_path?: string | null
          rate_adj_pct?: number
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_model?: string
          vehicle_type?: string
        }
        Update: {
          accept_bank?: boolean
          accept_bix?: boolean
          accept_cash?: boolean
          accept_qris?: boolean
          bank_account?: string
          bank_holder?: string
          bank_name?: string
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          mode?: string
          online?: boolean
          operator_note?: string
          phone?: string
          plate?: string
          qris_path?: string | null
          rate_adj_pct?: number
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_model?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      bixgo_jastip_requests: {
        Row: {
          city: string
          created_at: string
          driver_user_id: string | null
          dropoff: string
          fee_idr: number
          id: string
          item: string
          item_budget_idr: number
          note: string | null
          pay_method: string
          qty: number
          status: string
          store: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          driver_user_id?: string | null
          dropoff: string
          fee_idr?: number
          id?: string
          item: string
          item_budget_idr?: number
          note?: string | null
          pay_method?: string
          qty?: number
          status?: string
          store: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          city?: string
          created_at?: string
          driver_user_id?: string | null
          dropoff?: string
          fee_idr?: number
          id?: string
          item?: string
          item_budget_idr?: number
          note?: string | null
          pay_method?: string
          qty?: number
          status?: string
          store?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bixgo_menu_items: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          in_stock: boolean
          merchant_id: string
          name: string
          photo_path: string | null
          price_idr: number
          sort: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          in_stock?: boolean
          merchant_id: string
          name: string
          photo_path?: string | null
          price_idr: number
          sort?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          in_stock?: boolean
          merchant_id?: string
          name?: string
          photo_path?: string | null
          price_idr?: number
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "bixgo_menu_items_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "bixgo_merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      bixgo_merchant_orders: {
        Row: {
          address: string
          buyer_id: string
          created_at: string
          id: string
          items: Json
          merchant_id: string
          note: string
          pay_method: string
          status: string
          subtotal_idr: number
          updated_at: string
        }
        Insert: {
          address?: string
          buyer_id: string
          created_at?: string
          id?: string
          items?: Json
          merchant_id: string
          note?: string
          pay_method?: string
          status?: string
          subtotal_idr?: number
          updated_at?: string
        }
        Update: {
          address?: string
          buyer_id?: string
          created_at?: string
          id?: string
          items?: Json
          merchant_id?: string
          note?: string
          pay_method?: string
          status?: string
          subtotal_idr?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bixgo_merchant_orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "bixgo_merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      bixgo_merchants: {
        Row: {
          address: string
          banner_path: string | null
          category: string
          city: string
          close_time: string
          created_at: string
          id: string
          is_open: boolean
          kind: string
          landmark: string
          lat: number | null
          lng: number | null
          logo_path: string | null
          name: string
          open_time: string
          owner_id: string
          phone: string
          review_note: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string
          banner_path?: string | null
          category?: string
          city?: string
          close_time?: string
          created_at?: string
          id?: string
          is_open?: boolean
          kind?: string
          landmark?: string
          lat?: number | null
          lng?: number | null
          logo_path?: string | null
          name: string
          open_time?: string
          owner_id: string
          phone?: string
          review_note?: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          banner_path?: string | null
          category?: string
          city?: string
          close_time?: string
          created_at?: string
          id?: string
          is_open?: boolean
          kind?: string
          landmark?: string
          lat?: number | null
          lng?: number | null
          logo_path?: string | null
          name?: string
          open_time?: string
          owner_id?: string
          phone?: string
          review_note?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      bixtok_comments: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          author_name?: string
          body: string
          created_at?: string
          id?: string
          user_id?: string
          video_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bixtok_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "bixtok_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      bixtok_config: {
        Row: {
          auto_follow_back: boolean
          backdrops_enabled: boolean
          challenge_enabled: boolean
          challenge_ends_at: string | null
          challenge_prize: string | null
          challenge_tag: string | null
          challenge_title: string | null
          clips_enabled: boolean
          comm_chat_enabled: boolean
          comm_chat_min_usd: number
          comm_video_min_usd: number
          comm_vip_min_usd: number
          comm_voice_min_usd: number
          creator_share_pct: number
          enabled: boolean
          features: Json
          gifts_enabled: boolean
          host_gifts: boolean
          id: number
          link_slots: number
          live_backdrops: Json
          live_cta: boolean
          live_enabled: boolean
          live_host_min_stake_usd: number
          live_max_minutes: number
          live_min_stake_usd: number
          max_links: number
          menus: Json
          owner2_isolation: boolean
          pk_bix_weight: number
          pk_enabled: boolean
          replay_enabled: boolean
          showcase_enabled: boolean
          soundboard: boolean
          stage_max: number
          tester_code: string | null
          updated_at: string
          withdraw_min_bix: number
        }
        Insert: {
          auto_follow_back?: boolean
          backdrops_enabled?: boolean
          challenge_enabled?: boolean
          challenge_ends_at?: string | null
          challenge_prize?: string | null
          challenge_tag?: string | null
          challenge_title?: string | null
          clips_enabled?: boolean
          comm_chat_enabled?: boolean
          comm_chat_min_usd?: number
          comm_video_min_usd?: number
          comm_vip_min_usd?: number
          comm_voice_min_usd?: number
          creator_share_pct?: number
          enabled?: boolean
          features?: Json
          gifts_enabled?: boolean
          host_gifts?: boolean
          id?: number
          link_slots?: number
          live_backdrops?: Json
          live_cta?: boolean
          live_enabled?: boolean
          live_host_min_stake_usd?: number
          live_max_minutes?: number
          live_min_stake_usd?: number
          max_links?: number
          menus?: Json
          owner2_isolation?: boolean
          pk_bix_weight?: number
          pk_enabled?: boolean
          replay_enabled?: boolean
          showcase_enabled?: boolean
          soundboard?: boolean
          stage_max?: number
          tester_code?: string | null
          updated_at?: string
          withdraw_min_bix?: number
        }
        Update: {
          auto_follow_back?: boolean
          backdrops_enabled?: boolean
          challenge_enabled?: boolean
          challenge_ends_at?: string | null
          challenge_prize?: string | null
          challenge_tag?: string | null
          challenge_title?: string | null
          clips_enabled?: boolean
          comm_chat_enabled?: boolean
          comm_chat_min_usd?: number
          comm_video_min_usd?: number
          comm_vip_min_usd?: number
          comm_voice_min_usd?: number
          creator_share_pct?: number
          enabled?: boolean
          features?: Json
          gifts_enabled?: boolean
          host_gifts?: boolean
          id?: number
          link_slots?: number
          live_backdrops?: Json
          live_cta?: boolean
          live_enabled?: boolean
          live_host_min_stake_usd?: number
          live_max_minutes?: number
          live_min_stake_usd?: number
          max_links?: number
          menus?: Json
          owner2_isolation?: boolean
          pk_bix_weight?: number
          pk_enabled?: boolean
          replay_enabled?: boolean
          showcase_enabled?: boolean
          soundboard?: boolean
          stage_max?: number
          tester_code?: string | null
          updated_at?: string
          withdraw_min_bix?: number
        }
        Relationships: []
      }
      bixtok_follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      bixtok_gift_tx: {
        Row: {
          amount: number
          claimed_at: string | null
          created_at: string
          currency: string
          gift_id: string
          gift_name: string
          gross_amount: number | null
          id: string
          live_id: string | null
          recipient_id: string
          sender_id: string
          video_id: string | null
        }
        Insert: {
          amount: number
          claimed_at?: string | null
          created_at?: string
          currency: string
          gift_id: string
          gift_name: string
          gross_amount?: number | null
          id?: string
          live_id?: string | null
          recipient_id: string
          sender_id: string
          video_id?: string | null
        }
        Update: {
          amount?: number
          claimed_at?: string | null
          created_at?: string
          currency?: string
          gift_id?: string
          gift_name?: string
          gross_amount?: number | null
          id?: string
          live_id?: string | null
          recipient_id?: string
          sender_id?: string
          video_id?: string | null
        }
        Relationships: []
      }
      bixtok_gifts: {
        Row: {
          created_at: string
          currency: string
          emoji: string
          enabled: boolean
          id: string
          name: string
          price: number
          sort: number
        }
        Insert: {
          created_at?: string
          currency?: string
          emoji?: string
          enabled?: boolean
          id?: string
          name: string
          price: number
          sort?: number
        }
        Update: {
          created_at?: string
          currency?: string
          emoji?: string
          enabled?: boolean
          id?: string
          name?: string
          price?: number
          sort?: number
        }
        Relationships: []
      }
      bixtok_live_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          live_id: string
          name: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          live_id: string
          name: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          live_id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bixtok_live_messages_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "bixtok_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      bixtok_live_reminders: {
        Row: {
          created_at: string
          schedule_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          schedule_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          schedule_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bixtok_live_reminders_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "bixtok_live_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      bixtok_live_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          host_name: string
          id: string
          starts_at: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          host_name?: string
          id?: string
          starts_at: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          host_name?: string
          id?: string
          starts_at?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      bixtok_lives: {
        Row: {
          backdrop: string | null
          cam_off: boolean
          ended_at: string | null
          host_id: string
          host_name: string
          id: string
          kind: string
          likes: number
          muted: string[]
          pinned: string | null
          pk: Json | null
          showcase: string | null
          started_at: string
          status: string
          title: string
        }
        Insert: {
          backdrop?: string | null
          cam_off?: boolean
          ended_at?: string | null
          host_id: string
          host_name: string
          id?: string
          kind?: string
          likes?: number
          muted?: string[]
          pinned?: string | null
          pk?: Json | null
          showcase?: string | null
          started_at?: string
          status?: string
          title: string
        }
        Update: {
          backdrop?: string | null
          cam_off?: boolean
          ended_at?: string | null
          host_id?: string
          host_name?: string
          id?: string
          kind?: string
          likes?: number
          muted?: string[]
          pinned?: string | null
          pk?: Json | null
          showcase?: string | null
          started_at?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      bixtok_official_hosts: {
        Row: {
          added_by: string | null
          created_at: string
          display_name: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          display_name: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          display_name?: string
          user_id?: string
        }
        Relationships: []
      }
      bixtok_sounds: {
        Row: {
          artist: string
          audio_url: string
          category: string
          created_at: string
          enabled: boolean
          id: string
          sort: number
          title: string
        }
        Insert: {
          artist?: string
          audio_url: string
          category?: string
          created_at?: string
          enabled?: boolean
          id?: string
          sort?: number
          title: string
        }
        Update: {
          artist?: string
          audio_url?: string
          category?: string
          created_at?: string
          enabled?: boolean
          id?: string
          sort?: number
          title?: string
        }
        Relationships: []
      }
      bixtok_stage_requests: {
        Row: {
          created_at: string
          id: string
          live_id: string
          name: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          live_id: string
          name?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          live_id?: string
          name?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bixtok_stage_requests_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "bixtok_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      bixtok_videos: {
        Row: {
          allow_gifts: boolean
          caption: string
          created_at: string
          creator_id: string | null
          creator_name: string
          enabled: boolean
          filter: string
          id: string
          likes: number
          media_kind: string
          media_path: string | null
          music_title: string | null
          music_url: string | null
          overlay: string
          poster_url: string | null
          sort: number
          source_kind: string
          text_style: Json
          video_url: string
        }
        Insert: {
          allow_gifts?: boolean
          caption?: string
          created_at?: string
          creator_id?: string | null
          creator_name?: string
          enabled?: boolean
          filter?: string
          id?: string
          likes?: number
          media_kind?: string
          media_path?: string | null
          music_title?: string | null
          music_url?: string | null
          overlay?: string
          poster_url?: string | null
          sort?: number
          source_kind?: string
          text_style?: Json
          video_url: string
        }
        Update: {
          allow_gifts?: boolean
          caption?: string
          created_at?: string
          creator_id?: string | null
          creator_name?: string
          enabled?: boolean
          filter?: string
          id?: string
          likes?: number
          media_kind?: string
          media_path?: string | null
          music_title?: string | null
          music_url?: string | null
          overlay?: string
          poster_url?: string | null
          sort?: number
          source_kind?: string
          text_style?: Json
          video_url?: string
        }
        Relationships: []
      }
      bixtrade_bonuses: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          kind: string
          level: number
          member_id: string
          rate_pct: number
          request_id: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          kind?: string
          level?: number
          member_id: string
          rate_pct: number
          request_id: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          kind?: string
          level?: number
          member_id?: string
          rate_pct?: number
          request_id?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bixtrade_bonuses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "bixtrade_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      bixtrade_executions: {
        Row: {
          buy_price: number
          buy_venue: string
          executed_at: string
          fee_usd: number
          funding: string
          gross_usd: number
          id: string
          latency_ms: number
          net_usd: number
          notional_usd: number
          pair: string
          qty: number
          ref: string
          sell_price: number
          sell_venue: string
          source: string
          strategy: string
          user_id: string
        }
        Insert: {
          buy_price: number
          buy_venue: string
          executed_at?: string
          fee_usd: number
          funding: string
          gross_usd: number
          id?: string
          latency_ms: number
          net_usd: number
          notional_usd: number
          pair: string
          qty: number
          ref: string
          sell_price: number
          sell_venue: string
          source?: string
          strategy: string
          user_id: string
        }
        Update: {
          buy_price?: number
          buy_venue?: string
          executed_at?: string
          fee_usd?: number
          funding?: string
          gross_usd?: number
          id?: string
          latency_ms?: number
          net_usd?: number
          notional_usd?: number
          pair?: string
          qty?: number
          ref?: string
          sell_price?: number
          sell_venue?: string
          source?: string
          strategy?: string
          user_id?: string
        }
        Relationships: []
      }
      bixtrade_requests: {
        Row: {
          admin_note: string | null
          amount_usd: number
          created_at: string
          funding: string
          id: string
          kind: string
          note: string | null
          reviewed_at: string | null
          settled_at: string | null
          settled_usd: number | null
          status: string
          strategy: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_usd: number
          created_at?: string
          funding?: string
          id?: string
          kind: string
          note?: string | null
          reviewed_at?: string | null
          settled_at?: string | null
          settled_usd?: number | null
          status?: string
          strategy?: string
          user_id?: string
        }
        Update: {
          admin_note?: string | null
          amount_usd?: number
          created_at?: string
          funding?: string
          id?: string
          kind?: string
          note?: string | null
          reviewed_at?: string | null
          settled_at?: string | null
          settled_usd?: number | null
          status?: string
          strategy?: string
          user_id?: string
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
          avatar_path: string | null
          call_permission: string
          created_at: string
          full_name: string
          status_text: string | null
          status_updated_at: string | null
          user_id: string
          username: string
          whatsapp: string | null
          whatsapp_public: boolean
        }
        Insert: {
          avatar_path?: string | null
          call_permission?: string
          created_at?: string
          full_name: string
          status_text?: string | null
          status_updated_at?: string | null
          user_id: string
          username: string
          whatsapp?: string | null
          whatsapp_public?: boolean
        }
        Update: {
          avatar_path?: string | null
          call_permission?: string
          created_at?: string
          full_name?: string
          status_text?: string | null
          status_updated_at?: string | null
          user_id?: string
          username?: string
          whatsapp?: string | null
          whatsapp_public?: boolean
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
      bix_agency_apply: {
        Args: {
          p_city: string
          p_contact: string
          p_country: string
          p_tier: string
          p_usd: number
        }
        Returns: string
      }
      bix_agency_config: { Args: never; Returns: Json }
      bix_agency_review: {
        Args: { p_id: string; p_note: string; p_status: string }
        Returns: Json
      }
      bix_agency_save: { Args: { p_config: Json }; Returns: Json }
      bix_arena_admin_config: { Args: never; Returns: Json }
      bix_arena_config: { Args: never; Returns: Json }
      bix_arena_save: { Args: { p_config: Json }; Returns: undefined }
      bix_arena_streak: { Args: { p_user: string }; Returns: number }
      bix_assert_bix_unlocked: {
        Args: { p_amount: number; p_user: string }
        Returns: undefined
      }
      bix_assert_real_stake_funds: {
        Args: { p_usdt: number; p_user: string }
        Returns: undefined
      }
      bix_asset_balances: {
        Args: { p_user: string }
        Returns: {
          bix_balance: number
          usdt_balance: number
        }[]
      }
      bix_avatar_in_use: { Args: { p_name: string }; Returns: boolean }
      bix_balance_ledger: { Args: { p_user: string }; Returns: Json }
      bix_bixgo_bix_delta: { Args: { p_user: string }; Returns: number }
      bix_bixgo_usdt_delta: { Args: { p_user: string }; Returns: number }
      bix_bixtrade_usdt_delta: { Args: { p_user: string }; Returns: number }
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
      bix_call_allowed: {
        Args: { p_callee: string; p_caller: string }
        Returns: boolean
      }
      bix_call_find: { Args: { p_query: string }; Returns: Json }
      bix_call_peer: { Args: { p_user: string }; Returns: Json }
      bix_call_ring: { Args: { p_id: string }; Returns: undefined }
      bix_call_set: {
        Args: { p_id: string; p_status: string }
        Returns: string
      }
      bix_call_settings: { Args: never; Returns: Json }
      bix_call_settings_save: {
        Args: { p_permission: string; p_public: boolean; p_whatsapp: string }
        Returns: undefined
      }
      bix_call_start: {
        Args: { p_callee: string; p_kind: string }
        Returns: string
      }
      bix_can_manage_packages: { Args: never; Returns: boolean }
      bix_challenge_verified_team: { Args: { p_user: string }; Returns: number }
      bix_chat_delete: {
        Args: { p_everyone?: boolean; p_id: string }
        Returns: Json
      }
      bix_chat_delivered: { Args: never; Returns: undefined }
      bix_chat_guard: {
        Args: { p_me: string; p_to: string }
        Returns: undefined
      }
      bix_chat_pay: {
        Args: { p_amount: number; p_note?: string; p_to: string }
        Returns: Json
      }
      bix_chat_pin: {
        Args: { p_id: string; p_pin: boolean }
        Returns: undefined
      }
      bix_chat_react: { Args: { p_emoji: string; p_id: string }; Returns: Json }
      bix_chat_read: { Args: { p_peer: string }; Returns: undefined }
      bix_chat_reply_snip: {
        Args: { p_me: string; p_peer: string; p_reply: string }
        Returns: string
      }
      bix_chat_request: {
        Args: { p_amount: number; p_note?: string; p_to: string }
        Returns: Json
      }
      bix_chat_request_act: {
        Args: { p_action: string; p_id: string }
        Returns: Json
      }
      bix_chat_send: {
        Args: {
          p_body: string
          p_forwarded?: boolean
          p_reply?: string
          p_to: string
        }
        Returns: Json
      }
      bix_chat_send_file: {
        Args: {
          p_mime: string
          p_name: string
          p_path: string
          p_size: number
          p_to: string
        }
        Returns: Json
      }
      bix_chat_send_media: {
        Args: {
          p_body?: string
          p_forwarded?: boolean
          p_kind: string
          p_path: string
          p_reply?: string
          p_to: string
        }
        Returns: Json
      }
      bix_chat_sync: {
        Args: { p_peer?: string; p_typing?: boolean }
        Returns: Json
      }
      bix_chat_threads: { Args: never; Returns: Json }
      bix_claim_conditional_leader: {
        Args: { p_days: number; p_package: string }
        Returns: Json
      }
      bix_claim_stake_profit: { Args: never; Returns: Json }
      bix_claim_vip: { Args: { p_level: number }; Returns: string }
      bix_comm_me: { Args: never; Returns: Json }
      bix_comm_tier: { Args: { p_uid: string }; Returns: Json }
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
      bix_deposit_lock_list: { Args: never; Returns: Json }
      bix_deposit_lock_owner1: {
        Args: { p_code: string; p_lock: boolean }
        Returns: Json
      }
      bix_deposit_owner: { Args: { p_user: string }; Returns: string }
      bix_deposit_quota_list: { Args: never; Returns: Json }
      bix_deposit_quota_set: {
        Args: { p_code: string; p_max: number; p_on: boolean }
        Returns: Json
      }
      bix_deposit_route_preview: {
        Args: { p_max: number; p_q: string }
        Returns: Json
      }
      bix_edit_duration_package: {
        Args: {
          p_apys: Json
          p_enabled: boolean
          p_id: string
          p_price: number
        }
        Returns: undefined
      }
      bix_expire_conditional_leaders: { Args: never; Returns: number }
      bix_feature_enabled: { Args: { p_feature: string }; Returns: boolean }
      bix_find_user_by_email: { Args: { p_email: string }; Returns: string }
      bix_grant_welcome: { Args: { p_user: string }; Returns: undefined }
      bix_group_add_member: {
        Args: { p_group: string; p_query: string }
        Returns: string
      }
      bix_group_feed: {
        Args: { p_group: string }
        Returns: {
          body: string
          created_at: string
          id: string
          name: string
          sender_id: string
        }[]
      }
      bix_group_is_member: { Args: { _g: string }; Returns: boolean }
      bix_group_join: { Args: { p_code: string }; Returns: string }
      bix_growth_excluded: { Args: { p_user: string }; Returns: boolean }
      bix_growth_radar: { Args: never; Returns: Json }
      bix_growth_scope_report: { Args: never; Returns: Json }
      bix_growth_snapshot: { Args: never; Returns: Json }
      bix_has_real_verified_email: {
        Args: { p_user: string }
        Returns: boolean
      }
      bix_in_owner1_network: { Args: never; Returns: boolean }
      bix_is_owner1: { Args: never; Returns: boolean }
      bix_is_owner1_user: { Args: { p_user: string }; Returns: boolean }
      bix_is_sponsored_source: {
        Args: { p_member: string; p_stake: string }
        Returns: boolean
      }
      bix_leader_30d_progress: { Args: { p_user: string }; Returns: Json }
      bix_leader_challenge_claim: { Args: never; Returns: Json }
      bix_leader_challenge_list: { Args: never; Returns: Json }
      bix_leader_challenge_review: {
        Args: { p_approve: boolean; p_id: string; p_note?: string }
        Returns: Json
      }
      bix_leader_challenge_status: { Args: never; Returns: Json }
      bix_leader_set_access: {
        Args: { p_access: string; p_note?: string; p_user: string }
        Returns: Json
      }
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
      bix_lock_exempt_reason: { Args: { p_user: string }; Returns: string }
      bix_locked_bonus_bix: { Args: { p_user: string }; Returns: number }
      bix_member_shop_slots: { Args: { p_user: string }; Returns: number }
      bix_merchant_tier: { Args: { p_user: string }; Returns: string }
      bix_mining_conversion_status: { Args: never; Returns: Json }
      bix_mining_convert: { Args: never; Returns: Json }
      bix_mining_preorder: {
        Args: { p_rig: string; p_units: number }
        Returns: string
      }
      bix_mining_preorder_review: {
        Args: { p_approve: boolean; p_id: string }
        Returns: undefined
      }
      bix_mining_rate: { Args: { p_user: string }; Returns: number }
      bix_mining_rig_save: {
        Args: {
          p_enabled: boolean
          p_id: string
          p_name: string
          p_note: string
          p_price: number
          p_quota: number
          p_th: number
        }
        Returns: undefined
      }
      bix_mining_settle: { Args: never; Returns: Json }
      bix_mining_start: { Args: never; Returns: Json }
      bix_mining_status: { Args: never; Returns: Json }
      bix_my_deposit_wallets: { Args: never; Returns: Json }
      bix_network_bix_metrics: { Args: never; Returns: Json }
      bix_network_bonus_split: {
        Args: { p_total: number }
        Returns: Record<string, unknown>
      }
      bix_network_insert: {
        Args: { p_child: string; p_new: string }
        Returns: Json
      }
      bix_network_is_descendant: {
        Args: { p_root: string; p_target: string }
        Returns: boolean
      }
      bix_network_lookup: { Args: { p_code: string }; Returns: Json }
      bix_network_move: {
        Args: { p_member: string; p_sponsor: string }
        Returns: Json
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
      bix_owner_wallet_save_unique: {
        Args: {
          p_address: string
          p_asset: string
          p_enabled: boolean
          p_label: string
          p_network: string
        }
        Returns: string
      }
      bix_owner_wallets_save_extra: { Args: { p_wallets: Json }; Returns: Json }
      bix_p2p_bix_delta: { Args: { p_user: string }; Returns: number }
      bix_p2p_cancel: { Args: { p_offer: string }; Returns: undefined }
      bix_p2p_market_pulse: { Args: never; Returns: Json }
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
      bix_profile_card: { Args: { p_user: string }; Returns: Json }
      bix_profile_me: { Args: never; Returns: Json }
      bix_profile_set_avatar: { Args: { p_path: string }; Returns: undefined }
      bix_profile_set_status: { Args: { p_status: string }; Returns: undefined }
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
          member: string
        }[]
      }
      bix_public_home_stats: { Args: never; Returns: Json }
      bix_quest_claim: {
        Args: { p_answer?: number; p_key: string }
        Returns: Json
      }
      bix_quest_status: { Args: never; Returns: Json }
      bix_quota_overflow: {
        Args: { p_child: string; p_parent: string }
        Returns: boolean
      }
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
      bix_requires_360: { Args: { p_user: string }; Returns: boolean }
      bix_resolve_member: { Args: { p_q: string }; Returns: string }
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
      bix_room_visible: {
        Args: { p_code: string; p_host: string }
        Returns: boolean
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
      bix_story_can_view: {
        Args: { p_author: string; p_viewer: string }
        Returns: boolean
      }
      bix_story_can_view_path: { Args: { p_name: string }; Returns: boolean }
      bix_story_delete: { Args: { p_id: string }; Returns: string }
      bix_story_feed: { Args: never; Returns: Json }
      bix_story_mark_view: { Args: { p_id: string }; Returns: undefined }
      bix_story_post: {
        Args: {
          p_bg: string
          p_caption: string
          p_kind: string
          p_path: string
        }
        Returns: string
      }
      bix_story_viewers: { Args: { p_id: string }; Returns: Json }
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
      bix_surprise_admin: { Args: never; Returns: Json }
      bix_surprise_answer:
        | { Args: { p_answers: number[]; p_attempt: string }; Returns: Json }
        | {
            Args: { p_answers: number[]; p_attempt: string; p_device: string }
            Returns: Json
          }
      bix_surprise_cfg: { Args: never; Returns: Json }
      bix_surprise_open: { Args: never; Returns: Json }
      bix_surprise_save: {
        Args: {
          p_enabled: boolean
          p_new_round: boolean
          p_quota: number
          p_reward: number
        }
        Returns: Json
      }
      bix_surprise_status: { Args: never; Returns: Json }
      bix_team_sales_usd: { Args: { p_user: string }; Returns: number }
      bix_team_size: { Args: { p_root: string }; Returns: number }
      bix_unreal_bonus_bix: {
        Args: { p_before: string; p_user: string }
        Returns: number
      }
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
      bix_vusdt_clawback: {
        Args: { p_amount: number; p_note: string; p_user: string }
        Returns: Json
      }
      bix_vusdt_component: { Args: { p_user: string }; Returns: number }
      bix_vusdt_recipients: { Args: never; Returns: Json }
      bix_vusdt_send: {
        Args: { p_amount: number; p_code: string; p_note: string }
        Returns: string
      }
      bix_wallet_balance: { Args: { p_user: string }; Returns: number }
      bix_wallet_balance_internal: { Args: { p_user: string }; Returns: number }
      bix_wd_matching_config: { Args: never; Returns: Json }
      bix_wd_matching_save: { Args: { p_config: Json }; Returns: Json }
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
      bixcare_bix_delta: { Args: { p_user: string }; Returns: number }
      bixcare_config: { Args: never; Returns: Json }
      bixcare_order_paid: {
        Args: { p_id: string; p_ref: string }
        Returns: Json
      }
      bixcare_order_place: {
        Args: {
          p_items: Json
          p_note: string
          p_outlet: string
          p_pay: string
          p_schedule: string
        }
        Returns: string
      }
      bixcare_order_proof: {
        Args: { p_id: string; p_path: string; p_ref: string }
        Returns: Json
      }
      bixcare_order_service_note: {
        Args: { p_id: string; p_next: string; p_note: string }
        Returns: undefined
      }
      bixcare_order_set: {
        Args: { p_id: string; p_stage: string; p_status: string }
        Returns: Json
      }
      bixcare_outlet_ratings: {
        Args: never
        Returns: {
          avg_rating: number
          outlet_id: string
          reviews: number
        }[]
      }
      bixcare_outlet_reviews: {
        Args: { p_outlet: string }
        Returns: {
          rated_at: string
          rating: number
          review: string
        }[]
      }
      bixcare_owner1_id: { Args: never; Returns: string }
      bixcare_partner_gate: { Args: never; Returns: Json }
      bixcare_rate_order: {
        Args: { p_id: string; p_rating: number; p_review: string }
        Returns: undefined
      }
      bixcare_set_break: { Args: { p_minutes: number }; Returns: string }
      bixcare_set_open: { Args: { p_open: boolean }; Returns: Json }
      bixcare_set_partner_gate: {
        Args: { p_min: number; p_promo: boolean }
        Returns: undefined
      }
      bixcare_usdt_delta: { Args: { p_user: string }; Returns: number }
      bixgo_bix_balance_internal: { Args: { p_user: string }; Returns: number }
      bixgo_cancel_trip: {
        Args: { p_id: string; p_note?: string; p_reason: string }
        Returns: Json
      }
      bixgo_driver_accept: { Args: { p_id: string }; Returns: Json }
      bixgo_driver_advance: {
        Args: { p_id: string; p_status: string }
        Returns: Json
      }
      bixgo_driver_jobs: { Args: never; Returns: Json }
      bixgo_driver_location: {
        Args: { p_id: string; p_lat: number; p_lng: number }
        Returns: undefined
      }
      bixgo_driver_reapply: {
        Args: {
          p_city: string
          p_full_name: string
          p_mode: string
          p_phone: string
          p_plate: string
          p_vehicle_model: string
          p_vehicle_type: string
        }
        Returns: string
      }
      bixgo_driver_set_city: { Args: { p_city: string }; Returns: undefined }
      bixgo_driver_set_online: { Args: { p_online: boolean }; Returns: boolean }
      bixgo_driver_set_pay: {
        Args: {
          p_bank: boolean
          p_bank_account: string
          p_bank_holder: string
          p_bank_name: string
          p_qris: boolean
          p_qris_path: string
        }
        Returns: undefined
      }
      bixgo_driver_set_rates: {
        Args: { p_adj: number; p_bix: boolean; p_cash: boolean }
        Returns: undefined
      }
      bixgo_jastip_cancel: { Args: { _id: string }; Returns: undefined }
      bixgo_jastip_set_status: {
        Args: { _id: string; _status: string }
        Returns: undefined
      }
      bixgo_merchant_order_place: {
        Args: {
          p_address: string
          p_items: Json
          p_merchant: string
          p_note: string
        }
        Returns: string
      }
      bixgo_merchant_order_set: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      bixgo_passenger_cancel: { Args: { p_id: string }; Returns: undefined }
      bixgo_rate_trip: {
        Args: { p_id: string; p_note: string; p_rating: number }
        Returns: undefined
      }
      bixgo_ref_stats: { Args: never; Returns: Json }
      bixgo_trip_confirm_paid: { Args: { p_id: string }; Returns: undefined }
      bixgo_trip_driver: { Args: { p_id: string }; Returns: Json }
      bixgo_trip_mark_paid: {
        Args: { p_id: string; p_ref: string }
        Returns: undefined
      }
      bixgo_trip_payee: { Args: { p_id: string }; Returns: Json }
      bixtok_am_official: { Args: never; Returns: boolean }
      bixtok_am_owner1: { Args: never; Returns: boolean }
      bixtok_can_bypass: { Args: never; Returns: boolean }
      bixtok_claim_earnings: { Args: never; Returns: Json }
      bixtok_end_live: { Args: { p_id: string }; Returns: undefined }
      bixtok_is_official: { Args: { p_uid: string }; Returns: boolean }
      bixtok_is_tier_host: { Args: { p_uid: string }; Returns: boolean }
      bixtok_like: { Args: { p_video: string }; Returns: undefined }
      bixtok_live_backdrop: {
        Args: { p_backdrop: string; p_cam_off: boolean; p_live: string }
        Returns: undefined
      }
      bixtok_live_like: {
        Args: { p_live: string; p_n: number }
        Returns: number
      }
      bixtok_live_moderate: {
        Args: { p_msg: string; p_mute: boolean }
        Returns: undefined
      }
      bixtok_live_pin: {
        Args: { p_live: string; p_text: string }
        Returns: undefined
      }
      bixtok_live_showcase: {
        Args: { p_key: string; p_live: string }
        Returns: undefined
      }
      bixtok_live_top: {
        Args: { p_live: string }
        Returns: {
          currency: string
          name: string
          total: number
        }[]
      }
      bixtok_media_published: { Args: { p_name: string }; Returns: boolean }
      bixtok_my_earnings: { Args: never; Returns: Json }
      bixtok_my_stake_usd: { Args: never; Returns: number }
      bixtok_official_add: {
        Args: { p_code: string; p_name: string }
        Returns: string
      }
      bixtok_official_remove: { Args: { p_user: string }; Returns: undefined }
      bixtok_pk_end: { Args: { p_live: string }; Returns: undefined }
      bixtok_pk_score: {
        Args: { p_live: string }
        Returns: {
          a_score: number
          b_score: number
        }[]
      }
      bixtok_pk_start: {
        Args: { p_a: string; p_b: string; p_live: string; p_minutes: number }
        Returns: Json
      }
      bixtok_publish: {
        Args: {
          p_allow_gifts: boolean
          p_caption: string
          p_filter: string
          p_kind: string
          p_overlay: string
          p_path: string
        }
        Returns: string
      }
      bixtok_publish_clip: {
        Args: { p_live: string; p_path: string }
        Returns: string
      }
      bixtok_publish_links: {
        Args: {
          p_allow_gifts: boolean
          p_caption: string
          p_filter: string
          p_music_title: string
          p_music_url: string
          p_overlay: string
          p_text_style: Json
          p_urls: string[]
        }
        Returns: number
      }
      bixtok_publish_replay: {
        Args: { p_live: string; p_part: number; p_path: string }
        Returns: string
      }
      bixtok_reminder_counts: {
        Args: never
        Returns: {
          n: number
          schedule_id: string
        }[]
      }
      bixtok_send_gift: {
        Args: { p_gift: string; p_live: string; p_video: string }
        Returns: string
      }
      bixtok_send_gift_to: {
        Args: { p_gift: string; p_live: string; p_to: string; p_video: string }
        Returns: string
      }
      bixtok_stage_decide: {
        Args: { p_req: string; p_status: string }
        Returns: undefined
      }
      bixtok_stage_request: { Args: { p_live: string }; Returns: string }
      bixtok_start_live: { Args: { p_title: string }; Returns: string }
      bixtok_start_official_live: { Args: { p_title: string }; Returns: string }
      bixtok_vip_hosts: { Args: { p_uids: string[] }; Returns: string[] }
      bixtok_visible_to_me: { Args: { p_other: string }; Returns: boolean }
      bixtrade_admin_virtual_deposit: {
        Args: { p_amount: number; p_strategy?: string }
        Returns: Json
      }
      bixtrade_bonus_review: {
        Args: { p_approve: boolean; p_id: string }
        Returns: undefined
      }
      bixtrade_review: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: Json
      }
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
