// lib/google-api-client.ts

import { google } from "googleapis";

// This function remains mostly the same
function createGoogleAuth() {
  try {
    const base64Credentials = process.env.GOOGLE_CREDENTIALS_BASE64;
    if (!base64Credentials) {
      throw new Error("GOOGLE_CREDENTIALS_BASE64 environment variable is not set");
    }
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const authConfig = JSON.parse(credentials);

    const scopes = [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ];

    const jwtClient = new google.auth.JWT({
      email: authConfig.client_email,
      key: authConfig.private_key.replace(/\\n/g, "\n"),
      scopes,
    });

    return jwtClient;
  } catch (error) {
    console.error("Error setting up Google API auth:", error);
    throw error;
  }
}

// Create and export the auth client directly
export const auth = createGoogleAuth();