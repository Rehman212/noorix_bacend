import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@noorix.best').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '786786';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.ADMIN, name: 'NOORIX Admin' },
    create: {
      name: 'NOORIX Admin',
      email,
      phone: '03104656107',
      passwordHash,
      role: Role.ADMIN,
      plan: 'GOLDEN',
    },
  });

  // Keep legacy admin usable if it still exists.
  const legacy = await prisma.user.findUnique({ where: { email: 'admin@noorix.pk' } });
  if (legacy && legacy.email !== email) {
    await prisma.user.update({
      where: { email: 'admin@noorix.pk' },
      data: { passwordHash, role: Role.ADMIN },
    });
  }

  console.log(`Admin ready: ${email} / ${password}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
