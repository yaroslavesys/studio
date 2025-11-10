'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addAccessRequest, updateRequestStatus, deleteRequestById, updateUserRoleInDb } from './data';
import type { RequestType, UserRole, RequestStatus } from './types';
import { initializeFirebase } from '@/firebase/server-actions-init';

const requestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  description: z.string().min(10, 'Description must be at least 10 characters long.'),
  requestType: z.enum(['System', 'Data', 'Other']),
});

function getDb() {
    return initializeFirebase().firestore;
}

export async function createAccessRequest(
  values: z.infer<typeof requestSchema>,
  userId: string,
  departmentId: string
) {
  const validatedFields = requestSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const db = getDb();
  if (!db) return { error: 'Firestore not initialized' };
  
  await addDoc(collection(db, 'accessRequests'), {
    ...validatedFields.data,
    userId,
    departmentId,
    status: 'Pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });


  revalidatePath('/dashboard');
}

export async function updateRequest(id: string, status: RequestStatus, techLeadComment?: string) {
  const db = getDb();
  if (!db) return { error: 'Firestore not initialized' };
  
  const updateData: any = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (techLeadComment) {
    updateData.techLeadComment = techLeadComment;
  }
  
  await updateDoc(doc(db, 'accessRequests', id), updateData);
  revalidatePath('/dashboard');
}

export async function deleteRequest(id: string) {
    const db = getDb();
    if (!db) return { error: 'Firestore not initialized' };
    await deleteDoc(doc(db, 'accessRequests', id));
    revalidatePath('/dashboard');
}

export async function updateUserRole(id: string, role: UserRole) {
    const db = getDb();
    if (!db) return { error: 'Firestore not initialized' };
    await updateDoc(doc(db, 'users', id), { role });
    revalidatePath('/dashboard/admin');
}
