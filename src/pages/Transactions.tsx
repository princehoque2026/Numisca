import React from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Receipt, Package, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  userId: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }[];
  totalAmount: number;
  status: 'completed' | 'pending' | 'failed';
  createdAt: any;
}

export const Transactions: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-display font-bold tracking-tight">Purchase History</h1>
        <p className="text-xs text-gray-500 mt-1 font-sans">Track your recent acquisitions.</p>
      </motion.div>

      <div className="space-y-4">
        {transactions.map((tx, index) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-curved p-5 bg-white border border-gray-100"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                    <Receipt size={16} className="text-black" />
                  </div>
                  <div>
                    <p className="text-[8px] uppercase font-bold tracking-widest text-gray-400">Order ID</p>
                    <p className="text-[10px] font-mono font-bold">#{tx.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] uppercase font-bold tracking-widest text-gray-400">Date</p>
                  <p className="text-[10px] font-bold flex items-center gap-1 justify-end">
                    <Clock size={10} />
                    {tx.createdAt ? format(tx.createdAt.toDate(), 'MMM d, HH:mm') : '...'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {tx.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={16} className="text-gray-200" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-tight truncate">{item.name}</p>
                      <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] font-bold">${(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 ${
                  tx.status === 'completed' ? 'bg-black text-white' :
                  tx.status === 'pending' ? 'bg-yellow-400 text-black' :
                  'bg-red-500 text-white'
                }`}>
                  {tx.status === 'completed' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                  {tx.status}
                </div>
                <div className="text-right">
                  <p className="text-[8px] uppercase font-bold tracking-widest text-gray-400">Total</p>
                  <p className="text-2xl font-display font-bold tracking-tighter">${tx.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {transactions.length === 0 && !loading && (
          <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl">
            <Receipt size={32} className="text-gray-100 mx-auto mb-4" />
            <p className="text-gray-400 font-sans italic text-sm px-6">No transactions found. Start collecting items from the shop!</p>
          </div>
        )}
      </div>
    </div>
  );
};
