'use client';

import {
  collection,
  doc,
  getDoc,
  query,
  getDocs,
  setDoc,
  Firestore,
} from 'firebase/firestore';
import type { User } from './types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export const createUserProfile = async (db: Firestore, user: import('firebase/auth').User): Promise<User> => {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        return userDoc.data() as User;
    }

    // Check if this is the first user
    const usersQuery = query(collection(db, 'users'));
    const usersSnapshot = await getDocs(usersQuery);
    const isFirstUser = usersSnapshot.empty;

    // For simplicity, we'll assign the first user to a default department.
    // In a real app, this might be handled differently.
    const newUser: User = {
        id: user.uid,
        name: user.displayName || 'New User',
        email: user.email!,
        avatarId: `avatar${(usersSnapshot.size % 5) + 1}`,
        role: isFirstUser ? 'Admin' : 'User', // First user is an Admin
        departmentId: 'engineering', // Default department
    };
    
    // Use a non-blocking set with error handling
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
