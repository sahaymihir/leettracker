// Global test environment. Runs before every test file (vitest setupFiles).
// Pins the secrets/flags the code reads from process.env so tests never depend
// on a developer's real .env or AWS credentials.
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.DYNAMODB_TABLE = 'TestTable';
process.env.AWS_REGION = 'ap-south-1';
// Make app.js treat the test process as "running in Lambda" so importing it for
// supertest doesn't also start a real localhost listener.
process.env.AWS_LAMBDA_FUNCTION_NAME = 'test';
