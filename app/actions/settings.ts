"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getActionErrorMessage } from "@/lib/errors";
import { assertTrustedOrigin } from "@/lib/security";
import { deletePublicUpload, saveImageUpload } from "@/lib/upload";

export async function updateSettings(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    const logo = await saveImageUpload(formData.get("logoFile") as File | null, "logo");
    const existingLogo = String(formData.get("logo") || "");
    const id = Number(formData.get("id"));
    const existing = id ? await prisma.setting.findUnique({ where: { id } }) : null;
    const data = {
      storeName: String(formData.get("storeName") || "PosPintar"),
      logo: logo || existingLogo || null,
      address: String(formData.get("address") || "") || null,
      whatsapp: String(formData.get("whatsapp") || "") || null,
      email: String(formData.get("email") || "") || null,
      invoicePrefix: String(formData.get("invoicePrefix") || "INV"),
      invoiceFooter: String(formData.get("invoiceFooter") || "") || null,
      defaultPrintFormat: String(formData.get("defaultPrintFormat") || "thermal_80")
    };
    const setting = id ? await prisma.setting.update({ where: { id }, data }) : await prisma.setting.create({ data });
    if (logo) await deletePublicUpload(existingLogo);
    await writeAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: existing ? "update" : "create",
      entity: "settings",
      entityId: setting.id,
      metadata: {
        before: existing ? { storeName: existing.storeName, address: existing.address, whatsapp: existing.whatsapp, email: existing.email, invoicePrefix: existing.invoicePrefix, defaultPrintFormat: existing.defaultPrintFormat } : {},
        after: { storeName: setting.storeName, address: setting.address, whatsapp: setting.whatsapp, email: setting.email, invoicePrefix: setting.invoicePrefix, defaultPrintFormat: setting.defaultPrintFormat }
      }
    });
    revalidatePath("/settings/store");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}
