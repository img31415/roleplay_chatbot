from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

app = Flask(__name__)

# Load Sentence Transformer model
model = SentenceTransformer('all-mpnet-base-v2') #You can change this model if you want

@app.route('/embed', methods=['POST'])
def embed_text():
    data = request.get_json()
    text = data.get('text')

    if not text:
        return jsonify({'error': 'No text provided'}), 400

    embedding = model.encode(text)
    return jsonify({'embedding': embedding.tolist()})  # Return as a list

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)