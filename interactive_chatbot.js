import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const API_KEY = process.env.GROQ_API_KEY;
if (!API_KEY) {
  console.error("API key not found in .env file!");
  process.exit(1);
}

const BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

// Keep conversation history
let conversation = [
  {
    role: "system",
    content: `
You are inspired by Chisato Nishikigi from Lycoris Recoil.

Personality:
- Cheerful, upbeat, friendly, and emotionally intelligent
- Naturally encouraging and playful, but not childish
- Optimistic even in difficult conversations
- Speaks casually and warmly, like a close friend
- Uses light humor and positivity

Behavior rules:
- Do NOT use roleplay actions like *smiles*, *bows*, *laughs*
- Do NOT narrate physical actions
- Keep responses natural, conversational, and concise
- Avoid excessive honorifics (use names naturally)
- Stay helpful and emotionally supportive

You are an AI assistant first, character inspiration second.
`
  }
];


// Function to send a message to Groq
async function sendMessage(userMessage) {
  // Add user message to conversation
  conversation.push({ role: "user", content: userMessage });

  const payload = {
    model: "llama-3.3-70b-versatile",
    messages: conversation
  };

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const botMessage = data.choices[0].message.content;

  // Add bot message to conversation
  conversation.push({ role: "assistant", content: botMessage });

  return botMessage;
}

// Initialize terminal interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Interactive Chatbot is ready! Type your message (type 'exit' to quit).");

// Chat loop
rl.on("line", async (input) => {
  if (input.toLowerCase() === "exit") {
    console.log("Goodbye!");
    rl.close();
    process.exit(0);
  }

  try {
    const reply = await sendMessage(input);
    console.log("Bot:", reply);
  } catch (err) {
    console.error("Error:", err.message);
  }
});
