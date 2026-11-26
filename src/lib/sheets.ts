import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

// Sheet names
export const SHEETS = {
  USERS: 'users',
  CATEGORIES: 'categories',
  TRANSACTIONS: 'transactions',
  BUDGETS: 'budgets',
  SETTINGS: 'settings',
};

// Headers for each sheet
const HEADERS: Record<string, string[]> = {
  users: ['id', 'email', 'password', 'name', 'createdAt'],
  categories: ['id', 'userId', 'name', 'icon', 'typeScope', 'createdAt'],
  transactions: ['id', 'userId', 'amount', 'type', 'note', 'categoryId', 'date', 'createdAt', 'details'],
  budgets: ['id', 'userId', 'amount', 'categoryId', 'period', 'createdAt'],
  settings: ['userId', 'monthlyCutoffDay'],
};

export async function initSheets() {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = res.data.sheets?.map(s => s.properties?.title) || [];

  const requests = [];
  for (const name of Object.values(SHEETS)) {
    if (!existingSheets.includes(name)) {
      requests.push({ addSheet: { properties: { title: name } } });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody: { requests } });
    // Add headers
    for (const [name, headers] of Object.entries(HEADERS)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${name}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    }
  }
}

export async function getRows(sheet: string): Promise<Record<string, string>[]> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A1:Z`,
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return [];

  let headers = rows[0];
  // New columns appended to HEADERS (e.g. transactions.details): fill the
  // missing header cells once so existing spreadsheets keep working.
  const expected = HEADERS[sheet];
  if (expected && expected.length > headers.length && headers.every((h, i) => h === expected[i])) {
    headers = expected;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheet}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [expected] },
    });
  }
  return rows.slice(1).map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  );
}

export async function appendRow(sheet: string, data: Record<string, string>) {
  const sheets = await getSheets();
  const headers = HEADERS[sheet];
  const row = headers.map(h => data[h] ?? '');

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

export async function updateRow(sheet: string, rowIndex: number, data: Record<string, string>) {
  const sheets = await getSheets();
  const headers = HEADERS[sheet];
  const row = headers.map(h => data[h] ?? '');
  const sheetRow = rowIndex + 2; // +1 for header, +1 for 1-based index

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

export async function deleteRow(sheet: string, rowIndex: number) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetMeta = res.data.sheets?.find(s => s.properties?.title === sheet);
  const sheetId = sheetMeta?.properties?.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex + 1, // +1 for header
            endIndex: rowIndex + 2,
          },
        },
      }],
    },
  });
}

// Only let editable fields through from a request body (never id/userId/createdAt)
export function pick(body: any, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) if (body?.[k] !== undefined && body[k] !== null) out[k] = String(body[k]);
  return out;
}

export type Detail = { name: string; qty: number; price: number };

// Validate receipt line items from a client/AI payload → clean array (max 50)
export function cleanDetails(input: any): Detail[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 50)
    .map((d: any) => ({
      name: String(d?.name || '').trim().slice(0, 80),
      qty: Math.max(1, Math.round(Number(d?.qty) || 1)),
      price: Math.max(0, Math.round(Number(d?.price) || 0)),
    }))
    .filter((d) => d.name);
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
