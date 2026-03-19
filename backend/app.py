import sys
import os
import base64
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
from utils.db import init_db, add_history_entry, get_history_entries, delete_history_entry

app = Flask(__name__)
# In production, you can replace "*" with your specific Vercel URL for better security
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Global model variable
model = None

def load_emotion_model():
    global model
    import keras
    # Use absolute path for model to avoid issues on different platforms
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    MODEL_PATH = os.path.join(BASE_DIR, 'models', 'emotion_model.h5')
    
    print(f"--- Loading Model from {MODEL_PATH} ---", flush=True)
    try:
        model = keras.models.load_model(MODEL_PATH)
        print("--- Model Loaded Successfully ---", flush=True)
    except Exception as e:
        print(f"---!!! Model Loading Failed: {e} !!!---", flush=True)
        model = None

# Initialize database
init_db()

@app.route('/api/predict', methods=['POST'])
def predict():
    global model
    if model is None:
        load_emotion_model()
    
    if model is None:
        return jsonify({'error': 'Model not loaded on server'}), 500

    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({'error': 'No image provided'}), 400

    image = decode_base64_image(data['image'])
    if image is None:
        return jsonify({'error': 'Invalid Image - No human face detected'}), 400

    # Preprocess the cropped face image
    processed_img = preprocess_image(image)
    if processed_img is None:
        return jsonify({'error': 'Error processing image'}), 500

    # Make prediction
    predictions = model.predict(processed_img)
    max_index = int(np.argmax(predictions[0]))
    confidence = float(predictions[0][max_index]) * 100
    emotion = EMOTIONS[max_index]
    emoji = EMOJI_MAP.get(emotion, '❓')

    # Store detection in history
    add_history_entry(emotion, emoji, round(confidence, 2))

    response = {
        'faces': [
            {
                'emotion': emotion,
                'emoji': emoji,
                'confidence': round(confidence, 2)
            }
        ]
    }
    
    return jsonify(response)

# Emotion mapping (FER2013 standard)
EMOTIONS = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']
EMOJI_MAP = {
    'Angry': '😠',
    'Disgust': '🤢',
    'Fear': '😨',
    'Happy': '😊',
    'Sad': '😢',
    'Surprise': '😲',
    'Neutral': '😐'
}

def preprocess_image(cv2_img):
    """Preprocess image for MobileNet model: resize to 224x224 and normalize"""
    try:
        resized = cv2.resize(cv2_img, (224, 224))
        img_array = resized.astype('float32') / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
    except Exception as e:
        print(f"Preprocessing error: {e}")
        return None

def decode_base64_image(base64_str):
    """Decodes a base64 string into a numpy array (OpenCV format)"""
    try:
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        
        image_bytes = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None

@app.route('/api/history', methods=['GET'])
def get_history():
    history = get_history_entries()
    return jsonify(history)

@app.route('/api/history/<int:entry_id>', methods=['DELETE'])
def delete_history(entry_id):
    if delete_history_entry(entry_id):
        return jsonify({'message': 'Deleted successfully'})
    return jsonify({'error': 'Failed to delete'}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'model_loaded': model is not None})

if __name__ == '__main__':
    # Get port from environment variable for deployment
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
