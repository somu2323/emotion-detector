# AI Emotion Detection Web Application

A professional, full-stack AI application that detects human emotions from images and realtime webcam feeds.

## 🚀 Features
- **Realtime Webcam Detection**: High-performance face tracking and emotion analysis.
- **Image Upload**: Multi-face detection and processing for uploaded images.
- **AI Powered**: Utilizes a MobileNet-based deep learning model for accuracy.
- **Face Validation**: Only processes human faces; invalid images are rejected.
- **Detection History**: Stores scan results in a persistent SQLite database.
- **Modern UI**: Dark-themed, responsive interface with glassmorphism aesthetics.

## ⚙️ Tech Stack
- **Frontend**: React (Vite), Tailwind CSS 4.0, Face-api.js
- **Backend**: Flask (Python), Keras/TensorFlow, OpenCV
- **Database**: SQLite
- **Deployment**: Render (Backend), Vercel (Frontend)

## 📂 Project Structure
- `/frontend`: React application.
- `/backend`: Flask API and AI model.

## 🛠️ Local Development

### Backend Setup
1. Navigate to `/backend`.
2. Create a virtual environment: `python -m venv venv`.
3. Activate: `.\venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux).
4. Install dependencies: `pip install -r requirements.txt`.
5. Run: `python app.py`.

### Frontend Setup
1. Navigate to `/frontend`.
2. Install dependencies: `npm install`.
3. Run: `npm run dev`.

## 🌐 Deployment Instructions

### Backend (Render)
1. Connect your GitHub repository to Render.
2. Create a new **Web Service**.
3. Set the **Root Directory** to `backend`.
4. **Build Command**: `pip install -r requirements.txt`.
5. **Start Command**: `gunicorn app:app`.

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel.
2. Create a new project and select the `frontend` folder as the root.
3. Set the **Environment Variable**: `VITE_API_URL` to your Render backend URL.
4. Deploy!
