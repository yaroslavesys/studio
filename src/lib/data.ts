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

// --- Data Seeding (for demo purposes) ---
// This part is to ensure the database has some initial data.
let departmentsSeed: Department[] = [
  { id: 'dept-1', name: 'Engineering' },
  { id: 'dept-2', name: 'Marketing' },
  { id: 'dept-3', name: 'Human Resources' },
];

let usersSeed: Omit<User, 'avatarUrl'>[] = [
    {
        id: 'user-1-admin', // This ID is a placeholder for the seed data only
        name: 'Default Admin',
        email: 'admin@example.com', // Placeholder email
        avatarId: 'avatar1',
        role: 'Admin',
        departmentId: 'dept-1',
    },
    {
        id: 'user-2-lead',
        name: 'Maria Garcia',
        email: 'maria.g@trafficdevils.net',
        avatarId: 'avatar2',
        role: 'TechLead',
        departmentId: 'dept-1',
    },
    {
        id: 'user-3-user',
        name: 'Sam Williams',
        email: 'sam.w@trafficdevils.net',
        avatarId: 'avatar3',
        role: 'User',
        departmentId: 'dept-1',
    },
     {
        id: 'user-4-lead',
        name: 'Casey Lee',
        email: 'casey.l@newdevils.net',
        avatarId: 'avatar4',
        role: 'TechLead',
        departmentId: 'dept-2',
    },
     {
        id: 'user-5-user',
        name: 'Jordan Smith',
        email: 'jordan.s@newdevils.net',
        avatarId: 'avatar5',
        role: 'User',
        departmentId: 'dept-2',
    },
];

let accessRequestsSeed: Omit<AccessRequest, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
        title: 'Access to Production Database',
        description: 'Need read-only access to the production database for debugging purposes.',
        requestType: 'Data',
        status: 'Pending',
        userId: 'user-3-user',
        departmentId: 'dept-1',
    },
    {
        title: 'Admin rights for Staging Server',
        description: 'Requesting admin rights on staging for new feature deployment testing.',
        requestType: 'System',
        status: 'Approved',
        userId: 'user-3-user',
        departmentId: 'dept-1',
    },
    {
        title: 'Marketing Analytics Tool Access',
        description: 'Need access to our new marketing analytics platform to track campaign performance.',
        requestType: 'Other',
        status: 'Pending',
        userId: 'user-5-user',
        departmentId: 'dept-2',
    },
     {
        title: 'GitHub Repo "Project-X" write access',
        description: 'I need to push my latest changes for the upcoming release.',
        requestType: 'System',
        status: 'Rejected',
        userId: 'user-3-user',
        departmentId: 'dept-1',
    },
];


export async function seedDatabase(db: Firestore) {
    console.log("Checking if seeding is needed...");

    const checkDocRef = doc(db, 'meta', 'seeded');
    const checkDoc = await getDoc(checkDocRef);

    if (checkDoc.exists() && checkDoc.data().done) {
        console.log("Database already seeded. Skipping.");
        return;
    }

    console.log("Seeding database...");
    const batch = writeBatch(db);

    // Seed departments
    departmentsSeed.forEach(dept => {
        const docRef = doc(db, 'departments', dept.id);
        batch.set(docRef, dept);
    });

    // Seed users
    usersSeed.forEach(user => {
        const docRef = doc(db, 'users', user.id);
        batch.set(docRef, user);
    });
    
    // Seed requests
    accessRequestsSeed.forEach(req => {
        const docRef = doc(collection(db, 'accessRequests'));
        batch.set(docRef, { 
            ...req, 
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    });

    // Mark seeding as done
    batch.set(checkDocRef, { done: true });

    try {
        await batch.commit();
        console.log("Database seeded successfully!");
    } catch(e) {
        console.error("Error seeding database: ", e);
    }
}


// --- Data Manipulation Functions ---

export const addAccessRequest = async (
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

  try {
    await addDoc(colRef, newRequest);
  } catch (error) {
    const contextualError = await FirestorePermissionError.create({
      path: colRef.path,
      operation: 'create',
      requestResourceData: newRequest
    });
    errorEmitter.emit('permission-error', contextualError);
  }
};

export const updateRequestStatus = async (db: Firestore, id: string, status: RequestStatus, techLeadComment?: string) => {
  const docRef = doc(db, 'accessRequests', id);
  const updateData: any = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (techLeadComment) {
    updateData.techLeadComment = techLeadComment;
  }
  
  try {
    await updateDoc(docRef, updateData)
  } catch (error) {
    const contextualError = await FirestorePermissionError.create({
      path: docRef.path,
      operation: 'update',
      requestResourceData: updateData
    });
    errorEmitter.emit('permission-error', contextualError);
  }
};

export const deleteRequestById = async (db: Firestore, id: string) => {
  const docRef = doc(db, 'accessRequests', id);
  try {
    await deleteDoc(docRef)
  } catch (error) {
    const contextualError = await FirestorePermissionError.create({
      path: docRef.path,
      operation: 'delete'
    });
    errorEmitter.emit('permission-error', contextualError);
  }
};

export const updateUserRoleInDb = async (db: Firestore, id: string, role: UserRole) => {
  const docRef = doc(db, 'users', id);
  const updateData = { role, updatedAt: serverTimestamp() };
  try {
    await updateDoc(docRef, updateData)
  } catch (error) {
     const contextualError = await FirestorePermissionError.create({
      path: docRef.path,
      operation: 'update',
      requestResourceData: { role }
    });
    errorEmitter.emit('permission-error', contextualError);
  }
};

// --- This function is to create a user document in Firestore the first time they log in ---
export const createUserProfile = async (db: Firestore, user: import('firebase/auth').User) => {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    // If user document already exists, return it
    if (userDoc.exists()) {
        const userData = userDoc.data() as Omit<User, 'avatarUrl'>;
        const imageMap = new Map(PlaceHolderImages.map(img => [img.id, img.imageUrl]));
        return { ...userData, id: userDoc.id, avatarUrl: imageMap.get(userData.avatarId) || '' };
    }

    // If user document doesn't exist, create it
    const usersQuery = query(collection(db, 'users'));
    const usersSnapshot = await getDocs(usersQuery);
    const isFirstUser = usersSnapshot.empty;

    const departmentsQuery = query(collection(db, 'departments'));
    const deptsSnapshot = await getDocs(departmentsQuery);
    const allDepts = deptsSnapshot.docs.map(d => ({...d.data(), id: d.id})) as Department[];

    // Assign a default department if one exists, otherwise an empty string.
    const defaultDept = allDepts.find(d => d.name === 'Engineering') || allDepts[0];

    const newUser: Omit<User, 'avatarUrl'> = {
        id: user.uid,
        name: user.displayName || 'New User',
        email: user.email!,
        avatarId: `avatar${(usersSnapshot.size % 5) + 1}`,
        // The very first user to sign in becomes the Admin
        role: isFirstUser ? 'Admin' : 'User',
        departmentId: defaultDept ? defaultDept.id : '',
    };
    
    try {
        await setDoc(userRef, newUser);
    } catch (error) {
        const contextualError = await FirestorePermissionError.create({
            path: userRef.path,
            operation: 'create',
            requestResourceData: newUser
        });
        errorEmitter.emit('permission-error', contextualError);
        // Re-throw or handle as needed, for now we just emit
        throw contextualError;
    }
    
    const imageMap = new Map(PlaceHolderImages.map(img => [img.id, img.imageUrl]));
    return { ...newUser, avatarUrl: imageMap.get(newUser.avatarId) || '' };
};

// This function can be called on first load to seed data if necessary
// Be careful with this in production environments
export const checkAndSeedDatabase = async (db: Firestore) => {
    const metaDocRef = doc(db, 'meta', 'isSeeded');
    const docSnap = await getDoc(metaDocRef);

    if (!docSnap.exists()) {
        console.log("Seeding database for the first time...");
        await seedDatabase(db);
        console.log("Seeding complete.");
    } else {
        console.log("Database already seeded.");
    }
}
