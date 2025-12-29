import { useState, useCallback } from "react";

interface BlurResult {
  isBlurry: boolean;
  score: number;
  message: string;
}

export function useBlurDetection() {
  const [analyzing, setAnalyzing] = useState<{ [key: number]: boolean }>({});

  const analyzeImage = useCallback((file: File, id: number): Promise<BlurResult> => {
    return new Promise((resolve) => {
      setAnalyzing(prev => ({ ...prev, [id]: true }));
      
      const img = new Image();
      img.onload = () => {
        // Create canvas to analyze image
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          setAnalyzing(prev => ({ ...prev, [id]: false }));
          resolve({ isBlurry: false, score: 100, message: "Unable to analyze" });
          return;
        }

        // Resize for faster processing
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Convert to grayscale and calculate Laplacian variance (blur detection)
        const gray: number[] = [];
        for (let i = 0; i < data.length; i += 4) {
          gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        
        // Apply Laplacian kernel
        const width = canvas.width;
        const height = canvas.height;
        let laplacianSum = 0;
        let count = 0;
        
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            // Laplacian kernel: [0, 1, 0], [1, -4, 1], [0, 1, 0]
            const laplacian = 
              gray[idx - width] + 
              gray[idx - 1] + 
              gray[idx + 1] + 
              gray[idx + width] - 
              4 * gray[idx];
            laplacianSum += laplacian * laplacian;
            count++;
          }
        }
        
        // Calculate variance
        const variance = laplacianSum / count;
        
        // Threshold for blur detection (lower = more blurry)
        // Typical threshold is around 100-500 depending on image
        const blurThreshold = 100;
        const isBlurry = variance < blurThreshold;
        
        // Convert to a 0-100 score (higher = better quality)
        const score = Math.min(100, Math.round((variance / blurThreshold) * 100));
        
        setAnalyzing(prev => ({ ...prev, [id]: false }));
        
        if (isBlurry) {
          resolve({
            isBlurry: true,
            score,
            message: "Photo appears blurry. Try again with steadier hands."
          });
        } else if (score < 60) {
          resolve({
            isBlurry: false,
            score,
            message: "Photo quality is acceptable but could be clearer."
          });
        } else {
          resolve({
            isBlurry: false,
            score,
            message: "Great photo! Clear and sharp."
          });
        }
      };
      
      img.onerror = () => {
        setAnalyzing(prev => ({ ...prev, [id]: false }));
        resolve({ isBlurry: false, score: 100, message: "Unable to analyze" });
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  return { analyzeImage, analyzing };
}
