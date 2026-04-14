import { supabase } from "./supabase";
import { Database } from "./database.types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Budget = Database["public"]["Tables"]["budgets"]["Row"];
type Bill = Database["public"]["Tables"]["bills"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface DashboardData {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  partnerProfile: Profile | null;
}

export async function fetchDashboardData(
  coupleId: string,
  userId: string
): Promise<DashboardData> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [accountsRes, txRes, budgetsRes, billsRes, partnerRes] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false }),

      supabase
        .from("transactions")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: false })
        .limit(20),

      supabase
        .from("budgets")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("is_active", true)
        .order("category", { ascending: true }),

      supabase
        .from("bills")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("is_active", true)
        .order("next_due_date", { ascending: true })
        .limit(10),

      supabase
        .from("profiles")
        .select("*")
        .eq("couple_id", coupleId)
        .neq("id", userId)
        .single(),
    ]);

  return {
    accounts: accountsRes.data ?? [],
    transactions: txRes.data ?? [],
    budgets: budgetsRes.data ?? [],
    bills: billsRes.data ?? [],
    partnerProfile: partnerRes.data,
  };
}

export function getTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, acc) => {
    if (acc.type === "credit") return sum - acc.balance;
    return sum + acc.balance;
  }, 0);
}

export function getBalanceByUser(
  accounts: Account[],
  userId: string
): number {
  return accounts
    .filter((a) => !a.is_shared && a.created_by === userId)
    .reduce((sum, acc) => {
      if (acc.type === "credit") return sum - acc.balance;
      return sum + acc.balance;
    }, 0);
}

export function getRecentTransactionsForUser(
  transactions: Transaction[],
  userId: string
): Transaction[] {
  return transactions.filter((t) => t.paid_by === userId);
}

export function getUpcomingBills(bills: Bill[]): Bill[] {
  const today = new Date();
  const twoWeeksOut = new Date(today);
  twoWeeksOut.setDate(today.getDate() + 14);

  return bills.filter((b) => {
    if (!b.next_due_date) return false;
    const due = new Date(b.next_due_date);
    return due >= today && due <= twoWeeksOut;
  });
}

export function formatCurrency(amount: number, currency = "SGD"): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
  });
}

const CATEGORY_ICONS: Record<string, string> = {
  food: "cutlery",
  transport: "car",
  shopping: "shopping-bag",
  entertainment: "film",
  health: "heartbeat",
  education: "graduation-cap",
  bills: "file-text",
  rent: "home",
  utilities: "bolt",
  groceries: "shopping-cart",
  travel: "plane",
  other: "ellipsis-h",
};

export function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category.toLowerCase()] ?? "tag";
}

const CATEGORY_COLORS: Record<string, string> = {
  food: "#FF6B6B",
  transport: "#4ECDC4",
  shopping: "#FFE66D",
  entertainment: "#A78BFA",
  health: "#F472B6",
  education: "#60A5FA",
  bills: "#FB923C",
  rent: "#34D399",
  utilities: "#FBBF24",
  groceries: "#6EE7B7",
  travel: "#818CF8",
  other: "#94A3B8",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] ?? "#94A3B8";
}
