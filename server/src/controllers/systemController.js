/**
 * @name healthCheckController
 * @description Report API health status
 * @access Public
 */
export const healthCheck = (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};
