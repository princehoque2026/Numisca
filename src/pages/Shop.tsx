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
  description?: string;
}

export const Shop: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const { addToCart } = useCart();
  const [items, setItems] = React.useState<Collectible[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('all');
  const [rarityFilter, setRarityFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('newest');
  const [search, setSearch] = React.useState('');
  const [isAdding, setIsAdding] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Collectible | null>(null);
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
      imageUrl: item.imageUrl,
      description: item.description
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
    status: 'available',
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
        status: 'available',
        description: ''
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

  const filteredAndSortedItems = React.useMemo(() => {
    let result = items.filter(item => {
      const matchesType = filter === 'all' || item.type === filter;
      const matchesRarity = rarityFilter === 'all' || item.rarity === rarityFilter;
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                            item.country.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesRarity && matchesSearch;
    });

    result.sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0; // Default newest (handled by Firestore order if needed, but here we just keep it)
    });

    return result;
  }, [items, filter, rarityFilter, sortBy, search]);

  return (
    <div className="space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-50">The Shop</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-sans">Exclusive collectibles curated by Numisca admins.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={14} />
            <input 
              type="text" 
              placeholder="Search items..." 
              className="input-field pl-9 py-2 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsAdding(true)}
              className="btn-primary flex items-center gap-1 px-3 py-2 text-[10px]"
            >
              <Plus size={14} /> Add
            </button>
          )}
        </div>
      </motion.div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {['all', 'coin', 'banknote', 'stamp', 'keychain', 'other'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-[9px] uppercase tracking-widest font-bold px-4 py-1.5 rounded-full transition-all border whitespace-nowrap ${
                filter === t 
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100' 
                  : 'bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 border-zinc-100 dark:border-zinc-800'
              }`}
            >
              {t}s
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="flex-1 text-[9px] uppercase font-bold tracking-widest bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-full px-3 py-2 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
          >
            <option value="all">All Rarities</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="legendary">Legendary</option>
          </select>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 text-[9px] uppercase font-bold tracking-widest bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-full px-3 py-2 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
          >
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low-High</option>
            <option value="price-high">Price: High-Low</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="bg-white dark:bg-zinc-900 w-full rounded-t-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto relative p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-display font-bold text-zinc-900 dark:text-zinc-50">New Collectible</h2>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-900 dark:text-zinc-100"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400 ml-1">Name</label>
                    <input 
                      required
                      type="text" 
                      className="input-field py-2 text-xs" 
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400 ml-1">Type</label>
                      <select 
                        className="input-field py-2 text-xs"
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
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400 ml-1">Price (৳)</label>
                      <input 
                        required
                        type="number" 
                        className="input-field py-2 text-xs" 
                        value={newItem.price}
                        onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400 ml-1">Country</label>
                      <input 
                        required
                        type="text" 
                        className="input-field py-2 text-xs" 
                        value={newItem.country}
                        onChange={(e) => setNewItem({...newItem, country: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400 ml-1">Year</label>
                      <input 
                        type="number" 
                        className="input-field py-2 text-xs" 
                        value={newItem.year}
                        onChange={(e) => setNewItem({...newItem, year: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400 ml-1">Rarity</label>
                    <select 
                      className="input-field py-2 text-xs"
                      value={newItem.rarity}
                      onChange={(e) => setNewItem({...newItem, rarity: e.target.value as any})}
                    >
                      <option value="common">Common</option>
                      <option value="uncommon">Uncommon</option>
                      <option value="rare">Rare</option>
                      <option value="legendary">Legendary</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400 ml-1">Description</label>
                    <textarea 
                      className="input-field min-h-[80px] py-2 text-xs" 
                      value={newItem.description}
                      onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                      placeholder="Tell the story of this piece..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400 ml-1">Item Image</label>
                    <div className="aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group">
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
                          <span className="text-[9px] uppercase font-bold tracking-widest">Upload Photo</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                      )}
                    </div>
                  </div>
                  <button type="submit" className="btn-primary w-full py-4 text-sm rounded-xl">Add to Shop</button>
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
        <div className="grid grid-cols-1 gap-4">
          {filteredAndSortedItems.map((item, index) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group card-curved p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex gap-4"
              >
                <div 
                  className="w-24 h-24 bg-zinc-50 dark:bg-zinc-800 rounded-xl overflow-hidden relative flex-shrink-0"
                  onClick={() => setSelectedProduct(item)}
                >
                  <img 
                    src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/600`} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-1 left-1">
                    <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                      item.rarity === 'legendary' ? 'bg-yellow-400 text-black' :
                      item.rarity === 'rare' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                    }`}>
                      {item.rarity}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div onClick={() => setSelectedProduct(item)} className="cursor-pointer">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-display font-bold text-sm leading-tight truncate text-zinc-900 dark:text-zinc-50">{item.name}</h3>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(item.id);
                        }}
                        className={`p-1.5 rounded-lg transition-all ${
                          profile?.wishlist?.includes(item.id)
                            ? 'bg-red-500 text-white'
                            : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        <Heart size={12} className={profile?.wishlist?.includes(item.id) ? 'fill-current' : ''} />
                      </button>
                    </div>
                    <p className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold mt-1">
                      {item.country} • {item.year}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-base text-zinc-900 dark:text-zinc-50">৳{item.price}</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleAddToCart(item)}
                        disabled={item.status === 'sold'}
                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                          item.status === 'sold'
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                            : addedToCart === item.id 
                              ? 'bg-green-500 text-white' 
                              : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        }`}
                      >
                        {item.status === 'sold' ? 'Sold' : addedToCart === item.id ? 'Added' : 'Add'}
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 border border-zinc-100 dark:border-zinc-800 rounded-lg text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="bg-white dark:bg-zinc-900 w-full rounded-t-[2rem] shadow-2xl overflow-y-auto relative max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md rounded-full shadow-lg text-zinc-900 dark:text-zinc-100"
              >
                <X size={20} />
              </button>

              <div className="w-full bg-zinc-50 dark:bg-zinc-800 relative aspect-square">
                <img 
                  src={selectedProduct.imageUrl} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className={`text-[9px] px-4 py-1.5 rounded-full font-bold uppercase tracking-widest ${
                    selectedProduct.rarity === 'legendary' ? 'bg-yellow-400 text-black' :
                    selectedProduct.rarity === 'rare' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                  }`}>
                    {selectedProduct.rarity}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-1">
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] font-bold">
                    {selectedProduct.country} • {selectedProduct.year} • {selectedProduct.type}
                  </p>
                  <h2 className="text-2xl font-display font-bold leading-tight text-zinc-900 dark:text-zinc-50">{selectedProduct.name}</h2>
                </div>

                <div className="space-y-2">
                  <h3 className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 dark:text-zinc-400">The Story</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed font-sans">
                    {selectedProduct.description || "This rare piece has a rich history waiting to be discovered."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-zinc-100 dark:border-zinc-800">
                  <div>
                    <p className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold mb-0.5">Price</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">৳{selectedProduct.price}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold mb-0.5">Stock</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{selectedProduct.quantity} Left</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleAddToCart(selectedProduct)}
                    disabled={selectedProduct.status === 'sold'}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                      selectedProduct.status === 'sold'
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                        : addedToCart === selectedProduct.id 
                          ? 'bg-green-500 text-white' 
                          : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    }`}
                  >
                    {selectedProduct.status === 'sold' ? 'Sold Out' : addedToCart === selectedProduct.id ? 'Added' : 'Add to Cart'}
                  </button>
                  <button 
                    onClick={() => toggleWishlist(selectedProduct.id)}
                    className={`p-4 rounded-xl border transition-all ${
                      profile?.wishlist?.includes(selectedProduct.id)
                        ? 'bg-red-500 text-white border-red-500'
                        : 'border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <Heart size={20} className={profile?.wishlist?.includes(selectedProduct.id) ? 'fill-current' : ''} />
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

