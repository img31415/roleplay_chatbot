from flask import Flask, request, jsonify
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration
import torch

app = Flask(__name__)

# Load BLIP model and processor (adjust device if needed)
device = "cuda" if torch.cuda.is_available() else "cpu" #Use CUDA if you have GPU, otherwise use CPU
processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)

@app.route('/process', methods=['POST'])
def process_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    image_file = request.files['image']
    image = Image.open(image_file).convert("RGB") #Open image and convert to RGB format

    inputs = processor(image, return_tensors="pt").to(device) #Send image to the model for processing
    out = model.generate(**inputs) #Generate the image caption
    caption = processor.decode(out[0], skip_special_tokens=True) #Decode the caption

    return jsonify({'caption': caption})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)