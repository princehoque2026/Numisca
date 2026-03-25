import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Shield, Zap, Globe, Star, ShoppingBag } from 'lucide-react';
import { signInWithGoogle, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';

interface FeaturedItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  country: string;
  year: number;
  rarity: string;
}

export const Home: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const { user } = useAuth();
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'collectibles'), limit(4));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeaturedItem[];
      setFeaturedItems(items);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-24">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex flex-col items-center justify-center text-center overflow-hidden rounded-[3rem] bg-gray-50 border border-black/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50 z-10" />
          <img 
            src="https://images.unsplash.com/photo-1590595906931-81f04f0ccebb?auto=format&fit=crop&q=80&w=2000" 
            alt="Coins Background" 
            className="w-full h-full object-cover opacity-10"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        <div className="relative z-20 max-w-4xl px-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-8xl font-display font-bold leading-tight tracking-tighter"
          >
            The Art of <br /> <span className="text-gray-400">Collecting</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-xl text-gray-500 font-medium max-w-2xl mx-auto"
          >
            Numisca is a digital sanctuary for numismatists and philatelists. 
            Discover rare treasures, swap with peers, and curate your legacy.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex flex-col md:flex-row gap-4 justify-center"
          >
            {user ? (
              <button onClick={onStart} className="btn-pill flex items-center gap-2 group">
                Enter Dashboard <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button onClick={signInWithGoogle} className="btn-pill flex items-center gap-2">
                Start Your Collection <Star size={16} />
              </button>
            )}
            <button className="btn-pill-outline">Explore Shop</button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div 
          whileHover={{ y: -10 }}
          className="card-curved p-10 space-y-6"
        >
          <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center shadow-xl">
            <Shield size={28} />
          </div>
          <h3 className="text-2xl font-display">Secure Escrow</h3>
          <p className="text-gray-500 font-medium leading-relaxed">
            Our proprietary swap system ensures both parties receive their items before releasing the trade.
          </p>
        </motion.div>
        <motion.div 
          whileHover={{ y: -10 }}
          className="card-curved p-10 space-y-6"
        >
          <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center shadow-xl">
            <Globe size={28} />
          </div>
          <h3 className="text-2xl font-display">Global Network</h3>
          <p className="text-gray-500 font-medium leading-relaxed">
            Connect with collectors from over 150 countries. Expand your horizons across borders.
          </p>
        </motion.div>
        <motion.div 
          whileHover={{ y: -10 }}
          className="card-curved p-10 space-y-6"
        >
          <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center shadow-xl">
            <Zap size={28} />
          </div>
          <h3 className="text-2xl font-display">Instant Valuation</h3>
          <p className="text-gray-500 font-medium leading-relaxed">
            Get real-time market data and rarity scores for every item in your personal inventory.
          </p>
        </motion.div>
      </section>

      {/* Featured Items */}
      <section className="space-y-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-display">Curated Selection</h2>
            <p className="text-gray-500 mt-2 font-medium">Hand-picked rarities from our master curators.</p>
          </div>
          <button 
            onClick={() => onStart()}
            className="text-xs uppercase tracking-widest font-bold border-b-2 border-black pb-1 hover:text-gray-500 transition-colors"
          >
            View All
          </button>
        </div>
        
        {featuredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {featuredItems.map((item, i) => (
              <motion.div 
                key={item.id}
                whileHover={{ y: -10 }}
                className="group cursor-pointer"
                onClick={() => onStart()}
              >
                <div className="aspect-[3/4] bg-gray-100 overflow-hidden relative rounded-[2rem] border border-black/5 shadow-sm group-hover:shadow-2xl transition-all duration-500">
                  <img 
                    src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/800`} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-all duration-700 scale-110 group-hover:scale-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className={`absolute top-6 left-6 px-3 py-1 text-[8px] uppercase tracking-widest font-bold rounded-full ${
                    item.rarity === 'legendary' ? 'bg-yellow-400 text-black' : 'bg-black text-white'
                  }`}>
                    {item.rarity}
                  </div>
                </div>
                <div className="mt-6 flex justify-between items-start px-2">
                  <div>
                    <h4 className="font-display text-lg">{item.name}</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{item.country} • {item.year}</p>
                  </div>
                  <span className="font-bold text-lg">${item.price}</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center card-curved bg-gray-50 border-dashed border-2 border-gray-200">
            <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">The Archives are currently empty</p>
          </div>
        )}
      </section>
    </div>
  );
};
