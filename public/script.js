const chat = document.getElementById("chat");
const input = document.getElementById("input");

function addMessage(text, cls) {
  const div = document.createElement("div");
  div.className = `message ${cls}`;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";

  const res = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text })
  });

  const data = await res.json();
  addMessage(data.reply, "bot");
}

input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});
