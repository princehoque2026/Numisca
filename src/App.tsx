import React from 'react';
import { motion } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { Layout } from './components/Layout';
import { ProfileSetup } from './components/ProfileSetup';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { Inventory } from './pages/Inventory';
import { Swap } from './pages/Swap';
import { Community } from './pages/Community';
import { Profile } from './pages/Profile';
import { AdminDashboard } from './pages/AdminDashboard';

const AppContent = () => {
  const [activeTab, setActiveTab] = React.useState('home');
  const { user, loading, isSetupComplete } = useAuth();

  const renderContent = () => {
    if (user && !isSetupComplete) {
      return <ProfileSetup />;
    }
    switch (activeTab) {
      case 'home':
        return <Home onStart={() => setActiveTab('shop')} />;
      case 'shop':
        return <Shop />;
      case 'inventory':
      case 'collection':
        return <Inventory />;
      case 'swap':
        return <Swap />;
      case 'community':
        return <Community />;
      case 'profile':
        return <Profile />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Home onStart={() => setActiveTab('shop')} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <img 
            src="https://i.ibb.co.com/gZsH2TCN/IMG-20251013-012232.jpg" 
            alt="Numisca Logo" 
            className="w-24 h-24 rounded-[2rem] shadow-2xl border-4 border-white/10"
            referrerPolicy="no-referrer"
          />
          <span className="text-4xl font-display font-bold tracking-tighter uppercase animate-pulse text-white">Numisca</span>
          <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full bg-white"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
