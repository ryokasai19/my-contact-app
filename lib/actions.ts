// lib/actions.ts

"use server";

import { processAudio } from "@/lib/openai";
import { extractInfoFromImage } from "@/lib/openai-vision";
import { appendToSheet, appendMultipleToSheet } from "@/lib/google-sheets";
import { uploadMultipleFiles } from "@/lib/google-drive";

export async function submitData(formData: FormData) {
  try {
    const imageFile = formData.get("image") as File;
    const audioFile = formData.get("audio") as File;

    if (!imageFile || imageFile.size === 0 || !audioFile || audioFile.size === 0) {
      return { success: false, error: "Image and audio files are required." };
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const [extractionResult, audioResult] = await Promise.all([
      extractInfoFromImage(imageBuffer),
      processAudio(audioFile)
    ]);

    const primaryCompany = extractionResult.cards[0]?.company || "Unknown_Company";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const imageFileName = `image_${timestamp}.${imageFile.type.split("/")[1] || "jpg"}`;
    const audioFileName = `audio_${timestamp}.${audioFile.type.split("/")[1] || "webm"}`;
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    const uploadResult = await uploadMultipleFiles(
      [
        { buffer: imageBuffer, fileName: imageFileName, mimeType: imageFile.type },
        { buffer: audioBuffer, fileName: audioFileName, mimeType: audioFile.type },
      ],
      primaryCompany
    );

    // ✅ This part is fixed
    const sheetData = extractionResult.cards.map(card => ({
      ...card,
      jobTitle: card.jobTitle || "", // Provide default empty string
      badgeId: card.badgeId || "",   // Provide default empty string
      transcription: audioResult.transcription,
      summary: audioResult.summary,
      folderLink: uploadResult.folderLink,
      imageLink: uploadResult.fileLinks[0] || "Upload Error",
      audioLink: uploadResult.fileLinks[1] || "Upload Error",
    }));

    if (sheetData.length === 1) {
      await appendToSheet(sheetData[0]);
    } else {
      await appendMultipleToSheet(sheetData);
    }

    return {
      success: true,
      message: `${extractionResult.count} card(s) processed successfully.`,
    };

  } catch (error) {
    console.error("Error in submitData:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}