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
  for (const path of ["/dashboard", "/inventory", "/categories", "/suppliers", "/customers", "/transactions", "/services", "/finance", "/reports", "/settings"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("main")).toBeVisible();
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

  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();

  await page.getByRole("link", { name: "Inventory" }).click();
  await expect(page).toHaveURL(/\/inventory/);
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");

  await menuButton.click();
  await page.getByRole("button", { name: "Logout" }).click();

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
