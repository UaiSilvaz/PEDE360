export type OrderStatus =
  "Recebido" | "Em preparo" | "Pronto" | "Entregando" | "Finalizado";
export type OrderType = "Delivery" | "Retirada" | "Mesa" | "Encomenda";

export type Product = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  active: boolean;
  featured?: boolean;
  emoji: string;
};

export type Order = {
  id: string;
  customer: string;
  phone: string;
  total: number;
  payment: string;
  type: OrderType;
  status: OrderStatus;
  time: string;
  address?: string;
  table?: string;
  courier?: string;
  items: { name: string; qty: number; price: number }[];
};
