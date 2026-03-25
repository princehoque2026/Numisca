import React from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Filter, Search, ShoppingCart, Trash2, Edit, Heart, Check, Upload, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

interface Collectible {
  id: string;
  name: string;
  type: 'coin' | 'banknote' | 'stamp' | 'keychain' | 'other';
  country: string;
  year: number;
  quantity: number;
  price: number;
  imageUrl: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  status: 'available' | 'sold';
}

export const Shop: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const { addToCart } = useCart();
  const [items, setItems] = React.useState<Collectible[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [isAdding, setIsAdding] = React.useState(false);
  const [addedToCart, setAddedToCart] = React.useState<string | null>(null);

  const toggleWishlist = async (itemId: string) => {
    if (!user) return;
    const isWishlisted = profile?.wishlist?.includes(itemId);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        wishlist: isWishlisted ? arrayRemove(itemId) : arrayUnion(itemId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/wishlist`);
    }
  };

  const handleAddToCart = (item: Collectible) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl
    });
    setAddedToCart(item.id);
    setTimeout(() => setAddedToCart(null), 2000);
  };

  // Form state
  const [newItem, setNewItem] = React.useState<Partial<Collectible>>({
    name: '',
    type: 'coin',
    country: '',
    year: new Date().getFullYear(),
    quantity: 1,
    price: 0,
    imageUrl: '',
    rarity: 'common',
    status: 'available'
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
    const q = query(collection(db, 'collectibles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collectible));
      setItems(itemsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'collectibles');
    });

    return unsubscribe;
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'collectibles'), {
        ...newItem,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewItem({
        name: '',
        type: 'coin',
        country: '',
        year: new Date().getFullYear(),
        quantity: 1,
        price: 0,
        imageUrl: '',
        rarity: 'common',
        status: 'available'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'collectibles');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, 'collectibles', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `collectibles/${id}`);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.country.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div>
          <h1 className="text-5xl font-display font-bold tracking-tight">The Shop</h1>
          <p className="text-gray-500 mt-2 font-sans">Exclusive collectibles curated by Numisca admins.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search items..." 
              className="input-field pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsAdding(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> Add Item
            </button>
          )}
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {['all', 'coin', 'banknote', 'stamp', 'keychain', 'other'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-[10px] uppercase tracking-widest font-bold px-6 py-2 rounded-full transition-all border ${
              filter === t 
                ? 'bg-black text-white border-black' 
                : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'
            }`}
          >
            {t}s
          </button>
        ))}
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white p-8 max-w-2xl w-full rounded-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto relative"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-display font-bold">New Collectible</h2>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Name</label>
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
                      <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Type</label>
                      <select 
                        className="input-field"
                        value={newItem.type}
                        onChange={(e) => setNewItem({...newItem, type: e.target.value as any})}
                      >
                        <option value="coin">Coin</option>
                        <option value="banknote">Banknote</option>
                        <option value="stamp">Stamp</option>
                        <option value="keychain">Keychain</option>
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
                        onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value)})}
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
                        type="number" 
                        className="input-field" 
                        value={newItem.year}
                        onChange={(e) => setNewItem({...newItem, year: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Rarity</label>
                    <select 
                      className="input-field"
                      value={newItem.rarity}
                      onChange={(e) => setNewItem({...newItem, rarity: e.target.value as any})}
                    >
                      <option value="common">Common</option>
                      <option value="uncommon">Uncommon</option>
                      <option value="rare">Rare</option>
                      <option value="legendary">Legendary</option>
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
                  <button type="submit" className="btn-primary w-full py-6 text-lg rounded-2xl">Add to Shop</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredItems.map((item, index) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group card-curved hover-lift p-4 bg-white"
            >
              <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden relative mb-4">
                <img 
                  src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/600`} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-all duration-700 scale-110 group-hover:scale-100"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 flex flex-col gap-1">
                  <span className={`badge ${
                    item.rarity === 'legendary' ? 'bg-yellow-400 text-black border-yellow-400' :
                    item.rarity === 'rare' ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-100'
                  }`}>
                    {item.rarity}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 px-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-display font-bold text-lg leading-tight">{item.name}</h3>
                  <span className="font-bold text-lg">${item.price}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    {item.country} • {item.year}
                  </p>
                  <span className="w-1 h-1 bg-gray-200 rounded-full" />
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    {item.type}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button 
                  onClick={() => handleAddToCart(item)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold transition-all ${
                    addedToCart === item.id 
                      ? 'bg-green-500 text-white' 
                      : 'bg-black text-white hover:bg-black/90'
                  }`}
                >
                  {addedToCart === item.id ? (
                    <>
                      <Check size={14} /> Added
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={14} /> Add to Cart
                    </>
                  )}
                </button>
                <button 
                  onClick={() => toggleWishlist(item.id)}
                  className={`p-3 rounded-xl border transition-all ${
                    profile?.wishlist?.includes(item.id)
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'border-gray-100 text-black hover:border-black'
                  }`}
                >
                  <Heart size={16} className={profile?.wishlist?.includes(item.id) ? 'fill-current' : ''} />
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-3 border border-gray-100 rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

