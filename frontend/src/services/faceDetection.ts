import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

export const loadModels = async () => {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    ]);
    console.log('Face detection models loaded');
  } catch (error) {
    console.error('Error loading face detection models:', error);
    throw error;
  }
};

export const detectFaces = async (imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => {
  const detections = await faceapi.detectAllFaces(
    imageElement,
    new faceapi.TinyFaceDetectorOptions({
      inputSize: 320, // Increased for better accuracy
      scoreThreshold: 0.3 // Lowered to detect more faces
    })
  );
  return detections;
};

export const getFaceCrops = (
  canvas: HTMLCanvasElement,
  detections: faceapi.FaceDetection[]
): string[] => {
  return detections.map(detection => {
    const { x, y, width, height } = detection.box;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(
        canvas,
        x, y, width, height,
        0, 0, width, height
      );
      return tempCanvas.toDataURL('image/jpeg', 0.9);
    }
    return '';
  }).filter(crop => crop !== '');
};
