import { useState, useRef } from "react";
import { removeBackground } from "@imgly/background-removal";

export default function BackgroundRemover() {
  
  const [orriginalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setError(null);
    setProcessedImage(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      if(e.target && typeof e.target.result === "string") {
        setOriginalImage(e.target.result);
      }
    }
    reader.readAsDataURL(file);

    try {
      const blob = await removeBackground(file);
      const url = URL.createObjectURL(blob);
      setProcessedImage(url);
    } catch (error) {
      setError("Failed to process image. Please try another image.");
      console.error('Background removal error: ', error)
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  }

   const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files  && e.target.files[0] ? e.target.files[0] : undefined;
    handleFileSelect(file);
  }

  const downloadImage = () => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'background-removed.png';
    link.click();
    URL.revokeObjectURL(processedImage);
  }

  const resetApp = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setIsProcessing(false);
    setError(null);

    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-950 via-neutral-900 to-purple-950 flex flex-col items-center justify-center p-4 gap-12">
      <h1 className="text-7xl text-center bg-gradient-to-r text-purple-200 ">
        Background Remover
      </h1>

      <div className="w-full max-w-2xl bg-gradient-to-r from-fuchsia-900 to-indigo-950 backdrop-blur-md border border-fuchisia-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl">
      {!orriginalImage && (
        <div 
        className="flex flex-col items-center justify-center h-96 mb-6 p-4 bg-gradient-to-b from-indigo-950/40 to-fuchsia-950/50 rounded-2xl opacity-80 hover:opacity-100 hover:shadow-fuchsia-700 shadow-2xl transition-all duration-400 text-center cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        >
          <div className="text-4xl sm:text-5xl mb-4">📸</div>
          <div className="text-lg sm:text-xl text-fuchsia-200 mb-2">
            Drag & drop or click to upload an image
          </div>
          <div className="text-xs sm:text-sm text-fuchsia-400">
            JPG, PNG, WEBP supported
          </div>
          <input 
          type="file"
          ref={fileInputRef}
          accept="image/"
          onChange={handleFileInputChange}
          className="hidden"
          />
        </div>
      )}

      {error && <div className="text-center text-pink-400 mb-4">
        {error}
        </div>}

      {
        orriginalImage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center">
              <div className="text-fuchsia-300 text-xl mb-2">
                Original
              </div>
              <div className="aspect-square w-full max-w-md mx-auto border-2 border-fuchsia-600/50 rounded-2xl overflow-hidden flex items-center justify-center">
                <img 
                src={orriginalImage} 
                alt="Original" 
                className="object-contain h-full w-full"
                />
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-fuchsia-300 text-xl mb-2">
                Background Removed
              </div>
              <div className="aspect-square w-full max-w-md mx-auto border-2 border-fuchsia-600/50 rounded-2xl overflow-hidden flex items-center justify-center">
              { processedImage ? (
                <img 
                  src={processedImage} 
                  alt="Processed" 
                  className="object-contain h-full w-full"
                />
              ):(
                <div className="flex flex-col items-center justify-center w-full h-full text-fuchsia-400">
                  { isProcessing ? (
                    <div className="flex items-baseline gap-2">
                      <div className="animate-spin w-6 h-6 border-2 border-fuchsia-300/30 border-t-fuchsia-100 rounded-full"></div>
                      Processing...
                    </div>
                  ):(
                    <span>Processed image will appear here</span>
                  )}
                </div>
              )}                
              </div>
            </div>
          </div>
        )
      }

      {orriginalImage && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center mt-2"> 
          <button
          onClick={downloadImage}
          disabled={!processedImage}
          className="px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-400 hover:opacity-80 text-white font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {processedImage ? "⬇️ Download Image" : "⏳ Processing..."}
          </button>
          <button
          onClick={resetApp}
          className="px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-400 hover:opacity-80 text-white font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            🔄 Process Another Image
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
 