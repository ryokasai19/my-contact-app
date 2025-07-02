const fs = require('fs');
const path = require('path');

// --- IMPORTANT ---
// Change 'your-credentials-file.json' to the real name of the JSON file you downloaded.
const fileName = 'expo-app-email-generator-882235125043.json';
// ---

const filePath = path.resolve(__dirname, fileName);

try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const base64Content = Buffer.from(fileContent).toString('base64');

    console.log("\n✅ Your Base64 credential string is ready:\n");
    console.log(base64Content);

} catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(`\nMake sure the file named "${fileName}" is in the same directory as this script.`);
}