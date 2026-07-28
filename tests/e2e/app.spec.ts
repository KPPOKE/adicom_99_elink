import { expect, test } from "@playwright/test";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function login(page: import("@playwright/test").Page, email = "admin@adicom99.com") {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function createStaff(suffix: string) {
  const staffRole = await prisma.role.findUniqueOrThrow({ where: { name: "staff" } });
  const outlet = await prisma.outlet.findFirstOrThrow({ orderBy: { id: "asc" } });
  return prisma.user.create({
    data: {
      name: suffix,
      email: `${suffix}@example.com`,
      passwordHash: await hash("password123", 10),
      roleId: staffRole.id,
      outletId: outlet.id
    }
  });
}

test("admin can open the main operational pages", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  for (const path of ["/dashboard", "/inventory", "/categories", "/suppliers", "/customers", "/transactions", "/bank-transfers", "/funds", "/fund-mutations", "/services", "/finance", "/reports", "/settings"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("main")).toBeVisible();
  }
});

test("bank transfer records only the admin fee as income", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Mutation smoke test runs once");
  const marker = `mini-atm-${Date.now()}`;
  const depositNote = `${marker}-deposit`;
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@adicom99.com" } });
  const outlet = admin.outletId
    ? await prisma.outlet.findUniqueOrThrow({ where: { id: admin.outletId } })
    : await prisma.outlet.findFirstOrThrow({ orderBy: { name: "asc" } });
  const bri = await prisma.fundAccount.findFirstOrThrow({ where: { outletId: outlet.id, name: "BRI", isActive: true } });
  const laci = await prisma.fundAccount.findFirstOrThrow({ where: { outletId: outlet.id, name: "LACI", isActive: true } });
  const briBalance = bri.balance;
  const laciBalance = laci.balance;
  let transferId: number | undefined;
  let depositId: number | undefined;

  try {
    await login(page);
    await page.goto("/bank-transfers");
    await page.locator('select[name="fundAccountId"]').selectOption(String(bri.id));
    await page.getByPlaceholder("Nominal deposit").fill("200000");
    await page.getByPlaceholder("Catatan deposit").fill(depositNote);
    await page.getByRole("button", { name: "Tambah Deposit" }).click();
    await expect(page.getByText("Deposit transfer disimpan")).toBeVisible();
    depositId = (await prisma.bankTransferDeposit.findFirstOrThrow({ where: { note: depositNote }, orderBy: { id: "desc" } })).id;

    await page.locator('select[name="sourceFundId"]').selectOption(String(bri.id));
    await page.locator('select[name="targetFundId"]').selectOption(String(laci.id));
    await page.getByLabel("Bank Tujuan").fill("BCA");
    await page.getByLabel("Nominal", { exact: true }).fill("100000");
    await page.getByLabel("Admin Loket").fill("5000");
    await page.getByLabel("Catatan").fill(marker);
    await page.getByRole("button", { name: "Simpan Transfer" }).click();
    await expect(page.getByText("MiniATM disimpan sebagai Pending")).toBeVisible();

    const transfer = await prisma.bankTransfer.findFirstOrThrow({ where: { note: marker }, orderBy: { id: "desc" } });
    transferId = transfer.id;
    expect(Number(transfer.totalReceived)).toBe(105000);
    await page.getByTitle("Transfer berhasil").first().click();
    await page.getByRole("button", { name: "Berhasil", exact: true }).click();
    await expect(page.getByText("MiniATM berhasil diselesaikan")).toBeVisible();

    const finance = await prisma.financeRecord.findUniqueOrThrow({ where: { bankTransferId: transfer.id } });
    expect(Number(finance.amount)).toBe(5000);
    expect(finance.referenceType).toBe("bank_transfer");
  } finally {
    if (transferId) {
      await prisma.financeRecord.deleteMany({ where: { bankTransferId: transferId } });
      await prisma.fundMutation.deleteMany({ where: { bankTransferId: transferId } });
      await prisma.auditLog.deleteMany({ where: { entity: "bank_transfer", entityId: transferId } });
      await prisma.bankTransfer.deleteMany({ where: { id: transferId } });
    }
    await prisma.fundMutation.deleteMany({ where: { referenceType: "manual_deposit", note: depositNote } });
    if (depositId) {
      await prisma.auditLog.deleteMany({ where: { entity: "bank_transfer_deposit", entityId: depositId } });
      await prisma.bankTransferDeposit.deleteMany({ where: { id: depositId } });
    }
    await prisma.fundAccount.update({ where: { id: bri.id }, data: { balance: briBalance } });
    await prisma.fundAccount.update({ where: { id: laci.id }, data: { balance: laciBalance } });
  }
});

test("exports and invoices respond for admin", async ({ page }) => {
  await login(page);
  await page.goto("/reports");
  const href = await page.getByRole("link", { name: "Excel Penjualan" }).getAttribute("href");
  expect(href).toBeTruthy();
  const response = await page.request.get(href!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-disposition"]).toMatch(/laporan-penjualan\.(xls|xlsx)"/);

  await page.goto("/transactions/1/invoice");
  await expect(page.getByText("Kode")).toBeVisible();
  await page.goto("/services/1/invoice");
  await expect(page.getByText("Kode Service")).toBeVisible();
});

test("staff only sees and opens cashier pages", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const staff = await createStaff(`staff-${Date.now()}-${testInfo.project.name}`);
  await login(page, staff.email);

  for (const path of ["/dashboard", "/customers", "/transactions", "/bank-transfers", "/services", "/settings"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("main")).toBeVisible();
  }

  for (const path of ["/inventory", "/categories", "/suppliers", "/funds", "/fund-mutations", "/finance", "/reports"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard/);
  }
});

test("mobile burger opens role-aware sidebar drawer", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name !== "mobile", "Mobile drawer is only visible on mobile viewport");

  await login(page);
  await page.goto("/dashboard");

  const menuButton = page.getByRole("button", { name: "Buka menu" });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("link", { name: "Inventori" })).toHaveCount(0);

  await menuButton.evaluate((element: HTMLElement) => element.click());
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Pengaturan" })).toBeVisible();

  await page.getByRole("link", { name: "Inventori" }).evaluate((element: HTMLElement) => element.click());
  await expect(page).toHaveURL(/\/inventory/);
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");

  await menuButton.evaluate((element: HTMLElement) => element.click());
  await page.getByRole("button", { name: "Keluar" }).evaluate((element: HTMLElement) => element.click());

  const staff = await createStaff(`drawer-staff-${Date.now()}-${testInfo.project.name}`);
  await login(page, staff.email);
  await page.getByRole("button", { name: "Buka menu" }).click();

  for (const name of ["Inventori", "Kategori", "Supplier", "Sumber Dana", "Mutasi Saldo", "Keuangan", "Laporan"]) {
    await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
  }
  for (const name of ["Dasbor", "Pelanggan", "Transaksi", "MiniATM", "Service", "Pengaturan"]) {
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }
});
test("admin sees balance audit and staff cannot open activity history", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Audit mutation test runs once");
  const marker = `audit-${Date.now()}`;
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@adicom99.com" } });
  const outlet = admin.outletId
    ? await prisma.outlet.findUniqueOrThrow({ where: { id: admin.outletId } })
    : await prisma.outlet.findFirstOrThrow({ orderBy: { name: "asc" } });
  const fund = await prisma.fundAccount.findFirstOrThrow({ where: { outletId: outlet.id, isActive: true }, orderBy: [{ type: "asc" }, { name: "asc" }] });
  const balanceBefore = fund.balance;
  const staff = await createStaff(`${marker}-staff`);
  let mutationId: number | undefined;

  try {
    await login(page);
    await page.goto("/fund-mutations");
    await page.getByLabel("Ke Sumber Dana").selectOption(String(fund.id));
    await page.getByLabel("Nominal").fill("1000");
    await page.getByPlaceholder("Keterangan mutasi").fill(marker);
    await page.getByRole("button", { name: "Simpan Tambah" }).click();
    await expect(page.getByText("Mutasi saldo disimpan")).toBeVisible();

    const mutation = await prisma.fundMutation.findFirstOrThrow({ where: { note: marker }, orderBy: { id: "desc" } });
    mutationId = mutation.id;
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entity: "fund_mutation", entityId: mutation.id }, orderBy: { id: "desc" } });
    expect(audit.outletId).toBe(outlet.id);
    expect(audit.userId).toBe(admin.id);
    expect(audit.metadata).toMatchObject({ mode: "Tambah", amount: 1000 });

    await page.goto("/settings/activity");
    await expect(page.getByRole("heading", { name: "Riwayat Aktivitas" })).toBeVisible();
    await expect(page.getByText("Mutasi saldo").first()).toBeVisible();

    await page.context().clearCookies();
    await login(page, staff.email);
    await page.goto("/settings/activity");
    await expect(page).toHaveURL(/\/dashboard/);
  } finally {
    if (mutationId) {
      await prisma.auditLog.deleteMany({ where: { entity: "fund_mutation", entityId: mutationId } });
      await prisma.fundMutation.deleteMany({ where: { id: mutationId } });
      await prisma.fundAccount.update({ where: { id: fund.id }, data: { balance: balanceBefore } });
    }
    await prisma.auditLog.deleteMany({ where: { userId: staff.id } });
    await prisma.userPermission.deleteMany({ where: { userId: staff.id } });
    await prisma.user.deleteMany({ where: { id: staff.id } });
  }
});
test("audit date range controls are clearly labeled", async ({ page }) => {
  await login(page);
  await page.goto("/settings/activity", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("group", { name: "Rentang tanggal" })).toBeVisible();
  await expect(page.locator('header select[name="outletId"]')).toHaveCount(0);
  await expect(page.getByLabel("Dari tanggal")).toBeVisible();
  await expect(page.getByLabel("Sampai tanggal")).toBeVisible();
  await expect(page.getByRole("button", { name: "Terapkan" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reset" })).toBeVisible();
});
