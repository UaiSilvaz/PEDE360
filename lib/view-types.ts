export type ImageValue = { imageUrl: string | null; imageKey: string | null };
export type Option = {
  id: string;
  name: string;
  price: string | number;
  active: boolean;
};
export type OptionGroup = {
  id: string;
  name: string;
  min: number;
  max: number;
  required: boolean;
  options: Option[];
};
export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  imageUrl: string | null;
  imageKey?: string | null;
  active: boolean;
  featured: boolean;
  categoryId: string | null;
  optionGroups: OptionGroup[];
};
export type Category = {
  id: string;
  name: string;
  active: boolean;
  imageUrl: string | null;
  imageKey: string | null;
};
export type Store = {
  primaryColor?: string;
  appearance?: unknown;
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  description: string | null;
  address: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  estimatedTime: string;
  deliveryMinimum: string | null;
  pickupMinimum: string | null;
  isOpen: boolean;
  paymentMethods: string[];
  categories: Category[];
  products: CatalogProduct[];
  deliveryZones: { id: string; name: string; fee: string }[];
};
export type OrderView = {
  courier?: { id: string; name: string } | null;
  id: string;
  code: number;
  status: string;
  type: string;
  createdAt: string;
  total: string;
  subtotal: string;
  discount: string;
  deliveryFee: string;
  address: string | null;
  notes: string | null;
  paymentMethod: string;
  tableNumber: string | null;
  customer: { name: string; phone: string } | null;
  items: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: string;
    total: string;
    notes: string | null;
    options: { id: string; name: string; price: string }[];
  }[];
  events: { id: string; status: string; createdAt: string }[];
};
export type SessionView = {
  id: string;
  name: string;
  email: string;
  role: string;
  imageUrl: string | null;
  imageKey: string | null;
  merchant: { id: string; name: string; slug: string; isOpen: boolean };
};
export const statusLabels: Record<string, string> = {
  RECEIVED: "Recebido",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  READY: "Pronto",
  DELIVERING: "Saiu para entrega",
  FINISHED: "Finalizado",
  CANCELED: "Cancelado",
};
export const typeLabels: Record<string, string> = {
  DELIVERY: "Entrega",
  PICKUP: "Retirada",
  TABLE: "Mesa",
  SCHEDULED: "Encomenda",
};
