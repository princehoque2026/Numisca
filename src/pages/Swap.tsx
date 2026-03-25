import React from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Repeat, ShieldCheck, Clock, CheckCircle2, XCircle, Plus, ArrowRightLeft, User } from 'lucide-react';
import { format } from 'date-fns';

interface Swap {
  id: string;
  initiatorUid: string;
  receiverUid: string;
  initiatorItemIds: string[];
  receiverItemIds: string[];
  status: 'pending' | 'escrow' | 'completed' | 'cancelled';
  createdAt: any;
}

interface InventoryItem {
  id: string;
  name: string;
  ownerUid: string;
}

export const Swap: React.FC = () => {
  const { user } = useAuth();
  const [swaps, setSwaps] = React.useState<Swap[]>([]);
  const [myInventory, setMyInventory] = React.useState<InventoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isInitiating, setIsInitiating] = React.useState(false);

  // New Swap State
  const [targetUserEmail, setTargetUserEmail] = React.useState('');
  const [selectedMyItems, setSelectedMyItems] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!user) return;

    // Fetch Swaps
    const q = query(
      collection(db, 'swaps'), 
      where('initiatorUid', '==', user.uid)
    );
    const q2 = query(
      collection(db, 'swaps'), 
      where('receiverUid', '==', user.uid)
    );

    const unsub1 = onSnapshot(q, (snapshot) => {
      const s1 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Swap));
      setSwaps(prev => {
        const other = prev.filter(s => s.receiverUid === user.uid);
        return [...s1, ...other];
      });
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      const s2 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Swap));
      setSwaps(prev => {
        const other = prev.filter(s => s.initiatorUid === user.uid);
        return [...s2, ...other];
      });
    });

    // Fetch My Inventory
    const invQ = query(collection(db, 'inventory'), where('ownerUid', '==', user.uid));
    const unsubInv = onSnapshot(invQ, (snapshot) => {
      setMyInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
      setLoading(false);
    });

    return () => {
      unsub1();
      unsub2();
      unsubInv();
    };
  }, [user]);

  const handleInitiateSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedMyItems.length === 0) return;

    try {
      // Find receiver by email
      const userQ = query(collection(db, 'users'), where('email', '==', targetUserEmail));
      const userSnap = await getDocs(userQ);
      
      if (userSnap.empty) {
        alert('User not found');
        return;
      }

      const receiverUid = userSnap.docs[0].id;

      await addDoc(collection(db, 'swaps'), {
        initiatorUid: user.uid,
        receiverUid,
        initiatorItemIds: selectedMyItems,
        receiverItemIds: [], // To be filled by receiver
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setIsInitiating(false);
      setSelectedMyItems([]);
      setTargetUserEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'swaps');
    }
  };

  const updateSwapStatus = async (swapId: string, status: Swap['status']) => {
    try {
      await updateDoc(doc(db, 'swaps', swapId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `swaps/${swapId}`);
    }
  };

  return (
    <div className="space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div>
          <h1 className="text-5xl font-display font-bold tracking-tight">Swap Escrow</h1>
          <p className="text-gray-500 mt-2 font-sans">Secure peer-to-peer trading protected by Numisca.</p>
        </div>
        
        <button 
          onClick={() => setIsInitiating(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> New Swap Request
        </button>
      </motion.div>

      {/* Active Swaps */}
      <div className="grid grid-cols-1 gap-6">
        {swaps.map((swap, index) => (
          <motion.div 
            key={swap.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-curved p-8 flex flex-col md:flex-row justify-between items-center gap-8 bg-white"
          >
            <div className="flex items-center gap-12 flex-1 w-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-black text-white flex items-center justify-center rounded-full mb-3 mx-auto shadow-lg">
                  <User size={24} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                  {swap.initiatorUid === user?.uid ? 'You' : 'Initiator'}
                </span>
              </div>
              
              <div className="flex-1 flex flex-col items-center gap-3">
                <div className="flex items-center gap-4 w-full">
                  <div className="h-[1px] flex-1 bg-gray-100" />
                  <div className="p-2 bg-gray-50 rounded-full">
                    <ArrowRightLeft className="text-gray-400" size={16} />
                  </div>
                  <div className="h-[1px] flex-1 bg-gray-100" />
                </div>
                <span className={`badge ${
                  swap.status === 'escrow' ? 'bg-yellow-400 text-black border-yellow-400' :
                  swap.status === 'completed' ? 'bg-black text-white border-black' :
                  swap.status === 'cancelled' ? 'bg-red-500 text-white border-red-500' : 'bg-gray-100 text-gray-500 border-gray-100'
                }`}>
                  {swap.status}
                </span>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 border-2 border-gray-100 flex items-center justify-center rounded-full mb-3 mx-auto">
                  <User size={24} className="text-gray-300" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                  {swap.receiverUid === user?.uid ? 'You' : 'Receiver'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-56">
              {swap.status === 'pending' && swap.receiverUid === user?.uid && (
                <button 
                  onClick={() => updateSwapStatus(swap.id, 'escrow')}
                  className="btn-primary w-full py-3 rounded-xl text-[10px]"
                >
                  Accept & Escrow
                </button>
              )}
              {swap.status === 'escrow' && (
                <button 
                  onClick={() => updateSwapStatus(swap.id, 'completed')}
                  className="btn-primary w-full py-3 rounded-xl text-[10px] flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={14} /> Confirm Receipt
                </button>
              )}
              {swap.status !== 'completed' && swap.status !== 'cancelled' && (
                <button 
                  onClick={() => updateSwapStatus(swap.id, 'cancelled')}
                  className="btn-secondary w-full py-3 rounded-xl text-[10px]"
                >
                  Cancel
                </button>
              )}
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold text-center mt-2">
                {swap.createdAt ? format(swap.createdAt.toDate(), 'MMM d, yyyy') : '...'}
              </div>
            </div>
          </motion.div>
        ))}
        {swaps.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-32 text-center border-2 border-dashed border-gray-100 rounded-[3rem]"
          >
            <Repeat size={48} className="text-gray-100 mx-auto mb-6" />
            <p className="text-gray-400 font-sans italic text-lg">No active swaps. Connect with other collectors to trade items.</p>
          </motion.div>
        )}
      </div>

      {/* Initiate Modal */}
      <AnimatePresence>
        {isInitiating && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white p-10 max-w-2xl w-full rounded-[2.5rem] shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-4xl font-display font-bold">Initiate Swap</h2>
                <button 
                  onClick={() => setIsInitiating(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={28} />
                </button>
              </div>
              <form onSubmit={handleInitiateSwap} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Receiver Email</label>
                  <input 
                    required
                    type="email" 
                    placeholder="collector@example.com"
                    className="input-field" 
                    value={targetUserEmail}
                    onChange={(e) => setTargetUserEmail(e.target.value)}
                  />
                </div>
                
                <div className="space-y-4">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 ml-1">Select Items to Offer</label>
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-2xl scrollbar-hide">
                    {myInventory.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (selectedMyItems.includes(item.id)) {
                            setSelectedMyItems(selectedMyItems.filter(id => id !== item.id));
                          } else {
                            setSelectedMyItems([...selectedMyItems, item.id]);
                          }
                        }}
                        className={`p-4 text-[10px] uppercase tracking-widest font-bold text-left rounded-xl border-2 transition-all ${
                          selectedMyItems.includes(item.id) 
                            ? 'bg-black text-white border-black shadow-md' 
                            : 'bg-white text-gray-500 border-transparent hover:border-black/10'
                        }`}
                      >
                        {item.name}
                      </button>
                    ))}
                    {myInventory.length === 0 && (
                      <div className="col-span-2 py-8 text-center text-gray-400 text-[10px] uppercase tracking-widest">
                        Your inventory is empty
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={selectedMyItems.length === 0}
                    className="btn-primary w-full py-5 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                  >
                    Send Swap Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const X = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);


