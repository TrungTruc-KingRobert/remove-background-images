import { useState, useRef } from "react";
import { removeBackground } from "@imgly/background-removal";
import { toast } from "react-toastify";

export default function BackgroundRemover() {
  
  const [orriginalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [finalImage, setFinalImage] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const resetApp = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setFinalImage(null);
    setIsProcessing(false);
    setBackgroundColor('#ffffff');

    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const handleFileSelect = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.info("Vui lòng chọn tệp hình ảnh có phần mở rộng được hỗ trợ!");
      resetApp();
      return;
    }

    setProcessedImage(null);
    setFinalImage(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      if(e.target && typeof e.target.result === "string") {
        setOriginalImage(e.target.result);
      }
    }
    reader.readAsDataURL(file);

    try {
      setIsProcessing(true);
      const blob = await removeBackground(file);
      const url = URL.createObjectURL(blob);
      setProcessedImage(url);
      
      // Tự động tạo hình ảnh có nền trắng ban đầu
      await createImageWithBackground(url, backgroundColor);
    } catch (error) {
      toast.error("Không xử lý được hình ảnh. Vui lòng thử hình ảnh khác!");
      console.error('Lỗi xóa nền: ', error)
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

  const createImageWithBackground = async (imageUrl, bgColor) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Fill màu nền mới cho ảnh
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Vẽ hình ảnh trong suốt ở trên cùng
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          setFinalImage(url);
          resolve(url);
        }, 'image/png');
      };
      img.src = imageUrl;
    });
  };

  const handleBackgroundColorChange = async (color) => {
    setBackgroundColor(color);
    if (processedImage) {
      await createImageWithBackground(processedImage, color);
    }
  };

  const downloadBackgroundRemovedImage = () => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'background-removed.png';
    link.click();
    toast.success("Đã tải xuống hình ảnh đã xóa nền!");
  };

  const downloadFinalImage = () => {
    if (!finalImage) return;

    const link = document.createElement('a');
    link.href = finalImage;
    link.download = 'background-removed-with-new-bg.png';
    link.click();
    URL.revokeObjectURL(finalImage);
    toast.success("Đã tải xuống hình ảnh với nền mới!");
    resetApp();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-950 via-neutral-900 to-purple-950 flex flex-col items-center justify-center p-4 gap-12">
      <h1 className="text-7xl text-center bg-gradient-to-r text-purple-200 ">
        Xóa nền ảnh
      </h1>

      <div className="w-full max-w-5xl bg-gradient-to-r from-fuchsia-900 to-indigo-950 backdrop-blur-md border border-fuchisia-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl">
      {!orriginalImage && (
        <div 
        className="flex flex-col items-center justify-center h-96 mb-6 p-4 bg-gradient-to-b from-indigo-950/40 to-fuchsia-950/50 rounded-2xl opacity-80 hover:opacity-100 hover:shadow-fuchsia-700 shadow-2xl transition-all duration-400 text-center cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        >
          <div className="text-4xl sm:text-5xl mb-4">📸</div>
          <div className="text-lg sm:text-xl text-fuchsia-200 mb-2">
            Kéo thả hoặc click để tải ảnh lên
          </div>
          <div className="text-xs sm:text-sm text-fuchsia-400">
            Các định dạng file hỗ trợ: JPG, PNG, WEBP
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

      {
        orriginalImage && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                Ảnh đã xóa nền
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
                    <span>Vui lòng chờ giây lát...</span>
                  )}
                </div>
              )}                
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-fuchsia-300 text-xl mb-2">
                Ảnh nền đơn sắc
              </div>
              <div className="aspect-square w-full max-w-md mx-auto border-2 border-fuchsia-600/50 rounded-2xl overflow-hidden flex items-center justify-center">
              { finalImage ? (
                <img 
                  src={finalImage} 
                  alt="Final" 
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
                    <span>Vui lòng chờ giây lát...</span>
                  )}
                </div>
              )}                
              </div>
            </div>
          </div>
        )
      }

      {processedImage && (
        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-950/40 to-fuchsia-950/50 rounded-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="text-fuchsia-300 text-lg font-semibold">
              Chọn màu nền mới
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => handleBackgroundColorChange(e.target.value)}
                className="w-12 h-12 rounded-lg border-2 border-fuchsia-400/50 cursor-pointer"
              />
              <div className="flex gap-2">
                {['#ffffff', '#000000', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'].map((color) => (
                  <button
                    key={color}
                    onClick={() => handleBackgroundColorChange(color)}
                    className="w-8 h-8 rounded-full border-2 border-fuchsia-400/50 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {orriginalImage && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center mt-2"> 
          <button
          onClick={downloadBackgroundRemovedImage}
          disabled={!processedImage}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-400 hover:opacity-80 text-white font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {processedImage ? "⬇️ Tải ảnh đã xóa nền" : "⏳ Processing..."}
          </button>
          <button
          onClick={downloadFinalImage}
          disabled={!finalImage}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-400 hover:opacity-80 text-white font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {finalImage ? "⬇️ Tải ảnh có nền đơn sắc mới" : "⏳ Filling..."}
          </button>
          <button
          onClick={resetApp}
          className="px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-400 hover:opacity-80 text-white font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            🔄 Chọn hình ảnh khác
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
 