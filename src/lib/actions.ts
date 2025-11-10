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
  
  addAccessRequest(
    db,
    {
      title: validatedFields.data.title,
      description: validatedFields.data.description,
      requestType: validatedFields.data.requestType as RequestType,
    },
    userId,
    departmentId
  );

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/admin');
}

export async function updateRequest(id: string, status: RequestStatus, techLeadComment?: string) {
  const db = getDb();
  if (!db) return { error: 'Firestore not initialized' };
  updateRequestStatus(db, id, status, techLeadComment);
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/admin');
}

export async function deleteRequest(id: string) {
    const db = getDb();
    if (!db) return { error: 'Firestore not initialized' };
    deleteRequestById(db, id);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/admin');
}

export async function updateUserRole(id: string, role: UserRole) {
    const db = getDb();
    if (!db) return { error: 'Firestore not initialized' };
    updateUserRoleInDb(db, id, role);
    revalidatePath('/dashboard/admin');
}