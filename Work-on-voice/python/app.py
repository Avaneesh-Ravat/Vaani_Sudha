from flask import Flask, request, jsonify, send_from_directory
import pickle
import numpy as np
import librosa
import librosa.display
import os
import matplotlib.pyplot as plt

app = Flask(__name__)

# Load model
with open('stutter_model_decision_tree', 'rb') as f:
    model = pickle.load(f)

# Ensure static folder exists
if not os.path.exists('static'):
    os.makedirs('static')

@app.route('/predict', methods=['POST'])
def predict():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file uploaded'}), 400

    audio_file = request.files['audio']
    audio_path = 'temp_audio.mp3'
    audio_file.save(audio_path)

    try:
        # Load audio
        audio, sample_rate = librosa.load(audio_path, res_type='kaiser_fast', sr=None)

        # Extract MFCC for prediction
        mfccs = np.mean(librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=13).T, axis=0)
        no, yes = model.predict_proba([mfccs])[0]

        # 1. Waveform
        plt.figure(figsize=(8, 3))
        librosa.display.waveshow(audio, sr=sample_rate)
        plt.title('Waveform')
        plt.xlabel('Time (s)')
        plt.ylabel('Amplitude')
        waveform_path = os.path.join('static', 'waveform.png')
        plt.tight_layout()
        plt.savefig(waveform_path)
        plt.close()

        # 2. Spectrogram
        plt.figure(figsize=(8, 3))
        D = librosa.amplitude_to_db(np.abs(librosa.stft(audio)), ref=np.max)
        librosa.display.specshow(D, sr=sample_rate, x_axis='time', y_axis='log', cmap='magma')
        plt.colorbar(format='%+2.0f dB')
        plt.title('Spectrogram')
        spectrogram_path = os.path.join('static', 'spectrogram.png')
        plt.tight_layout()
        plt.savefig(spectrogram_path)
        plt.close()

        # 3. Pitch Contour
        f0, voiced_flag, voiced_probs = librosa.pyin(audio,
                                                     fmin=librosa.note_to_hz('C2'),
                                                     fmax=librosa.note_to_hz('C7'))
        times = librosa.times_like(f0)
        plt.figure(figsize=(8, 3))
        plt.plot(times, f0, label='Pitch (F0)', color='blue')
        plt.title('Pitch Contour')
        plt.xlabel('Time (s)')
        plt.ylabel('Frequency (Hz)')
        plt.legend(loc='upper right')
        pitch_path = os.path.join('static', 'pitch_contour.png')
        plt.tight_layout()
        plt.savefig(pitch_path)
        plt.close()

        return jsonify({
            'No (%)': round(no * 100, 2),
            'Yes (%)': round(yes * 100, 2),
            'waveformUrl': 'http://127.0.0.1:5000/static/waveform.png',
            'spectrogramUrl': 'http://127.0.0.1:5000/static/spectrogram.png',
            'pitchContourUrl': 'http://127.0.0.1:5000/static/pitch_contour.png'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    app.run(port=5000)
