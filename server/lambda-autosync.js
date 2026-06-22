/**
 * Scheduled auto-sync Lambda handler.
 * Triggered by Amazon EventBridge (CloudWatch Events) hourly.
 *
 * This is a SEPARATE Lambda function from the API handler (mirrors
 * lambda-backup.js). It runs the batch auto-sync — no Express, no API Gateway.
 *
 * A single hourly schedule drives both supported cadences ('end_of_day' in IST
 * and 'every_12h'); the per-user due decision lives in autoSyncRunner.
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
