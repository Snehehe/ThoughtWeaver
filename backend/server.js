import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";

const app = express();

// Use Render's PORT in production, fallback for local dev
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Basic cosine similarity
function cosineSim(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Embedding endpoint: returns similarity scores between newNode and existing list
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
    console.error("Embedding error:", err);
    res.status(500).json({ error: "Embedding error" });
  }
});

// OpenAI-powered explanations for why a node is linked to neighbors
app.post("/api/explain-links", async (req, res) => {
  try {
    const { center, neighbors } = req.body;
    if (!center || !Array.isArray(neighbors) || neighbors.length === 0) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const prompt = `
You are ThoughtWeaver, an AI that explains relationships between short textual "thoughts".

Center thought:
"${center}"

Neighbor thoughts:
${neighbors.map((n, i) => `${i + 1}. "${n}"`).join("\n")}

For each neighbor, give a short, clear explanation of how it relates to the center thought.
Respond as strict JSON and nothing else, in this exact format:

{
  "explanations": [
    { "neighbor": "NEIGHBOR_TEXT", "reason": "short reason here" }
  ]
}
    `.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You output strict JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse JSON from OpenAI:", raw);
      // Fallback: generic reasons
      parsed = {
        explanations: neighbors.map((n) => ({
          neighbor: n,
          reason:
            "This thought is semantically related to the center thought based on their embeddings.",
        })),
      };
    }

    if (!Array.isArray(parsed.explanations)) {
      parsed.explanations = neighbors.map((n) => ({
        neighbor: n,
        reason:
          "This thought is semantically related to the center thought based on their embeddings.",
      }));
    }

    res.json({ explanations: parsed.explanations });
  } catch (err) {
    console.error("Explain-links error:", err);
    res.status(500).json({ error: "Explain-links error" });
  }
});

app.listen(PORT, () => {
  console.log(`Embedding server listening on port ${PORT}`);
});
