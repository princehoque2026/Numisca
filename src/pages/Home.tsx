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
    <div className="space-y-16 pb-10">
      {/* Hero Section */}
      <section className="relative h-[65vh] flex flex-col items-center justify-center text-center overflow-hidden rounded-[2.5rem] bg-gray-50 border border-black/5">
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

        <div className="relative z-20 px-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-display font-bold leading-tight tracking-tighter"
          >
            The Art of <br /> <span className="text-gray-400">Collecting</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 text-sm text-gray-500 font-medium max-w-xs mx-auto"
          >
            Numisca is a digital sanctuary for numismatists. 
            Discover rare treasures, swap with peers, and curate your legacy.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 flex flex-col gap-3 items-center"
          >
            {user ? (
              <button onClick={onStart} className="btn-pill flex items-center gap-2 group py-3 px-8 text-sm">
                Enter Dashboard <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button onClick={signInWithGoogle} className="btn-pill flex items-center gap-2 py-3 px-8 text-sm">
                Start Your Collection <Star size={14} />
              </button>
            )}
            <button className="btn-pill-outline py-3 px-8 text-sm">Explore Shop</button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 gap-4">
        <motion.div 
          className="card-curved p-6 space-y-4"
        >
          <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center shadow-lg">
            <Shield size={20} />
          </div>
          <h3 className="text-xl font-display font-bold">Secure Escrow</h3>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            Our proprietary swap system ensures both parties receive their items before releasing the trade.
          </p>
        </motion.div>
        <motion.div 
          className="card-curved p-6 space-y-4"
        >
          <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center shadow-lg">
            <Globe size={20} />
          </div>
          <h3 className="text-xl font-display font-bold">Global Network</h3>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            Connect with collectors from over 150 countries. Expand your horizons across borders.
          </p>
        </motion.div>
        <motion.div 
          className="card-curved p-6 space-y-4"
        >
          <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center shadow-lg">
            <Zap size={20} />
          </div>
          <h3 className="text-xl font-display font-bold">Instant Valuation</h3>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            Get real-time market data and rarity scores for every item in your personal inventory.
          </p>
        </motion.div>
      </section>

      {/* Featured Items */}
      <section className="space-y-8">
        <div className="flex justify-between items-end px-2">
          <div>
            <h2 className="text-2xl font-display font-bold">Curated Selection</h2>
            <p className="text-[10px] text-gray-500 mt-1 font-medium">Hand-picked rarities from our curators.</p>
          </div>
          <button 
            onClick={() => onStart()}
            className="text-[10px] uppercase tracking-widest font-bold border-b border-black pb-0.5 hover:text-gray-500 transition-colors"
          >
            View All
          </button>
        </div>
        
        {featuredItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {featuredItems.map((item, i) => (
              <motion.div 
                key={item.id}
                className="group cursor-pointer"
                onClick={() => onStart()}
              >
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative rounded-[2rem] border border-black/5 shadow-sm">
                  <img 
                    src={item.imageUrl || `https://picsum.photos/seed/${item.id}/800/600`} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className={`absolute top-4 left-4 px-2 py-0.5 text-[7px] uppercase tracking-widest font-bold rounded-full ${
                    item.rarity === 'legendary' ? 'bg-yellow-400 text-black' : 'bg-black text-white'
                  }`}>
                    {item.rarity}
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-start px-2">
                  <div className="min-w-0">
                    <h4 className="font-display text-base font-bold truncate">{item.name}</h4>
                    <p className="text-[8px] text-gray-400 uppercase tracking-widest font-bold">{item.country} • {item.year}</p>
                  </div>
                  <span className="font-bold text-base">৳{item.price}</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center card-curved bg-gray-50 border-dashed border-2 border-gray-200">
            <ShoppingBag size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">The Archives are currently empty</p>
          </div>
        )}
      </section>
    </div>
  );
};
