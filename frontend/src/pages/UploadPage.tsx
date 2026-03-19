import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Upload, ImageIcon, AlertCircle, X, BrainCircuit, Loader2 } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { loadModels } from '../services/faceDetection';
import { api } from '../services/api';

interface DetectionResult {
  emotion: string;
  emoji: string;
  confidence: number;
  box?: faceapi.Box;
}

const UploadPage = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<DetectionResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading AI models...');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const initModels = async () => {
      try {
        await loadModels();
        setModelsLoaded(true);
        setLoadingMessage('');
      } catch (err) {
        console.error("Model load error:", err);
        setError('Failed to load face detection models. Please check the public/models folder.');
        setLoadingMessage('Model loading failed.');
      }
    };
    initModels();
  }, []);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setResults(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImage = async () => {
    if (!selectedImage || !imageRef.current || !modelsLoaded) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      // Ensure image is fully loaded before detection
      if (imageRef.current && !imageRef.current.complete) {
        await new Promise((resolve) => {
          if (imageRef.current) imageRef.current.onload = resolve;
        });
      }

      // 1. Detect faces in the browser with robust options
      const detections = await faceapi.detectAllFaces(
        imageRef.current,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 })
      );

      if (detections.length === 0) {
        setError('Invalid Image - No human face detected');
        setIsProcessing(false);
        return;
      }

      // 2. Crop and predict for each face
      const allResults: DetectionResult[] = [];
      
      for (const detection of detections) {
        const { x, y, width, height } = detection.box;
        
        // Create a temporary canvas to crop the face
        const canvas = document.createElement('canvas');
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(
            imageRef.current,
            x, y, width, height,
            0, 0, 224, 224
          );
          
          const croppedFaceBase64 = canvas.toDataURL('image/jpeg', 0.9);
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
    } catch (err) {
      console.error(err);
      setError('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-12 py-12 max-w-5xl mx-auto">
      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tighter">
          Emotion <span className="text-gradient">Detection</span>
        </h1>
        <p className="text-slate-400 text-lg sm:text-xl font-medium">
          Upload any human image and our AI will detect faces and predict emotions in seconds.
        </p>
      </div>

      <div className="w-full max-w-2xl px-4">
        {!modelsLoaded && (
          <div className="text-center p-8 glass rounded-2xl">
            <p className="text-lg font-semibold text-blue-400 animate-pulse">{loadingMessage}</p>
          </div>
        )}

        {modelsLoaded && !selectedImage ? (
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition duration-500" />
            <div className="relative glass border-white/5 rounded-3xl p-12 text-center transition-all group-hover:bg-slate-900/60 group-hover:border-blue-500/50">
              <div className="flex flex-col items-center space-y-6">
                <div className="p-5 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform duration-500">
                  <Upload className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-white tracking-tight">Click to upload or drag & drop</p>
                  <p className="text-slate-400 font-medium">PNG, JPG or WebP (max. 5MB)</p>
                </div>
                <button className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25">
                  Select Image
                </button>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                className="hidden" 
              />
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black/40 aspect-square sm:aspect-video flex items-center justify-center shadow-2xl">
              <img 
                ref={imageRef}
                src={selectedImage} 
                alt="Preview" 
                className="max-h-full w-full object-contain" 
              />
              <button 
                onClick={clearImage}
                className="absolute top-6 right-6 p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full backdrop-blur-xl border border-red-500/20 transition-all duration-300 z-20 group"
              >
                <X className="w-5 h-5 group-hover:scale-110" />
              </button>
              
              {results && results.map((res, i) => res.box && (
                <div 
                  key={i}
                  className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none rounded-sm"
                  style={{
                    left: `${(res.box.x / (imageRef.current?.naturalWidth || 1)) * 100}%`,
                    top: `${(res.box.y / (imageRef.current?.naturalHeight || 1)) * 100}%`,
                    width: `${(res.box.width / (imageRef.current?.naturalWidth || 1)) * 100}%`,
                    height: `${(res.box.height / (imageRef.current?.naturalHeight || 1)) * 100}%`
                  }}
                >
                  <div className="absolute -top-7 left-0 bg-blue-600 text-white text-[11px] font-black px-2 py-0.5 rounded-t-md whitespace-nowrap uppercase tracking-widest shadow-lg">
                    {res.emotion} {res.confidence}%
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 sm:gap-6">
              <button 
                onClick={processImage}
                disabled={isProcessing}
                className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-800 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-[0.98]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    ANALYZING...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="w-6 h-6" />
                    RUN AI DETECTION
                  </>
                )}
              </button>
              <button 
                onClick={clearImage}
                className="flex-1 py-4 glass hover:bg-white/10 text-slate-100 font-bold rounded-2xl transition-all border-white/5 active:scale-[0.98]"
              >
                RESET
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 text-red-400 bg-red-400/10 px-6 py-3 rounded-2xl border border-red-400/20 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {results && (
        <div className="w-full max-w-2xl px-4 animate-in slide-in-from-bottom-6 duration-500">
          <div className="glass rounded-3xl p-8 space-y-6 shadow-2xl">
            <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-widest">
              <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-blue-400" />
              </span>
              Analysis Results
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {results.map((res, i) => (
                <div key={i} className="flex items-center justify-between p-5 glass-dark rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group">
                  <div className="flex items-center gap-5">
                    <span className="text-5xl group-hover:scale-110 transition-transform duration-500 drop-shadow-lg">{res.emoji}</span>
                    <div>
                      <p className="text-xl font-black text-white uppercase tracking-tight">{res.emotion}</p>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">AI Confidence</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black font-mono text-gradient">{res.confidence}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4 mt-12">
        <div className="glass p-8 rounded-3xl space-y-4 hover:border-blue-500/30 transition-all group">
          <div className="p-3 bg-green-500/10 text-green-400 w-fit rounded-2xl group-hover:scale-110 transition-transform">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Multi-Face</h3>
          <p className="text-slate-400 font-medium leading-relaxed">Our AI scans and analyzes every human face in a single shot.</p>
        </div>
        <div className="glass p-8 rounded-3xl space-y-4 hover:border-blue-500/30 transition-all group">
          <div className="p-3 bg-blue-500/10 text-blue-400 w-fit rounded-2xl group-hover:scale-110 transition-transform">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Auto-Validate</h3>
          <p className="text-slate-400 font-medium leading-relaxed">Smart detection ensures only human faces are sent for processing.</p>
        </div>
        <div className="glass p-8 rounded-3xl space-y-4 hover:border-blue-500/30 transition-all group">
          <div className="p-3 bg-purple-500/10 text-purple-400 w-fit rounded-2xl group-hover:scale-110 transition-transform">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Deep Learning</h3>
          <p className="text-slate-400 font-medium leading-relaxed">Powered by MobileNet for lightning-fast and accurate results.</p>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
