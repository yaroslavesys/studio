'use server';

/**
 * @fileOverview Summarizes dashboard data using GenAI.
 *
 * - summarizeDashboard - A function that summarizes the dashboard information.
 * - DashboardSummaryInput - The input type for the summarizeDashboard function.
 * - DashboardSummaryOutput - The return type for the summarizeDashboard function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DashboardSummaryInputSchema = z.object({
  dashboardData: z
    .string()
    .describe(
      'The dashboard data to summarize. Should include information on access requests and user activity.'
    ),
});
export type DashboardSummaryInput = z.infer<typeof DashboardSummaryInputSchema>;

const DashboardSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the dashboard data.'),
});
export type DashboardSummaryOutput = z.infer<typeof DashboardSummaryOutputSchema>;

export async function summarizeDashboard(input: DashboardSummaryInput): Promise<DashboardSummaryOutput> {
  return summarizeDashboardFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dashboardSummaryPrompt',
  input: {schema: DashboardSummaryInputSchema},
  output: {schema: DashboardSummaryOutputSchema},
  prompt: `You are an expert at summarizing dashboard data for quick insights.

  Please provide a concise summary of the following dashboard data, highlighting key trends and important information regarding access requests and user activity:

  Dashboard Data: {{{dashboardData}}}`,
});

const summarizeDashboardFlow = ai.defineFlow(
  {
    name: 'summarizeDashboardFlow',
    inputSchema: DashboardSummaryInputSchema,
    outputSchema: DashboardSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
