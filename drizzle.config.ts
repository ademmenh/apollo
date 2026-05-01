import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
config({ path: '.env.dev', override: true });

export default defineConfig({
    schema: './src/**/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        host: 'localhost',
        port: 5432,
        user: process.env.DB_USER!,
        password: process.env.DB_PASSWORD!,
        database: process.env.DB_NAME!,
        ssl: false,
    },
});
