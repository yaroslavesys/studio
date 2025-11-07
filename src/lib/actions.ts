'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addAccessRequest, updateRequestStatus, deleteRequestById, updateUserRoleInDb } from './data';
import type { RequestType, UserRole, RequestStatus } from './types';

const requestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  description: z.string().min(10, 'Description must be at least 10 characters long.'),
  requestType: z.enum(['System', 'Data', 'Other']),
});

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
  
  addAccessRequest(
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
  updateRequestStatus(id, status, techLeadComment);
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/admin');
}

export async function deleteRequest(id: string) {
    deleteRequestById(id);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/admin');
}

export async function updateUserRole(id: string, role: UserRole) {
    updateUserRoleInDb(id, role);
    revalidatePath('/dashboard/admin');
}
