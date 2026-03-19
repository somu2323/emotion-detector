import { useEffect, useState, useRef, useCallback } from 'react';
import { Camera, RefreshCw, StopCircle, BrainCircuit, Loader2, AlertCircle } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useWebcam } from '../hooks/useWebcam';
import { loadModels } from '../services/faceDetection';
import { api } from '../services/api';

interface EmotionResponse {
  emotion: string;
  emoji: string;
  confidence: number;
}

interface WebcamDetection extends EmotionResponse {
  box: faceapi.Box;
}

const WebcamPage = () => {
  const { videoRef, isActive, error: webcamError, startWebcam, stopWebcam, captureFrame } = useWebcam();
  const [results, setResults] = useState<WebcamDetection[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading AI models...');
  const [fps, setFps] = useState(0);
  const lastTimeRef = useRef<number>(performance.now());
  const processingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initModels = async () => {
      try {
        setLoadingMessage('Loading AI models...');
        await loadModels();
        setModelsLoaded(true);
        setLoadingMessage('');
      } catch (err) {
        console.error("Model load error:", err);
        setLoadingMessage('Model loading failed. Check console for details.');
      }
    };
    initModels();
  }, []);

  const processFrame = useCallback(async () => {
    if (!isActive || processingRef.current || !modelsLoaded || !videoRef.current) return;

    try {
      processingRef.current = true;
      
      // 1. Detect multiple faces in the browser
      const detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 })
      );

      if (detections.length === 0) {
        setResults([]);
        processingRef.current = false;
        return;
      }

      console.log(`Detected ${detections.length} faces`);
      setIsProcessing(true);
      const allResults: WebcamDetection[] = [];

      // 2. Process each face (we limit to 4 faces for performance in realtime)
      const limitedDetections = detections.slice(0, 4);
      
      for (const detection of limitedDetections) {
        const { x, y, width, height } = detection.box;
        
        // Use a persistent canvas if possible, or create one with fixed size
        const canvas = document.createElement('canvas');
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext('2d', { alpha: false }); // Optimization: disable alpha
        
        if (ctx && videoRef.current) {
          ctx.drawImage(
            videoRef.current,
            x, y, width, height,
            0, 0, 224, 224
          );
          
          // Use lower quality for JPEG to reduce bandwidth
          const croppedFaceBase64 = canvas.toDataURL('image/jpeg', 0.5);
          const response = await api.predictEmotion(croppedFaceBase64);
          
          if (response.faces && response.faces.length > 0) {
            allResults.push({
              ...response.faces[0],
              box: detection.box
            });
          }
        }
      }

      setResults(allResults);

      // Calculate FPS
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      setFps(Math.round(1000 / delta));
      lastTimeRef.current = now;

    } catch (err) {
      console.error('Prediction error:', err);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [isActive, modelsLoaded, videoRef]);

  useEffect(() => {
    if (isActive && modelsLoaded) {
      // Adaptive interval: increase if FPS is low
      timerRef.current = setInterval(processFrame, 400);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setResults([]);
      setFps(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, modelsLoaded, processFrame]);

  const handleToggleWebcam = () => {
    if (isActive) {
      stopWebcam();
    } else {
      startWebcam();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-12 py-12 max-w-5xl mx-auto">
      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tighter">
          Realtime <span className="text-gradient">Webcam</span>
        </h1>
        <p className="text-slate-400 text-lg sm:text-xl font-medium">
          Experience AI emotion detection in realtime with your camera feed.
        </p>
        {!modelsLoaded && (
          <p className="text-lg font-semibold text-blue-400 animate-pulse">{loadingMessage}</p>
        )}
      </div>

      <div className="relative group w-full max-w-3xl aspect-video bg-black/60 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)]">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className={`w-full h-full object-cover transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* Face Bounding Boxes Overlay */}
        {isActive && results.map((res, i) => (
          <div 
            key={i}
            className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none transition-all duration-100 rounded-sm"
            style={{
              left: `${(res.box.x / (videoRef.current?.videoWidth || 1)) * 100}%`,
              top: `${(res.box.y / (videoRef.current?.videoHeight || 1)) * 100}%`,
              width: `${(res.box.width / (videoRef.current?.videoWidth || 1)) * 100}%`,
              height: `${(res.box.height / (videoRef.current?.videoHeight || 1)) * 100}%`
            }}
          >
            <div className="absolute -top-7 left-0 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-t-md whitespace-nowrap uppercase tracking-widest shadow-lg flex items-center gap-1">
              <span>{res.emoji}</span>
              <span>{res.emotion}</span>
              <span className="opacity-70">{res.confidence}%</span>
            </div>
          </div>
        ))}
        
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 bg-slate-900/40 backdrop-blur-xl">
            <div className="p-8 bg-blue-500/10 rounded-3xl text-blue-400 animate-pulse">
              <Camera className="w-16 h-16" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-black text-white uppercase tracking-tight">Camera Inactive</p>
              <p className="text-slate-400 font-medium">Ready to start the realtime AI scan?</p>
            </div>
            <button 
              onClick={handleToggleWebcam}
              className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-blue-500/25 active:scale-95"
            >
              <RefreshCw className="w-5 h-5" /> START CAMERA FEED
            </button>
          </div>
        )}

        {webcamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 bg-red-900/20 backdrop-blur-xl p-8 text-center">
            <div className="p-6 bg-red-500/10 rounded-full">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <p className="text-xl font-bold text-white max-w-md">{webcamError}</p>
            <button 
              onClick={startWebcam}
              className="px-8 py-3 glass hover:bg-white/10 text-white font-bold rounded-xl transition-all border-white/10"
            >
              Try Again
            </button>
          </div>
        )}

        {isActive && (
          <>
            <div className="absolute top-6 left-6 flex items-center gap-3">
              <div className="glass px-4 py-1.5 rounded-full text-xs font-black text-blue-400 flex items-center gap-2 tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Live Feed • {fps} FPS
              </div>
              {isProcessing && (
                <div className="glass px-4 py-1.5 rounded-full text-xs font-black text-emerald-400 flex items-center gap-2 tracking-widest uppercase">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  AI Syncing...
                </div>
              )}
            </div>
            <button 
              onClick={handleToggleWebcam}
              className="absolute bottom-6 right-6 p-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl backdrop-blur-xl border border-red-500/20 transition-all duration-300 group shadow-lg"
            >
              <StopCircle className="w-6 h-6 group-hover:scale-110" />
            </button>
          </>
        )}
      </div>

      <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 px-4">
        {results.length > 0 ? (
          results.map((face, i) => (
            <div key={i} className="glass p-6 rounded-3xl text-center animate-in zoom-in-95 duration-300 hover:border-blue-500/30 transition-all group">
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-500 drop-shadow-md">{face.emoji}</div>
              <p className="text-sm font-black text-white uppercase tracking-tighter">{face.emotion}</p>
              <div className="mt-3 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500" 
                  style={{ width: `${face.confidence}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest">{face.confidence}% AI Match</p>
            </div>
          ))
        ) : (
          ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral'].map((emotion) => (
            <div key={emotion} className="glass p-4 rounded-2xl text-center opacity-30 grayscale hover:opacity-40 transition-opacity">
              <div className="text-2xl mb-2">
                {emotion === 'Angry' && '😠'}
                {emotion === 'Disgust' && '🤢'}
                {emotion === 'Fear' && '😨'}
                {emotion === 'Happy' && '😊'}
                {emotion === 'Sad' && '😢'}
                {emotion === 'Surprise' && '😲'}
                {emotion === 'Neutral' && '😐'}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emotion}</p>
            </div>
          ))
        )}
      </div>

      {isActive && results.length === 0 && !isProcessing && (
        <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-[0.2em] text-xs animate-pulse">
          <span className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
          Scanning for targets
          <span className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
        </div>
      )}
    </div>
  );
};

export default WebcamPage;
