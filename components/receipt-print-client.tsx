"use client";

import { Bluetooth, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

type Bank = { id: number; bankName: string; accountName: string; accountNumber: string };
type Transfer = { id: number; code: string; sourceName: string; destinationBank: string; accountName: string; accountNumber: string; amount: number; adminBank: number; adminLoket: number; createdAt: string };
type Setting = { storeName: string; address: string | null; footer: string | null; logo: string | null };
type Form = { senderBank: string; senderName: string; senderAccount: string; receiverBank: string; receiverName: string; receiverAccount: string; date: string; time: string; amount: number; adminBank: number; adminLoket: number; footer: string };

type Characteristic = { properties: { writeWithoutResponse?: boolean }; writeValueWithoutResponse(value: BufferSource): Promise<void>; writeValue(value: BufferSource): Promise<void> };
type Service = { getCharacteristic(uuid: string): Promise<Characteristic> };
type Server = { getPrimaryService(uuid: string): Promise<Service> };
type Device = { name?: string; gatt?: { connect(): Promise<Server> } };
type BluetoothApi = { requestDevice(options: { acceptAllDevices: boolean; optionalServices: string[] }): Promise<Device> };

const services = ["000018f0-0000-1000-8000-00805f9b34fb", "49535343-fe7d-4ae5-8fa9-9fafd205e455", "e7810a71-73ae-499d-8c15-faa9aef0c3f2"];
const characteristics = ["00002af1-0000-1000-8000-00805f9b34fb", "49535343-8841-43f4-a8d4-ecbe34729bb3", "e7810a71-73ae-499d-8c15-faa9aef0c3f2"];
function initialReceiptForm(footer: string): Form {
  const current = new Date();
  return { senderBank: "", senderName: "", senderAccount: "", receiverBank: "", receiverName: "", receiverAccount: "", date: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`, time: current.toTimeString().slice(0, 5), amount: 0, adminBank: 0, adminLoket: 0, footer };
}

export function ReceiptPrintClient({ banks, transfers, setting, printFormat }: { banks: Bank[]; transfers: Transfer[]; setting: Setting; printFormat: string }) {
  const [printing, setPrinting] = useState(false);
  const [form, setForm] = useState<Form>(() => initialReceiptForm(setting.footer || "Terima kasih atas kepercayaan Anda"));
  const total = useMemo(() => form.amount + form.adminBank + form.adminLoket, [form]);
  const chooseBank = (value: string) => { const bank = banks.find((item) => item.id === Number(value)); if (bank) setForm({ ...form, senderBank: bank.bankName, senderName: bank.accountName, senderAccount: bank.accountNumber }); };
  const chooseTransfer = (value: string) => {
    const transfer = transfers.find((item) => item.id === Number(value));
    if (!transfer) return;
    const bank = banks.find((item) => item.bankName.toLowerCase() === transfer.sourceName.toLowerCase());
    const date = new Date(transfer.createdAt);
    setForm({ ...form, senderBank: bank?.bankName || transfer.sourceName, senderName: bank?.accountName || "", senderAccount: bank?.accountNumber || "", receiverBank: transfer.destinationBank, receiverName: transfer.accountName, receiverAccount: transfer.accountNumber, amount: transfer.amount, adminBank: transfer.adminBank, adminLoket: transfer.adminLoket, date: date.toISOString().slice(0, 10), time: date.toTimeString().slice(0, 5) });
  };
  const validate = () => {
    if (!form.senderBank || !form.senderName || !form.senderAccount || !form.receiverBank || !form.receiverName || !form.receiverAccount || form.amount <= 0) { toast.error("Lengkapi data pengirim, penerima, dan nominal"); return false; }
    return true;
  };
  const browserPrint = () => { if (validate()) window.print(); };
  const bluetoothPrint = async () => {
    if (!validate()) return;
    const bluetooth = (navigator as Navigator & { bluetooth?: BluetoothApi }).bluetooth;
    if (!bluetooth) { toast.error("Web Bluetooth tidak didukung. Gunakan Chrome atau Edge melalui HTTPS."); return; }
    setPrinting(true);
    try {
      const device = await bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: services });
      if (!device.gatt) throw new Error("Printer tidak memiliki koneksi GATT");
      const server = await device.gatt.connect();
      let service: Service | undefined;
      for (const uuid of services) { try { service = await server.getPrimaryService(uuid); break; } catch {} }
      if (!service) throw new Error("Service printer tidak ditemukan");
      let characteristic: Characteristic | undefined;
      for (const uuid of characteristics) { try { characteristic = await service.getCharacteristic(uuid); break; } catch {} }
      if (!characteristic) throw new Error("Karakteristik tulis printer tidak ditemukan");
      const bytes = buildEscPos(form, setting.storeName, setting.address, total);
      for (let offset = 0; offset < bytes.length; offset += 100) {
        const chunk = bytes.slice(offset, offset + 100) as unknown as BufferSource;
        if (characteristic.properties.writeWithoutResponse) await characteristic.writeValueWithoutResponse(chunk);
        else await characteristic.writeValue(chunk);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      toast.success(`Struk dikirim ke ${device.name || "printer"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mencetak lewat Bluetooth");
    } finally { setPrinting(false); }
  };
  return <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5"><h2 className="font-semibold">Form Cetak Struk Transfer</h2><p className="mt-1 text-sm text-slate-500">Pilih transaksi MiniATM atau isi manual.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pilih Transaksi MiniATM"><Select defaultValue="" onChange={(e) => chooseTransfer(e.target.value)}><option value="">Input manual</option>{transfers.map((item) => <option key={item.id} value={item.id}>{item.code} - {formatCurrency(item.amount)}</option>)}</Select></Field>
        <Field label="Pilih dari Master Bank"><Select defaultValue="" onChange={(e) => chooseBank(e.target.value)}><option value="">Input manual</option>{banks.map((item) => <option key={item.id} value={item.id}>{item.bankName} - {item.accountNumber}</option>)}</Select></Field>
        <div className="sm:col-span-2 border-t border-slate-200 pt-4"><h3 className="font-semibold">Data Pengirim</h3></div>
        <Field label="Nama Bank Pengirim"><Input value={form.senderBank} onChange={(e) => setForm({ ...form, senderBank: e.target.value })} /></Field><Field label="Nama Pemilik Rekening"><Input value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} /></Field><Field label="Nomor Rekening Pengirim"><Input value={form.senderAccount} onChange={(e) => setForm({ ...form, senderAccount: e.target.value })} /></Field>
        <div className="sm:col-span-2 border-t border-slate-200 pt-4"><h3 className="font-semibold">Data Penerima</h3></div>
        <Field label="Nama Bank Penerima"><Input value={form.receiverBank} onChange={(e) => setForm({ ...form, receiverBank: e.target.value })} /></Field><Field label="Nama Pemilik Rekening"><Input value={form.receiverName} onChange={(e) => setForm({ ...form, receiverName: e.target.value })} /></Field><Field label="Nomor Rekening Penerima"><Input value={form.receiverAccount} onChange={(e) => setForm({ ...form, receiverAccount: e.target.value })} /></Field>
        <div className="sm:col-span-2 border-t border-slate-200 pt-4"><h3 className="font-semibold">Detail Transaksi</h3></div>
        <Field label="Tanggal Struk"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><Field label="Jam Struk"><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field><Field label="Nominal Transfer"><CurrencyInput value={form.amount} onChange={(amount) => setForm({ ...form, amount })} /></Field><Field label="Admin Bank"><CurrencyInput value={form.adminBank} onChange={(adminBank) => setForm({ ...form, adminBank })} /></Field><Field label="Admin Loket"><CurrencyInput value={form.adminLoket} onChange={(adminLoket) => setForm({ ...form, adminLoket })} /></Field><Field label="Total"><Input readOnly value={formatCurrency(total)} /></Field><div className="sm:col-span-2"><Field label="Footer"><Textarea value={form.footer} onChange={(e) => setForm({ ...form, footer: e.target.value })} /></Field></div>
      </div>
    </section>
    <aside className="space-y-4"><div id="receipt-print" className={`receipt-paper ${printFormat === "thermal_58" ? "print-thermal-58 max-w-[220px]" : "print-thermal-80 max-w-[320px]"} mx-auto w-full bg-white p-5 text-[12px] text-black shadow-sm`}><div className="text-center">{setting.logo ? <img src={setting.logo} alt="Logo toko" className="mx-auto mb-2 max-h-12 max-w-24 object-contain" /> : null}<p className="font-bold">STRUK TRANSFER</p><p className="font-bold">{setting.storeName}</p><p>{setting.address}</p><p>================================</p></div><p>{form.date} {form.time}</p><p>--------------------------------</p><p className="font-bold">PENGIRIM</p><Line label="Bank" value={form.senderBank} /><Line label="Nama" value={form.senderName} /><Line label="Rekening" value={form.senderAccount} /><p>--------------------------------</p><p className="font-bold">PENERIMA</p><Line label="Bank" value={form.receiverBank} /><Line label="Nama" value={form.receiverName} /><Line label="Rekening" value={form.receiverAccount} /><p>--------------------------------</p><Line label="Nominal" value={formatCurrency(form.amount)} /><Line label="Adm Bank" value={formatCurrency(form.adminBank)} /><Line label="Adm Jasa" value={formatCurrency(form.adminLoket)} /><p>--------------------------------</p><Line label="TOTAL" value={formatCurrency(total)} bold /><p className="mt-3 text-center">{form.footer}</p></div><div className="no-print grid grid-cols-2 gap-3"><Button type="button" variant="outline" onClick={browserPrint}><Printer className="h-4 w-4" />Browser</Button><Button type="button" onClick={bluetoothPrint} disabled={printing}><Bluetooth className="h-4 w-4" />{printing ? "Mengirim..." : "Bluetooth"}</Button></div></aside>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) { return <div className={`flex justify-between gap-3 ${bold ? "font-bold" : ""}`}><span>{label}</span><span className="text-right">{value || "-"}</span></div>; }
function buildEscPos(form: Form, storeName: string, address: string | null, total: number) {
  const ESC = 0x1b, GS = 0x1d;
  const bytes: number[] = [ESC, 0x40, ESC, 0x61, 0x01];
  const add = (text: string) => bytes.push(...new TextEncoder().encode(`${text}\n`));
  add("================================"); bytes.push(ESC, 0x45, 0x01); add("STRUK TRANSFER"); add(storeName); bytes.push(ESC, 0x45, 0x00); if (address) add(address); add("================================"); bytes.push(ESC, 0x61, 0x00); add(`${form.date} ${form.time}`); add("--------------------------------"); bytes.push(ESC, 0x45, 0x01); add("PENGIRIM"); bytes.push(ESC, 0x45, 0x00); add(`Bank     : ${form.senderBank}`); add(`Nama     : ${form.senderName}`); add(`Rekening : ${form.senderAccount}`); add("--------------------------------"); bytes.push(ESC, 0x45, 0x01); add("PENERIMA"); bytes.push(ESC, 0x45, 0x00); add(`Bank     : ${form.receiverBank}`); add(`Nama     : ${form.receiverName}`); add(`Rekening : ${form.receiverAccount}`); add("--------------------------------"); add(`Nominal  : ${formatCurrency(form.amount)}`); add(`Adm Bank : ${formatCurrency(form.adminBank)}`); add(`Adm Jasa : ${formatCurrency(form.adminLoket)}`); add("--------------------------------"); bytes.push(ESC, 0x45, 0x01); add(`TOTAL    : ${formatCurrency(total)}`); bytes.push(ESC, 0x45, 0x00, ESC, 0x61, 0x01); add("================================"); add(form.footer); bytes.push(0x0a, 0x0a, 0x0a, GS, 0x56, 0x00); return new Uint8Array(bytes);
}