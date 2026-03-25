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
  Camera,
  Save,
  Loader2,
  CheckCircle,
  ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import Cropper from 'react-easy-crop';
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
      const countries = new Set(items.map(i => i.country)).size;
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

      setInventoryStats({
        total: items.reduce((acc, i) => acc + (i.quantity || 1), 0),
        countries,
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
        className="w-12 h-12 border-4 border-black border-t-transparent rounded-full"
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
        <div className="w-24 h-24 bg-accent/20 rounded-[2rem] flex items-center justify-center mx-auto">
          <User size={48} className="text-black/20" />
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-display font-bold">Join Numisca</h1>
          <p className="text-gray-500 font-medium">Sign in to manage your collection, swap with others, and track your progress.</p>
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
        className="card-curved p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center md:items-start"
      >
        <div className="relative group">
          <motion.img 
            whileHover={{ scale: 1.05 }}
            src={profile?.photoURL || user.photoURL || ''} 
            alt="Profile" 
            className="w-40 h-40 rounded-full border-4 border-black object-cover shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -bottom-2 -right-2 bg-black text-white p-2 rounded-full border-4 border-white">
            <Award size={20} />
          </div>
        </div>

        <div className="flex-1 text-center md:text-left space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-3">
                <h1 className="text-5xl font-display font-bold tracking-tight">{profile?.name}</h1>
                {profile?.verificationStatus === 'verified' && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-blue-500"
                  >
                    <CheckCircle size={32} fill="currentColor" className="text-white" />
                  </motion.div>
                )}
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
                <span className="text-xs uppercase tracking-[0.2em] font-bold px-4 py-1.5 bg-black text-white rounded-full">
                  {profile?.role === 'admin' ? 'Elite Administrator' : 'Advanced Collector'}
                </span>
                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest">
                  <MapPin size={14} />
                  <span>{profile?.location || 'Global Collector'}</span>
                </div>
              </div>
            </div>
            {profile?.bio && (
              <p className="text-gray-500 max-w-2xl leading-relaxed">{profile.bio}</p>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <span className="text-2xl font-display font-bold">{inventoryStats.total}</span>
              <span className="text-[8px] uppercase tracking-widest font-bold opacity-60">Total Items</span>
            </div>
            <div className="stat-card">
              <span className="text-2xl font-display font-bold">{profile?.wishlist?.length || 0}</span>
              <span className="text-[8px] uppercase tracking-widest font-bold opacity-60">Wishlist</span>
            </div>
            <div className="stat-card">
              <span className="text-2xl font-display font-bold">{inventoryStats.countries}</span>
              <span className="text-[8px] uppercase tracking-widest font-bold opacity-60">Countries</span>
            </div>
            <div className="stat-card">
              <span className="text-2xl font-display font-bold">#--</span>
              <span className="text-[8px] uppercase tracking-widest font-bold opacity-60">Ranking</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <button 
              onClick={() => setIsEditing(true)}
              className="btn-pill flex items-center gap-2"
            >
              <Settings size={14} /> Edit Profile
            </button>
            
            {profile?.verificationStatus === 'none' && (
              <button 
                onClick={handleApplyVerification}
                className="btn-pill-outline flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <ShieldCheck size={14} /> Apply for Verification
              </button>
            )}
            {profile?.verificationStatus === 'pending' && (
              <div className="px-6 py-3 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100">
                Verification Pending
              </div>
            )}
            
            <button onClick={logout} className="btn-pill-outline flex items-center gap-2">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </motion.div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white p-8 max-w-lg w-full rounded-[2.5rem] shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-display font-bold">Edit Profile</h2>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {cameraError && (
                  <div className="p-3 bg-red-50 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-red-100 animate-pulse">
                    {cameraError}
                  </div>
                )}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <img 
                      src={editForm.photoURL || user.photoURL || ''} 
                      alt="Avatar Preview" 
                      className="w-24 h-24 rounded-full border-2 border-black object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-full">
                      <label className="cursor-pointer p-1.5 bg-white text-black rounded-full hover:scale-110 transition-transform">
                        <Upload size={12} />
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                      <button 
                        type="button"
                        onClick={startCamera}
                        className="p-1.5 bg-white text-black rounded-full hover:scale-110 transition-transform"
                      >
                        <Camera size={12} />
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Profile Picture</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Display Name</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Location</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={editForm.location}
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    placeholder="e.g. London, UK"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Bio</label>
                  <textarea 
                    className="input-field min-h-[120px] py-4" 
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
          <h2 className="text-3xl font-display">Collection Overview</h2>
          <button className="text-xs font-bold uppercase tracking-widest border-b-2 border-black pb-1 hover:text-gray-500 transition-colors">
            View Full Inventory
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {inventoryStats.types.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card-curved p-6 group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-black text-white rounded-2xl group-hover:scale-110 transition-transform">
                  <item.icon size={24} />
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-display">{item.value}</h3>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-400">{item.name}</p>
              </div>
              <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / (inventoryStats.total || 1)) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-black"
                />
              </div>
            </motion.div>
          ))}
          {inventoryStats.types.length === 0 && (
            <div className="col-span-full py-12 text-center card-curved bg-gray-50 border-dashed border-2 border-gray-200">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Your collection is empty</p>
            </div>
          )}
        </div>
      </section>

      {/* Statistics & Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card-curved p-8 space-y-6"
        >
          <div className="flex items-center gap-3">
            <TrendingUp size={20} />
            <h2 className="text-xl font-display">Distribution</h2>
          </div>
          <div className="h-[300px]">
            {inventoryStats.types.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryStats.types}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {inventoryStats.types.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300">
                <TrendingUp size={48} className="opacity-20" />
              </div>
            )}
          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card-curved p-8 space-y-6"
        >
          <div className="flex items-center gap-3">
            <Globe size={20} />
            <h2 className="text-xl font-display">Collection Stats</h2>
          </div>
          <div className="h-[300px] flex flex-col justify-center space-y-8">
            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center">
                  <Globe size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest">Countries</h4>
                  <p className="text-xs text-gray-400">Represented in collection</p>
                </div>
              </div>
              <span className="text-4xl font-display font-bold">{inventoryStats.countries}</span>
            </div>
            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center">
                  <Star size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest">Rarity Score</h4>
                  <p className="text-xs text-gray-400">Average item quality</p>
                </div>
              </div>
              <span className="text-4xl font-display font-bold">A+</span>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Wishlist */}
      <section className="space-y-6">
        <h2 className="text-3xl font-display">My Wishlist</h2>
        {wishlistItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishlistItems.map((item) => (
              <motion.div 
                key={item.id}
                whileHover={{ y: -5 }}
                className="card-curved p-4 bg-white group"
              >
                <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-4">
                  <img 
                    src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/400`} 
                    alt={item.name}
                    className="w-full h-full object-cover transition-all"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest">{item.name}</h4>
                    <p className="text-xs text-gray-400 font-bold">${item.price}</p>
                  </div>
                  <button className="p-2 bg-black text-white rounded-xl hover:scale-110 transition-transform">
                    <ShoppingBag size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center card-curved bg-gray-50 border-dashed border-2 border-gray-200">
            <Heart size={32} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Your wishlist is empty</p>
          </div>
        )}
      </section>

      {/* Achievements */}
      <section className="space-y-6">
        <h2 className="text-2xl font-display">Achievements</h2>
        <div className="flex flex-wrap gap-8 justify-center md:justify-start">
          {[
            { id: 1, name: 'First Purchase', icon: ShoppingBag, description: 'Made your first acquisition' },
            { id: 2, name: 'Swap Master', icon: Repeat, description: 'Completed 10 successful swaps' },
            { id: 3, name: 'Rare Find', icon: Star, description: 'Added a rare item to collection' },
            { id: 4, name: 'World Traveler', icon: Globe, description: 'Items from 10+ countries' },
          ].map((badge) => (
            <motion.div 
              key={badge.id}
              whileHover={{ y: -10 }}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="badge-icon relative">
                <badge.icon size={24} />
                <div className="absolute inset-0 bg-black/5 rounded-full scale-0 group-hover:scale-100 transition-transform" />
              </div>
              <div className="text-center">
                <h4 className="text-[10px] font-bold uppercase tracking-widest">{badge.name}</h4>
                <p className="text-[8px] text-gray-400 uppercase font-bold max-w-[80px]">{badge.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};
