import { supabase } from "./supabase";

/**
 * Extract the spreadsheet ID from a Google Sheets URL.
 * e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
 *   → "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
 */
export function extractSheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : urlOrId;
}

export async function getGoogleSheetsSettings() {
  const { data, error } = await supabase
    .from("couple_settings")
    .select("google_sheet_id, google_sheets_enabled")
    .single();

  return { settings: data, error };
}

export async function enableGoogleSheetsSync(sheetUrlOrId: string) {
  const sheetId = extractSheetId(sheetUrlOrId);

  const { data, error } = await supabase
    .from("couple_settings")
    .update({
      google_sheet_id: sheetId,
      google_sheets_enabled: true,
    })
    .select()
    .single();

  return { settings: data, error };
}

export async function disableGoogleSheetsSync() {
  const { data, error } = await supabase
    .from("couple_settings")
    .update({ google_sheets_enabled: false })
    .select()
    .single();

  return { settings: data, error };
}

/**
 * Manually trigger a full sync of all transactions to Google Sheets.
 * Calls the Edge Function with a special "full_sync" flag.
 */
export async function triggerFullSync() {
  const { data: settings } = await supabase
    .from("couple_settings")
    .select("couple_id, google_sheet_id")
    .single();

  if (!settings?.google_sheet_id) {
    return { error: new Error("No Google Sheet configured") };
  }

  const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
    body: {
      type: "FULL_SYNC",
      couple_id: settings.couple_id,
    },
  });

  return { data, error };
}
