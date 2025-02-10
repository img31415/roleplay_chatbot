from flask import Flask, request, jsonify
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL")

@app.route('/generate', methods=['POST'])
def generate_text():
    data = request.get_json()
    prompt = data.get('prompt')

    if not prompt:
        return jsonify({'error': 'No prompt provided'}), 400

    try:
        response = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json={
            "model": "llama2", # Or your model name
            "prompt": prompt,
            "stream": False # Set to true if you want to stream the response
        })
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
        json_response = response.json()
        text = json_response["response"]
        return jsonify({'text': text})
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5003)