import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";

const app = express();

// *** FIX FOR RENDER ***
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

app.post("/api/embeddings", async (req, res) => {
  try {
    const { newNode, existing } = req.body;
    if (!newNode || !Array.isArray(existing)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const inputs = [newNode, ...existing];

    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: inputs,
    });

    const vectors = response.data.map((d) => d.embedding);
    const newVec = vectors[0];
    const scores = [];

    for (let i = 1; i < vectors.length; i++) {
      const sim = cosineSim(newVec, vectors[i]);
      scores.push({ id: existing[i - 1], similarity: sim });
    }

    res.json({ scores });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Embedding error" });
  }
});

// *** FIX FOR RENDER ***
app.listen(PORT, () => {
  console.log(`Embedding server listening on port ${PORT}`);
});
