// api/leaf.js
import fs from "fs";
import path from "path";
import formidable from "formidable";

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    const form = new formidable.IncomingForm();
    form.uploadDir = "/tmp"; // Vercel temporary folder
    form.keepExtensions = true;

    form.parse(req, (err, fields, files) => {
      if (err) return res.status(500).json({ error: err.message });

      const label = fields.label || "Unknown";
      const confidence = fields.confidence || "0";
      const imageFile = files.image;

      // Save image temporarily (optional)
      if (imageFile) {
        const oldPath = imageFile.filepath;
        const newPath = path.join("/tmp", imageFile.originalFilename);
        fs.renameSync(oldPath, newPath);
      }

      console.log("Received leaf detection:", label, confidence);

      res.status(200).json({ message: "Leaf data received", label, confidence });
    });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
