export async function sendLocal(messages) {
  const response = await fetch(process.env.LMSTUDIO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.LOCAL_MODEL,
      messages,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Local LLM error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
