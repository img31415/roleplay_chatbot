import { ChromaClient } from "chromadb"; // Import the chromaClient
import FormData from "form-data";
import fetch from "node-fetch";
import { Ollama } from "ollama";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "llama2"; 

const SYSTEM_PROMPT = `
# Role and Purpose:

# Guidelines:
`;

const ollama = new Ollama({ host: OLLAMA_BASE_URL }); // Initialize Ollama

// Initialize Chroma client (using environment variables for path)
const chroma = new ChromaClient({
  path: `http://${process.env.CHROMA_HOST}:${process.env.CHROMA_PORT}`, // Use env vars
});

export const generateResponse = async (
  userId: string, // Add userId parameter
  message: string,
  images: File[],
  documents: File[]
) => {
  try {
    // 1. Get or create collection for the user
    let collection = await chroma.getOrCreateCollection({ name: userId });

    // 2. Process images (call Vision API)
    const imageEmbeddings = await Promise.all(
      images.map(async (image) => {
        const formData = new FormData();
        formData.append("image", image);
        const response = await fetch("http://vision_api:5001/process", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        return data.embedding;
      })
    );

    // 3. Process documents (call Embedding API)
    const documentEmbeddings = await Promise.all(
      documents.map(async (document) => {
        const formData = new FormData();
        formData.append("document", document);
        const response = await fetch("http://embedding_api:5002/embed", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        return data.embedding;
      })
    );

    // 4. Store embeddings in vector database (using the correct collection)
    if (imageEmbeddings.length > 0) {
      await collection.add({
        ids: imageEmbeddings.map((_, index) => `image_${index}`),
        embeddings: imageEmbeddings,
        metadatas: images.map((image) => ({ type: "image", name: image.name })), // Store metadata
      });
    }

    if (documentEmbeddings.length > 0) {
      await collection.add({
        ids: documentEmbeddings.map((_, index) => `image_${index}`),
        embeddings: documentEmbeddings,
        metadatas: documents.map((document) => ({
          type: "document",
          name: document.name,
        })), // Store metadata
      });
    }

    // 5. Query vector database for context (using message embedding from Python API and correct collection)
    const messageEmbeddingResponse = await fetch(
      "http://embedding_api:5002/embed",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: message }),
      }
    );

    const messageEmbeddingData = await messageEmbeddingResponse.json();
    const messageEmbedding = messageEmbeddingData.embedding;

    const queryData = await collection.query({
      queryEmbeddings: messageEmbedding,
      nResults: 3,
    });

    const context = queryData.metadatas
      .map((metadataArray) =>
        metadataArray.map((metadata) => metadata?.text).join("\n")
      ) // Join metadata within each result
      .join("\n\n"); // Join metadata from different results with extra newlines

    // 6. Generate Response (using Ollama directly)
    const contextStr = JSON.stringify(context, null, 2);
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `# User question:\n${message}` },
      { role: "assistant", content: `# Retrieved information:\n${contextStr}` },
      { role: "assistant", content: "" },
    ];

    const ollamaResponse = await ollama.chat({
      model: OLLAMA_CHAT_MODEL,
      messages: messages,
      stream: false,
    });
    return ollamaResponse.message.content;
  } catch (error) {
    console.error("Error generating response:", error);
    return "An error occurred during response generation.";
  }
};
