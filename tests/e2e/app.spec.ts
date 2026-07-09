import { expect, test } from "@playwright/test";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function login(page: import("@playwright/test").Page, email = "admin@adicom99.com") {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("admin can open the main operational pages", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  for (const path of ["/dashboard", "/inventory", "/categories", "/suppliers", "/customers", "/transactions", "/bank-transfers", "/services", "/finance", "/reports", "/settings"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("main")).toBeVisible();
  }
});

test("bank transfer records only the admin fee as income", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Mutation smoke test runs once");
  await login(page);
  await page.goto("/bank-transfers");
  await page.locator('input[name="amount"]').first().fill("200000");
  await page.getByRole("button", { name: "Tambah Deposit" }).click();
  await expect(page.getByText("Deposit transfer disimpan")).toBeVisible();

  const accountNumber = `99${Date.now()}`;
  await page.getByLabel("Bank Tujuan").fill("BCA");
  await page.getByLabel("Nomor Rekening").fill(accountNumber);
  await page.getByLabel("Nama Pemilik Rekening").fill("Penerima Uji");
  await page.getByLabel("Nominal Transfer").fill("100000");
  await page.getByLabel("Biaya Admin").fill("5000");
  await page.getByRole("button", { name: "Simpan Transfer" }).click();
  await expect(page.getByText(accountNumber)).toBeVisible();

  const transfer = await prisma.bankTransfer.findFirstOrThrow({ where: { accountNumber }, orderBy: { id: "desc" } });
  try {
    expect(Number(transfer.totalReceived)).toBe(105000);
    await page.getByTitle("Transfer berhasil").click();
    await page.getByRole("button", { name: "Berhasil", exact: true }).click();
    await expect(page.getByText("Transfer berhasil diselesaikan")).toBeVisible();

    const finance = await prisma.financeRecord.findUniqueOrThrow({ where: { bankTransferId: transfer.id } });
    expect(Number(finance.amount)).toBe(5000);
    expect(finance.referenceType).toBe("bank_transfer");
  } finally {
    await prisma.financeRecord.deleteMany({ where: { bankTransferId: transfer.id } });
    await prisma.bankTransfer.delete({ where: { id: transfer.id } });
    await prisma.bankTransferDeposit.deleteMany({ where: { amount: 200000 } });
  }
});

test("exports and invoices respond for admin", async ({ page }) => {
  await login(page);
  const download = page.waitForEvent("download");
  await page.goto("/reports");
  await page.getByRole("link", { name: "Excel Penjualan" }).click();
  expect((await download).suggestedFilename()).toMatch(/laporan-penjualan\.(xls|xlsx)$/);

  await page.goto("/transactions/1/invoice");
  await expect(page.getByText("Kode")).toBeVisible();
  await page.goto("/services/1/invoice");
  await expect(page.getByText("Kode Service")).toBeVisible();
});

test("staff cannot access admin settings", async ({ page }, testInfo) => {
  const suffix = `staff-${Date.now()}-${testInfo.project.name}`;
  const staffRole = await prisma.role.findUniqueOrThrow({ where: { name: "staff" } });
  const staff = await prisma.user.create({
    data: {
      name: suffix,
      email: `${suffix}@example.com`,
      passwordHash: await hash("password123", 10),
      roleId: staffRole.id
    }
  });
  await login(page, staff.email);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("mobile burger opens role-aware sidebar drawer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile drawer is only visible on mobile viewport");

  await login(page);
  await page.goto("/dashboard");

  const menuButton = page.getByRole("button", { name: "Buka menu" });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("link", { name: "Inventory" })).toHaveCount(0);

  await menuButton.evaluate((element: HTMLElement) => element.click());
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();

  await page.getByRole("link", { name: "Inventory" }).evaluate((element: HTMLElement) => element.click());
  await expect(page).toHaveURL(/\/inventory/);
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");

  await menuButton.evaluate((element: HTMLElement) => element.click());
  await page.getByRole("button", { name: "Logout" }).evaluate((element: HTMLElement) => element.click());

  const suffix = `drawer-staff-${Date.now()}-${testInfo.project.name}`;
  const staffRole = await prisma.role.findUniqueOrThrow({ where: { name: "staff" } });
  const staff = await prisma.user.create({
    data: {
      name: suffix,
      email: `${suffix}@example.com`,
      passwordHash: await hash("password123", 10),
      roleId: staffRole.id
    }
  });

  await login(page, staff.email);
  await page.getByRole("button", { name: "Buka menu" }).click();
  await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Inventory" })).toBeVisible();
});
