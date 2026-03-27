import React from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
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
  description?: string;
}

export const Inventory: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAdding, setIsAdding] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<InventoryItem | null>(null);
  const [view, setView] = React.useState<'grid' | 'stats'>('grid');
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'date' | 'rarity'>('date');
  const [filterType, setFilterType] = React.useState('all');
  const [filterRarity, setFilterRarity] = React.useState('all');

  // Form state
  const [newItem, setNewItem] = React.useState<Partial<InventoryItem>>({
    name: '',
    type: 'coin',
    country: '',
    year: new Date().getFullYear(),
    quantity: 1,
    rarity: 'common',
    source: 'manual',
    imageUrl: '',
    description: ''
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
        imageUrl: '',
        description: ''
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

  const filteredAndSortedItems = React.useMemo(() => {
    let result = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                           item.country.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'all' || item.type === filterType;
      const matchesRarity = filterRarity === 'all' || item.rarity === filterRarity;
      return matchesSearch && matchesType && matchesRarity;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') {
        const dateA = a.addedAt?.seconds || 0;
        const dateB = b.addedAt?.seconds || 0;
        return dateB - dateA;
      }
      if (sortBy === 'rarity') {
        const rarityOrder = { legendary: 4, rare: 3, uncommon: 2, common: 1 };
        return (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) - (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0);
      }
      return 0;
    });

    return result;
  }, [items, search, filterType, filterRarity, sortBy]);

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
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-zinc-900 dark:text-zinc-50">My Collection</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Manage and visualize your personal inventory.</p>
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex border border-zinc-900 dark:border-zinc-100 p-1 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
            <button 
              onClick={() => setView('grid')}
              className={`p-2 transition-all ${view === 'grid' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            >
              <Filter size={14} />
            </button>
            <button 
              onClick={() => setView('stats')}
              className={`p-2 transition-all ${view === 'stats' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            >
              <ChartIcon size={14} />
            </button>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="btn-pill flex items-center gap-2 text-xs py-2.5"
          >
            <Plus size={14} /> Add Manually
          </button>
        </div>
      </div>

      {view === 'grid' && (
        <div className="flex flex-col gap-3 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={14} />
            <input 
              type="text" 
              placeholder="Search..." 
              className="input-field pl-10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800 text-sm py-2.5"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 w-full">
            <select 
              className="input-field py-2 text-[10px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="coin">Coins</option>
              <option value="banknote">Banknotes</option>
              <option value="stamp">Stamps</option>
              <option value="keychain">Keychains</option>
              <option value="other">Other</option>
            </select>

            <select 
              className="input-field py-2 text-[10px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              value={filterRarity}
              onChange={(e) => setFilterRarity(e.target.value)}
            >
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="legendary">Legendary</option>
            </select>

            <select 
              className="input-field py-2 text-[10px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 col-span-2"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="date">Newest Added</option>
              <option value="name">Name (A-Z)</option>
              <option value="rarity">Rarity (High-Low)</option>
            </select>
          </div>
        </div>
      )}

      {view === 'stats' ? (
        <div className="grid grid-cols-1 gap-6">
          <div className="card-curved p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-[10px] uppercase tracking-widest font-bold mb-6 text-zinc-900 dark:text-zinc-50">Distribution by Type</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', backgroundColor: '#18181b', color: '#f4f4f5', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {typeData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[8px] uppercase tracking-tighter font-bold truncate text-zinc-900 dark:text-zinc-50">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-curved p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-[10px] uppercase tracking-widest font-bold mb-6 text-zinc-900 dark:text-zinc-50">Top Countries</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countryData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80} 
                    axisLine={false} 
                    tickLine={false} 
                    className="text-[8px] uppercase font-bold text-zinc-900 dark:text-zinc-50" 
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '1rem', border: 'none', backgroundColor: '#18181b', color: '#f4f4f5', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '10px' }}
                  />
                  <Bar dataKey="value" fill="#71717a" radius={[0, 10, 10, 0]} barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredAndSortedItems.map((item) => (
            <motion.div 
              key={item.id}
              layout
              whileHover={{ y: -5 }}
              className="group card-curved p-3 bg-white dark:bg-zinc-900 hover:shadow-xl transition-all duration-500 border border-zinc-200 dark:border-zinc-800"
            >
              <div 
                className="aspect-square bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center mb-3 relative overflow-hidden cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <Globe className="text-zinc-200 dark:text-zinc-700" size={32} />
                )}
                <div className="absolute top-2 left-2">
                  <span className={`text-[6px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${
                    item.rarity === 'legendary' ? 'bg-yellow-400 text-black border-yellow-400' :
                    item.rarity === 'rare' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100' : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-100 dark:border-zinc-800'
                  }`}>
                    {item.rarity}
                  </span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                  className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-zinc-800/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 shadow-sm text-zinc-900 dark:text-zinc-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="space-y-0.5">
                <h3 className="font-display font-bold text-xs leading-tight truncate text-zinc-900 dark:text-zinc-50">{item.name}</h3>
                <div className="flex items-center gap-1">
                  <p className="text-[7px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold truncate max-w-[40px]">
                    {item.country}
                  </p>
                  <span className="w-0.5 h-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                  <p className="text-[7px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold">
                    {item.year}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
          {filteredAndSortedItems.length === 0 && !loading && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Search size={32} className="text-gray-200" />
              </div>
              <h3 className="text-xl font-display font-bold">No items found</h3>
              <p className="text-gray-400 font-medium mt-2">Try adjusting your filters or search terms.</p>
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
            className="bg-white dark:bg-zinc-900 p-10 rounded-[2.5rem] max-w-2xl w-full shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-4xl font-display font-bold text-zinc-900 dark:text-zinc-50">Add to Collection</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-900 dark:text-zinc-100">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="grid grid-cols-1 gap-8">
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
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Description</label>
                  <textarea 
                    className="input-field min-h-[100px] py-4" 
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    placeholder="Tell the story of this piece..."
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
      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 max-w-5xl w-full rounded-[3rem] shadow-2xl overflow-y-auto flex flex-col relative max-h-[90vh] border border-zinc-200 dark:border-zinc-800"
            >
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 z-10 p-3 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md hover:bg-white dark:hover:bg-zinc-700 rounded-full transition-all shadow-xl text-zinc-900 dark:text-zinc-100"
              >
                <X size={24} />
              </button>

              <div className="w-full bg-zinc-50 dark:bg-zinc-800 relative aspect-square">
                <img 
                  src={selectedItem.imageUrl || `https://picsum.photos/seed/${selectedItem.id}/800/800`} 
                  alt={selectedItem.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-8 left-8">
                  <span className={`badge px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    selectedItem.rarity === 'legendary' ? 'bg-yellow-400 text-black border-yellow-400' :
                    selectedItem.rarity === 'rare' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100' : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-100 dark:border-zinc-800'
                  }`}>
                    {selectedItem.rarity}
                  </span>
                </div>
              </div>

              <div className="w-full p-8 flex flex-col justify-between">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] font-bold">
                      {selectedItem.country} • {selectedItem.year} • {selectedItem.type}
                    </p>
                    <h2 className="text-4xl font-display font-bold leading-tight text-zinc-900 dark:text-zinc-50">{selectedItem.name}</h2>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 dark:text-zinc-400">The Story</h3>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed font-sans">
                      {selectedItem.description || "This rare piece has a rich history waiting to be discovered. Each detail reflects the era it belongs to, making it a prized addition to any serious collector's inventory."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-8 py-8 border-y border-zinc-100 dark:border-zinc-800">
                    <div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold mb-1">Source</p>
                      <p className="text-2xl font-bold uppercase text-zinc-900 dark:text-zinc-50">{selectedItem.source}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold mb-1">Quantity</p>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{selectedItem.quantity}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex gap-4">
                  <button 
                    onClick={() => {
                      handleDeleteItem(selectedItem.id);
                      setSelectedItem(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-3 py-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 shadow-2xl hover:shadow-red-500/40 transition-all"
                  >
                    <Trash2 size={18} /> Remove
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
