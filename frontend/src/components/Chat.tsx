import React, { useEffect, useState } from "react";
import styles from "./Chat.module.css";

const Chat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hi!", timestamp: new Date().toLocaleString() },
  ]);
  const [initialConfigText, setInitialConfigText] = useState("");
  const [initialConfigImage, setInitialConfigImage] = useState<File | null>(
    null
  );
  const [isConfigured, setIsConfigured] = useState(false);
  const [embedContextResponse, setEmbedContextResponse] = useState(null);
  const [images, setImages] = useState<
    { filename?: string; caption?: string }[] | null
  >(null);

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

    const formData = new FormData();
    formData.append("userId", "admin");
    formData.append("messages", initialConfigText);
    if (initialConfigImage) {
      formData.append("image", initialConfigImage);
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_BASE_URL}/embed_context`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      setEmbedContextResponse(data);
      // setIsConfigured(true);
      alert("Initial configuration submitted successfully!");
    } catch (error) {
      console.error("Error submitting initial configuration:", error);
      alert("Error submitting initial configuration. Please try again.");
    }
  };

  const submitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();

    const newMessage = {
      role: "user",
      content: message,
      timestamp: new Date().toLocaleString(),
    };
    setMessages([...messages, newMessage]);
    setMessage("");

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_BASE_URL}/prompt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: "admin", // Replace with actual user ID
            message: message,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json(); // Try to parse error response
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      const botMessage = {
        role: "bot",
        content: data.response,
        timestamp: new Date().toLocaleString(),
      };
      setMessages([...messages, newMessage, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        role: "bot",
        content: "Error sending message. Please try again.",
        timestamp: new Date().toLocaleString(),
      };
      setMessages([...messages, newMessage, errorMessage]);
    }
  };

  console.log("images", images);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_BASE_URL}/get_images?userId=admin`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setImages(data.images);
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };

    fetchImages();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.leftPane}>
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
          <div className={styles.submitButtonContainer}>
            <button type="submit">Submit Configuration</button>
          </div>
        </form>
        <div>
          {embedContextResponse && (
            <div className={styles.response}>
              <h3>Embed Context Response:</h3>
              <pre>{JSON.stringify(embedContextResponse, null, 2)}</pre>
            </div>
          )}
          <div className={styles.imageListBox}>
            <h3>Uploaded Images:</h3>
            <ul className={styles.imageList}>
              {images?.map((image, index) => (
                <li key={index}>
                  {image.filename} {image.caption ? `(${image.caption})` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className={styles.rightPane}>
        <h2>Talk to me</h2>
        <div className={styles.chatWindow}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`${styles.message} ${
                m.role === "user" ? styles.userMessage : styles.botMessage
              }`}
            >
              <div className={styles.messageContent}>{m.content}</div>
              <div className={styles.timestamp}>{m.timestamp}</div>
            </div>
          ))}
        </div>
        <form onSubmit={submitPrompt} className={styles.form}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={styles.chatInput}
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
