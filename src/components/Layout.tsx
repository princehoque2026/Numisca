import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  ShoppingBag, 
  Repeat, 
  LayoutGrid, 
  Users, 
  User, 
  LogOut, 
  Menu, 
  X,
  Plus,
  Search,
  Map as MapIcon,
  PieChart as ChartIcon,
  Shield,
  ShoppingCart,
  Trash2,
  Minus,
  ArrowRight,
  Bell,
  Receipt,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { signInWithGoogle, logout, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, writeBatch } from 'firebase/firestore';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, profile, isAdmin } = useAuth();
  const { cartItems, removeFromCart, updateQuantity, totalPrice, itemCount, clearCart } = useCart();
  const { notifications, unreadCount, markAsRead, sendNotification } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    if (!user || cartItems.length === 0) return;
    setIsCheckingOut(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Create Transaction
      const transactionRef = doc(collection(db, 'transactions'));
      batch.set(transactionRef, {
        userUid: user.uid,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl
        })),
        totalAmount: totalPrice,
        status: 'completed',
        createdAt: serverTimestamp()
      });

      // 2. Update Collectibles and Add to Inventory
      for (const item of cartItems) {
        const collectibleRef = doc(db, 'collectibles', item.id);
        const collectibleSnap = await getDoc(collectibleRef);
        
        if (collectibleSnap.exists()) {
          const currentQty = collectibleSnap.data().quantity || 0;
          const newQty = Math.max(0, currentQty - item.quantity);
          batch.update(collectibleRef, { 
            quantity: newQty,
            status: newQty === 0 ? 'sold' : 'available'
          });

          // Add to Inventory
          const inventoryRef = doc(collection(db, 'inventory'));
          batch.set(inventoryRef, {
            ownerUid: user.uid,
            collectibleId: item.id,
            name: item.name,
            type: collectibleSnap.data().type,
            country: collectibleSnap.data().country,
            year: collectibleSnap.data().year,
            rarity: collectibleSnap.data().rarity,
            quantity: item.quantity,
            source: 'purchase',
            imageUrl: item.imageUrl,
            description: collectibleSnap.data().description || '',
            addedAt: serverTimestamp()
          });
        }
      }

      await batch.commit();
      
      // 3. Success Actions
      clearCart();
      setIsCartOpen(false);
      await sendNotification({
        userUid: user.uid,
        title: 'Purchase Successful',
        message: `You've successfully acquired ${itemCount} items for ৳${totalPrice.toFixed(2)}.`,
        type: 'success',
        link: 'collection'
      });
      alert('Purchase successful! Items added to your collection.');
    } catch (error) {
      console.error('Checkout failed:', error);
      handleFirestoreError(error, OperationType.WRITE, 'checkout');
      alert('Checkout failed. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'shop', label: 'Shop', icon: ShoppingBag },
    { id: 'swap', label: 'Swap', icon: Repeat },
    { id: 'collection', label: 'My Collection', icon: LayoutGrid },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between shadow-sm">
        <div 
          className="flex items-center cursor-pointer group" 
          onClick={() => setActiveTab('home')}
        >
          <img 
            src="https://i.ibb.co.com/gZsH2TCN/IMG-20251013-012232.jpg" 
            alt="Numisca Logo" 
            className="h-8 w-auto rounded-lg object-contain transition-transform group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors relative"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center border border-white dark:border-zinc-900">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsNotificationsOpen(false)} 
                      />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                          <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-900 dark:text-zinc-100">Notifications</span>
                          <span className="text-[7px] text-zinc-500 font-bold">{unreadCount} New</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length > 0 ? (
                            notifications.map((n) => (
                              <div 
                                key={n.id} 
                                onClick={() => {
                                  markAsRead(n.id);
                                  if (n.link) {
                                    setActiveTab(n.link);
                                    setIsNotificationsOpen(false);
                                  }
                                }}
                                className={`p-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${!n.read ? 'bg-zinc-50 dark:bg-zinc-800/30' : ''}`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className={`text-[7px] uppercase font-bold px-1.5 py-0.5 rounded-full ${
                                    n.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                                    n.type === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                                    'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  }`}>
                                    {n.type}
                                  </span>
                                  <span className="text-[7px] text-zinc-500">
                                    {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                  </span>
                                </div>
                                <h4 className="text-[9px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{n.title}</h4>
                                <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{n.message}</p>
                              </div>
                            ))
                          ) : (
                            <div className="p-6 text-center">
                              <p className="text-[9px] text-zinc-500 uppercase font-bold">No notifications</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Cart */}
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <ShoppingCart size={18} />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[8px] font-bold rounded-full flex items-center justify-center border border-white dark:border-zinc-900">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <div className="relative group">
                <img 
                  src={profile?.photoURL || user.photoURL || ''} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-transform group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-1.5 z-50">
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className="w-full text-left px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <User size={12} />
                    Settings
                  </button>
                  <button 
                    onClick={() => setActiveTab('transactions')}
                    className="w-full text-left px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Receipt size={12} />
                    History
                  </button>
                  <button 
                    onClick={logout}
                    className="w-full text-left px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <LogOut size={12} />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={signInWithGoogle} className="px-4 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-[9px] font-bold uppercase tracking-widest hover:opacity-90 transition-colors">
              Login
            </button>
          )}
          
          <button 
            className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-black pt-20 px-6 max-w-md mx-auto"
          >
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`text-xl font-display font-bold uppercase tracking-tighter text-left py-2 border-b border-white/5 ${
                    activeTab === item.id ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {!user && (
                <button onClick={signInWithGoogle} className="btn-pill bg-white text-black w-full py-3 text-sm mt-4">
                  Login with Google
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 pt-20 pb-10 px-4 max-w-md mx-auto w-full border-x border-gray-50 dark:border-zinc-900 min-h-screen bg-white dark:bg-zinc-950">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 dark:border-white/5 py-8 px-4 max-w-md mx-auto w-full bg-gray-50 dark:bg-zinc-900/50">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <img 
              src="https://i.ibb.co.com/gZsH2TCN/IMG-20251013-012232.jpg" 
              alt="Numisca Logo" 
              className="h-8 w-auto rounded-lg object-contain mb-3 grayscale"
              referrerPolicy="no-referrer"
            />
            <p className="text-gray-500 dark:text-zinc-400 text-[10px] font-medium">
              The premier digital ecosystem for collectors.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-[7px] uppercase tracking-widest font-bold mb-1.5 dark:text-zinc-300">Platform</h4>
              <ul className="space-y-1 text-[9px] text-gray-500 dark:text-zinc-400 font-medium">
                <li>Shop</li>
                <li>Swap</li>
                <li>Community</li>
              </ul>
            </div>
            <div>
              <h4 className="text-[7px] uppercase tracking-widest font-bold mb-1.5 dark:text-zinc-300">Legal</h4>
              <ul className="space-y-1 text-[9px] text-gray-500 dark:text-zinc-400 font-medium">
                <li>Privacy</li>
                <li>Terms</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex flex-col gap-2 text-[7px] uppercase tracking-widest text-gray-400 dark:text-zinc-500 font-bold">
          <span>© 2026 Numisca.</span>
          <div className="flex gap-4">
            <span>Twitter</span>
            <span>Instagram</span>
            <span>Discord</span>
          </div>
        </div>
      </footer>
      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="p-6 bg-black text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={20} />
                  <h2 className="text-xl font-display font-bold">Your Cart</h2>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cartItems.length > 0 ? (
                  cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3 group">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-900 rounded-xl overflow-hidden flex-shrink-0">
                        <img 
                          src={item.imageUrl || `https://picsum.photos/seed/${item.id}/200/200`} 
                          alt={item.name}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <h4 className="font-bold uppercase tracking-widest text-[10px] truncate dark:text-white">{item.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold">৳{item.price}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-black dark:text-white"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-[10px] font-bold dark:text-white">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-black dark:text-white"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors self-start"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-gray-200 dark:text-zinc-700">
                      <ShoppingCart size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-display font-bold dark:text-white">Empty Cart</h3>
                      <p className="text-xs text-gray-400">Your archives are waiting.</p>
                    </div>
                  </div>
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="p-6 border-t border-black/5 dark:border-white/5 space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[8px] uppercase tracking-widest font-bold text-gray-400">Total Amount</span>
                    <span className="text-2xl font-display font-bold dark:text-white">৳{totalPrice.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="btn-pill bg-black dark:bg-white dark:text-black w-full flex items-center justify-center gap-2 py-3.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCheckingOut ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Checkout Now <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
