import { useState, useRef } from "react";
import { removeBackground } from "@imgly/background-removal";
import { toast } from "react-toastify";

export default function BackgroundRemover() {
  
  const [orriginalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [finalImage, setFinalImage] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [resizeOption, setResizeOption] = useState('original');
  const [customWidth, setCustomWidth] = useState(256);
  const [customHeight, setCustomHeight] = useState(256);
  const [cropArea, setCropArea] = useState(null); // { x, y, width, height } in percentage
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const resetApp = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setFinalImage(null);
    setIsProcessing(false);
    setBackgroundColor('#ffffff');
    setResizeOption('original');

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

  const resizeImage = (img, size, width = customWidth, height = customHeight) => {
    if (size === 'original') {
      return {
        canvasWidth: img.width,
        canvasHeight: img.height,
        sx: 0,
        sy: 0,
        sWidth: img.width,
        sHeight: img.height,
        dx: 0,
        dy: 0,
        dWidth: img.width,
        dHeight: img.height
      };
    }
    
    let targetWidth, targetHeight;
    
    if (size === 'custom') {
      targetWidth = parseInt(width) || 256;
      targetHeight = parseInt(height) || 256;
    } else {
      // Parse size like '256x256'
      [targetWidth, targetHeight] = size.split('x').map(Number);
    }
    
    // Calculate scale để crop (lấy scale lớn hơn để fill đầy canvas)
    const scaleX = targetWidth / img.width;
    const scaleY = targetHeight / img.height;
    const scale = Math.max(scaleX, scaleY); // Dùng max để fill đầy
    
    // Kích thước ảnh sau khi scale
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    
    // Tính toán vị trí crop để center
    const sx = 0;
    const sy = 0;
    const sWidth = img.width;
    const sHeight = img.height;
    
    // Vị trí vẽ để center ảnh
    const dx = (targetWidth - scaledWidth) / 2;
    const dy = (targetHeight - scaledHeight) / 2;
    
    return {
      canvasWidth: targetWidth,
      canvasHeight: targetHeight,
      sx,
      sy,
      sWidth,
      sHeight,
      dx,
      dy,
      dWidth: scaledWidth,
      dHeight: scaledHeight
    };
  };

  const createImageWithBackground = async (imageUrl, bgColor, size = resizeOption, width = customWidth, height = customHeight, area = cropArea) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const { canvasWidth, canvasHeight, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight } = resizeImage(img, size, width, height, area);
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Fill màu nền mới cho ảnh
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Vẽ hình ảnh với crop (center crop)
        ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        
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
      await createImageWithBackground(processedImage, color, resizeOption, customWidth, customHeight, cropArea);
    }
  };

  const handleResizeChange = async (size) => {
    setResizeOption(size);
    if (size === 'original') {
      setCropArea(null);
    }
    if (processedImage) {
      await createImageWithBackground(processedImage, backgroundColor, size, customWidth, customHeight, size === 'original' ? null : cropArea);
    }
  };

  const handlePresetSize = async (width, height) => {
    setCustomWidth(width);
    setCustomHeight(height);
    setResizeOption('custom');
    if (processedImage) {
      await createImageWithBackground(processedImage, backgroundColor, 'custom', width, height, cropArea);
    }
  };

  const handleCustomSizeChange = async () => {
    if (processedImage) {
      await createImageWithBackground(processedImage, backgroundColor, 'custom', customWidth, customHeight, cropArea);
    }
  };

  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setIsSelecting(true);
    setStartPoint({ x, y });
    setCropArea({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isSelecting || !startPoint || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;
    
    const width = Math.abs(currentX - startPoint.x);
    const height = Math.abs(currentY - startPoint.y);
    const x = Math.min(startPoint.x, currentX);
    const y = Math.min(startPoint.y, currentY);
    
    setCropArea({ x, y, width, height });
  };

  const handleMouseUp = async () => {
    if (isSelecting && cropArea && cropArea.width > 1 && cropArea.height > 1) {
      setIsSelecting(false);
      // Apply crop
      if (processedImage && resizeOption !== 'original') {
        await createImageWithBackground(processedImage, backgroundColor, resizeOption, customWidth, customHeight, cropArea);
      }
    } else {
      setIsSelecting(false);
      setCropArea(null);
    }
  };

  const handleResetCrop = async () => {
    setCropArea(null);
    if (processedImage && resizeOption !== 'original') {
      await createImageWithBackground(processedImage, backgroundColor, resizeOption, customWidth, customHeight, null);
    }
  };

  const downloadBackgroundRemovedImage = () => {
    if (!processedImage) return;

    // Nếu là original size, download trực tiếp
    if (resizeOption === 'original') {
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = 'background-removed.png';
      link.click();
      toast.success("Đã tải xuống hình ảnh đã xóa nền!");
      return;
    }

    // Nếu có resize, tạo canvas với size mới (crop)
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const { canvasWidth, canvasHeight, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight } = resizeImage(img, resizeOption, customWidth, customHeight, cropArea);
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Vẽ với crop (center crop)
      ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const sizeLabel = resizeOption === 'custom' ? `${customWidth}x${customHeight}` : resizeOption;
        link.download = `background-removed-${sizeLabel}.png`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Đã tải xuống hình ảnh ${sizeLabel}!`);
      }, 'image/png');
    };
    img.src = processedImage;
  };

  const downloadFinalImage = () => {
    if (!finalImage) return;

    const link = document.createElement('a');
    link.href = finalImage;
    const sizeLabel = resizeOption === 'custom' ? `${customWidth}x${customHeight}` : resizeOption;
    link.download = `background-removed-with-new-bg-${sizeLabel}.png`;
    link.click();
    URL.revokeObjectURL(finalImage);
    toast.success(`Đã tải xuống hình ảnh ${sizeLabel} với nền mới!`);
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
              <div 
                ref={containerRef}
                className="relative aspect-square w-full max-w-md mx-auto border-2 border-fuchsia-600/50 rounded-2xl overflow-hidden flex items-center justify-center cursor-crosshair"
                onMouseDown={resizeOption !== 'original' ? handleMouseDown : undefined}
                onMouseMove={resizeOption !== 'original' ? handleMouseMove : undefined}
                onMouseUp={resizeOption !== 'original' ? handleMouseUp : undefined}
                onMouseLeave={resizeOption !== 'original' ? handleMouseUp : undefined}
              >
              { processedImage ? (
                <>
                  <img 
                    ref={imageRef}
                    src={processedImage} 
                    alt="Processed" 
                    className="object-contain h-full w-full pointer-events-none select-none"
                    draggable="false"
                  />
                  {/* Crop Selection Box */}
                  {cropArea && resizeOption !== 'original' && (
                    <div
                      className="absolute border-2 border-yellow-400 bg-yellow-400/10"
                      style={{
                        left: `${cropArea.x}%`,
                        top: `${cropArea.y}%`,
                        width: `${cropArea.width}%`,
                        height: `${cropArea.height}%`,
                        pointerEvents: 'none'
                      }}
                    >
                      <div className="absolute top-0 left-0 w-full h-full border-2 border-dashed border-white/50"></div>
                    </div>
                  )}
                </>
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
              {resizeOption !== 'original' && (
                <div className="text-xs text-fuchsia-400 text-center mt-2">
                  {cropArea ? '✂️ Kéo để chọn vùng cắt mới' : '🖱️ Kéo chuột để chọn vùng cắt'}
                </div>
              )}
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
        <div className="mt-6 space-y-4">
          {/* Resize Options */}
          <div className="p-4 bg-gradient-to-r from-indigo-950/40 to-fuchsia-950/50 rounded-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="text-fuchsia-300 text-lg font-semibold">
                📏 Chọn kích thước ảnh
              </div>
              
              {/* Preset Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => handleResizeChange('original')}
                  className={`px-6 py-2 rounded-xl font-medium transition-all ${
                    resizeOption === 'original'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                      : 'bg-fuchsia-900/30 text-fuchsia-300 hover:bg-fuchsia-900/50'
                  }`}
                >
                  🔲 Original
                </button>
                <button
                  onClick={() => handlePresetSize(256, 256)}
                  className={`px-6 py-2 rounded-xl font-medium transition-all ${
                    resizeOption === 'custom' && customWidth === 256 && customHeight === 256
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                      : 'bg-fuchsia-900/30 text-fuchsia-300 hover:bg-fuchsia-900/50'
                  }`}
                >
                  📐 256x256
                </button>
                <button
                  onClick={() => handlePresetSize(512, 512)}
                  className={`px-6 py-2 rounded-xl font-medium transition-all ${
                    resizeOption === 'custom' && customWidth === 512 && customHeight === 512
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                      : 'bg-fuchsia-900/30 text-fuchsia-300 hover:bg-fuchsia-900/50'
                  }`}
                >
                  📏 512x512
                </button>
              </div>

              {/* Custom Size Inputs */}
              <div className="flex flex-col items-center gap-3 w-full max-w-md">
                <div className="text-fuchsia-400 text-sm">✏️ Hoặc tùy chỉnh kích thước:</div>
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1">
                    <label className="text-fuchsia-300 text-xs mb-1 block">Chiều rộng (px)</label>
                    <input
                      type="number"
                      min="1"
                      max="4096"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      onBlur={handleCustomSizeChange}
                      className="w-full px-3 py-2 bg-fuchsia-950/50 border border-fuchsia-500/30 rounded-lg text-white focus:border-fuchsia-400 focus:outline-none"
                      placeholder="Width"
                    />
                  </div>
                  <div className="text-fuchsia-400 text-xl mt-5">×</div>
                  <div className="flex-1">
                    <label className="text-fuchsia-300 text-xs mb-1 block">Chiều cao (px)</label>
                    <input
                      type="number"
                      min="1"
                      max="4096"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      onBlur={handleCustomSizeChange}
                      className="w-full px-3 py-2 bg-fuchsia-950/50 border border-fuchsia-500/30 rounded-lg text-white focus:border-fuchsia-400 focus:outline-none"
                      placeholder="Height"
                    />
                  </div>
                  <button
                    onClick={handleCustomSizeChange}
                    className="mt-5 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:opacity-80 text-white font-medium rounded-lg transition-all"
                  >
                    ✓ Áp dụng
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Crop Control - Only show when not original size */}
          {resizeOption !== 'original' && cropArea && (
            <div className="p-4 bg-gradient-to-r from-indigo-950/40 to-fuchsia-950/50 rounded-2xl">
              <div className="flex flex-col items-center gap-3">
                <div className="text-fuchsia-300 text-lg font-semibold">
                  ✂️ Vùng đã chọn
                </div>
                <div className="text-sm text-fuchsia-400">
                  Kéo chuột trên ảnh để chọn vùng cắt mới
                </div>
                <button
                  onClick={handleResetCrop}
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-80 text-white font-medium rounded-lg transition-all"
                >
                  🔄 Reset vùng cắt
                </button>
              </div>
            </div>
          )}

          {/* Background Color Options */}
          <div className="p-4 bg-gradient-to-r from-indigo-950/40 to-fuchsia-950/50 rounded-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="text-fuchsia-300 text-lg font-semibold">
                🎨 Chọn màu nền mới
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
 