import { google } from "googleapis"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Missing email or password" }, { status: 400 })
    }

    let credentials = {}
    const rawCredentials = process.env.GOOGLE_SHEETS_CREDENTIALS
    credentials = rawCredentials ? JSON.parse(rawCredentials.trim()) : {}

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth })
    const spreadsheetId = process.env.GOOGLE_SHEET_ID

    if (!spreadsheetId) {
      return NextResponse.json({ success: false, message: "Missing spreadsheet ID" }, { status: 500 })
    }

    const range = "Credentials!A:C" // Adjust range as needed
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    })

    const rows = response.data.values

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, message: "No credentials found in spreadsheet" }, { status: 401 })
    }

    const foundCredential = rows.find((row) => row[0] === email && row[1] === password)

    if (foundCredential) {
      const role = foundCredential[2] || "viewer" // Default to 'viewer' if role is not specified
      return NextResponse.json({ success: true, message: "Credentials valid", role }, { status: 200 })
    } else {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }
  } catch (error: any) {
    console.error("Error during credential check:", error)
    return NextResponse.json(
      { success: false, message: "Error during credential check", error: error.message },
      { status: 500 },
    )
  }
}
