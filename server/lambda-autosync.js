/**
 * Scheduled auto-sync Lambda handler.
 * Triggered by Amazon EventBridge (CloudWatch Events) once a day at end-of-day
 * UTC (e.g. cron(0 23 * * ? *)).
 *
 * This is a SEPARATE Lambda function from the API handler. It runs the batch
 * auto-sync — no Express, no API Gateway.
 *
 * EventBridge owns the timing; the per-user eligibility decision lives in
 * autoSyncRunner (only 'end_of_day' users are synced).
 */

import 'dotenv/config';
import { runAutoSync } from './src/services/autoSyncRunner.js';

export const handler = async (event) => {
  console.log('🔄 Starting scheduled auto-sync...', JSON.stringify(event));

  try {
    const result = await runAutoSync();
    console.log('✅ Scheduled auto-sync complete:', JSON.stringify(result));
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Auto-sync successful', ...result }),
    };
  } catch (err) {
    console.error('❌ Scheduled auto-sync failed:', err);
    throw err; // Let Lambda mark this invocation as failed
  }
};
