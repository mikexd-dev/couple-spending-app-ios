import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL")!;
const GOOGLE_PRIVATE_KEY = Deno.env.get("GOOGLE_PRIVATE_KEY")!.replace(/\\n/g, "\n");

// --- Google Auth: generate JWT and exchange for access token ---

async function getGoogleAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const unsignedToken = `${enc(header)}.${enc(payload)}`;

  const keyData = GOOGLE_PRIVATE_KEY
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${sig}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await resp.json();
  if (!data.access_token) throw new Error(`Google auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// --- Google Sheets helpers ---

async function getOrCreateSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<void> {
  const metaResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const meta = await metaResp.json();
  const exists = meta.sheets?.some(
    (s: { properties: { title: string } }) => s.properties.title === sheetTitle
  );

  if (!exists) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: sheetTitle } } }],
        }),
      }
    );

    // Write header row
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:L1?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[
            "ID", "Date", "Type", "Category", "Description",
            "Amount", "Paid By", "Split?", "Split Ratio %",
            "Account", "Notes", "Last Updated",
          ]],
        }),
      }
    );
  }
}

async function appendRows(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  rows: string[][]
): Promise<void> {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A:L:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: rows }),
    }
  );
}

async function updateRow(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  transactionId: string,
  row: string[]
): Promise<void> {
  // Find the row by transaction ID in column A
  const searchResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A:A`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchResp.json();
  const values: string[][] = searchData.values || [];
  const rowIndex = values.findIndex((r: string[]) => r[0] === transactionId);

  if (rowIndex === -1) {
    await appendRows(accessToken, spreadsheetId, sheetTitle, [row]);
    return;
  }

  const range = `${sheetTitle}!A${rowIndex + 1}:L${rowIndex + 1}`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    }
  );
}

async function deleteRow(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  transactionId: string
): Promise<void> {
  // Find and clear the row (Sheets API doesn't do true row delete easily via values API)
  const searchResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A:A`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchResp.json();
  const values: string[][] = searchData.values || [];
  const rowIndex = values.findIndex((r: string[]) => r[0] === transactionId);

  if (rowIndex === -1) return;

  // Get the sheet ID for batchUpdate
  const metaResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const meta = await metaResp.json();
  const sheet = meta.sheets?.find(
    (s: { properties: { title: string; sheetId: number } }) =>
      s.properties.title === sheetTitle
  );
  if (!sheet) return;

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        }],
      }),
    }
  );
}

// --- Main handler ---

// --- Full sync: dump all transactions for a couple ---

async function handleFullSync(
  supabase: ReturnType<typeof createClient>,
  coupleId: string,
  spreadsheetId: string,
  accessToken: string,
  sheetTitle: string
): Promise<Response> {
  await getOrCreateSheet(accessToken, spreadsheetId, sheetTitle);

  // Clear existing data (keep header)
  const metaResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const meta = await metaResp.json();
  const sheet = meta.sheets?.find(
    (s: { properties: { title: string; sheetId: number } }) =>
      s.properties.title === sheetTitle
  );
  if (sheet) {
    // Clear everything below the header
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A2:L?clear`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
  }

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, profiles!transactions_paid_by_fkey(display_name, email), accounts!transactions_account_id_fkey(name)")
    .eq("couple_id", coupleId)
    .order("date", { ascending: false });

  if (!transactions || transactions.length === 0) {
    return new Response(JSON.stringify({ success: true, synced: 0 }), { status: 200 });
  }

  const rows = transactions.map((t: any) => [
    t.id,
    t.date,
    t.type,
    t.category,
    t.description || "",
    String(t.amount),
    t.profiles?.display_name || t.profiles?.email || "",
    t.is_split ? "Yes" : "No",
    t.is_split ? String(t.split_ratio) : "",
    t.accounts?.name || "",
    t.notes || "",
    t.updated_at,
  ]);

  await appendRows(accessToken, spreadsheetId, sheetTitle, rows);

  return new Response(JSON.stringify({ success: true, synced: rows.length }), { status: 200 });
}

// --- Main handler ---

serve(async (req) => {
  try {
    const body = await req.json();
    const { type, record, old_record, table } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle full sync request from the app
    if (type === "FULL_SYNC") {
      const coupleId = body.couple_id;
      if (!coupleId) {
        return new Response(JSON.stringify({ error: "No couple_id" }), { status: 400 });
      }

      const { data: settings } = await supabase
        .from("couple_settings")
        .select("google_sheet_id, google_sheets_enabled")
        .eq("couple_id", coupleId)
        .single();

      if (!settings?.google_sheet_id || !settings.google_sheets_enabled) {
        return new Response(JSON.stringify({ error: "Google Sheets sync not configured" }), { status: 400 });
      }

      const accessToken = await getGoogleAccessToken();
      return handleFullSync(supabase, coupleId, settings.google_sheet_id, accessToken, "Transactions");
    }

    // Handle webhook events from transaction changes
    if (table !== "transactions") {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const coupleId = record?.couple_id || old_record?.couple_id;
    if (!coupleId) {
      return new Response(JSON.stringify({ error: "No couple_id" }), { status: 400 });
    }

    const { data: settings } = await supabase
      .from("couple_settings")
      .select("google_sheet_id, google_sheets_enabled")
      .eq("couple_id", coupleId)
      .single();

    if (!settings?.google_sheet_id || !settings.google_sheets_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "Google Sheets sync not enabled" }), { status: 200 });
    }

    const spreadsheetId = settings.google_sheet_id;
    const sheetTitle = "Transactions";
    const accessToken = await getGoogleAccessToken();

    await getOrCreateSheet(accessToken, spreadsheetId, sheetTitle);

    // Resolve paid_by user name
    let paidByName = "";
    const paidById = record?.paid_by || old_record?.paid_by;
    if (paidById) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", paidById)
        .single();
      paidByName = profile?.display_name || profile?.email || paidById;
    }

    // Resolve account name
    let accountName = "";
    const accountId = record?.account_id;
    if (accountId) {
      const { data: account } = await supabase
        .from("accounts")
        .select("name")
        .eq("id", accountId)
        .single();
      accountName = account?.name || "";
    }

    const toRow = (r: typeof record): string[] => [
      r.id,
      r.date,
      r.type,
      r.category,
      r.description || "",
      String(r.amount),
      paidByName,
      r.is_split ? "Yes" : "No",
      r.is_split ? String(r.split_ratio) : "",
      accountName,
      r.notes || "",
      r.updated_at,
    ];

    if (type === "INSERT") {
      await appendRows(accessToken, spreadsheetId, sheetTitle, [toRow(record)]);
    } else if (type === "UPDATE") {
      await updateRow(accessToken, spreadsheetId, sheetTitle, record.id, toRow(record));
    } else if (type === "DELETE") {
      await deleteRow(accessToken, spreadsheetId, sheetTitle, old_record.id);
    }

    return new Response(JSON.stringify({ success: true, type }), { status: 200 });
  } catch (err) {
    console.error("Google Sheets sync error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
