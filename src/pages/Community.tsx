import React from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Hash, MessageSquare, Plus, Users, Image as ImageIcon, Search, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Chat {
  id: string;
  type: 'group' | 'direct';
  name: string;
  participants: string[];
  participantDetails?: Record<string, { name: string, photoURL?: string }>;
  lastMessage?: string;
  updatedAt: any;
}

interface Message {
  id: string;
  chatId: string;
  senderUid: string;
  senderName: string;
  senderPhotoURL?: string;
  text?: string;
  imageUrl?: string;
  createdAt: any;
}

export const Community: React.FC = () => {
  const { user, profile } = useAuth();
  const [chats, setChats] = React.useState<Chat[]>([]);
  const [activeChat, setActiveChat] = React.useState<Chat | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [imageFile, setImageFile] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChat || (!newMessage.trim() && !imageFile)) return;

    try {
      const msgText = newMessage;
      const msgImage = imageFile;
      setNewMessage('');
      setImageFile(null);
      
      await addDoc(collection(db, `chats/${activeChat.id}/messages`), {
        chatId: activeChat.id,
        senderUid: user.uid,
        senderName: profile?.name || 'Collector',
        senderPhotoURL: profile?.photoURL || '',
        text: msgText,
        imageUrl: msgImage || null,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${activeChat.id}/messages`);
    }
  };

  React.useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(chatsData);
      setLoading(false);
      
      if (chatsData.length > 0 && !activeChat) {
        setActiveChat(chatsData[0]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return unsubscribe;
  }, [user]);

  React.useEffect(() => {
    if (!activeChat) return;

    const q = query(
      collection(db, `chats/${activeChat.id}/messages`),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgsData);
      
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${activeChat.id}/messages`);
    });

    return unsubscribe;
  }, [activeChat]);

  const createGroupChat = async (name: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'chats'), {
        type: 'group',
        name,
        participants: [user.uid],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats');
    }
  };

  return (
    <div className="h-[75vh] flex curved-card overflow-hidden bg-white">
      {/* Sidebar */}
      <div className="w-1/4 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">Groups</h2>
          <button 
            onClick={() => {
              const name = window.prompt('Group Name?');
              if (name) createGroupChat(name);
            }}
            className="p-2 hover:bg-black hover:text-white rounded-full transition-all"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className={`w-full p-6 text-left border-b border-gray-100/50 transition-all flex items-center gap-4 ${
                activeChat?.id === chat.id ? 'bg-black text-white shadow-lg z-10' : 'hover:bg-white'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                activeChat?.id === chat.id ? 'bg-white text-black' : 'bg-black text-white'
              }`}>
                {chat.type === 'group' ? <Hash size={18} /> : <Users size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest font-bold truncate">{chat.name}</div>
                <div className={`text-[8px] uppercase tracking-tighter truncate mt-1 ${
                  activeChat?.id === chat.id ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {chat.participants.length} members
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeChat ? (
          <>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center">
                  {activeChat.type === 'group' ? <Hash size={20} /> : <Users size={20} />}
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold leading-tight">{activeChat.name}</h2>
                  <span className="text-[8px] uppercase tracking-[0.2em] text-gray-400 font-bold">
                    {activeChat.type} • {activeChat.participants.length} members
                  </span>
                </div>
              </div>
              <div className="flex -space-x-3">
                {activeChat.participants.slice(0, 4).map((p, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-black shadow-sm">
                    {i + 1}
                  </div>
                ))}
                {activeChat.participants.length > 4 && (
                  <div className="w-8 h-8 rounded-full bg-black border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                    +{activeChat.participants.length - 4}
                  </div>
                )}
              </div>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide"
            >
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex flex-col ${msg.senderUid === user?.uid ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-3 mb-2 px-1">
                      {msg.senderPhotoURL && (
                        <img src={msg.senderPhotoURL} alt={msg.senderName} className="w-5 h-5 rounded-full object-cover" />
                      )}
                      <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{msg.senderName}</span>
                      <span className="text-[8px] text-gray-300 font-bold">
                        {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : '...'}
                      </span>
                    </div>
                    <div className={`max-w-[75%] space-y-3 ${msg.senderUid === user?.uid ? 'items-end' : 'items-start'}`}>
                      {msg.imageUrl && (
                        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                          <img src={msg.imageUrl} alt="Shared" className="max-w-full max-h-64 object-cover" />
                        </div>
                      )}
                      {msg.text && (
                        <div className={`p-5 text-sm shadow-sm ${
                          msg.senderUid === user?.uid 
                            ? 'bg-black text-white rounded-2xl rounded-tr-none' 
                            : 'bg-gray-50 text-black rounded-2xl rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white space-y-4">
              {imageFile && (
                <div className="relative inline-block">
                  <img src={imageFile} alt="Preview" className="w-20 h-20 object-cover rounded-xl border-2 border-black" />
                  <button 
                    onClick={() => setImageFile(null)}
                    className="absolute -top-2 -right-2 bg-black text-white rounded-full p-1 shadow-lg"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-4 items-end">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="w-full input-field rounded-2xl px-6 pr-12"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <label className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-black transition-colors">
                    <ImageIcon size={20} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                  </label>
                </div>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="btn-primary p-4 rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-8">
              <MessageSquare size={40} className="text-gray-200" />
            </div>
            <h2 className="text-3xl font-display font-bold">Select a Conversation</h2>
            <p className="text-gray-400 mt-3 max-w-xs font-sans">Join a group or start a direct message with another collector.</p>
          </div>
        )}
      </div>
    </div>
  );
};
