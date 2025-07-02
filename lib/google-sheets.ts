// lib/google-sheets.ts

import { google } from "googleapis";
import { auth } from "./google-api-client";

const sheets = google.sheets({ version: "v4", auth });

interface SheetData {
  company: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  badgeId: string;
  transcription: string;
  summary: string;
  folderLink: string;
  imageLink: string;
  audioLink: string;
  timestamp?: string;
}

async function ensureHeaderRow(spreadsheetId: string) {
  try {
    const headerResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: "A1:L1" });
    const headers = headerResponse.data.values?.[0];
    if (!headers || headers.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "A1:L1",
        valueInputOption: "RAW",
        requestBody: {
          values: [
            ["会社名", "氏名", "メールアドレス", "電話番号", "役職", "バッジID", "音声文字起こし", "音声要約", "フォルダリンク", "画像リンク", "音声リンク", "登録日時"],
          ],
        },
      });
    }
  } catch (error) {
    console.log("Could not check/add headers, proceeding with data append.");
  }
}

export async function appendToSheet(data: SheetData) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  await ensureHeaderRow(spreadsheetId);
  const timestamp = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "A:L",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[data.company, data.name, data.email, data.phone, data.jobTitle, data.badgeId, data.transcription, data.summary, data.folderLink, data.imageLink, data.audioLink, timestamp]],
    },
  });
  console.log("Data appended to sheet successfully.");
}

// ✅ ADD THIS FUNCTION BACK
export async function appendMultipleToSheet(dataArray: SheetData[]) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  await ensureHeaderRow(spreadsheetId);
  const timestamp = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  const values = dataArray.map((data) => [data.company, data.name, data.email, data.phone, data.jobTitle, data.badgeId, data.transcription, data.summary, data.folderLink, data.imageLink, data.audioLink, timestamp]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "A:L",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
  console.log(`${dataArray.length} records appended to sheet successfully.`);
}