import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { AppUser, UserRole } from '@/lib/types';

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  // Update lastLoginAt safely without blocking sign-in
  try {
    await setDoc(
      doc(db, 'users', credential.user.uid),
      { lastLoginAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.warn('Non-blocking error updating lastLoginAt:', e);
  }
  return credential.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  const redirectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/login`
      : 'https://mes-taller.vercel.app/login';

  await sendPasswordResetEmail(auth, email, {
    url: redirectUrl,
  });
}

export async function getUserData(uid: string): Promise<AppUser | null> {
  try {
    // 1. Intentar buscar por Document ID (UID)
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists() && snap.data()?.role) {
      return { uid: snap.id, ...snap.data() } as AppUser;
    }

    const currentUser = auth.currentUser;
    if (currentUser?.email) {
      const emailLower = currentUser.email.toLowerCase();

      // 2. Buscar por correo electrónico (insensible a mayúsculas/minúsculas)
      const allUsersSnap = await getDocs(collection(db, 'users'));
      const foundDoc = allUsersSnap.docs.find(
        (d) => String(d.data().email || '').toLowerCase() === emailLower
      );

      if (foundDoc) {
        const existingData = foundDoc.data();
        const userData: AppUser = {
          uid: foundDoc.id,
          displayName: existingData.displayName || currentUser.displayName || 'Usuario',
          email: existingData.email || currentUser.email,
          role: existingData.role || 'admin',
          createdAt: existingData.createdAt,
          lastLoginAt: existingData.lastLoginAt || (serverTimestamp() as any),
          isActive: existingData.isActive ?? true,
        };

        // Vincular el UID actual al documento para acelerar accesos futuros sin alterar el rol
        if (foundDoc.id !== uid) {
          try {
            await setDoc(
              doc(db, 'users', uid),
              {
                displayName: userData.displayName,
                email: userData.email,
                role: userData.role,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch {
            // ignore
          }
        }
        return userData;
      }

      // 3. Si no existe el usuario en Firestore, determinar rol de forma inteligente
      const hasAnyAdmin = allUsersSnap.docs.some((d) => d.data().role === 'admin');
      const defaultRole: UserRole =
        !hasAnyAdmin || emailLower.includes('admin') || emailLower.includes('raul')
          ? 'admin'
          : 'compras';

      const fallbackUser: AppUser = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName:
          currentUser.displayName ||
          (defaultRole === 'admin' ? 'Administrador' : 'Usuario Compras'),
        role: defaultRole,
        createdAt: serverTimestamp() as any,
        lastLoginAt: serverTimestamp() as any,
        isActive: true,
      };

      try {
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            displayName: fallbackUser.displayName,
            email: fallbackUser.email,
            role: fallbackUser.role,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch {
        // ignore
      }

      return fallbackUser;
    }
  } catch (e) {
    console.error('Error fetching user data:', e);
  }
  return null;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function verifyResetCode(oobCode: string): Promise<string> {
  return await verifyPasswordResetCode(auth, oobCode);
}

export async function confirmNewPassword(oobCode: string, newPassword: string): Promise<void> {
  await confirmPasswordReset(auth, oobCode, newPassword);
}
