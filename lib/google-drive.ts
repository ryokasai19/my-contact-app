// lib/google-drive.ts

import { google } from "googleapis";
import { auth } from "./google-api-client";
import { Readable } from "stream";

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";

const drive = google.drive({ version: "v3", auth });

function bufferToStream(buffer: Buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export async function getOrCreateCompanyFolder(companyName: string): Promise<string> {
  try {
    const safeFolderName = companyName.replace(/[<>:"/\\|?*]/g, "_").trim() || "Unknown_Company";
    const searchResponse = await drive.files.list({
      q: `name='${safeFolderName}' and mimeType='application/vnd.google-apps.folder' and parents in '${GOOGLE_DRIVE_FOLDER_ID}' and trashed=false`,
      fields: "files(id)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      return searchResponse.data.files[0].id!;
    }

    const createResponse = await drive.files.create({
      requestBody: { name: safeFolderName, mimeType: "application/vnd.google-apps.folder", parents: [GOOGLE_DRIVE_FOLDER_ID] },
      fields: "id",
      supportsAllDrives: true,
    });
    return createResponse.data.id!;
  } catch (error) {
    console.error("Error in getOrCreateCompanyFolder:", error);
    throw error;
  }
}

async function uploadFileToDrive(fileBuffer: Buffer, fileName: string, mimeType: string, folderId: string): Promise<string> {
  const response = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType: mimeType || 'application/octet-stream', body: bufferToStream(fileBuffer) },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });
  return response.data.webViewLink!;
}

export async function uploadMultipleFiles(
  files: Array<{ buffer: Buffer; fileName: string; mimeType: string }>,
  companyName: string
): Promise<{ folderId: string; folderLink: string; fileLinks: string[] }> {
  try {
    const folderId = await getOrCreateCompanyFolder(companyName);
    const folderLink = `https://drive.google.com/drive/folders/${folderId}`;
    const fileLinks: string[] = [];

    for (const file of files) {
      const fileLink = await uploadFileToDrive(file.buffer, file.fileName, file.mimeType, folderId);
      fileLinks.push(fileLink);
    }

    return { folderId, folderLink, fileLinks };
  } catch (error) {
    console.error("Error in uploadMultipleFiles:", error);
    throw error;
  }
}

// ✅ ADDING THIS FUNCTION BACK
export async function getFolderInfo(folderId: string) {
  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error getting folder info:", error);
    throw error;
  }
}