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
from dotenv import load_dotenv
import logging
import hashlib


load_dotenv(dotenv_path='./.env')

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


# ChromaDB Configuration (read from environment variables)
CHROMA_HOST = os.getenv("CHROMA_HOST")
CHROMA_PORT = os.getenv("CHROMA_PORT")
CHROMA_URL = f"http://{CHROMA_HOST}:{CHROMA_PORT}"

#Ollama Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL")
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL")
SYSTEM_PROMPT = """
# Role and Purpose:

# Guidelines:
"""

# Initialize Chroma client
chroma_client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)

# Load BLIP model and processor (adjust device if needed)
device = "cuda" if torch.cuda.is_available() else "cpu" #Use CUDA if you have GPU, otherwise use CPU

logging.info(f"Loading BLIP model and processor on device :{device}")

# Load Sentence Transformer model
llm_model = SentenceTransformer('all-mpnet-base-v2')
image_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)
processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")

def process_image(image_file):
    try:
        image = Image.open(image_file)

        inputs = processor(images=image, return_tensors="pt").to(device, torch.float16)
        generated_ids = image_model.generate(**inputs)
        generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
        logging.info(f"Image caption: {generated_text}")
        
        return generated_text
    except Exception as e:
        logging.error(f"Error processing image: {e}")
        return None  # Or handle the error as you see fit
    
def embed_text(text: str):
    """Embeds the given text using the Sentence Transformer model."""
    if not text:
        raise ValueError("No text provided")
    embedding = llm_model.encode(text).tolist()
    return embedding

@app.route('/embed_context', methods=['POST'])
def embed_context():
    logging.info("Received request at /embed_context")
    user_id = request.form.get('userId')
    messages = request.form.get('messages')
    image_file = request.files.get('image')
    caption = ''

    logging.info(f"Request data: {user_id}, {messages}, {image_file}")

    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    try:
        # 1. Get or create collection for the user
        collection = chroma_client.get_or_create_collection(name=user_id)

        # 2. Process images and messages
        image_embeddings = []
        if image_file:
            try:
                # Extract filename from image file
                filename = image_file.filename
                # Decode base64 image
                caption = process_image(image_file)
                
                image_embedding = embed_text(caption)
                image_embeddings.append(image_embedding)

                # Hash the image file name to create an ID
                image_id = hashlib.sha256(filename.encode('utf-8')).hexdigest()

            except Exception as e:
                logging.error(f"Error processing image: {e}")

        message_embeddings = []
        if messages:
            try:
                embedding = embed_text(messages)
                message_embeddings.append(embedding)
            except Exception as e:
                logging.error(f"Error embedding message: {e}")

        # 3. Store embeddings in vector database
        if image_embeddings:
            metadatas = [{"type": "image", "filename": filename, "caption": caption} for _ in [filename]]
            collection.add(ids=[image_id], embeddings=image_embeddings, metadatas=metadatas)

        if message_embeddings:
            ids = [str(uuid.uuid4()) for _ in message_embeddings]
            metadatas = [{"type": "text", "text": messages} for message in [messages]]
            collection.add(ids=ids, embeddings=message_embeddings, metadatas=metadatas)

        response_data = jsonify({'success': True, 'caption': caption})
        logging.info(f"Response data: {response_data.json}")  # Log the response data
        logging.info("Successfully processed request at /embed_context")
        return response_data, 200

    except Exception as e:
        logging.exception(f"Error embedding context: {e}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@app.route('/prompt', methods=['POST'])
def generate_response():
    logging.info("Received request at /prompt")
    data = request.get_json()
    logging.info(f"Request data: {data}")  # Log the request data
    user_id = data.get('userId')
    message = data.get('message')

    if not user_id or not message:
        return jsonify({'error': 'User ID is required'}), 400

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
        response_data = jsonify({'response': ollama_response["message"]["content"]})
        logging.info(f"Response data: {response_data.json}")  # Log the response data
        logging.info("Successfully processed request at /prompt")
        return response_data

    except Exception as e:
        logging.exception(f"Error generating response: {e}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@app.route('/get_images', methods=['GET'])
def get_images():
    logging.info("Received request at /get_images")
    user_id = request.args.get('userId')

    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    try:
        # Get the collection for the user
        collection = chroma_client.get_or_create_collection(name=user_id)

        # Query all images in the collection
        results = collection.get(where={'type': 'image'})
        logging.info(f"Found {results['metadatas']} images for user: {user_id}")
        
        images = [{'filename': item['filename'], 'caption': item.get('caption', None)} for item in results['metadatas']if isinstance(item, dict) and 'filename' in item]

        return jsonify({'images': images}), 200

    except Exception as e:
        logging.exception(f"Error fetching images: {e}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500
    

@app.route('/delete_all_images', methods=['DELETE'])
def delete_all_images():
    logging.info("Received request at /delete_all_images")
    user_id = request.args.get('userId')

    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    try:
        # Get the collection for the user
        collection = chroma_client.get_or_create_collection(name=user_id)

        # Query all images in the collection
        results = collection.get(where={'type': 'image'})

        # Extract image IDs
        image_ids = [result['id'] for result in results]

        # Delete all images from the collection
        collection.delete(ids=image_ids)
        logging.info(f"Deleted all images for user: {user_id}")

        return jsonify({'success': True}), 200

    except Exception as e:
        logging.exception(f"Error deleting all images: {e}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)