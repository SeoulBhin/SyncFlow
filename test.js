// test.js
import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.users.create({
    data: {
      email: "test@test.com",
      name: "테스트유저",
    },
  });

  console.log(user);
}

main();
