import { neon } from '@neondatabase/serverless';

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Return mock query function if DATABASE_URL is not set yet
    return async (strings: TemplateStringsArray, ...values: any[]) => {
      console.warn('DATABASE_URL belum dikonfigurasi pada .env.local');
      return [];
    };
  }
  return neon(connectionString);
}
