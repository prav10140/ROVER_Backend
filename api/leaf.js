import formidable from "formidable";
import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";

export const config = {
  api: { bodyParser: false },
};

// 👉 PUT YOUR RENDER URL HERE
const ML_API_URL = "https://your-fastapi.onrender.com/api/leaf";

export default async function handler(req, res) {
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

      const fileStream = fs.createReadStream(file.filepath);

      const formData = new FormData();
      formData.append("file", fileStream, file.originalFilename);

      const response = await fetch(ML_API_URL, {
        method: "POST",
        body: formData,
        headers: formData.getHeaders(),
      });

      const result = await response.json();

      return res.status(200).json(result);

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
}
