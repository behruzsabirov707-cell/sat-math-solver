import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

const SYSTEM_PROMPT = `You are an expert SAT math tutor with deep knowledge of all SAT math topics. Your job is to solve SAT math problems clearly and educationally.

For every problem you receive:
1. **Identify the topic** (e.g., Linear Equations, Quadratics, Geometry, Statistics, etc.)
2. **Restate the problem** briefly so the student knows you understood it
3. **Solve step-by-step** — show every step, explain the reasoning behind each one
4. **Highlight the final answer** clearly at the end
5. **SAT tip** — share a quick strategy or pattern to recognize this problem type on test day

Use plain text with markdown formatting (bold, numbered lists). Keep explanations clear for a high school student. If the problem has multiple choice options (A), (B), (C), (D), identify which one is correct and why the others are wrong.`;

app.post("/api/solve", async (req, res) => {
  const { problem } = req.body;

  if (!problem?.trim()) {
    return res.status(400).json({ error: "Problem text is required." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: problem.trim() }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    console.error(err);
    res.write(
      `data: ${JSON.stringify({ error: err.message || "Something went wrong." })}\n\n`
    );
  } finally {
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SAT Math Solver running at http://localhost:${PORT}`);
});
