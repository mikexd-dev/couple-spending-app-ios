export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AccountType =
  | "checking"
  | "savings"
  | "credit"
  | "cash"
  | "investment"
  | "other";

export type TransactionType = "expense" | "income" | "transfer";

export type BudgetPeriod = "weekly" | "monthly" | "yearly";

export type BillFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          couple_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          couple_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          couple_id?: string | null;
          updated_at?: string;
        };
      };
      couples: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          invite_code?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          couple_id: string;
          name: string;
          type: AccountType;
          currency: string;
          balance: number;
          icon: string | null;
          is_shared: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          name: string;
          type: AccountType;
          currency?: string;
          balance?: number;
          icon?: string | null;
          is_shared?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: AccountType;
          currency?: string;
          balance?: number;
          icon?: string | null;
          is_shared?: boolean;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          couple_id: string;
          account_id: string | null;
          amount: number;
          type: TransactionType;
          category: string;
          description: string | null;
          date: string;
          is_split: boolean;
          split_ratio: number | null;
          paid_by: string | null;
          receipt_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          account_id?: string | null;
          amount: number;
          type: TransactionType;
          category?: string;
          description?: string | null;
          date?: string;
          is_split?: boolean;
          split_ratio?: number | null;
          paid_by?: string | null;
          receipt_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string | null;
          amount?: number;
          type?: TransactionType;
          category?: string;
          description?: string | null;
          date?: string;
          is_split?: boolean;
          split_ratio?: number | null;
          paid_by?: string | null;
          receipt_url?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          couple_id: string;
          category: string;
          amount: number;
          spent: number;
          period: BudgetPeriod;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          category: string;
          amount: number;
          spent?: number;
          period?: BudgetPeriod;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          amount?: number;
          spent?: number;
          period?: BudgetPeriod;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          couple_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          target_date: string | null;
          icon: string | null;
          color: string | null;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          target_date?: string | null;
          icon?: string | null;
          color?: string | null;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          target_amount?: number;
          current_amount?: number;
          target_date?: string | null;
          icon?: string | null;
          color?: string | null;
          is_completed?: boolean;
          updated_at?: string;
        };
      };
      bills: {
        Row: {
          id: string;
          couple_id: string;
          name: string;
          amount: number;
          category: string;
          due_day: number;
          frequency: BillFrequency;
          is_auto_pay: boolean;
          is_active: boolean;
          last_paid_date: string | null;
          next_due_date: string | null;
          assigned_to: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          name: string;
          amount: number;
          category?: string;
          due_day: number;
          frequency?: BillFrequency;
          is_auto_pay?: boolean;
          is_active?: boolean;
          last_paid_date?: string | null;
          next_due_date?: string | null;
          assigned_to?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          amount?: number;
          category?: string;
          due_day?: number;
          frequency?: BillFrequency;
          is_auto_pay?: boolean;
          is_active?: boolean;
          last_paid_date?: string | null;
          next_due_date?: string | null;
          assigned_to?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
    };
    Functions: {
      create_couple: {
        Args: { couple_name?: string };
        Returns: string;
      };
      join_couple: {
        Args: { code: string };
        Returns: string;
      };
      regenerate_invite_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_my_couple_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
  };
}
