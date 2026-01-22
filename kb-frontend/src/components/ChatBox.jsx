import { useState } from "react";
import { streamChat } from "../api/backend";

export default function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    setLoading(true);

    let assistantMessage = { role: "assistant", content: "" };
    setMessages((m) => [...m, assistantMessage]);

    await streamChat(input, (chunk) => {
      assistantMessage.content += chunk;
      setMessages((m) => [...m.slice(0, -1), assistantMessage]);
    });

    setLoading(false);
  };

  return (
    <div>
      <div style={{ minHeight: 300, border: "1px solid #ddd", padding: 10 }}>
        {messages.map((m, i) => (
          <p key={i}>
            <strong>{m.role}:</strong> {m.content}
          </p>
        ))}
        {loading && <p>Thinking...</p>}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask about your documents..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
