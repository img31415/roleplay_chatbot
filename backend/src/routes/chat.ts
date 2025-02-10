import express from "express";
import { generateResponse } from "../chains/chatChain";

const router = express.Router();

router.post("/", async (req, res) => {
  const { message, images, documents } = req.body;

  try {
    const response = await generateResponse(
      "admin",
      message,
      images,
      documents
    );
    res.json({ response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

export default router;
