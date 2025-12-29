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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accident_cases: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          status: string
          updated_at: string
          user1_data: Json | null
          user1_id: string
          user2_data: Json | null
          user2_session_id: string
          user2_user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          user1_data?: Json | null
          user1_id: string
          user2_data?: Json | null
          user2_session_id: string
          user2_user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          user1_data?: Json | null
          user1_id?: string
          user2_data?: Json | null
          user2_session_id?: string
          user2_user_id?: string | null
        }
        Relationships: []
      }
      claims: {
        Row: {
          accident_case_id: string | null
          created_at: string
          description: string | null
          has_witnesses: boolean | null
          id: string
          incident_location: string | null
          incident_time: string | null
          other_party_address: string | null
          other_party_agent_name: string | null
          other_party_coverage_type: string | null
          other_party_date_of_birth: string | null
          other_party_gender: string | null
          other_party_id_number: string | null
          other_party_insurance: string | null
          other_party_license_expiry: string | null
          other_party_license_number: string | null
          other_party_license_year_of_issue: number | null
          other_party_name: string | null
          other_party_phone: string | null
          other_party_policy_number: string | null
          other_party_policy_valid_from: string | null
          other_party_policy_valid_until: string | null
          other_party_policyholder_id: string | null
          other_party_policyholder_name: string | null
          other_party_vehicle: string | null
          other_party_vehicle_color: string | null
          other_party_vehicle_make: string | null
          other_party_vehicle_model: string | null
          other_party_vehicle_type: string | null
          other_party_vehicle_year: number | null
          pdf_url: string | null
          photos: string[] | null
          policy_id: string | null
          status: string | null
          updated_at: string
          user_id: string
          weather_conditions: string | null
          witness_1_address: string | null
          witness_1_name: string | null
          witness_1_phone: string | null
          witness_1_statement: string | null
          witness_2_address: string | null
          witness_2_name: string | null
          witness_2_phone: string | null
          witness_2_statement: string | null
        }
        Insert: {
          accident_case_id?: string | null
          created_at?: string
          description?: string | null
          has_witnesses?: boolean | null
          id?: string
          incident_location?: string | null
          incident_time?: string | null
          other_party_address?: string | null
          other_party_agent_name?: string | null
          other_party_coverage_type?: string | null
          other_party_date_of_birth?: string | null
          other_party_gender?: string | null
          other_party_id_number?: string | null
          other_party_insurance?: string | null
          other_party_license_expiry?: string | null
          other_party_license_number?: string | null
          other_party_license_year_of_issue?: number | null
          other_party_name?: string | null
          other_party_phone?: string | null
          other_party_policy_number?: string | null
          other_party_policy_valid_from?: string | null
          other_party_policy_valid_until?: string | null
          other_party_policyholder_id?: string | null
          other_party_policyholder_name?: string | null
          other_party_vehicle?: string | null
          other_party_vehicle_color?: string | null
          other_party_vehicle_make?: string | null
          other_party_vehicle_model?: string | null
          other_party_vehicle_type?: string | null
          other_party_vehicle_year?: number | null
          pdf_url?: string | null
          photos?: string[] | null
          policy_id?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          weather_conditions?: string | null
          witness_1_address?: string | null
          witness_1_name?: string | null
          witness_1_phone?: string | null
          witness_1_statement?: string | null
          witness_2_address?: string | null
          witness_2_name?: string | null
          witness_2_phone?: string | null
          witness_2_statement?: string | null
        }
        Update: {
          accident_case_id?: string | null
          created_at?: string
          description?: string | null
          has_witnesses?: boolean | null
          id?: string
          incident_location?: string | null
          incident_time?: string | null
          other_party_address?: string | null
          other_party_agent_name?: string | null
          other_party_coverage_type?: string | null
          other_party_date_of_birth?: string | null
          other_party_gender?: string | null
          other_party_id_number?: string | null
          other_party_insurance?: string | null
          other_party_license_expiry?: string | null
          other_party_license_number?: string | null
          other_party_license_year_of_issue?: number | null
          other_party_name?: string | null
          other_party_phone?: string | null
          other_party_policy_number?: string | null
          other_party_policy_valid_from?: string | null
          other_party_policy_valid_until?: string | null
          other_party_policyholder_id?: string | null
          other_party_policyholder_name?: string | null
          other_party_vehicle?: string | null
          other_party_vehicle_color?: string | null
          other_party_vehicle_make?: string | null
          other_party_vehicle_model?: string | null
          other_party_vehicle_type?: string | null
          other_party_vehicle_year?: number | null
          pdf_url?: string | null
          photos?: string[] | null
          policy_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          weather_conditions?: string | null
          witness_1_address?: string | null
          witness_1_name?: string | null
          witness_1_phone?: string | null
          witness_1_statement?: string | null
          witness_2_address?: string | null
          witness_2_name?: string | null
          witness_2_phone?: string | null
          witness_2_statement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_accident_case_id_fkey"
            columns: ["accident_case_id"]
            isOneToOne: false
            referencedRelation: "accident_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_claim_scans: {
        Row: {
          created_at: string
          id: string
          matched_at: string | null
          matched_user_id: string | null
          policy_id: string
          policy_owner_id: string
          scanned_at: string
          scanner_email: string
          scanner_phone: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_at?: string | null
          matched_user_id?: string | null
          policy_id: string
          policy_owner_id: string
          scanned_at?: string
          scanner_email: string
          scanner_phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_at?: string | null
          matched_user_id?: string | null
          policy_id?: string
          policy_owner_id?: string
          scanned_at?: string
          scanner_email?: string
          scanner_phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_claim_scans_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          agent_name: string | null
          coverage_type: string | null
          created_at: string
          id: string
          insurance_company: string | null
          is_active: boolean | null
          policy_number: string | null
          policyholder_id: string | null
          policyholder_name: string | null
          token: string
          updated_at: string
          user_id: string
          valid_from: string | null
          valid_until: string | null
          vehicle_id: string | null
        }
        Insert: {
          agent_name?: string | null
          coverage_type?: string | null
          created_at?: string
          id?: string
          insurance_company?: string | null
          is_active?: boolean | null
          policy_number?: string | null
          policyholder_id?: string | null
          policyholder_name?: string | null
          token?: string
          updated_at?: string
          user_id: string
          valid_from?: string | null
          valid_until?: string | null
          vehicle_id?: string | null
        }
        Update: {
          agent_name?: string | null
          coverage_type?: string | null
          created_at?: string
          id?: string
          insurance_company?: string | null
          is_active?: boolean | null
          policy_number?: string | null
          policyholder_id?: string | null
          policyholder_name?: string | null
          token?: string
          updated_at?: string
          user_id?: string
          valid_from?: string | null
          valid_until?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          gender: string | null
          id: string
          id_number: string | null
          license_expiry: string | null
          license_number: string | null
          license_year_of_issue: number | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          id_number?: string | null
          license_expiry?: string | null
          license_number?: string | null
          license_year_of_issue?: number | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          id_number?: string | null
          license_expiry?: string | null
          license_number?: string | null
          license_year_of_issue?: number | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          id: string
          make: string | null
          model: string | null
          updated_at: string
          user_id: string
          vehicle_number: string
          vehicle_type: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          updated_at?: string
          user_id: string
          vehicle_number: string
          vehicle_type?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          updated_at?: string
          user_id?: string
          vehicle_number?: string
          vehicle_type?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
