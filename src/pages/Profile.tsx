import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle, logout, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Repeat, 
  LayoutGrid, 
  Users, 
  User, 
  Upload,
  Mail, 
  MapPin, 
  Calendar, 
  Award, 
  Heart, 
  Settings, 
  LogOut,
  Coins,
  FileText,
  Stamp,
  Box,
  TrendingUp,
  Globe,
  ChevronRight,
  Plus,
  Star,
  Clock,
  X,
  CheckCircle,
  Edit,
  Zap,
  ShieldCheck,
  Camera,
  Save,
  Loader2,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';
import Cropper from 'react-easy-crop';
import { WorldMap } from '../components/WorldMap';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from 'recharts';

interface WishlistItem {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
}

export const Profile: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { requestPushPermission, permissionStatus } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    bio: '',
    photoURL: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Cropper state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [collectedCountries, setCollectedCountries] = useState<string[]>([]);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const onCropComplete = React.useCallback((_croppedArea: any, croppedAreaPixels: any) => {
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
        setEditForm(prev => ({ ...prev, photoURL: croppedImage }));
        setShowCropper(false);
        setTempImage(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  const handleApplyVerification = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        verificationStatus: 'pending'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [inventoryStats, setInventoryStats] = useState({
    total: 0,
    countries: 0,
    types: [] as any[]
  });

  useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.name || '',
        location: profile.location || '',
        bio: profile.bio || '',
        photoURL: profile.photoURL || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user || !profile?.wishlist?.length) {
      setWishlistItems([]);
      return;
    }

    const fetchWishlist = async () => {
      try {
        const q = query(collection(db, 'collectibles'), where('__name__', 'in', profile.wishlist));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WishlistItem[];
        setWishlistItems(items);
      } catch (error) {
        console.error('Error fetching wishlist:', error);
      }
    };

    fetchWishlist();
  }, [user, profile?.wishlist]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'inventory'), where('ownerUid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data());
      const countriesList = Array.from(new Set(items.map(i => i.country)));
      const countriesCount = countriesList.length;
      
      const typesMap = items.reduce((acc: any, item: any) => {
        acc[item.type] = (acc[item.type] || 0) + (item.quantity || 1);
        return acc;
      }, {});

      const typesData = Object.entries(typesMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        icon: name === 'coin' ? Coins : name === 'banknote' ? FileText : name === 'stamp' ? Stamp : Box,
        color: name === 'coin' ? '#000000' : name === 'banknote' ? '#333333' : name === 'stamp' ? '#666666' : '#999999'
      }));

      setCollectedCountries(countriesList);
      setInventoryStats({
        total: items.reduce((acc, i) => acc + (i.quantity || 1), 0),
        countries: countriesCount,
        types: typesData
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventory');
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: editForm.name,
        location: editForm.location,
        bio: editForm.bio,
        photoURL: editForm.photoURL
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full"
      />
    </div>
  );

  if (!user) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto text-center space-y-8 py-24"
      >
        <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-[2rem] flex items-center justify-center mx-auto">
          <User size={48} className="text-zinc-400 dark:text-zinc-600" />
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-display font-bold text-zinc-900 dark:text-zinc-50">Join Numisca</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Sign in to manage your collection, swap with others, and track your progress.</p>
        </div>
        <button onClick={signInWithGoogle} className="btn-pill w-full max-w-xs mx-auto">
          Login with Google
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-12 pb-24">
      {/* Profile Summary Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-curved p-6 flex flex-col gap-6 items-center text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
      >
        <div className="relative group">
          <motion.img 
            whileHover={{ scale: 1.05 }}
            src={profile?.photoURL || user.photoURL || ''} 
            alt="Profile" 
            className="w-32 h-32 rounded-full border-4 border-zinc-900 dark:border-zinc-100 object-cover shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -bottom-1 -right-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-2 rounded-full border-4 border-white dark:border-zinc-900">
            <Award size={16} />
          </div>
        </div>

        <div className="w-full space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-display font-bold tracking-tight truncate max-w-[200px] text-zinc-900 dark:text-zinc-50">{profile?.name}</h1>
                {profile?.verificationStatus === 'verified' && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-blue-500"
                  >
                    <CheckCircle size={24} fill="currentColor" className="text-white dark:text-zinc-900" />
                  </motion.div>
                )}
              </div>
              <div className="flex flex-col items-center gap-2 mt-2">
                <span className="text-[8px] uppercase tracking-[0.2em] font-bold px-3 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full">
                  {profile?.role === 'admin' ? 'Elite Administrator' : 'Advanced Collector'}
                </span>
                <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                  <MapPin size={12} />
                  <span>{profile?.location || 'Global Collector'}</span>
                </div>
              </div>
            </div>
            {profile?.bio && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3">{profile.bio}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="text-xl font-display font-bold text-zinc-900 dark:text-zinc-50">{inventoryStats.total}</span>
              <span className="text-[7px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Total Items</span>
            </div>
            <div className="stat-card p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="text-xl font-display font-bold text-zinc-900 dark:text-zinc-50">{profile?.wishlist?.length || 0}</span>
              <span className="text-[7px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Wishlist</span>
            </div>
            <div className="stat-card p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="text-xl font-display font-bold text-zinc-900 dark:text-zinc-50">{inventoryStats.countries}</span>
              <span className="text-[7px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Countries</span>
            </div>
            <div className="stat-card p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="text-xl font-display font-bold text-zinc-900 dark:text-zinc-50">#--</span>
              <span className="text-[7px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Ranking</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => setIsEditing(true)}
              className="btn-pill w-full flex items-center justify-center gap-2 text-xs py-3"
            >
              <Settings size={14} /> Edit Profile
            </button>

            {permissionStatus !== 'granted' && (
              <button 
                onClick={requestPushPermission}
                className="btn-pill-outline w-full flex items-center justify-center gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 text-xs py-3"
              >
                <Bell size={14} /> Enable Push Notifications
              </button>
            )}
            
            {profile?.verificationStatus === 'none' && (
              <button 
                onClick={handleApplyVerification}
                className="btn-pill-outline w-full flex items-center justify-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 text-xs py-3"
              >
                <ShieldCheck size={14} /> Apply for Verification
              </button>
            )}
            {profile?.verificationStatus === 'pending' && (
              <div className="w-full py-3 bg-blue-50 text-blue-600 rounded-full text-[8px] font-bold uppercase tracking-widest border border-blue-100 text-center">
                Verification Pending
              </div>
            )}
            
            <button onClick={logout} className="btn-pill-outline w-full flex items-center justify-center gap-2 text-xs py-3">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </motion.div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 p-8 max-w-lg w-full rounded-[2.5rem] shadow-2xl relative max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-display font-bold text-zinc-900 dark:text-zinc-50">Edit Profile</h2>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-900 dark:text-zinc-100"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {cameraError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-red-100 dark:border-red-900/30 animate-pulse">
                    {cameraError}
                  </div>
                )}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <img 
                      src={editForm.photoURL || user.photoURL || ''} 
                      alt="Avatar Preview" 
                      className="w-24 h-24 rounded-full border-2 border-zinc-900 dark:border-zinc-100 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-full">
                      <label className="cursor-pointer p-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-full hover:scale-110 transition-transform">
                        <Upload size={12} />
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                      <button 
                        type="button"
                        onClick={startCamera}
                        className="p-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-full hover:scale-110 transition-transform"
                      >
                        <Camera size={12} />
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 dark:text-zinc-500">Profile Picture</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Display Name</label>
                  <input 
                    required
                    type="text" 
                    className="input-field bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" 
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Location</label>
                  <input 
                    type="text" 
                    className="input-field bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" 
                    value={editForm.location}
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    placeholder="e.g. London, UK"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Bio</label>
                  <textarea 
                    className="input-field min-h-[120px] py-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" 
                    value={editForm.bio}
                    onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                    placeholder="Tell the Society about your collection..."
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="btn-pill w-full flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Save size={18} /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                <span className="text-xs font-bold uppercase tracking-widest text-black">Zoom</span>
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

      {/* Collection Overview */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <h2 className="text-3xl font-display text-zinc-900 dark:text-zinc-50">Collection Overview</h2>
          <button className="text-xs font-bold uppercase tracking-widest border-b-2 border-zinc-900 dark:border-zinc-100 pb-1 hover:text-zinc-500 transition-colors text-zinc-900 dark:text-zinc-100">
            View Full Inventory
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {inventoryStats.types.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card-curved p-5 group cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl group-hover:scale-110 transition-transform">
                  <item.icon size={20} />
                </div>
                <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-700 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-display text-zinc-900 dark:text-zinc-50">{item.value}</h3>
                <p className="text-[8px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">{item.name}</p>
              </div>
              <div className="mt-3 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / (inventoryStats.total || 1)) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-zinc-900 dark:bg-zinc-100"
                />
              </div>
            </motion.div>
          ))}
          {inventoryStats.types.length === 0 && (
            <div className="col-span-full py-12 text-center card-curved bg-zinc-50 dark:bg-zinc-800/50 border-dashed border-2 border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-xs">Your collection is empty</p>
            </div>
          )}
        </div>
      </section>

      {/* Statistics & Visualizations */}
      <div className="grid grid-cols-1 gap-6">
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-curved p-6 space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <Globe size={18} />
              <h2 className="text-lg font-display">Global Presence</h2>
            </div>
            <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">{inventoryStats.countries} Countries</span>
          </div>
          <div className="h-[200px]">
            <WorldMap collectedCountries={collectedCountries} />
          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-curved p-6 space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
            <TrendingUp size={18} />
            <h2 className="text-lg font-display">Distribution</h2>
          </div>
          <div className="h-[250px]">
            {inventoryStats.types.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryStats.types}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {inventoryStats.types.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '0.5rem', fontSize: '10px', backgroundColor: '#18181b', color: '#f4f4f5' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-300 dark:text-zinc-700">
                <TrendingUp size={32} className="opacity-20" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {inventoryStats.types.map((type) => (
              <div key={type.name} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: type.color }} />
                  <span className="text-[7px] uppercase font-bold tracking-widest text-zinc-500 dark:text-zinc-400 truncate max-w-[50px]">{type.name}</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-50">{type.value}</span>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Swap & Wishlist */}
      <div className="grid grid-cols-1 gap-8">
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <h2 className="text-2xl font-display text-zinc-900 dark:text-zinc-50">Recent Swaps</h2>
            <button className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">View All</button>
          </div>
          <div className="space-y-3">
            {[
              { id: 1, partner: 'Alex K.', item: '1924 Silver Dollar', type: 'Received', date: '2d ago' },
              { id: 2, partner: 'Sarah M.', item: 'Victorian Stamp Set', type: 'Sent', date: '5d ago' },
            ].map((swap) => (
              <motion.div 
                key={swap.id}
                whileHover={{ x: 5 }}
                className="card-curved p-4 flex items-center justify-between group cursor-pointer border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${swap.type === 'Received' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                    <Repeat size={16} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest truncate max-w-[150px] text-zinc-900 dark:text-zinc-50">{swap.item}</h4>
                    <p className="text-[7px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-tighter truncate">With {swap.partner} • {swap.type}</p>
                  </div>
                </div>
                <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-widest whitespace-nowrap">{swap.date}</span>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <h2 className="text-2xl font-display text-zinc-900 dark:text-zinc-50">Wishlist</h2>
            <button className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">View All</button>
          </div>
          <div className="space-y-3">
            {wishlistItems.slice(0, 3).map((item) => (
              <motion.div 
                key={item.id}
                whileHover={{ scale: 1.02 }}
                className="card-curved p-3 flex items-center gap-3 group cursor-pointer border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              >
                <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                  <img 
                    src={item.imageUrl || `https://picsum.photos/seed/${item.id}/200/200`} 
                    alt={item.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[8px] font-bold uppercase tracking-widest leading-tight truncate text-zinc-900 dark:text-zinc-50">{item.name}</h4>
                  <p className="text-[10px] font-bold mt-0.5 text-zinc-900 dark:text-zinc-50">৳{item.price}</p>
                </div>
                <button className="p-1.5 text-zinc-300 dark:text-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  <Heart size={14} />
                </button>
              </motion.div>
            ))}
            {wishlistItems.length === 0 && (
              <div className="py-8 text-center card-curved bg-zinc-50/50 dark:bg-zinc-800/50 border-dashed border-2 border-zinc-100 dark:border-zinc-800">
                <Heart size={20} className="mx-auto text-gray-200 mb-2" />
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Empty Wishlist</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Activity Feed / Timeline */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <Clock size={24} />
          <h2 className="text-3xl font-display">Activity Timeline</h2>
        </div>
        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
          {[
            { id: 1, action: 'Added 3 coins from Germany', date: 'Today, 2:30 PM', icon: Plus },
            { id: 2, action: 'Completed swap with Alex K.', date: 'Yesterday', icon: CheckCircle },
            { id: 3, action: 'Updated profile bio', date: 'Mar 22, 2026', icon: Edit },
            { id: 4, action: 'Joined Numisca Society', date: 'Mar 20, 2026', icon: Users },
          ].map((activity) => (
            <motion.div 
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute -left-[29px] top-1 w-6 h-6 bg-white border-2 border-black rounded-full flex items-center justify-center z-10 group-hover:scale-110 transition-transform">
                <activity.icon size={12} />
              </div>
              <div className="card-curved p-6 hover:shadow-xl transition-all duration-500 border border-black/5">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-bold uppercase tracking-widest">{activity.action}</h4>
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{activity.date}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Achievements */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <Award size={24} />
          <h2 className="text-3xl font-display">Achievements</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-8">
          {[
            { id: 1, name: 'First Purchase', icon: ShoppingBag, description: 'Made your first acquisition' },
            { id: 2, name: 'Swap Master', icon: Repeat, description: 'Completed 10 successful swaps' },
            { id: 3, name: 'Rare Find', icon: Star, description: 'Added a rare item to collection' },
            { id: 4, name: 'World Traveler', icon: Globe, description: 'Items from 10+ countries' },
            { id: 5, name: 'Verified', icon: ShieldCheck, description: 'Identity verified by Society' },
            { id: 6, name: 'Early Adopter', icon: Zap, description: 'Joined during Beta phase' },
          ].map((badge) => (
            <motion.div 
              key={badge.id}
              whileHover={{ y: -10 }}
              className="flex flex-col items-center gap-4 group cursor-help"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-[1.5rem] flex items-center justify-center relative group-hover:bg-black group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-2xl">
                <badge.icon size={32} />
                <div className="absolute inset-0 border-2 border-black/5 rounded-[1.5rem] group-hover:border-white/20 transition-colors" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-[10px] font-bold uppercase tracking-widest">{badge.name}</h4>
                <p className="text-[8px] text-gray-400 uppercase font-bold max-w-[100px] leading-tight opacity-0 group-hover:opacity-100 transition-opacity">{badge.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};
