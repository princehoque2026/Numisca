import React from 'react';
import { motion } from 'motion/react';
import { collection, query, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, ShoppingBag, Repeat, ShieldCheck, AlertTriangle, Check, X, Upload, Plus, Package, Search } from 'lucide-react';
import { addDoc } from 'firebase/firestore';

export const AdminDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = React.useState({
    users: 0,
    items: 0,
    swaps: 0,
    revenue: 0
  });
  const [recentUsers, setRecentUsers] = React.useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddingItem, setIsAddingItem] = React.useState(false);
  const [newItem, setNewItem] = React.useState({
    name: '',
    type: 'coin',
    country: '',
    year: '',
    price: '',
    rarity: 'Common',
    imageUrl: ''
  });

  React.useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const itemsSnap = await getDocs(collection(db, 'collectibles'));
        const swapsSnap = await getDocs(collection(db, 'swaps'));
        
        const allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStats({
          users: usersSnap.size,
          items: itemsSnap.size,
          swaps: swapsSnap.size,
          revenue: itemsSnap.docs.reduce((acc, doc) => acc + (Number(doc.data().price) || 0), 0)
        });

        setRecentUsers(allUsers.slice(0, 5));
        setPendingVerifications(allUsers.filter((u: any) => u.verificationStatus === 'pending'));
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'admin_stats');
      }
    };

    fetchData();
  }, [isAdmin]);

  const handleVerification = async (userId: string, status: 'verified' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        verificationStatus: status
      });
      setPendingVerifications(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'collectibles'), {
        ...newItem,
        price: Number(newItem.price),
        status: 'available',
        createdAt: new Date().toISOString()
      });
      setIsAddingItem(false);
      setNewItem({
        name: '',
        type: 'coin',
        country: '',
        year: '',
        price: '',
        rarity: 'Common',
        imageUrl: ''
      });
      // Refresh stats
      const itemsSnap = await getDocs(collection(db, 'collectibles'));
      setStats(prev => ({ ...prev, items: itemsSnap.size }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'collectibles');
    }
  };

  if (!isAdmin) return <div className="py-24 text-center">Access Denied</div>;

  const chartData = [
    { name: 'Mon', value: 400 },
    { name: 'Tue', value: 300 },
    { name: 'Wed', value: 600 },
    { name: 'Thu', value: 800 },
    { name: 'Fri', value: 500 },
    { name: 'Sat', value: 900 },
    { name: 'Sun', value: 1000 },
  ];

  return (
    <div className="space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end"
      >
        <div>
          <h1 className="text-5xl font-display font-bold tracking-tight">Admin Console</h1>
          <p className="text-gray-500 mt-2 font-sans">Global platform metrics and management.</p>
        </div>
        <button 
          onClick={() => setIsAddingItem(true)}
          className="btn-pill flex items-center gap-2"
        >
          <Plus size={18} /> Add Shop Item
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: stats.users, icon: Users },
          { label: 'Shop Items', value: stats.items, icon: ShoppingBag },
          { label: 'Active Swaps', value: stats.swaps, icon: Repeat },
          { label: 'Total Value', value: `$${stats.revenue}`, icon: ShieldCheck },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card p-8 bg-white group hover:bg-black transition-all duration-500"
          >
            <div className="p-3 bg-gray-50 rounded-2xl w-fit group-hover:bg-white/10 transition-colors">
              <stat.icon size={24} className="group-hover:text-white transition-colors" />
            </div>
            <div className="mt-6">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 group-hover:text-gray-500 transition-colors">{stat.label}</h3>
              <p className="text-4xl font-display font-bold mt-1 group-hover:text-white transition-colors">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Verification Requests */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white card-curved p-10 shadow-sm"
        >
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">Verification Requests</h3>
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-bold uppercase tracking-widest">
              {pendingVerifications.length} Pending
            </span>
          </div>
          <div className="space-y-6">
            {pendingVerifications.length > 0 ? (
              pendingVerifications.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl group hover:bg-black transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <img 
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}`} 
                      alt={user.name}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-white"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="text-sm font-bold group-hover:text-white transition-colors">{user.name}</h4>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest group-hover:text-gray-500 transition-colors">{user.location || 'Global'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleVerification(user.id, 'verified')}
                      className="p-2 bg-white text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-sm"
                    >
                      <Check size={16} />
                    </button>
                    <button 
                      onClick={() => handleVerification(user.id, 'rejected')}
                      className="p-2 bg-white text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                No pending requests
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Users */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white card-curved p-10 shadow-sm"
        >
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-10">Recent Collectors</h3>
          <div className="space-y-8">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-sm font-bold group-hover:bg-black group-hover:text-white transition-all duration-300">
                    {user.name?.[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold group-hover:translate-x-1 transition-transform">{user.name}</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">{user.email}</p>
                  </div>
                </div>
                <span className={`badge ${
                  user.role === 'admin' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-100'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* System Status */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-gray-50 rounded-[2rem] flex items-center gap-6 border border-gray-100"
      >
        <div className="p-4 bg-white rounded-2xl shadow-sm">
          <AlertTriangle className="text-black" size={24} />
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest">System Integrity Check</h4>
          <p className="text-xs text-gray-500 mt-1 font-sans">All escrow services are operational. 2 swaps pending admin review.</p>
        </div>
      </motion.div>

      {/* Add Item Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white p-10 max-w-2xl w-full rounded-[3rem] shadow-2xl relative max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black text-white rounded-2xl">
                  <Package size={24} />
                </div>
                <h2 className="text-3xl font-display font-bold">Add Shop Item</h2>
              </div>
              <button 
                onClick={() => setIsAddingItem(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Item Name</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    placeholder="e.g. 1921 Morgan Silver Dollar"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Type</label>
                    <select 
                      className="input-field"
                      value={newItem.type}
                      onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                    >
                      <option value="coin">Coin</option>
                      <option value="banknote">Banknote</option>
                      <option value="stamp">Stamp</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Price ($)</label>
                    <input 
                      required
                      type="number" 
                      className="input-field" 
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Country</label>
                    <input 
                      required
                      type="text" 
                      className="input-field" 
                      value={newItem.country}
                      onChange={(e) => setNewItem({...newItem, country: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Year</label>
                    <input 
                      required
                      type="text" 
                      className="input-field" 
                      value={newItem.year}
                      onChange={(e) => setNewItem({...newItem, year: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Rarity</label>
                  <select 
                    className="input-field"
                    value={newItem.rarity}
                    onChange={(e) => setNewItem({...newItem, rarity: e.target.value})}
                  >
                    <option value="Common">Common</option>
                    <option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option>
                    <option value="Legendary">Legendary</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Item Image</label>
                  <div className="aspect-square bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group">
                    {newItem.imageUrl ? (
                      <>
                        <img src={newItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="cursor-pointer p-4 bg-white text-black rounded-full shadow-xl hover:scale-110 transition-transform">
                            <Upload size={24} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                          </label>
                        </div>
                      </>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-3 text-gray-400 hover:text-black transition-colors">
                        <Upload size={48} />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Upload Photo</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                    )}
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="btn-pill w-full py-6 text-lg"
                >
                  Create Listing
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
