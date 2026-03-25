import React from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
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
  initiatorUsername?: string;
  receiverUsername?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  ownerUid: string;
  image?: string;
  rarity?: string;
  type?: string;
}

export const Swap: React.FC = () => {
  const { user, profile } = useAuth();
  const { sendNotification } = useNotifications();
  const [swaps, setSwaps] = React.useState<Swap[]>([]);
  const [myInventory, setMyInventory] = React.useState<InventoryItem[]>([]);
  const [allInventoryItems, setAllInventoryItems] = React.useState<Record<string, InventoryItem>>({});
  const [loading, setLoading] = React.useState(true);
  const [isInitiating, setIsInitiating] = React.useState(false);
  const [isAccepting, setIsAccepting] = React.useState<string | null>(null);
  const [selectedReceiverItems, setSelectedReceiverItems] = React.useState<string[]>([]);

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

    // Fetch All Inventory Items (for display)
    const unsubAllInv = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const items: Record<string, InventoryItem> = {};
      snapshot.docs.forEach(doc => {
        items[doc.id] = { id: doc.id, ...doc.data() } as InventoryItem;
      });
      setAllInventoryItems(items);
    });

    return () => {
      unsub1();
      unsub2();
      unsubInv();
      unsubAllInv();
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

      const receiverDoc = userSnap.docs[0];
      const receiverData = receiverDoc.data();
      const receiverUid = receiverDoc.id;

      await addDoc(collection(db, 'swaps'), {
        initiatorUid: user.uid,
        initiatorUsername: profile?.username || 'Anonymous',
        receiverUid,
        receiverUsername: receiverData.username || 'Anonymous',
        initiatorItemIds: selectedMyItems,
        receiverItemIds: [], // To be filled by receiver
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Notify receiver
      await sendNotification({
        userUid: receiverUid,
        title: 'New Swap Request',
        message: `${profile?.username || 'A user'} has sent you a swap request.`,
        type: 'info',
        link: '/swap'
      });

      setIsInitiating(false);
      setSelectedMyItems([]);
      setTargetUserEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'swaps');
    }
  };

  const handleAcceptSwap = async (swapId: string) => {
    if (selectedReceiverItems.length === 0) return;
    const swap = swaps.find(s => s.id === swapId);
    if (!swap) return;

    try {
      await updateDoc(doc(db, 'swaps', swapId), { 
        status: 'escrow',
        receiverItemIds: selectedReceiverItems
      });

      // Notify initiator
      await sendNotification({
        userUid: swap.initiatorUid,
        title: 'Swap Request Accepted',
        message: `${profile?.username || 'A user'} has accepted your swap request. The items are now in escrow.`,
        type: 'success',
        link: '/swap'
      });

      setIsAccepting(null);
      setSelectedReceiverItems([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `swaps/${swapId}`);
    }
  };

  const updateSwapStatus = async (swapId: string, status: Swap['status']) => {
    const swap = swaps.find(s => s.id === swapId);
    if (!swap) return;

    try {
      await updateDoc(doc(db, 'swaps', swapId), { status });

      // Notify the other party
      const otherPartyUid = user?.uid === swap.initiatorUid ? swap.receiverUid : swap.initiatorUid;
      const otherPartyUsername = user?.uid === swap.initiatorUid ? swap.receiverUsername : swap.initiatorUsername;

      if (status === 'completed') {
        await sendNotification({
          userUid: otherPartyUid,
          title: 'Swap Completed',
          message: `Your swap with @${profile?.username || 'a user'} has been completed successfully.`,
          type: 'success',
          link: '/swap'
        });
      } else if (status === 'cancelled') {
        await sendNotification({
          userUid: otherPartyUid,
          title: 'Swap Cancelled',
          message: `The swap request with @${profile?.username || 'a user'} has been cancelled.`,
          type: 'info',
          link: '/swap'
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `swaps/${swapId}`);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-start gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Swap Escrow</h1>
          <p className="text-xs text-gray-500 mt-1 font-sans">Secure peer-to-peer trading.</p>
        </div>
        
        <button 
          onClick={() => setIsInitiating(true)}
          className="btn-primary flex items-center gap-2 py-2 px-4 text-xs rounded-xl"
        >
          <Plus size={14} /> New Swap
        </button>
      </motion.div>

      {/* Active Swaps */}
      <div className="space-y-4">
        {swaps.map((swap, index) => (
          <motion.div 
            key={swap.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-curved p-5 flex flex-col gap-6 bg-white"
          >
            <div className="flex flex-col gap-6">
              {/* Initiator Side */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-full">
                    <User size={14} />
                  </div>
                  <div>
                    <p className="text-[8px] uppercase font-bold tracking-widest text-gray-400">Initiator</p>
                    <h3 className="text-sm font-display font-bold truncate max-w-[150px]">@{swap.initiatorUsername || 'Anonymous'}</h3>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {swap.initiatorItemIds.map(itemId => {
                    const item = allInventoryItems[itemId];
                    return (
                      <div key={itemId} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                        {item?.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Repeat size={16} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status & Action */}
              <div className="flex items-center justify-between py-2 border-y border-gray-50">
                <div className="p-2 bg-gray-50 rounded-full">
                  <ArrowRightLeft className="text-black" size={16} />
                </div>
                <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                  swap.status === 'escrow' ? 'bg-yellow-400 text-black' :
                  swap.status === 'completed' ? 'bg-black text-white' :
                  swap.status === 'cancelled' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {swap.status}
                </span>
              </div>

              {/* Receiver Side */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 justify-end text-right">
                  <div>
                    <p className="text-[8px] uppercase font-bold tracking-widest text-gray-400">Receiver</p>
                    <h3 className="text-sm font-display font-bold truncate max-w-[150px]">@{swap.receiverUsername || 'Anonymous'}</h3>
                  </div>
                  <div className="w-8 h-8 border border-gray-100 flex items-center justify-center rounded-full">
                    <User size={14} className="text-gray-300" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {swap.receiverItemIds.length > 0 ? (
                    swap.receiverItemIds.map(itemId => {
                      const item = allInventoryItems[itemId];
                      return (
                        <div key={itemId} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                          {item?.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Repeat size={16} />
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-3 h-16 rounded-xl border border-dashed border-gray-100 flex items-center justify-center">
                      <p className="text-[8px] uppercase font-bold tracking-widest text-gray-300">Awaiting Selection</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex flex-col gap-4 pt-4 border-t border-gray-50">
              <div className="text-[8px] text-gray-400 uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                <Clock size={10} />
                {swap.createdAt ? format(swap.createdAt.toDate(), 'MMM d, yyyy') : '...'}
              </div>

              <div className="flex flex-col gap-2">
                {swap.status === 'pending' && swap.receiverUid === user?.uid && (
                  <button 
                    onClick={() => setIsAccepting(swap.id)}
                    className="btn-primary w-full py-3 rounded-xl text-[10px]"
                  >
                    Accept Swap
                  </button>
                )}
                {swap.status === 'escrow' && (
                  <button 
                    onClick={() => updateSwapStatus(swap.id, 'completed')}
                    className="btn-primary w-full py-3 rounded-xl text-[10px] flex items-center justify-center gap-2"
                  >
                    <ShieldCheck size={12} /> Confirm Receipt
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
              </div>
            </div>
          </motion.div>
        ))}
        {swaps.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl"
          >
            <Repeat size={32} className="text-gray-100 mx-auto mb-4" />
            <p className="text-gray-400 font-sans italic text-sm px-6">No active swaps. Connect with other collectors to trade items.</p>
          </motion.div>
        )}
      </div>

      {/* Initiate Modal */}
      <AnimatePresence>
        {isInitiating && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="bg-white p-6 w-full rounded-t-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-display font-bold">Initiate Swap</h2>
                <button 
                  onClick={() => setIsInitiating(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleInitiateSwap} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[8px] uppercase font-bold tracking-widest text-gray-400 ml-1">Receiver Email</label>
                  <input 
                    required
                    type="email" 
                    placeholder="collector@example.com"
                    className="input-field py-3 text-sm" 
                    value={targetUserEmail}
                    onChange={(e) => setTargetUserEmail(e.target.value)}
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-[8px] uppercase font-bold tracking-widest text-gray-400 ml-1">Select Items to Offer</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-xl scrollbar-hide">
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
                        className={`p-3 text-[8px] uppercase tracking-widest font-bold text-left rounded-lg border transition-all ${
                          selectedMyItems.includes(item.id) 
                            ? 'bg-black text-white border-black shadow-sm' 
                            : 'bg-white text-gray-500 border-transparent'
                        }`}
                      >
                        {item.name}
                      </button>
                    ))}
                    {myInventory.length === 0 && (
                      <div className="col-span-2 py-4 text-center text-gray-400 text-[8px] uppercase tracking-widest">
                        Your inventory is empty
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={selectedMyItems.length === 0}
                    className="btn-primary w-full py-4 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed text-[10px]"
                  >
                    Send Swap Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Acceptance Modal */}
      <AnimatePresence>
        {isAccepting && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="bg-white p-6 w-full rounded-t-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-display font-bold">Accept Swap</h2>
                <button 
                  onClick={() => setIsAccepting(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[8px] uppercase font-bold tracking-widest text-gray-400 ml-1">Select Items to Give in Return</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-xl scrollbar-hide">
                    {myInventory.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (selectedReceiverItems.includes(item.id)) {
                            setSelectedReceiverItems(selectedReceiverItems.filter(id => id !== item.id));
                          } else {
                            setSelectedReceiverItems([...selectedReceiverItems, item.id]);
                          }
                        }}
                        className={`p-3 text-[8px] uppercase tracking-widest font-bold text-left rounded-lg border transition-all ${
                          selectedReceiverItems.includes(item.id) 
                            ? 'bg-black text-white border-black shadow-sm' 
                            : 'bg-white text-gray-500 border-transparent'
                        }`}
                      >
                        {item.name}
                      </button>
                    ))}
                    {myInventory.length === 0 && (
                      <div className="col-span-2 py-4 text-center text-gray-400 text-[8px] uppercase tracking-widest">
                        Your inventory is empty
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => handleAcceptSwap(isAccepting)}
                    disabled={selectedReceiverItems.length === 0}
                    className="btn-primary w-full py-4 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed text-[10px]"
                  >
                    Confirm & Escrow
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

const X = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);


