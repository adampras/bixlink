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
      bix_leaders: {
        Row: {
          created_at: string
          require_turnover: boolean
          reviewed_at: string | null
          status: string
          turnover_multiple: number
          user_id: string
          virtual_usd: number
        }
        Insert: {
          created_at?: string
          require_turnover?: boolean
          reviewed_at?: string | null
          status?: string
          turnover_multiple?: number
          user_id: string
          virtual_usd?: number
        }
        Update: {
          created_at?: string
          require_turnover?: boolean
          reviewed_at?: string | null
          status?: string
          turnover_multiple?: number
          user_id?: string
          virtual_usd?: number
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
          daily_profit_enabled: boolean
          id: string
          lock_days: number
          price_usd: number
        }
        Insert: {
          apy: number
          daily_profit_enabled?: boolean
          id: string
          lock_days: number
          price_usd: number
        }
        Update: {
          apy?: number
          daily_profit_enabled?: boolean
          id?: string
          lock_days?: number
          price_usd?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string
          user_id?: string
          username?: string
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
          created_at: string
          funded_vusdt: boolean
          id: string
          lock_days: number
          package_id: string
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
          created_at?: string
          funded_vusdt?: boolean
          id?: string
          lock_days: number
          package_id: string
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
          created_at?: string
          funded_vusdt?: boolean
          id?: string
          lock_days?: number
          package_id?: string
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
          status?: string
          tx_hash?: string | null
          type?: string
          user_id?: string
          verified_at?: string | null
          wallet_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      bix_asset_balances: {
        Args: { p_user: string }
        Returns: {
          bix_balance: number
          usdt_balance: number
        }[]
      }
      bix_feature_enabled: { Args: { p_feature: string }; Returns: boolean }
      bix_leader_status: { Args: { p_user: string }; Returns: Json }
      bix_owner_vault: { Args: never; Returns: Json }
      bix_pay_lookup: { Args: { p_code: string }; Returns: boolean }
      bix_pay_send: {
        Args: { p_amount: number; p_code: string; p_note: string }
        Returns: string
      }
      bix_public_home_stats: { Args: never; Returns: Json }
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
      bix_unstake: { Args: { p_stake: string }; Returns: Json }
      bix_unstake_penalty: {
        Args: { p_days: number; p_lock: number }
        Returns: number
      }
      bix_username_available: { Args: { p_username: string }; Returns: boolean }
      bix_vusdt_balance: { Args: { p_user: string }; Returns: number }
      bix_vusdt_component: { Args: { p_user: string }; Returns: number }
      bix_vusdt_send: {
        Args: { p_amount: number; p_code: string; p_note: string }
        Returns: string
      }
      bix_wallet_balance: { Args: { p_user: string }; Returns: number }
      ensure_bix_profile: { Args: never; Returns: undefined }
      is_bix_admin: { Args: never; Returns: boolean }
      request_bix_deposit: {
        Args: { p_amount: number; p_tx_hash: string }
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
