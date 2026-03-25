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
    <div className="space-y-6 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-start gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Admin Console</h1>
          <p className="text-xs text-gray-500 mt-1 font-sans">Platform management.</p>
        </div>
        <button 
          onClick={() => setIsAddingItem(true)}
          className="btn-pill flex items-center gap-2 py-2 px-4 text-xs"
        >
          <Plus size={14} /> Add Shop Item
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Users', value: stats.users, icon: Users },
          { label: 'Items', value: stats.items, icon: ShoppingBag },
          { label: 'Swaps', value: stats.swaps, icon: Repeat },
          { label: 'Value', value: `$${stats.revenue}`, icon: ShieldCheck },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card p-4 bg-white group hover:bg-black transition-all duration-500"
          >
            <div className="p-2 bg-gray-50 rounded-xl w-fit group-hover:bg-white/10 transition-colors">
              <stat.icon size={16} className="group-hover:text-white transition-colors" />
            </div>
            <div className="mt-3">
              <h3 className="text-[8px] uppercase tracking-widest font-bold text-gray-400 group-hover:text-gray-500 transition-colors">{stat.label}</h3>
              <p className="text-xl font-display font-bold mt-0.5 group-hover:text-white transition-colors">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Verification Requests */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white card-curved p-6 shadow-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[8px] uppercase tracking-widest font-bold text-gray-400">Verification Requests</h3>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[8px] font-bold uppercase tracking-widest">
              {pendingVerifications.length} Pending
            </span>
          </div>
          <div className="space-y-4">
            {pendingVerifications.length > 0 ? (
              pendingVerifications.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl group hover:bg-black transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}`} 
                      alt={user.name}
                      className="w-10 h-10 rounded-xl object-cover border border-white"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold group-hover:text-white transition-colors truncate max-w-[100px]">{user.name}</h4>
                      <p className="text-[8px] text-gray-400 uppercase tracking-widest group-hover:text-gray-500 transition-colors truncate">{user.location || 'Global'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleVerification(user.id, 'verified')}
                      className="p-2 bg-white text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all shadow-sm"
                    >
                      <Check size={14} />
                    </button>
                    <button 
                      onClick={() => handleVerification(user.id, 'rejected')}
                      className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-400 text-[8px] uppercase font-bold tracking-widest">
                No pending requests
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Users */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white card-curved p-6 shadow-sm"
        >
          <h3 className="text-[8px] uppercase tracking-widest font-bold text-gray-400 mb-6">Recent Collectors</h3>
          <div className="space-y-4">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xs font-bold group-hover:bg-black group-hover:text-white transition-all duration-300">
                    {user.name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold group-hover:translate-x-1 transition-transform truncate max-w-[120px]">{user.name}</h4>
                    <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-0.5 truncate max-w-[120px]">{user.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                  user.role === 'admin' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500'
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
        className="p-5 bg-gray-50 rounded-3xl flex items-center gap-4 border border-gray-100"
      >
        <div className="p-3 bg-white rounded-xl shadow-sm">
          <AlertTriangle className="text-black" size={18} />
        </div>
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest">System Integrity</h4>
          <p className="text-[8px] text-gray-500 mt-0.5 font-sans">All services operational. 2 pending review.</p>
        </div>
      </motion.div>

      {/* Add Item Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 w-full rounded-t-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-black text-white rounded-xl">
                  <Package size={20} />
                </div>
                <h2 className="text-2xl font-display font-bold">Add Shop Item</h2>
              </div>
              <button 
                onClick={() => setIsAddingItem(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold tracking-widest text-gray-400 ml-1">Item Name</label>
                  <input 
                    required
                    type="text" 
                    className="input-field py-3 text-sm" 
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    placeholder="e.g. 1921 Morgan Silver Dollar"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase font-bold tracking-widest text-gray-400 ml-1">Type</label>
                    <select 
                      className="input-field py-3 text-sm"
                      value={newItem.type}
                      onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                    >
                      <option value="coin">Coin</option>
                      <option value="banknote">Banknote</option>
                      <option value="stamp">Stamp</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase font-bold tracking-widest text-gray-400 ml-1">Price ($)</label>
                    <input 
                      required
                      type="number" 
                      className="input-field py-3 text-sm" 
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase font-bold tracking-widest text-gray-400 ml-1">Country</label>
                    <input 
                      required
                      type="text" 
                      className="input-field py-3 text-sm" 
                      value={newItem.country}
                      onChange={(e) => setNewItem({...newItem, country: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase font-bold tracking-widest text-gray-400 ml-1">Year</label>
                    <input 
                      required
                      type="text" 
                      className="input-field py-3 text-sm" 
                      value={newItem.year}
                      onChange={(e) => setNewItem({...newItem, year: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold tracking-widest text-gray-400 ml-1">Rarity</label>
                  <select 
                    className="input-field py-3 text-sm"
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

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold tracking-widest text-gray-400 ml-1">Item Image</label>
                  <div className="aspect-square bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group">
                    {newItem.imageUrl ? (
                      <>
                        <img src={newItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <label className="cursor-pointer p-3 bg-white text-black rounded-full shadow-xl">
                            <Upload size={20} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                          </label>
                        </div>
                      </>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-2 text-gray-400">
                        <Upload size={32} />
                        <span className="text-[8px] uppercase font-bold tracking-widest">Upload Photo</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                    )}
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="btn-pill w-full py-4 text-sm"
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
