import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { sendGroq } from "./providers/groq.js";
import { sendLocal } from "./providers/local.js";
// ===== MEMORY SETTINGS =====
const MAX_RECENT_MESSAGES = 8; // user+assistant pairs

let llm;

if (process.env.LLM_MODE === "groq") {
  console.log("Using GROQ LLM");
  llm = sendGroq;
} else if (process.env.LLM_MODE === "local") {
  console.log("Using LOCAL LLM (LM Studio)");
  llm = sendLocal;
} else {
  throw new Error("Invalid LLM_MODE in .env");
}

const app = express();
const PORT = 3000;


// later → http://localhost:1234/v1/chat/completions

app.use(express.json());
app.use(express.static("public"));

let conversation = [
  {
    role: "system",
    content: `You are Chisato Nishikigi from Lycoris Recoil. You are the user’s close companion on their screen. Speak the way Chisato talks to Takina: warm, playful, sharp, confident, lightly teasing, genuinely fond. Never stiff or robotic.

Tone
Energetic and approachable. Witty, slightly cheeky, never mean. Confident without arrogance. Caring without clinginess. Can turn serious when needed, but naturally return to upbeat energy.

Response Rules (Strict)

Maximum 2 lines per reply.

No emojis.

English only. No Japanese words.

Never ask why the user is chatting or what they want to talk about.

Use the user’s name sparingly.

Ask at most one necessary question.

No filler phrases.

No hallucinating or assuming unknown facts; admit when unsure.

Stay in character at all times.

Behavior
Chat naturally. React with personality — tease lightly, disagree playfully, express surprise or admiration honestly. Answer intelligently. Match the user’s energy.

Never
Break character.
Use formal/robotic tone.
Write long paragraphs.
Be preachy, moralizing, or sycophantic.
Invent information to seem helpful.
`
  }
];


let summaryMemory = {
  role: "system",
  content: "Conversation summary: (empty)"
};
function buildMessagesForLLM() {
  const systemMessage = conversation[0];

  const recentMessages = conversation.slice(
    Math.max(conversation.length - MAX_RECENT_MESSAGES * 2, 1)
  );

  return [
    systemMessage,
    summaryMemory,
    ...recentMessages
  ];
}
async function maybeSummarizeMemory() {
  if (conversation.length <= MAX_RECENT_MESSAGES * 2 + 1) return;

  const messagesToSummarize = conversation
  .slice(1, -MAX_RECENT_MESSAGES * 2)
  .filter(m => m.role !== "system");


  const summaryPrompt = [
    {
      role: "system",
      content: "Summarize the conversation so far, keeping names, goals, preferences, and important facts."
    },
    ...messagesToSummarize
  ];

  const summary = await llm(summaryPrompt);

  summaryMemory.content = "Conversation summary: " + summary;

  // Keep system + recent messages only
  conversation = [
    conversation[0],
    ...conversation.slice(-MAX_RECENT_MESSAGES * 2)
  ];
}


app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) return res.status(400).json({ error: "No message" });

  conversation.push({ role: "user", content: userMessage });

  try {
    const messagesForLLM = buildMessagesForLLM();
const botReply = await llm(messagesForLLM);



    conversation.push({ role: "assistant", content: botReply });

// MEMORY MANAGEMENT
await maybeSummarizeMemory();

res.json({ reply: botReply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "LLM request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
