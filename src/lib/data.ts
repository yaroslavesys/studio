'use client';

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  writeBatch,
  getDoc,
  query,
  Firestore,
  setDoc,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { User, Department, AccessRequest, RequestStatus, RequestType, UserRole } from './types';
import { PlaceHolderImages } from './placeholder-images';

const departmentsSeed: Omit<Department, 'id'>[] = [
  { name: 'Engineering' },
  { name: 'Marketing' },
  { name: 'Human Resources' },
];

export async function checkAndSeedDatabase(db: Firestore) {
  const metaDocRef = doc(db, 'meta', 'isSeeded');
  try {
    const docSnap = await getDoc(metaDocRef);
    if (docSnap.exists()) {
      console.log("Database already seeded. Skipping.");
      return;
    }

    console.log("Seeding database for the first time...");
    const batch = writeBatch(db);

    departmentsSeed.forEach(dept => {
      const docRef = doc(collection(db, 'departments'));
      batch.set(docRef, dept);
    });

    batch.set(metaDocRef, { seededAt: serverTimestamp() });
    await batch.commit();
    console.log("Database seeded successfully!");
  } catch (e) {
    console.error("Could not check or seed database:", e);
  }
}

export const createUserProfile = async (db: Firestore, user: import('firebase/auth').User): Promise<User> => {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        return userDoc.data() as User;
    }

    const usersQuery = query(collection(db, 'users'));
    const usersSnapshot = await getDocs(usersQuery);
    const isFirstUser = usersSnapshot.empty;

    const departmentsQuery = query(collection(db, 'departments'));
    const deptsSnapshot = await getDocs(departmentsQuery);
    const allDepts = deptsSnapshot.docs.map(d => ({...d.data(), id: d.id})) as Department[];
    const defaultDept = allDepts.find(d => d.name === 'Engineering') || (allDepts.length > 0 ? allDepts[0] : null);

    const newUser: User = {
        id: user.uid,
        name: user.displayName || 'New User',
        email: user.email!,
        avatarId: `avatar${(usersSnapshot.size % 5) + 1}`,
        role: isFirstUser ? 'Admin' : 'User',
        departmentId: defaultDept ? defaultDept.id : '',
    };
    
    setDoc(userRef, newUser).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'create',
            requestResourceData: newUser,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    
    return newUser;
};

export const addAccessRequest = (
  db: Firestore,
  data: { title: string; description: string; requestType: RequestType },
  userId: string,
  departmentId: string
) => {
  const colRef = collection(db, 'accessRequests');
  const newRequest = {
    ...data,
    userId,
    departmentId,
    status: 'Pending' as RequestStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  addDoc(colRef, newRequest).catch(async (error) => {
    const permissionError = new FirestorePermissionError({
      path: colRef.path,
      operation: 'create',
      requestResourceData: newRequest
    });
    errorEmitter.emit('permission-error', permissionError);
  });
};

export const updateRequestStatus = (db: Firestore, id: string, status: RequestStatus, techLeadComment?: string) => {
  const docRef = doc(db, 'accessRequests', id);
  const updateData: any = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (techLeadComment) {
    updateData.techLeadComment = techLeadComment;
  }
  
  updateDoc(docRef, updateData).catch(async (error) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: updateData
    });
    errorEmitter.emit('permission-error', permissionError);
  });
};

export const deleteRequestById = (db: Firestore, id: string) => {
  const docRef = doc(db, 'accessRequests', id);
  deleteDoc(docRef).catch(async (error) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete'
    });
    errorEmitter.emit('permission-error', permissionError);
  });
};

export const updateUserRoleInDb = (db: Firestore, id: string, role: UserRole) => {
  const docRef = doc(db, 'users', id);
  const updateData = { role };
  updateDoc(docRef, updateData).catch(async (error) => {
     const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: { role }
    });
    errorEmitter.emit('permission-error', permissionError);
  });
};