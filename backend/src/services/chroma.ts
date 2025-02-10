import { ChromaClient } from "chromadb";
import * as dotenv from "dotenv";
dotenv.config();

const chromaHost = process.env.CHROMA_HOST || "localhost"; // Default to localhost if not in Docker
const chromaPort = parseInt(process.env.CHROMA_PORT || "8000", 10);

const chromaClient = new ChromaClient({
  path: `http://${chromaHost}:${chromaPort}`, // Construct the URL
});

export default chromaClient;
