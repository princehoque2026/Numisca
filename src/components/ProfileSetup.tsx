import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, Save, Loader2, X, Check, User } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export const ProfileSetup: React.FC = () => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.displayName || '');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [image, setImage] = useState<string | null>(user?.photoURL || null);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Cropper state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return canvas.toDataURL('image/jpeg');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setTempImage(reader.result as string);
        setShowCropper(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropSave = async () => {
    try {
      if (tempImage && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(tempImage, croppedAreaPixels);
        setImage(croppedImage);
        setShowCropper(false);
        setTempImage(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteSetup = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        location,
        bio,
        photoURL: image,
        setupCompleted: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported in this browser or context (e.g., non-HTTPS or restricted iframe). Try opening in a new tab.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      let message = "Could not access camera. Please ensure you have granted permission.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "Camera permission was denied. Please check your browser settings or try opening the app in a new tab.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = "No camera was found on your device.";
      } else if (err.message) {
        message = err.message;
      }
      setCameraError(message);
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setTempImage(dataUrl);
        setShowCropper(true);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]"
      >
        {/* Sidebar */}
        <div className="bg-black text-white p-12 md:w-1/3 flex flex-col justify-between">
          <div className="space-y-6">
            <h1 className="text-4xl font-display font-bold leading-tight">Welcome to the Society</h1>
            <p className="text-gray-400 text-sm leading-relaxed">Complete your profile to join our elite circle of collectors.</p>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={`h-1 flex-1 rounded-full transition-all ${step >= i ? 'bg-white' : 'bg-white/20'}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-12 relative">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold">Identity & Avatar</h2>
                  <p className="text-gray-400 text-sm">How should the Society address you?</p>
                </div>

                <div className="flex flex-col items-center gap-6">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full border-4 border-black overflow-hidden bg-gray-50 flex items-center justify-center">
                      {image ? (
                        <img src={image} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={48} className="text-gray-200" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-full">
                      <label className="cursor-pointer p-2 bg-white text-black rounded-full hover:scale-110 transition-transform">
                        <Upload size={16} />
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                      <button 
                        onClick={startCamera}
                        className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform"
                      >
                        <Camera size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="w-full space-y-4">
                    {cameraError && (
                      <div className="p-3 bg-red-50 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-red-100 animate-pulse">
                        {cameraError}
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Display Name</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setStep(2)}
                  disabled={!name}
                  className="btn-pill w-full"
                >
                  Continue
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold">Location & Bio</h2>
                  <p className="text-gray-400 text-sm">Tell us where you are and what you collect.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Location</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. London, UK"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Bio</label>
                    <textarea 
                      className="input-field min-h-[120px] py-4" 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="I've been collecting Roman coins for 10 years..."
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="btn-pill-outline flex-1">Back</button>
                  <button onClick={() => setStep(3)} className="btn-pill flex-1">Review</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold">Final Review</h2>
                  <p className="text-gray-400 text-sm">Everything looks perfect for the archives.</p>
                </div>

                <div className="card-curved p-6 bg-gray-50 flex items-center gap-6">
                  <img src={image || ''} alt="Avatar" className="w-20 h-20 rounded-2xl border-2 border-black object-cover" />
                  <div>
                    <h4 className="text-xl font-display font-bold">{name}</h4>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">{location || 'Global Collector'}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="btn-pill-outline flex-1">Edit</button>
                  <button 
                    onClick={handleCompleteSetup}
                    disabled={isSaving}
                    className="btn-pill flex-1 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} /> Complete Setup</>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Cropper Modal */}
      <AnimatePresence>
        {showCropper && tempImage && (
          <div className="fixed inset-0 z-[300] bg-black flex flex-col">
            <div className="flex-1 relative">
              <Cropper
                image={tempImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-8 bg-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-widest">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e: any) => setZoom(e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => { setShowCropper(false); setTempImage(null); }}
                  className="btn-pill-outline"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCropSave}
                  className="btn-pill flex items-center gap-2"
                >
                  <Save size={18} /> Save Crop
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Camera Modal */}
      <AnimatePresence>
        {isCameraActive && (
          <div className="fixed inset-0 z-[300] bg-black flex flex-col">
            <div className="flex-1 relative flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="max-w-full max-h-full rounded-[2rem]"
              />
            </div>
            <div className="p-12 bg-white flex justify-center items-center gap-8">
              <button 
                onClick={stopCamera}
                className="w-16 h-16 bg-gray-100 text-black rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
              <button 
                onClick={takePhoto}
                className="w-24 h-24 bg-black text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl"
              >
                <Camera size={32} />
              </button>
              <div className="w-16" /> {/* Spacer */}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
