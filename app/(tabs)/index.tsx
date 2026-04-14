import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useColorScheme,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Text, View } from "@/components/Themed";
import { useAuth } from "@/lib/auth-context";
import {
  DashboardData,
  fetchDashboardData,
  formatCurrency,
  formatDate,
  getCategoryColor,
  getCategoryIcon,
  getBalanceByUser,
  getRecentTransactionsForUser,
  getTotalBalance,
  getUpcomingBills,
} from "@/lib/dashboard";
import {
  subscribeToTransactions,
  subscribeToBudgets,
  subscribeToBills,
  subscribeToTable,
  unsubscribe,
} from "@/lib/realtime";

type ViewMode = "our" | "mine";

export default function DashboardScreen() {
  const { profile, session } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [viewMode, setViewMode] = useState<ViewMode>("our");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const coupleId = profile?.couple_id;
  const userId = session?.user.id;

  const loadData = useCallback(async () => {
    if (!coupleId || !userId) return;
    try {
      const result = await fetchDashboardData(coupleId, userId);
      setData(result);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coupleId, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!coupleId) return;

    const txChannel = subscribeToTransactions(coupleId, {
      onInsert: () => loadData(),
      onUpdate: () => loadData(),
      onDelete: () => loadData(),
    });
    const budgetChannel = subscribeToBudgets(coupleId, {
      onInsert: () => loadData(),
      onUpdate: () => loadData(),
    });
    const billChannel = subscribeToBills(coupleId, {
      onInsert: () => loadData(),
      onUpdate: () => loadData(),
    });
    const accountChannel = subscribeToTable("accounts", coupleId, {
      onInsert: () => loadData(),
      onUpdate: () => loadData(),
    });

    return () => {
      unsubscribe(txChannel);
      unsubscribe(budgetChannel);
      unsubscribe(billChannel);
      unsubscribe(accountChannel);
    };
  }, [coupleId, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2f95dc" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Unable to load dashboard</Text>
      </View>
    );
  }

  const totalBalance = getTotalBalance(data.accounts);
  const myBalance = userId ? getBalanceByUser(data.accounts, userId) : 0;
  const displayBalance = viewMode === "our" ? totalBalance : myBalance;

  const transactions =
    viewMode === "our"
      ? data.transactions
      : userId
        ? getRecentTransactionsForUser(data.transactions, userId)
        : [];

  const upcomingBills = getUpcomingBills(data.bills);

  const partnerName = data.partnerProfile?.display_name ?? "Partner";
  const myName = profile?.display_name ?? "Me";

  return (
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* View Toggle */}
      <View style={styles.toggleContainer}>
        <Pressable
          style={[
            styles.toggleButton,
            viewMode === "our" && styles.toggleActive,
          ]}
          onPress={() => setViewMode("our")}
        >
          <Text
            style={[
              styles.toggleText,
              viewMode === "our" && styles.toggleTextActive,
            ]}
          >
            Our View
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleButton,
            viewMode === "mine" && styles.toggleActive,
          ]}
          onPress={() => setViewMode("mine")}
        >
          <Text
            style={[
              styles.toggleText,
              viewMode === "mine" && styles.toggleTextActive,
            ]}
          >
            My View
          </Text>
        </Pressable>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>
          {viewMode === "our" ? "Combined Balance" : "My Balance"}
        </Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(displayBalance)}
        </Text>
        {viewMode === "our" && data.accounts.length > 0 && (
          <Text style={styles.accountCount}>
            {data.accounts.length} account
            {data.accounts.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {/* Budget Progress */}
      {data.budgets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Progress</Text>
          {data.budgets.map((budget) => {
            const progress = budget.amount > 0 ? budget.spent / budget.amount : 0;
            const isOverBudget = progress > 1;
            const barColor = isOverBudget
              ? "#EF4444"
              : progress > 0.8
                ? "#F59E0B"
                : "#10B981";

            return (
              <View key={budget.id} style={styles.budgetItem}>
                <View style={styles.budgetHeader}>
                  <View style={styles.budgetLabelRow}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: getCategoryColor(budget.category) },
                      ]}
                    />
                    <Text style={styles.budgetCategory}>{budget.category}</Text>
                  </View>
                  <Text style={styles.budgetAmounts}>
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(progress * 100, 100)}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptySection}>
            <FontAwesome
              name="exchange"
              size={24}
              color={isDark ? "#555" : "#ccc"}
            />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          transactions.slice(0, 10).map((tx) => {
            const isExpense = tx.type === "expense";
            return (
              <View key={tx.id} style={styles.txRow}>
                <View
                  style={[
                    styles.txIcon,
                    { backgroundColor: getCategoryColor(tx.category) + "20" },
                  ]}
                >
                  <FontAwesome
                    name={getCategoryIcon(tx.category) as any}
                    size={16}
                    color={getCategoryColor(tx.category)}
                  />
                </View>
                <View style={styles.txDetails}>
                  <Text style={styles.txCategory}>{tx.category}</Text>
                  <Text style={styles.txDescription}>
                    {tx.description ?? tx.category} · {formatDate(tx.date)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    { color: isExpense ? "#EF4444" : "#10B981" },
                  ]}
                >
                  {isExpense ? "-" : "+"}
                  {formatCurrency(tx.amount)}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* Upcoming Bills */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Bills</Text>
        {upcomingBills.length === 0 && data.bills.length === 0 ? (
          <View style={styles.emptySection}>
            <FontAwesome
              name="calendar"
              size={24}
              color={isDark ? "#555" : "#ccc"}
            />
            <Text style={styles.emptyText}>No upcoming bills</Text>
          </View>
        ) : upcomingBills.length === 0 ? (
          <View style={styles.emptySection}>
            <FontAwesome
              name="check-circle"
              size={24}
              color="#10B981"
            />
            <Text style={styles.emptyText}>All caught up!</Text>
          </View>
        ) : (
          upcomingBills.map((bill) => {
            const dueDate = bill.next_due_date
              ? new Date(bill.next_due_date)
              : null;
            const today = new Date();
            const daysUntilDue = dueDate
              ? Math.ceil(
                  (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                )
              : null;
            const isUrgent = daysUntilDue !== null && daysUntilDue <= 3;

            return (
              <View key={bill.id} style={styles.billRow}>
                <View style={styles.billLeft}>
                  <View
                    style={[
                      styles.billIcon,
                      {
                        backgroundColor: isUrgent
                          ? "#FEE2E2"
                          : "#E0F2FE",
                      },
                    ]}
                  >
                    <FontAwesome
                      name="file-text-o"
                      size={16}
                      color={isUrgent ? "#EF4444" : "#3B82F6"}
                    />
                  </View>
                  <View>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billDue}>
                      {dueDate
                        ? `Due ${formatDate(bill.next_due_date!)}`
                        : `Day ${bill.due_day}`}
                      {bill.is_auto_pay && " · Auto-pay"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.billAmount}>
                  {formatCurrency(bill.amount)}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  containerDark: {
    backgroundColor: "#0F172A",
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Toggle
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  toggleTextActive: {
    color: "#1E293B",
  },

  // Balance
  balanceCard: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
  },
  balanceLabel: {
    color: "#BFDBFE",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  balanceAmount: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -1,
  },
  accountCount: {
    color: "#93C5FD",
    fontSize: 13,
    marginTop: 8,
  },

  // Sections
  section: {
    marginBottom: 24,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1E293B",
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "transparent",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 8,
  },

  // Budget
  budgetItem: {
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    backgroundColor: "transparent",
  },
  budgetLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  budgetCategory: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    textTransform: "capitalize",
  },
  budgetAmounts: {
    fontSize: 13,
    color: "#64748B",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },

  // Transactions
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "transparent",
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
    backgroundColor: "transparent",
  },
  txCategory: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    textTransform: "capitalize",
  },
  txDescription: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Bills
  billRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "transparent",
  },
  billLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: "transparent",
  },
  billIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  billName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  billDue: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },
  billAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
});
