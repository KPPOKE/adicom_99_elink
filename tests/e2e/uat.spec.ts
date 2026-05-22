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

async function openDialog(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("button", { name }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.describe("UAT operational workflow", () => {
  test("admin and staff workflows update stock, finance, reports, and role access", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const suffix = `UAT-${Date.now()}-${testInfo.project.name}`;
    const categoryName = `${suffix}-Kategori`;
    const supplierName = `${suffix}-Supplier`;
    const customerName = `${suffix}-Customer`;
    const itemName = `${suffix}-Barang`;
    const itemCode = `${suffix}-BRG`;
    const staffEmail = `${suffix.toLowerCase()}-staff@example.com`;
    const staffRole = await prisma.role.findUniqueOrThrow({ where: { name: "staff" } });
    await prisma.user.create({
      data: {
        name: `${suffix}-Staff`,
        email: staffEmail,
        passwordHash: await hash("password123", 10),
        roleId: staffRole.id
      }
    });

    await login(page);

    await page.goto("/categories");
    await openDialog(page, "Tambah");
    await page.locator('input[name="name"]').fill(categoryName);
    await page.locator('textarea[name="description"]').fill("Kategori UAT otomatis");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Kategori disimpan")).toBeVisible();
    await page.reload();
    await page.locator('input[placeholder="Cari kategori..."]').fill(categoryName);
    await expect(page.getByText(categoryName)).toBeVisible();

    await page.goto("/suppliers");
    await openDialog(page, "Tambah");
    await page.locator('input[name="name"]').fill(supplierName);
    await page.locator('input[name="phone"]').fill("081200000001");
    await page.locator('textarea[name="address"]').fill("Alamat UAT");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Supplier disimpan")).toBeVisible();
    await page.reload();
    await expect(page.getByText(supplierName)).toBeVisible();

    await page.goto("/customers");
    await openDialog(page, "Tambah");
    await page.locator('input[name="name"]').fill(customerName);
    await page.locator('input[name="phone"]').fill("081200000002");
    await page.locator('input[name="email"]').fill(`${suffix.toLowerCase()}@example.com`);
    await page.locator('textarea[name="address"]').fill("Customer UAT");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Customer disimpan")).toBeVisible();
    await page.reload();
    await expect(page.getByText(customerName)).toBeVisible();

    await page.goto("/inventory");
    await openDialog(page, "Tambah Barang");
    await page.locator('input[name="namaBarang"]').fill(itemName);
    await page.locator('input[name="kodeBarang"]').fill(itemCode);
    await page.locator('select[name="categoryId"]').selectOption({ label: categoryName });
    await page.locator('select[name="supplierId"]').selectOption({ label: supplierName });
    await page.locator('input[name="hargaModal"]').fill("10000");
    await page.locator('input[name="hargaJual"]').fill("15000");
    await page.locator('input[name="stok"]').fill("5");
    await page.locator('input[name="stokMinimum"]').fill("2");
    await page.locator('input[name="satuan"]').fill("pcs");
    await page.locator('input[name="image"]').setInputFiles({
      name: `${suffix}.png`,
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64")
    });
    await page.locator('textarea[name="deskripsi"]').fill("Barang UAT otomatis");
    await page.getByRole("button", { name: "Simpan Barang" }).click();
    await expect(page.getByText("Barang disimpan")).toBeVisible();
    await page.reload();
    await expect(page.getByText(itemName)).toBeVisible();

    const itemBefore = await prisma.item.findUniqueOrThrow({ where: { kodeBarang: itemCode } });
    expect(itemBefore.stok).toBe(5);

    await page.goto("/transactions");
    await page.locator('select').first().selectOption({ label: customerName });
    await page.locator("select").nth(1).selectOption({ label: `${itemName} (5)` });
    await page.locator('input[type="number"]').nth(0).fill("2");
    await page.locator('input[type="number"]').nth(1).fill("15000");
    await page.getByText("Diskon").locator("..").locator("input").fill("0");
    await page.getByText("Dibayar").locator("..").locator("input").fill("30000");
    await page.getByRole("button", { name: "Simpan Transaksi" }).dispatchEvent("click");
    await expect.poll(async () => {
      const item = await prisma.item.findUniqueOrThrow({ where: { kodeBarang: itemCode } });
      return item.stok;
    }).toBe(3);
    const transaction = await prisma.transaction.findFirstOrThrow({
      where: { customerName },
      orderBy: { createdAt: "desc" },
      include: { financeRecords: true }
    });
    expect(transaction.status).toBe("Berhasil");
    expect(transaction.financeRecords.some((record) => record.type === "income")).toBe(true);

    await page.goto(`/transactions/${transaction.id}/invoice`);
    await expect(page.getByText(transaction.kodeTransaksi)).toBeVisible();

    await page.goto("/services");
    await openDialog(page, "Service Masuk");
    await page.locator('select[name="customerId"]').selectOption({ label: customerName });
    await page.locator('input[name="deviceType"]').fill("Laptop");
    await page.locator('input[name="deviceBrand"]').fill("UATBrand");
    await page.locator('input[name="deviceModel"]').fill("UATModel");
    await page.locator('input[name="estimatedCost"]').fill("50000");
    await page.locator('input[name="finalCost"]').fill("75000");
    await page.locator('select[name="status"]').selectOption("Selesai");
    await page.locator('textarea[name="problemDescription"]').fill("Keluhan UAT otomatis");
    await page.locator('textarea[name="diagnosis"]').fill("Diagnosa UAT");
    await page.locator('textarea[name="technicianNote"]').fill("Catatan UAT");
    await page.getByRole("button", { name: "Simpan Service" }).click();
    await expect(page.getByText("Service disimpan")).toBeVisible();

    const service = await prisma.service.findFirstOrThrow({ where: { customerName }, orderBy: { createdAt: "desc" } });
    await page.goto(`/services/${service.id}`);
    await expect(page.getByText(service.kodeService)).toBeVisible();

    await page.goto("/services");
    const serviceRow = page.getByRole("row").filter({ hasText: service.kodeService });
    await serviceRow.getByTitle("Tandai dibayar").click();
    await page.getByRole("button", { name: "Tandai Lunas" }).click();
    await expect(page.getByText("Service ditandai lunas")).toBeVisible();
    const paidService = await prisma.service.findUniqueOrThrow({ where: { id: service.id }, include: { financeRecords: true } });
    expect(paidService.paymentStatus).toBe("paid");
    expect(paidService.financeRecords.some((record) => record.type === "income")).toBe(true);

    await page.goto("/finance");
    await openDialog(page, "Catat Manual");
    await page.locator('select[name="type"]').selectOption("expense");
    await page.locator('input[name="category"]').fill(`${suffix}-Expense`);
    await page.locator('input[name="amount"]').fill("12000");
    await page.locator('textarea[name="description"]').fill("Expense UAT otomatis");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Catatan keuangan disimpan")).toBeVisible();
    expect(await prisma.financeRecord.count({ where: { category: `${suffix}-Expense` } })).toBe(1);

    await page.goto("/reports");
    for (const linkName of ["Excel Penjualan", "Excel Keuangan", "Excel Service", "Excel Stok", "PDF Laba/Rugi"]) {
      const href = await page.getByRole("link", { name: linkName }).getAttribute("href");
      expect(href).toBeTruthy();
      const response = await page.request.get(href!);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-disposition"]).toMatch(/\.(xlsx|pdf)"/);
    }

    await page.goto("/settings");
    await expect(page.getByText("Data User")).toBeVisible();

    await page.goto("/login");
    await login(page, staffEmail);
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
