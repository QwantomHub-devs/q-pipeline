'use server';

import { auth } from '@clerk/nextjs/server';
import {
  getExecutiveAnalyticsOverview,
  getMetabaseConnectionDetails,
} from './analytics-service';
import {
  ExecutiveAnalyticsOverview,
  MetabaseConnectionDetails,
} from './types';
import { AuthActor } from '../identity/types';

/**
 * Server Action: Admin fetch Executive Pipeline Operations Analytics Overview (Rule 5 check)
 */
export async function getExecutiveAnalyticsOverviewAction(): Promise<{
  success: boolean;
  analytics?: ExecutiveAnalyticsOverview;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const analytics = await getExecutiveAnalyticsOverview(adminUser);

    return { success: true, analytics };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch executive analytics overview' };
  }
}

/**
 * Server Action: Admin fetch Metabase Direct SQL Connection Details & Query Templates
 */
export async function getMetabaseConnectionDetailsAction(): Promise<{
  success: boolean;
  details?: MetabaseConnectionDetails;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const details = await getMetabaseConnectionDetails(adminUser);

    return { success: true, details };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch Metabase connection details' };
  }
}
