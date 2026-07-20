import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hash } from "bcryptjs";
import "dotenv/config";

function adapter() {
  const url = new URL(process.env.DATABASE_URL || "mysql://root:@localhost:3306/pospintar_management");
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "")
  });
}

const prisma = new PrismaClient({ adapter: adapter() });

const DEV_DEFAULT_PASSWORD = "password123";

function seedCredential(name: string, fallback: string) {
  const value = process.env[name] || fallback;
  if (process.env.NODE_ENV === "production" && value === fallback) {
    throw new Error(`${name} wajib diset untuk production`);
  }
  return value;
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@pospintar.com";
  const staffEmail = process.env.SEED_STAFF_EMAIL || "staff@pospintar.com";
  const adminPassword = seedCredential("SEED_ADMIN_PASSWORD", DEV_DEFAULT_PASSWORD);
  const staffPassword = seedCredential("SEED_STAFF_PASSWORD", DEV_DEFAULT_PASSWORD);

  const outlet = await prisma.outlet.upsert({
    where: { code: "ADICOM99_CIPUTAT" },
    update: {},
    create: { code: "ADICOM99_CIPUTAT", name: "ADICOM99_CIPUTAT", address: "Outlet default" }
  });

  for (const account of [
    { name: "LACI", type: "Cash" as const, note: "Kas tunai outlet" },
    { name: "BRI", type: "Bank" as const, note: "Saldo bank utama" },
    { name: "DANA", type: "Ewallet" as const, note: "Saldo e-wallet" }
  ]) {
    await prisma.fundAccount.upsert({
      where: { outletId_name: { outletId: outlet.id, name: account.name } },
      update: {},
      create: { outletId: outlet.id, name: account.name, type: account.type, balance: 0, openingBalance: 0, note: account.note }
    });
  }
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin" }
  });
  const staffRole = await prisma.role.upsert({
    where: { name: "staff" },
    update: {},
    create: { name: "staff" }
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Admin PosPintar",
      email: adminEmail,
      passwordHash: await hash(adminPassword, 10),
      roleId: adminRole.id,
      outletId: outlet.id
    }
  });

  await prisma.user.upsert({
    where: { email: staffEmail },
    update: {},
    create: {
      name: "Staff Counter",
      email: staffEmail,
      passwordHash: await hash(staffPassword, 10),
      roleId: staffRole.id,
      outletId: outlet.id
    }
  });

  const categoryNames = [
    "RAM",
    "SSD/HDD",
    "Charger",
    "LCD",
    "Keyboard",
    "Baterai",
    "Kabel",
    "Aksesoris",
    "Komponen PC",
    "Komponen Laptop",
    "Komponen HP",
    "Produk Digital"
  ];
  for (const name of categoryNames) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  const supplier = await prisma.supplier.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "PosPintar Main Supplier",
      phone: "081234567899",
      address: "Jakarta",
      note: "Supplier contoh untuk seed awal"
    }
  });

  const categories = await prisma.category.findMany();
  const getCategory = (name: string) => categories.find((item) => item.name === name)!.id;
  const items = [
    ["RAM DDR4 8GB", "RAM-DDR4-8", "RAM", 220000, 295000, 12, 3],
    ["SSD SATA 256GB", "SSD-SATA-256", "SSD/HDD", 260000, 345000, 8, 2],
    ["Charger Laptop Asus 19V", "CHG-ASUS-19V", "Charger", 120000, 185000, 4, 2],
    ["LCD Laptop 14 Slim", "LCD-14-SLIM", "LCD", 450000, 650000, 2, 2],
    ["Keyboard Laptop Universal", "KBD-UNI", "Keyboard", 90000, 150000, 6, 2],
    ["Pulsa Digital 50K", "DIGI-PULSA-50", "Produk Digital", 50000, 53000, 100, 10]
  ] as const;

  for (const [namaBarang, kodeBarang, category, hargaModal, hargaJual, stok, stokMinimum] of items) {
    await prisma.item.upsert({
      where: { outletId_kodeBarang: { outletId: outlet.id, kodeBarang } },
      update: {},
      create: {
        namaBarang,
        kodeBarang,
        categoryId: getCategory(category),
        hargaModal,
        hargaJual,
        stok,
        stokMinimum,
        satuan: "pcs",
        supplierId: supplier.id,
        outletId: outlet.id,
        deskripsi: "Data contoh seed awal"
      }
    });
  }

  const customer = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Budi Santoso",
      phone: "081298765432",
      email: "budi@example.com",
      address: "Bekasi"
    }
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
  const sampleItem = await prisma.item.findUniqueOrThrow({ where: { outletId_kodeBarang: { outletId: outlet.id, kodeBarang: "SSD-SATA-256" } } });
  const trxCode = `TRX-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-001`;
  const transaction = await prisma.transaction.upsert({
    where: { kodeTransaksi: trxCode },
    update: {},
    create: {
      kodeTransaksi: trxCode,
      customerId: customer.id,
      customerName: customer.name,
      total: 345000,
      diskon: 0,
      grandTotal: 345000,
      paymentMethod: "Cash",
      paidAmount: 350000,
      changeAmount: 5000,
      userId: user.id,
      outletId: outlet.id,
      items: {
        create: {
          itemId: sampleItem.id,
          qty: 1,
          price: 345000,
          subtotal: 345000
        }
      }
    }
  });

  await prisma.financeRecord.upsert({
    where: { id: 1 },
    update: {},
    create: {
      type: "income",
      category: "Penjualan",
      amount: 345000,
      description: `Transaksi ${transaction.kodeTransaksi}`,
      referenceType: "transaction",
      referenceId: transaction.id,
      transactionId: transaction.id,
      outletId: outlet.id,
      userId: user.id
    }
  });

  await prisma.service.upsert({
    where: { kodeService: `SRV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-001` },
    update: {},
    create: {
      kodeService: `SRV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-001`,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      deviceType: "Laptop",
      deviceBrand: "Lenovo",
      deviceModel: "IdeaPad",
      problemDescription: "Laptop lambat dan sering hang",
      diagnosis: "SSD melemah, perlu penggantian",
      estimatedCost: 450000,
      finalCost: 0,
      status: "Diproses",
      technicianNote: "Menunggu konfirmasi customer",
      userId: user.id,
      outletId: outlet.id
    }
  });

  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      storeName: "PosPintar",
      address: "Service hardware, laptop, PC, HP, pulsa, token listrik, dan produk digital.",
      whatsapp: "081234567899",
      email: "support@pospintar.com",
      invoicePrefix: "INV",
      invoiceFooter: "Terima kasih sudah mempercayakan kebutuhan service dan produk digital ke PosPintar.",
      defaultPrintFormat: "thermal_80"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

