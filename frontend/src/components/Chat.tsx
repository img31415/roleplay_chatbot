import React, { useState } from "react";

const Chat: React.FC = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([{ role: "bot", content: "Hi!" }]);
  const [images, setImages] = useState<File[]>([]); // Store selected images
  const [documents, setDocuments] = useState<File[]>([]); // Store selected documents

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessages([...messages, { role: "user", content: message }]);
    setMessage("");

    const formData = new FormData();
    formData.append("message", message);

    // Append images to FormData
    images.forEach((image, index) => {
      formData.append(`image${index}`, image); // Use a dynamic name
    });

    // Append documents to FormData
    documents.forEach((document, index) => {
      formData.append(`document${index}`, document); // Dynamic name
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData, // Send FormData
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
    <div>
      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <input type="file" multiple onChange={handleImageChange} />{" "}
        {/* Image upload */}
        <input type="file" multiple onChange={handleDocumentChange} />{" "}
        {/* Document upload */}
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Chat;
