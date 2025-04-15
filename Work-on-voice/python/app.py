from flask import Flask, request, jsonify
import pickle
import numpy as np
import librosa
import os
import soundfile as sf

app = Flask(__name__)

# Load the decision tree model
with open('stutter_model_decision_tree', 'rb') as f:
    model = pickle.load(f)

@app.route('/predict', methods=['POST'])
def predict():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file uploaded'}), 400

    # Save the uploaded file
    audio_file = request.files['audio']
    audio_path = 'temp_audio.mp3'
    audio_file.save(audio_path)

    try:
        # Load and extract features from the MP3 file
        audio, sample_rate = librosa.load(audio_path, res_type='kaiser_fast', sr=None)
        mfccs = np.mean(librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=13).T, axis=0)

        # Predict
        no, yes = model.predict_proba([mfccs])[0]
        category = "low"
        if yes>0.66:
            category = "med"
        elif yes>0.33:
            category = "high"
        return jsonify({
            'No (%)': round(no * 100, 2),
            'Yes (%)': round(yes * 100, 2),
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)

if __name__ == '__main__':
    app.run(port=5000)
