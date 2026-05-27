import { create } from "zustand";

export type LineItem = {
  itemId: number;
  qty: number;
  price: number;
};

interface CartState {
  lines: LineItem[];
  diskon: number;
  paidAmount: number;
  paymentMethod: string;
  status: string;
  customerId: number | null;
  customerName: string;
  
  // Digital
  nomorTujuan: string;
  provider: string;
  jenisProduk: string;
  serialNumber: string;
  digitalStatus: string;

  // Actions
  setLines: (lines: LineItem[] | ((prev: LineItem[]) => LineItem[])) => void;
  updateLine: (index: number, patch: Partial<LineItem>) => void;
  setDiskon: (diskon: number) => void;
  setPaidAmount: (amount: number) => void;
  setPaymentMethod: (method: string) => void;
  setStatus: (status: string) => void;
  setCustomer: (id: number | null, name: string) => void;
  setCustomerName: (name: string) => void;
  
  setDigitalFields: (fields: Partial<Pick<CartState, "nomorTujuan" | "provider" | "jenisProduk" | "serialNumber" | "digitalStatus">>) => void;
  
  resetCart: (defaultItemId?: number, defaultPrice?: number) => void;
}

export const useCartStore = create<CartState>((set) => ({
  lines: [],
  diskon: 0,
  paidAmount: 0,
  paymentMethod: "Cash",
  status: "Berhasil",
  customerId: null,
  customerName: "",
  
  nomorTujuan: "",
  provider: "",
  jenisProduk: "",
  serialNumber: "",
  digitalStatus: "Berhasil",

  setLines: (update) => set((state) => ({ lines: typeof update === "function" ? update(state.lines) : update })),
  updateLine: (index, patch) => set((state) => ({
    lines: state.lines.map((line, i) => i === index ? { ...line, ...patch } : line)
  })),
  setDiskon: (diskon) => set({ diskon }),
  setPaidAmount: (amount) => set({ paidAmount: amount }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setStatus: (status) => set({ status }),
  setCustomer: (id, name) => set({ customerId: id, customerName: name }),
  setCustomerName: (name) => set({ customerName: name }),
  
  setDigitalFields: (fields) => set((state) => ({ ...state, ...fields })),
  
  resetCart: (defaultItemId = 0, defaultPrice = 0) => set({
    lines: [{ itemId: defaultItemId, qty: 1, price: defaultPrice }],
    diskon: 0,
    paidAmount: 0,
    paymentMethod: "Cash",
    status: "Berhasil",
    customerId: null,
    customerName: "",
    nomorTujuan: "",
    provider: "",
    jenisProduk: "",
    serialNumber: "",
    digitalStatus: "Berhasil"
  })
}));
