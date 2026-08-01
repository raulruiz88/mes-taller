import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  arrayUnion,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../config';

export interface AppNotification {
  id: string;
  tipo: 'nueva_oc' | 'cambio_estado_ot' | 'maquila' | 'general';
  titulo: string;
  mensaje: string;
  ocId?: string;
  otId?: string;
  leidoPor: string[];
  createdAt: Timestamp;
  creadoPorNombre?: string;
}

const COL = 'notifications';

export async function createNotification(data: {
  tipo: AppNotification['tipo'];
  titulo: string;
  mensaje: string;
  ocId?: string;
  otId?: string;
  creadoPorNombre?: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, COL), {
    ...data,
    leidoPor: [],
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export function subscribeNotifications(
  callback: (notifications: AppNotification[]) => void
) {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    const notifications = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as AppNotification)
    );
    callback(notifications);
  });
}

export async function markNotificationAsRead(
  notificationId: string,
  userUid: string
): Promise<void> {
  const notifRef = doc(db, COL, notificationId);
  await updateDoc(notifRef, {
    leidoPor: arrayUnion(userUid),
  });
}

export async function markAllNotificationsAsRead(
  userUid: string,
  notifications: AppNotification[]
): Promise<void> {
  const unread = notifications.filter((n) => !n.leidoPor?.includes(userUid));
  await Promise.all(
    unread.map((n) =>
      updateDoc(doc(db, COL, n.id), {
        leidoPor: arrayUnion(userUid),
      })
    )
  );
}
