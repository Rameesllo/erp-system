import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Checking and activating admin user...");

  const adminEmail = "admin@gmail.com";
  const hashedPassword = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      isActive: true,
      password: hashedPassword,
      role: "ADMIN",
      name: "System Admin",
    },
    create: {
      name: "System Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  });

  // Also ensure any other users in the database have isActive = true
  await prisma.user.updateMany({
    data: {
      isActive: true,
    },
  });

  console.log(`Successfully activated admin: ${admin.email} (isActive: ${admin.isActive})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
