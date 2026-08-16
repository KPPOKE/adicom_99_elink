import { prisma } from "../lib/prisma";

async function main() {
  await prisma.setting.updateMany({
    data: { whatsapp: "+62 812-3456-8987" }
  });
  console.log("Database setting whatsapp updated to +62 812-3456-8987");
}

main().catch(console.error).finally(() => prisma.$disconnect());
