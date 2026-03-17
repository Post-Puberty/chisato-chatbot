import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { sendGroq } from "./providers/groq.js";
import { sendLocal } from "./providers/local.js";
// ===== MEMORY SETTINGS =====
const MAX_RECENT_MESSAGES = 8; // user+assistant pairs

// ===== LLM PROVIDER SETTINGS =====
let currentProvider = process.env.LLM_MODE || "local"; // Default to local
let llm;

const PROVIDERS = {
  groq: {
    name: "Groq",
    handler: sendGroq,
    description: "Cloud-based fast inference"
  },
  local: {
    name: "Local LLM",
    handler: sendLocal,
    description: "LM Studio (localhost)"
  }
};

function setProvider(providerName) {
  if (PROVIDERS[providerName]) {
    currentProvider = providerName;
    llm = PROVIDERS[providerName].handler;
    console.log(`Switched to ${PROVIDERS[providerName].name}`);
    return true;
  }
  return false;
}

// Initialize with default provider
setProvider(currentProvider);

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


// ===== API ENDPOINTS =====

// Get current provider
app.get("/provider", (req, res) => {
  res.json({
    current: currentProvider,
    available: Object.keys(PROVIDERS).map(key => ({
      id: key,
      name: PROVIDERS[key].name,
      description: PROVIDERS[key].description
    }))
  });
});

// Set provider
app.post("/provider", (req, res) => {
  const { provider } = req.body;
  
  if (!provider) {
    return res.status(400).json({ error: "Provider name required" });
  }

  if (setProvider(provider)) {
    res.json({ 
      success: true, 
      current: currentProvider,
      name: PROVIDERS[currentProvider].name
    });
  } else {
    res.status(400).json({ 
      error: "Invalid provider",
      available: Object.keys(PROVIDERS)
    });
  }
});

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
  console.log(`Current LLM provider: ${PROVIDERS[currentProvider].name}`);
});
