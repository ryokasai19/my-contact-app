import dotenv from "dotenv";
dotenv.config();

import { getDriveClient } from "../lib/google-api-client";

async function test() {
    console.log("Loaded creds:", process.env.GOOGLE_CREDENTIALS_BASE64?.slice(0, 30));

    const drive = await getDriveClient();
    const res = await drive.about.get({ fields: "user" });

    console.log("✅ Authenticated as:", res.data.user?.emailAddress);
}

test().catch((err) => {
    console.error("❌ Auth test failed:", err);
});
