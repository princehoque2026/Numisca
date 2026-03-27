import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, orderBy, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, messaging } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  userUid: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: any;
  link?: string;
}

interface SendNotificationParams {
  userUid: string;
  title: string;
  message: string;
  type: Notification['type'];
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  permissionStatus: NotificationPermission;
  markAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  sendNotification: (params: SendNotificationParams) => Promise<void>;
  requestPushPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    // Handle foreground messages
    if (messaging) {
      const unsubscribeMessage = onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        // Add to local notifications if not already there
        if (payload.notification) {
          const newNotif: Notification = {
            id: Date.now().toString(),
            userUid: user.uid,
            title: payload.notification.title || 'Notification',
            message: payload.notification.body || '',
            type: 'info',
            read: false,
            createdAt: new Date(),
            link: payload.data?.link
          };
          setNotifications(prev => [newNotif, ...prev]);
        }
      });
      return () => {
        unsubscribe();
        unsubscribeMessage();
      };
    }

    return () => unsubscribe();
  }, [user]);

  const requestPushPermission = async () => {
    if (!user || typeof Notification === 'undefined') return;
    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_VAPID_KEY || 'BOnnceIY77oWnqzqJjlYHTM5uF8s9cshBDyaLEA1Lw_L7Ii5lxMq_rZlYYRbEvid_MtIE2qU9A4SK5KVwMkbU3g'
        });
        if (token) {
          await updateDoc(doc(db, 'users', user.uid), {
            fcmTokens: arrayUnion(token)
          });
        }
      }
    } catch (error) {
      console.error('Push permission error:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const sendNotification = async ({ userUid, title, message, type, link }: SendNotificationParams) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userUid,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp(),
        link
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      permissionStatus,
      markAsRead, 
      deleteNotification, 
      sendNotification,
      requestPushPermission
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
