import { expect, test } from "@playwright/test";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DEFAULT_STAFF_PERMISSIONS } from "@/lib/permission-keys";

async function login(page: import("@playwright/test").Page, email = "admin@adicom99.com") {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("password123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("login password visibility can be toggled", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true");
  const password = page.locator('input[name="password"]');
  await password.fill("password123");
  await expect(password).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Lihat kata sandi" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("password123");

  await page.getByRole("button", { name: "Sembunyikan kata sandi" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

test("login returns accessible field validation errors", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true");
  await page.locator("form").evaluate((form: HTMLFormElement) => { form.noValidate = true; });
  await page.locator('input[name="email"]').fill("email-tidak-valid");
  await page.locator('input[name="password"]').fill("123");
  await page.locator('button[type="submit"]').click();

  await expect(page.locator('input[name="email"]')).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#login-email-error")).toHaveText("Email tidak valid");
  await expect(page.locator('input[name="password"]')).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#login-password-error")).toHaveText("Kata sandi minimal 6 karakter");
});
test("login remembers email without storing password", async ({ page }) => {
  const email = `remember-${Date.now()}@example.com`;
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("password-salah");
  await page.getByRole("checkbox", { name: "Ingat email saya" }).check();
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.locator('form [role="alert"]')).toContainText("Email atau kata sandi salah");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("pospintar_remember_email"))).toBe(email);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true");
  await expect(page.locator('input[name="email"]')).toHaveValue(email);
  await expect(page.getByRole("checkbox", { name: "Ingat email saya" })).toBeChecked();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("pospintar_remember_email"))).toBe(email);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("pospintar_remember_password"))).toBeNull();

  await page.locator('input[name="password"]').fill("password-salah");
  await page.getByRole("checkbox", { name: "Ingat email saya" }).uncheck();
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("pospintar_remember_email"))).toBeNull();
});

test("login shows a stable loading state", async ({ page }) => {
  let requestReached!: () => void;
  let releaseRequest!: () => void;
  const reached = new Promise<void>((resolve) => { requestReached = resolve; });

  await page.route("**/login", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    requestReached();
    await new Promise<void>((resolve) => { releaseRequest = resolve; });
    await route.continue();
  });

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(`loading-${Date.now()}@example.com`);
  await page.locator('input[name="password"]').fill("password-salah");
  const submit = page.locator('button[type="submit"]');
  const submission = submit.click();
  await reached;
  await expect(submit).toBeDisabled();
  await expect(submit).toContainText("Memeriksa...");
  releaseRequest();
  await submission;
  await expect(page.locator('form [role="alert"]')).toContainText("Email atau kata sandi salah");
});

test("login keyboard order and minimum mobile viewport remain accessible", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const email = page.locator('input[name="email"]');
  const password = page.locator('input[name="password"]');
  const passwordToggle = page.getByRole("button", { name: "Lihat kata sandi" });
  const remember = page.getByRole("checkbox", { name: "Ingat email saya" });
  const submit = page.locator('button[type="submit"]');

  if (testInfo.project.name !== "mobile") {
  await expect(email).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(password).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(passwordToggle).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(remember).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(submit).toBeFocused();
  }

  await page.setViewportSize({ width: 320, height: 568 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(email).not.toBeFocused();
  await submit.click();
  await expect(email).toBeFocused();
  await email.fill(`mobile-${Date.now()}@example.com`);
  await password.fill("password-salah");
  await submit.click();
  await expect(page.locator('form [role="alert"]')).toContainText("Email atau kata sandi salah");

  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
    mainScrollHeight: document.querySelector("main")?.scrollHeight ?? 0
  }));
  expect(dimensions.documentWidth).toBe(dimensions.viewportWidth);
  expect(dimensions.documentHeight).toBe(dimensions.viewportHeight);
  expect(dimensions.mainScrollHeight).toBeLessThanOrEqual(dimensions.viewportHeight);
});

test("health endpoint reports application and database readiness", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ status: "ok" });
});

async function createStaff(suffix: string) {
  const staffRole = await prisma.role.findUniqueOrThrow({ where: { name: "staff" } });
  const outlet = await prisma.outlet.findFirstOrThrow({ orderBy: { id: "asc" } });
  return prisma.user.create({
    data: {
      name: suffix,
      email: `${suffix}@example.com`,
      passwordHash: await hash("password123", 10),
      roleId: staffRole.id,
      permissions: { create: DEFAULT_STAFF_PERMISSIONS.map((key) => ({ key })) },
      outletId: outlet.id
    }
  });
}

test("admin can open the main operational pages", async ({ page }) => {
  test.setTimeout(150_000);
  await login(page);
  for (const path of ["/dashboard", "/inventory", "/categories", "/suppliers", "/customers", "/transactions", "/bank-transfers", "/funds", "/fund-mutations", "/services", "/receivables", "/receipts", "/receipts/banks", "/receipts/settings", "/finance", "/payroll", "/reports", "/settings/store", "/settings/access", "/settings/activity", "/settings/data"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("main")).toBeVisible();
  }
});

test("sidebar only marks the most specific receipt route active", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop navigation check runs once");
  await login(page);
  await page.goto("/receipts/settings");

  const activeLinks = page.locator('#desktop-navigation nav a[aria-current="page"]');
  await expect(activeLinks).toHaveCount(1);
  await expect(activeLinks).toHaveAttribute("href", "/receipts/settings");
  await expect(activeLinks).toHaveText("Pengaturan Struk");
});

test("MiniATM processes a transfer and fund mutations atomically", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Mutation smoke test runs once");
  const marker = `mini-atm-${Date.now()}`;
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@adicom99.com" } });
  const outlet = admin.outletId
    ? await prisma.outlet.findUniqueOrThrow({ where: { id: admin.outletId } })
    : await prisma.outlet.findFirstOrThrow({ orderBy: { name: "asc" } });
  const bri = await prisma.fundAccount.findFirstOrThrow({ where: { outletId: outlet.id, name: "BRI", isActive: true } });
  const laci = await prisma.fundAccount.findFirstOrThrow({ where: { outletId: outlet.id, name: "LACI", isActive: true } });
  const briBalance = bri.balance;
  const laciBalance = laci.balance;
  let transferId: number | undefined;

  try {
    await prisma.fundAccount.update({ where: { id: bri.id }, data: { balance: Number(bri.balance) + 200_000 } });
    await login(page);
    await page.goto("/bank-transfers");
    await page.getByRole("button", { name: "Tambah Transaksi" }).click();
    await page.getByLabel("Sumber Dana", { exact: true }).selectOption(String(bri.id));
    await page.getByLabel("Terima Dana").selectOption(String(laci.id));
    await page.getByLabel("Bank Tujuan").fill("BCA");
    await page.getByLabel("Nominal", { exact: true }).fill("100000");
    await page.getByLabel("Admin Loket").fill("5000");
    await page.getByLabel("Catatan").fill(marker);
    await page.getByRole("button", { name: "Proses", exact: true }).click();
    await expect(page.getByText("MiniATM berhasil diproses")).toBeVisible();

    const transfer = await prisma.bankTransfer.findFirstOrThrow({ where: { note: marker }, orderBy: { id: "desc" } });
    transferId = transfer.id;
    expect(transfer.status).toBe("Berhasil");
    expect(Number(transfer.totalReceived)).toBe(105000);
    expect(await prisma.fundMutation.count({ where: { bankTransferId: transfer.id, referenceType: "bank_transfer" } })).toBe(2);
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
  test.setTimeout(150_000);
  const staff = await createStaff(`staff-${Date.now()}-${testInfo.project.name}`);
  await login(page, staff.email);

  for (const path of ["/dashboard", "/customers", "/transactions", "/bank-transfers", "/services", "/settings/data"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`${path.replace("?", "\\?")}$`));
    await expect(page.getByRole("main")).toBeVisible();
  }

  for (const path of ["/inventory", "/categories", "/suppliers", "/funds", "/fund-mutations", "/finance", "/reports", "/receivables", "/receipts", "/payroll", "/settings/store", "/settings/access", "/settings/activity"]) {
    await page.evaluate((target) => { window.location.href = target; }, path);
    await expect(page).toHaveURL(/\/dashboard$/);
  }

  const activity = page.getByLabel("Aktivitas Hari Ini");
  await expect(activity.getByText("Penjualan Hari Ini", { exact: true })).toBeVisible();
  await expect(activity.getByText("Transaksi Fisik", { exact: true })).toBeVisible();
  await expect(activity.getByText("Service Dibayar", { exact: true })).toBeVisible();
  await expect(activity.getByText("Transfer Dana", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lihat ringkasan cabang" })).toBeVisible();
  await expect(page.getByText(/Laba bersih/i)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto(`/dashboard/cabang/${staff.outletId}`);
  await expect(page.getByText("Total Transaksi", { exact: true })).toBeVisible();
  await expect(page.getByText("Profit Kotor", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Profit Bersih", { exact: true })).toHaveCount(0);
  await page.goto("/bank-transfers");
  await expect(page.getByText("Estimasi Profit", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Transaksi oleh")).toHaveCount(0);
});
test("staff dashboard stays idle and loads notifications on demand", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Cukup diverifikasi pada satu browser");
  const staff = await createStaff(`idle-${Date.now()}`);
  await prisma.userPermission.deleteMany({ where: { userId: staff.id, key: "dashboard.view" } });
  let dashboardGets = 0;
  let eventGets = 0;
  page.on("request", (request) => {
    if (request.method() !== "GET") return;
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/dashboard") dashboardGets += 1;
    if (pathname === "/api/events") eventGets += 1;
  });

  try {
    await login(page, staff.email);
    await expect(page.getByRole("link", { name: "Dasbor" })).toBeVisible();
    await expect(page.getByText("Cabang Saya")).toBeVisible();
    await expect(page.getByTitle("Notifikasi")).toBeVisible();
    dashboardGets = 0;
    eventGets = 0;
    await page.waitForTimeout(5_000);
    expect(dashboardGets).toBe(0);
    expect(eventGets).toBe(0);
    await page.getByTitle("Notifikasi").click();
    await expect.poll(() => eventGets).toBe(1);
    expect(dashboardGets).toBe(0);
  } finally {
    await prisma.user.delete({ where: { id: staff.id } });
  }
});
test("staff cannot open records from another outlet by URL", async ({ page }, testInfo) => {
  const staff = await createStaff(`scope-${Date.now()}-${testInfo.project.name}`);
  try {
    const [transaction, service, customer] = await Promise.all([
      prisma.transaction.findFirst({ where: { outletId: { not: staff.outletId } }, select: { id: true, kodeTransaksi: true } }),
      prisma.service.findFirst({ where: { outletId: { not: staff.outletId } }, select: { id: true, kodeService: true } }),
      prisma.customer.findFirst({ where: { outlets: { none: { outletId: staff.outletId! } } }, select: { id: true, name: true } })
    ]);
    const targets = [
      transaction ? { path: `/transactions/${transaction.id}`, marker: transaction.kodeTransaksi } : null,
      transaction ? { path: `/transactions/${transaction.id}/invoice`, marker: transaction.kodeTransaksi } : null,
      service ? { path: `/services/${service.id}`, marker: service.kodeService } : null,
      service ? { path: `/services/${service.id}/invoice`, marker: service.kodeService } : null,
      customer ? { path: `/customers/${customer.id}`, marker: customer.name } : null
    ].filter((target): target is { path: string; marker: string } => Boolean(target));
    expect(targets.length).toBeGreaterThan(0);

    await login(page, staff.email);
    for (const target of targets) {
      const response = await page.request.get(target.path);
      const body = await response.text();
      expect(body, target.path).not.toContain(target.marker);
    }
  } finally {
    await prisma.auditLog.deleteMany({ where: { userId: staff.id } });
    await prisma.userPermission.deleteMany({ where: { userId: staff.id } });
    await prisma.user.deleteMany({ where: { id: staff.id } });
  }
});

test("mobile burger opens role-aware sidebar drawer", async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  test.skip(testInfo.project.name !== "mobile", "Mobile drawer is only visible on mobile viewport");

  await login(page);
  await page.goto("/dashboard");

  const menuButton = page.getByRole("button", { name: "Buka menu" });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("link", { name: "Inventori" })).toHaveCount(0);

  await menuButton.evaluate((element: HTMLElement) => element.click());
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#mobile-navigation summary").filter({ hasText: "Pengaturan" })).toBeVisible();

  await page.locator("#mobile-navigation summary").filter({ hasText: "Kelola Data" }).evaluate((element: HTMLElement) => element.click());
  await page.getByRole("link", { name: "Inventori" }).evaluate((element: HTMLElement) => element.click());
  await expect(page).toHaveURL(/\/inventory/);
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");

  await menuButton.evaluate((element: HTMLElement) => element.click());
  await page.getByRole("button", { name: "Keluar" }).evaluate((element: HTMLElement) => element.click());

  const staff = await createStaff(`drawer-staff-${Date.now()}-${testInfo.project.name}`);
  await login(page, staff.email);
  await page.getByRole("button", { name: "Buka menu" }).click();

  for (const name of ["Inventori", "Kategori", "Supplier", "Saldo Awal", "Pindah Saldo", "Catat Hutang", "Cetak Struk", "Penggajian Pegawai", "Kelola Toko", "Riwayat Aktivitas", "Laporan Transaksi"]) {
    await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
  }
  for (const name of ["Dasbor", "MiniATM", "Service"]) {
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await page.locator("#mobile-navigation summary").filter({ hasText: "Kelola Data" }).evaluate((element: HTMLElement) => element.click());
  await expect(page.getByRole("link", { name: "Transaksi Fisik", exact: true })).toBeVisible();
  await page.locator("#mobile-navigation summary").filter({ hasText: "Utang Piutang" }).evaluate((element: HTMLElement) => element.click());
  await expect(page.getByRole("link", { name: "Pelanggan", exact: true })).toBeVisible();
  await page.locator("#mobile-navigation summary").filter({ hasText: "Pengaturan" }).evaluate((element: HTMLElement) => element.click());
  await expect(page.getByRole("link", { name: "Backup Data", exact: true })).toBeVisible();

  await prisma.auditLog.deleteMany({ where: { userId: staff.id } });
  await prisma.userPermission.deleteMany({ where: { userId: staff.id } });
  await prisma.user.delete({ where: { id: staff.id } });
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
  await prisma.userPermission.createMany({
    data: ["fundMutations.view", "fundMutations.manage"].map((key) => ({ userId: staff.id, key })),
    skipDuplicates: true
  });
  let mutationId: number | undefined;

  try {
    await login(page, staff.email);
    await page.goto("/fund-mutations");
    await page.getByRole("button", { name: "Tambah Saldo" }).click();
    await page.getByLabel("Ke Sumber Dana").selectOption(String(fund.id));
    await page.getByLabel("Nominal").fill("1000");
    await page.getByPlaceholder("Keterangan mutasi").fill(marker);
    await page.getByRole("button", { name: "Simpan Tambah" }).click();
    await expect(page.getByText("Mutasi saldo disimpan")).toBeVisible();

    const mutation = await prisma.fundMutation.findFirstOrThrow({ where: { note: marker }, orderBy: { id: "desc" } });
    mutationId = mutation.id;
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entity: "fund_mutation", entityId: mutation.id }, orderBy: { id: "desc" } });
    expect(audit.outletId).toBe(outlet.id);
    expect(audit.userId).toBe(staff.id);
    expect(audit.metadata).toMatchObject({ mode: "Tambah", amount: 1000 });

    await page.goto("/settings/activity");
    await expect(page).toHaveURL(/\/dashboard/);
    await page.context().clearCookies();
    await login(page);
    await page.goto("/settings/activity");
    await expect(page.getByRole("main").getByRole("heading", { name: "Riwayat Aktivitas" })).toBeVisible();
    await expect(page.locator("tbody").getByText("Mutasi saldo").first()).toBeVisible();
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
test("editing a current balance records an adjustment and preserves opening balance", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Balance adjustment test runs once");
  const marker = `adjustment-${Date.now()}`;
  const startedAt = new Date();
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@adicom99.com" } });
  const outlet = admin.outletId
    ? await prisma.outlet.findUniqueOrThrow({ where: { id: admin.outletId } })
    : await prisma.outlet.findFirstOrThrow({ orderBy: { name: "asc" } });
  const fund = await prisma.fundAccount.findFirstOrThrow({ where: { outletId: outlet.id, isActive: true }, orderBy: { id: "asc" } });
  const balanceBefore = Number(fund.balance);
  const balanceAfter = balanceBefore + 1234;
  let mutationId: number | undefined;

  try {
    await login(page);
    await page.goto("/funds");
    await page.getByRole("button", { name: `Buka detail ${fund.name}` }).click();
    await page.getByLabel("Saldo Sekarang").fill(String(balanceAfter));
    await page.getByLabel("Alasan Penyesuaian").fill(marker);
    await page.getByRole("button", { name: "Simpan Perubahan" }).click();
    await expect(page.getByText("Sumber dana diperbarui")).toBeVisible();

    const mutation = await prisma.fundMutation.findFirstOrThrow({ where: { fundAccountId: fund.id, referenceType: "manual_adjustment", note: marker }, orderBy: { id: "desc" } });
    mutationId = mutation.id;
    expect(mutation.type).toBe("Adjustment");
    expect(Number(mutation.balanceBefore)).toBe(balanceBefore);
    expect(Number(mutation.balanceAfter)).toBe(balanceAfter);
    const updated = await prisma.fundAccount.findUniqueOrThrow({ where: { id: fund.id } });
    expect(Number(updated.balance)).toBe(balanceAfter);
    expect(updated.openingBalance.toString()).toBe(fund.openingBalance.toString());
  } finally {
    if (mutationId) await prisma.fundMutation.deleteMany({ where: { id: mutationId } });
    await prisma.fundAccount.update({ where: { id: fund.id }, data: { balance: fund.balance } });
    await prisma.auditLog.deleteMany({ where: { userId: admin.id, entity: "fund_account", entityId: fund.id, createdAt: { gte: startedAt } } });
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
test("admin opens the branch summary and monthly report from an outlet card", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const outletCards = page.locator('a[href^="/dashboard/cabang/"]');
  await expect(outletCards.first()).toBeVisible();
  const cardColors = await outletCards.evaluateAll((cards) => cards.map((card) => getComputedStyle(card).borderTopColor));
  expect(new Set(cardColors).size).toBeGreaterThan(1);
  const outletCard = outletCards.first();
  await outletCard.click();
  await expect(page).toHaveURL(/\/dashboard\/cabang\/\d+$/);

  for (const label of ["Total Transaksi", "Omset", "Profit Kotor", "Potongan Bank + Ops", "Pengeluaran", "Profit Bersih", "Aset Cash", "Aset Saldo", "Total Aset"]) {
    await expect(page.locator("main").getByText(label, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByLabel("Transaksi oleh")).toBeVisible();
  await expect(page.getByRole("link", { name: "Laporan Bulanan" })).toBeVisible();
  await page.getByRole("link", { name: "Laporan Bulanan" }).click();
  await expect(page).toHaveURL(/\/dashboard\/cabang\/\d+\/bulanan/);

  const previousYear = String(new Date().getFullYear() - 1);
  await page.getByLabel("Bulan").selectOption("1");
  await page.getByLabel("Tahun").selectOption(previousYear);
  await page.getByRole("button", { name: "Terapkan" }).click();
  await expect(page).toHaveURL(new RegExp(`tahun=${previousYear}`));
  await expect(page.getByRole("heading", { name: "Grafik Laporan Bulanan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ringkasan Harian" })).toBeVisible();
  for (const label of ["Profit Kotor", "Potongan Bank", "Operasional"]) {
    await expect(page.locator("main").getByText(label, { exact: true }).first()).toBeVisible();
  }
  const profitToggle = page.getByRole("button", { name: "Profit", exact: true });
  await expect(profitToggle).toHaveAttribute("aria-pressed", "true");
  await profitToggle.click();
  await expect(profitToggle).toHaveAttribute("aria-pressed", "false");
});
test("annual outlet report is scoped and export follows permission", async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const outlet = await prisma.outlet.findFirstOrThrow({ orderBy: { id: "asc" } });
  const staff = await createStaff(`annual-${Date.now()}-${testInfo.project.name}`);

  try {
    await login(page);
    await page.goto(`/dashboard/cabang/${outlet.id}`);
    await page.getByRole("link", { name: "Laporan Tahunan" }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/cabang/${outlet.id}/tahunan`));
    await expect(page.getByText(`Statistik Profit Tahun ${new Date().getFullYear()}`)).toBeVisible();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(14);

    const toggle = page.getByRole("button", { name: "Potongan Bank" });
    const december = page.getByText("Desember", { exact: true }).last();
    const [toggleBox, decemberBox] = await Promise.all([toggle.boundingBox(), december.boundingBox()]);
    expect(toggleBox?.y).toBeGreaterThanOrEqual((decemberBox?.y ?? 0) + (decemberBox?.height ?? 0) + 8);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    const exportHref = await page.getByRole("link", { name: "Unduh Excel" }).getAttribute("href");
    expect(exportHref).toBeTruthy();
    const exportResponse = await page.request.get(exportHref!);
    expect(exportResponse.ok()).toBe(true);
    expect(exportResponse.headers()["content-disposition"]).toMatch(/laporan-tahunan-.*\.xls"/);

    await page.context().clearCookies();
    await login(page, staff.email);
    await page.goto(`/dashboard/cabang/${outlet.id}/tahunan`);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(`Statistik Profit Tahun ${new Date().getFullYear()}`)).toHaveCount(0);
    await page.goto(`/dashboard/cabang/${outlet.id}/tahunan/export`);
    await expect(page).toHaveURL(/\/dashboard$/);
  } finally {
    await prisma.auditLog.deleteMany({ where: { userId: staff.id } });
    await prisma.userPermission.deleteMany({ where: { userId: staff.id } });
    await prisma.user.deleteMany({ where: { id: staff.id } });
  }
});

test("closing pecahan and new configuration controls are available", async ({ page }) => {
  await login(page);
  await page.goto("/bank-transfers");
  await page.getByRole("button", { name: "Closing Pecahan" }).click();
  await expect(page.getByRole("dialog").getByText("Total Closing")).toBeVisible();
  await page.getByLabel("Jumlah pecahan Rp 1.000").fill("2");
  await expect(page.getByRole("dialog").getByText("Rp 2.000", { exact: true }).last()).toBeVisible();
  await expect(page.getByRole("button", { name: "Kirim WhatsApp" })).toBeEnabled();
  await page.keyboard.press("Escape");

  await page.goto("/funds");
  await page.locator("section button").first().click();
  await expect(page.getByLabel("Gambar Bank / E-wallet")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/settings/store");
  await page.getByRole("button", { name: "Tambah", exact: true }).click();
  await expect(page.locator('input[type="color"]').first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/settings/data");
  await expect(page.getByRole("heading", { name: "Load Data" })).toBeVisible();
});
