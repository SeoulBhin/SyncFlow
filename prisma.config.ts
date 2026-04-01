import { defineConfig } from '@prisma/config'
import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "backend/.env") });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --experimental-strip-types prisma/seed.ts',
  },
  
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
