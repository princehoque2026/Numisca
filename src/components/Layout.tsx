import React from 'react';
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
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { signInWithGoogle, logout } from '../firebase';
import { SocietyChat } from './SocietyChat';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, profile, isAdmin } = useAuth();
  const { cartItems, removeFromCart, updateQuantity, totalPrice, itemCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isCartOpen, setIsCartOpen] = React.useState(false);

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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div 
          className="flex items-center cursor-pointer group" 
          onClick={() => setActiveTab('home')}
        >
          <img 
            src="https://i.ibb.co.com/gZsH2TCN/IMG-20251013-012232.jpg" 
            alt="Numisca Logo" 
            className="h-10 w-auto rounded-lg object-contain transition-transform group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-all relative py-2 ${
                activeTab === item.id ? 'text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              {item.label}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="nav-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {user && (
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-white hover:bg-white/10 rounded-xl transition-colors group"
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-black text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-black">
                  {itemCount}
                </span>
              )}
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-tighter font-bold text-white">{profile?.name}</span>
                <span className="text-[8px] uppercase text-gray-500 font-bold">{profile?.role}</span>
              </div>
              <div className="relative group">
                <img 
                  src={profile?.photoURL || user.photoURL || ''} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-xl border border-white/10 transition-transform group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-full right-0 mt-2 w-48 bg-black border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2">
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    Settings
                  </button>
                  <button 
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={signInWithGoogle} className="btn-pill bg-white text-black hover:bg-gray-200">
              Login
            </button>
          )}
          
          <button 
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-xl transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
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
            className="fixed inset-0 z-40 bg-black pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`text-2xl font-display font-bold uppercase tracking-tighter text-left ${
                    activeTab === item.id ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {!user && (
                <button onClick={signInWithGoogle} className="btn-pill bg-white text-black w-full py-4 text-lg">
                  Login with Google
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-12 px-6 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <img 
              src="https://i.ibb.co.com/gZsH2TCN/IMG-20251013-012232.jpg" 
              alt="Numisca Logo" 
              className="h-12 w-auto rounded-lg object-contain mb-4 grayscale"
              referrerPolicy="no-referrer"
            />
            <p className="mt-4 text-gray-500 text-sm max-w-xs">
              The premier digital ecosystem for collectors. Buy, swap, and manage your treasures with elegance and security.
            </p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-widest font-bold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>Shop</li>
              <li>Swap Escrow</li>
              <li>Community</li>
              <li>Security</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-widest font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Cookie Policy</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-black/5 flex justify-between items-center text-[10px] uppercase tracking-widest text-gray-400">
          <span>© 2026 Numisca. All rights reserved.</span>
          <div className="flex gap-6">
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
              <div className="p-8 bg-black text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ShoppingCart size={24} />
                  <h2 className="text-2xl font-display font-bold">Your Cart</h2>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {cartItems.length > 0 ? (
                  cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 group">
                      <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0">
                        <img 
                          src={item.imageUrl || `https://picsum.photos/seed/${item.id}/200/200`} 
                          alt={item.name}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold uppercase tracking-widest text-sm">{item.name}</h4>
                        <p className="text-xs text-gray-400 font-bold">${item.price}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-xs font-bold">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors self-start"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-200">
                      <ShoppingCart size={40} />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold">Empty Cart</h3>
                      <p className="text-sm text-gray-400">Your archives are waiting for treasures.</p>
                    </div>
                  </div>
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="p-8 border-t border-black/5 space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="text-xs uppercase tracking-widest font-bold text-gray-400">Total Amount</span>
                    <span className="text-3xl font-display font-bold">${totalPrice.toFixed(2)}</span>
                  </div>
                  <button className="btn-pill w-full flex items-center justify-center gap-2 group">
                    Checkout Now <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SocietyChat />
    </div>
  );
};
