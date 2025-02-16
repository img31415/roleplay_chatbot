import React, { useState } from "react";
import styles from "./Chat.module.css";

const Chat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([{ role: "bot", content: "Hi!" }]);
  const [initialConfigText, setInitialConfigText] = useState("");
  const [initialConfigImage, setInitialConfigImage] = useState<File | null>(
    null
  );
  const [isConfigured, setIsConfigured] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setInitialConfigImage(e.target.files[0]);
    }
  };

  const handleInitialConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!initialConfigText && !initialConfigImage) {
      alert(
        "Please provide either text or an image for initial configuration."
      );
      return;
    }

    // Convert image to base64
    let base64Image = null;
    if (initialConfigImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        base64Image = reader.result;
        submitEmbedContext(base64Image);
      };
      reader.readAsDataURL(initialConfigImage);
    } else {
      submitEmbedContext(null);
    }
  };

  const submitEmbedContext = async (
    base64Image: string | ArrayBuffer | null
  ) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_BASE_URL}/embed_context`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: "admin",
            messages: initialConfigText,
            images: base64Image ? [base64Image] : [],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      setIsConfigured(true);
      alert("Initial configuration submitted successfully!");
    } catch (error) {
      console.error("Error submitting initial configuration:", error);
      alert("Error submitting initial configuration. Please try again.");
    }
  };

  const submitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessages([...messages, { role: "user", content: message }]);
    setMessage("");

    try {
      const response = await fetch(`${process.env.BACKEND_BASE_URL}/prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "testuser", // Replace with actual user ID
          message: message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json(); // Try to parse error response
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      setMessages([...messages, { role: "bot", content: data.response }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages([
        ...messages,
        { role: "bot", content: "Error sending message. Please try again." },
      ]);
    }
  };

  return (
    <div className={styles.chatContainer}>
      {!isConfigured ? (
        <form
          onSubmit={handleInitialConfigSubmit}
          className={styles.initialConfigForm}
        >
          <h2>Hello. How are you? Tell me what I should be:</h2>
          <label>
            Text:
            <input
              type="text"
              value={initialConfigText}
              onChange={(e) => setInitialConfigText(e.target.value)}
            />
          </label>
          <br />
          <label>
            Image:
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </label>
          <br />
          <button type="submit">Submit Configuration</button>
        </form>
      ) : (
        <div>
          <div className={styles.chatWindow}>
            {messages.map((m, i) => (
              <div key={i} className={`${styles.message} ${styles[m.role]}`}>
                {m.content}
              </div>
            ))}
          </div>
          <form onSubmit={submitPrompt} className={styles.form}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chat;
