import express from "express";
import { embedContext, generateResponse } from "../chains/chatChain";

const router = express.Router();

/**
 * Initialize Conversation. Build Context.
 */
router.post("/embed", async (req, res) => {
  const { message, images, documents } = req.body;

  try {
    const response = await embedContext("admin", images, documents);
    res.json({ response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "/embed - An error occurred" });
  }
});

/**
 * Prompt for LLM.
 */
router.post("/prompt", async (req, res) => {
  const { message, userId } = req.body; // Include a conversationId
  try {
    const response = await generateResponse(userId, message);
    res.json({ response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "/prompt - An error occurred" });
  }
});

export default router;
