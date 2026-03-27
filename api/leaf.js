import formidable from "formidable";
import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";
import { kv } from "@vercel/kv"; // 👈 1. Import Vercel KV

export const config = {
  api: { bodyParser: false },
};

// 👉 PUT YOUR FASTAPI URL HERE
const ML_API_URL = "https://unsuperior-bizarrely-rodrigo.ngrok-free.dev/api/leaf";

export default async function handler(req, res) {
  // ==========================================
  // 🟢 GET: React Dashboard fetches data here
  // ==========================================
  if (req.method === "GET") {
    try {
      // Read the whole list from Vercel KV
      const leaves = await kv.lrange('leaf_scans', 0, -1);
      return res.status(200).json(leaves || []);
    } catch (error) {
      console.error("KV Read Error:", error);
      return res.status(500).json({ error: "Failed to read from database" });
    }
  }

  // ==========================================
  // 🔴 POST: Raspberry Pi sends images here
  // ==========================================
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const form = new formidable.IncomingForm();
  form.uploadDir = "/tmp";
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    try {
      const file = files.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // 1. Forward to your Colab AI
      const fileStream = fs.createReadStream(file.filepath);
      const formData = new FormData();
      formData.append("file", fileStream, file.originalFilename);

      const response = await fetch(ML_API_URL, {
        method: "POST",
        body: formData,
        headers: formData.getHeaders(),
      });

      const result = await response.json();

      // 2. 📸 Convert the image to a Base64 string so the dashboard can render it
      const imageBuffer = fs.readFileSync(file.filepath);
      const base64Image = `data:${file.mimetype || 'image/jpeg'};base64,${imageBuffer.toString('base64')}`;

      // 3. 💾 Package the data for the database
      const newLeaf = {
        id: `SCN-${Date.now().toString().slice(-6)}`,
        image: base64Image,
        label: result.label || "Unknown",
        confidence: result.confidence || 0,
        timestamp: new Date().toISOString()
      };

      // 4. 🗄️ Save to Vercel KV Database
      await kv.lpush('leaf_scans', JSON.stringify(newLeaf));
      await kv.ltrim('leaf_scans', 0, 14); // Keep only the newest 15 to prevent memory overload

      // Clean up the temporary file from the Vercel server
      fs.unlinkSync(file.filepath);

      // Return the AI result back to the Raspberry Pi
      return res.status(200).json(result);

    } catch (error) {
      console.error("Server Error:", error);
      return res.status(500).json({ error: error.message });
    }
  });
}
