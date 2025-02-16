from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
import chromadb
import uuid
import requests
import os
from flask_cors import CORS
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration
import torch

app = Flask(__name__)
CORS(app)

# Load Sentence Transformer model
model = SentenceTransformer('all-mpnet-base-v2')

# ChromaDB Configuration (read from environment variables)
CHROMA_HOST = os.environ.get("CHROMA_HOST", "localhost")
CHROMA_PORT = os.environ.get("CHROMA_PORT", "8000")
CHROMA_URL = f"http://{CHROMA_HOST}:{CHROMA_PORT}"

#Ollama Configuration
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_CHAT_MODEL = os.environ.get("OLLAMA_CHAT_MODEL", "llama2")
SYSTEM_PROMPT = """
# Role and Purpose:

# Guidelines:
"""

# Initialize Chroma client
chroma_client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)

# Load BLIP model and processor (adjust device if needed)
device = "cuda" if torch.cuda.is_available() else "cpu" #Use CUDA if you have GPU, otherwise use CPU
processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model_blip = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)

def embed_text(text: str):
    """Embeds the given text using the Sentence Transformer model."""
    if not text:
        raise ValueError("No text provided")
    embedding = model.encode(text).tolist()
    return embedding

def process_image(image_file):
    """Processes the given image file and returns a caption."""
    image = Image.open(image_file).convert("RGB")
    inputs = processor(image, return_tensors="pt").to(device)
    out = model_blip.generate(**inputs)
    caption = processor.decode(out[0], skip_special_tokens=True)
    return caption

@app.route('/embed_context', methods=['POST'])
def embed_context():
    data = request.get_json()
    user_id = data.get('userId')
    images = data.get('images', [])  # List of image files
    messages = data.get('messages', [])

    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    try:
        # 1. Get or create collection for the user
        collection = chroma_client.get_or_create_collection(name=user_id)

        # 2. Process images and messages
        image_embeddings = []
        for image_data in images:
            try:
                image = Image.open(image_data['data']).convert("RGB")
                caption = process_image(image)
                image_embedding = embed_text(caption)
                image_embeddings.append(image_embedding)
            except Exception as e:
                print(f"Error processing image: {e}")
                continue  # Skip to the next image

        message_embeddings = []
        for message in messages:
            try:
                embedding = embed_text(message)
                message_embeddings.append(embedding)
            except Exception as e:
                print(f"Error embedding message: {e}")
                continue  # Skip to the next message

        # 3. Store embeddings in vector database
        if image_embeddings:
            ids = [str(uuid.uuid4()) for _ in image_embeddings]
            metadatas = [{"type": "image", "name": 'image'} for _ in images]
            collection.add(ids=ids, embeddings=image_embeddings, metadatas=metadatas)

        if message_embeddings:
            ids = [str(uuid.uuid4()) for _ in message_embeddings]
            metadatas = [{"type": "message", "text": message} for message in messages]
            collection.add(ids=ids, embeddings=message_embeddings, metadatas=metadatas)

        return jsonify({'success': True}), 200

    except Exception as e:
        print(f"Error embedding context: {e}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@app.route('/prompt', methods=['POST'])
def generate_response():
    data = request.get_json()
    user_id = data.get('userId')
    message = data.get('message')

    if not user_id or not message:
        return jsonify({'error': 'User ID and message are required'}), 400

    try:
        # 1. Get or create collection for the user
        collection = chroma_client.get_or_create_collection(name=user_id)

        # 2. Generate embedding for the message
        message_embedding = embed_text(message);

        # 3. Query vector database for context
        results = collection.query(query_embeddings=[message_embedding], n_results=3)

        # 4. Format context
        context = "\n\n".join(
            "\n".join(item.get('text', '') for item in metadata_list)
            for metadata_list in results['metadatas']
        )
        # 5. Generate Response (using Ollama)
        context_str = str(context)

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"# User question:\n{message}"},
            {"role": "assistant", "content": f"# Retrieved information:\n{context_str}"},
            {"role": "assistant", "content": ""}
        ]
        ollama_payload = {
            "model": OLLAMA_CHAT_MODEL,
            "messages": messages,
            "stream": False
        }
        response = requests.post(f"{OLLAMA_BASE_URL}/api/chat", json=ollama_payload)
        response.raise_for_status()
        ollama_response = response.json()
        return jsonify({'response': ollama_response["message"]["content"]})

    except Exception as e:
        print(f"Error generating response: {e}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)