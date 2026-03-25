import React from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Plus, Map as MapIcon, PieChart as ChartIcon, Search, Globe, Filter, Trash2, Upload, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

interface InventoryItem {
  id: string;
  ownerUid: string;
  name: string;
  type: string;
  country: string;
  year: number;
  rarity: string;
  quantity: number;
  source: string;
  imageUrl?: string;
  addedAt: any;
}

export const Inventory: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAdding, setIsAdding] = React.useState(false);
  const [view, setView] = React.useState<'grid' | 'stats'>('grid');

  // Form state
  const [newItem, setNewItem] = React.useState<Partial<InventoryItem>>({
    name: '',
    type: 'coin',
    country: '',
    year: new Date().getFullYear(),
    quantity: 1,
    rarity: 'common',
    source: 'manual',
    imageUrl: ''
  });

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

  React.useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'inventory'), where('ownerUid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setItems(itemsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventory');
    });

    return unsubscribe;
  }, [user]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'inventory'), {
        ...newItem,
        ownerUid: user.uid,
        addedAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewItem({
        name: '',
        type: 'coin',
        country: '',
        year: new Date().getFullYear(),
        quantity: 1,
        rarity: 'common',
        source: 'manual',
        imageUrl: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inventory');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Remove this item from your collection?')) return;
    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inventory/${id}`);
    }
  };

  // Stats Data
  const typeData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      counts[item.type] = (counts[item.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [items]);

  const countryData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      counts[item.country] = (counts[item.country] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [items]);

  const COLORS = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC'];

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl font-display font-bold">My Collection</h1>
          <p className="text-gray-500 mt-2 font-medium">Manage and visualize your personal inventory.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex border border-black p-1 rounded-xl overflow-hidden">
            <button 
              onClick={() => setView('grid')}
              className={`p-2 transition-all ${view === 'grid' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
            >
              <Filter size={16} />
            </button>
            <button 
              onClick={() => setView('stats')}
              className={`p-2 transition-all ${view === 'stats' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
            >
              <ChartIcon size={16} />
            </button>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="btn-pill flex items-center gap-2"
          >
            <Plus size={16} /> Add Manually
          </button>
        </div>
      </div>

      {view === 'stats' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="card-curved p-8">
            <h3 className="text-xs uppercase tracking-widest font-bold mb-8">Distribution by Type</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {typeData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] uppercase tracking-tighter font-bold">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-curved p-8">
            <h3 className="text-xs uppercase tracking-widest font-bold mb-8">Top Countries</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countryData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    axisLine={false} 
                    tickLine={false} 
                    className="text-[10px] uppercase font-bold" 
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" fill="#000000" radius={[0, 10, 10, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((item) => (
            <motion.div 
              key={item.id}
              layout
              whileHover={{ y: -10 }}
              className="group card-curved p-4"
            >
              <div className="aspect-square bg-gray-50 rounded-[1.5rem] flex items-center justify-center mb-4 relative overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <Globe className="text-gray-200" size={64} />
                )}
                <div className="absolute top-4 left-4">
                  <span className="text-[8px] uppercase tracking-widest font-bold px-3 py-1 bg-black text-white rounded-full">
                    {item.rarity}
                  </span>
                </div>
                <button 
                  onClick={() => handleDeleteItem(item.id)}
                  className="absolute top-4 right-4 p-2 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="font-display font-bold text-lg">{item.name}</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                {item.country} • {item.year}
              </p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-[8px] uppercase tracking-tighter text-gray-400 font-bold">Source: {item.source}</span>
                <span className="text-[10px] font-bold">Qty: {item.quantity}</span>
              </div>
            </motion.div>
          ))}
          {items.length === 0 && !loading && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-gray-100 rounded-[2rem]">
              <p className="text-gray-400 font-display italic">Your collection is empty. Start by adding items from the shop or manually.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-10 rounded-[2.5rem] max-w-2xl w-full shadow-2xl"
          >
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-4xl font-display font-bold">Add to Collection</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Name</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Type</label>
                    <select 
                      className="input-field"
                      value={newItem.type}
                      onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                    >
                      <option value="coin">Coin</option>
                      <option value="banknote">Banknote</option>
                      <option value="stamp">Stamp</option>
                      <option value="keychain">Keychain</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Year</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={newItem.year}
                      onChange={(e) => setNewItem({...newItem, year: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Country</label>
                    <input 
                      required
                      type="text" 
                      className="input-field" 
                      value={newItem.country}
                      onChange={(e) => setNewItem({...newItem, country: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Rarity</label>
                    <select 
                      className="input-field"
                      value={newItem.rarity}
                      onChange={(e) => setNewItem({...newItem, rarity: e.target.value})}
                    >
                      <option value="common">Common</option>
                      <option value="uncommon">Uncommon</option>
                      <option value="rare">Rare</option>
                      <option value="legendary">Legendary</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Quantity</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Item Photo</label>
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
                <button type="submit" className="btn-pill w-full py-6 text-lg">Add to Collection</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

