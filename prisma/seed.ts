import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = process.env.ADMIN_PASSWORD || '786786786';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email: 'admin@noorix.pk' },
    update: { passwordHash, role: Role.ADMIN, name: 'NOORIX Admin' },
    create: {
      name: 'NOORIX Admin',
      email: 'admin@noorix.pk',
      phone: '03104656107',
      passwordHash,
      role: Role.ADMIN,
      plan: 'GOLDEN',
    },
  });

  console.log('Admin ready:  admin@noorix.pk');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
