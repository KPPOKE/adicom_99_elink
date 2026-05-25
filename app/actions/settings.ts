"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { handleActionError } from "@/lib/errors";
import { assertTrustedOrigin } from "@/lib/security";
import { deletePublicUpload, saveImageUpload } from "@/lib/upload";

export async function updateSettings(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    const logo = await saveImageUpload(formData.get("logoFile") as File | null, "logo");
    const existingLogo = String(formData.get("logo") || "");
    const id = Number(formData.get("id"));
    const data = {
      storeName: String(formData.get("storeName") || "Adicom99"),
      logo: logo || existingLogo || null,
      address: String(formData.get("address") || "") || null,
      whatsapp: String(formData.get("whatsapp") || "") || null,
      email: String(formData.get("email") || "") || null,
      invoicePrefix: String(formData.get("invoicePrefix") || "INV"),
      invoiceFooter: String(formData.get("invoiceFooter") || "") || null,
      defaultPrintFormat: String(formData.get("defaultPrintFormat") || "thermal_80")
    };
    if (id) await prisma.setting.update({ where: { id }, data });
    else await prisma.setting.create({ data });
    if (logo) await deletePublicUpload(existingLogo);
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: "update", entity: "settings", entityId: id || null });
    revalidatePath("/settings");
  } catch (error) {
    handleActionError(error);
  }
}
