import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Database } from "./database.types";

type TableName = keyof Database["public"]["Tables"];
type RowOf<T extends TableName> = Database["public"]["Tables"][T]["Row"];

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

interface RealtimeCallbacks<T> {
  onInsert?: (record: T) => void;
  onUpdate?: (record: T, old: Partial<T>) => void;
  onDelete?: (old: Partial<T>) => void;
}

export function subscribeToTable<T extends TableName>(
  table: T,
  coupleId: string,
  callbacks: RealtimeCallbacks<RowOf<T>>
): RealtimeChannel {
  const channel = supabase
    .channel(`${table}:${coupleId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `couple_id=eq.${coupleId}`,
      },
      (payload) => {
        const event = payload.eventType as RealtimeEvent;
        if (event === "INSERT" && callbacks.onInsert) {
          callbacks.onInsert(payload.new as RowOf<T>);
        } else if (event === "UPDATE" && callbacks.onUpdate) {
          callbacks.onUpdate(
            payload.new as RowOf<T>,
            payload.old as Partial<RowOf<T>>
          );
        } else if (event === "DELETE" && callbacks.onDelete) {
          callbacks.onDelete(payload.old as Partial<RowOf<T>>);
        }
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribe(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}

export function subscribeToTransactions(
  coupleId: string,
  callbacks: RealtimeCallbacks<RowOf<"transactions">>
) {
  return subscribeToTable("transactions", coupleId, callbacks);
}

export function subscribeToBudgets(
  coupleId: string,
  callbacks: RealtimeCallbacks<RowOf<"budgets">>
) {
  return subscribeToTable("budgets", coupleId, callbacks);
}

export function subscribeToGoals(
  coupleId: string,
  callbacks: RealtimeCallbacks<RowOf<"goals">>
) {
  return subscribeToTable("goals", coupleId, callbacks);
}

export function subscribeToBills(
  coupleId: string,
  callbacks: RealtimeCallbacks<RowOf<"bills">>
) {
  return subscribeToTable("bills", coupleId, callbacks);
}
