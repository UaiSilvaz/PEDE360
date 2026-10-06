export const roles = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "CASHIER",
  "ATTENDANT",
  "KITCHEN",
  "DELIVERY",
] as const;
export type Role = (typeof roles)[number];
export type Permission =
  | "catalog"
  | "settings"
  | "orders.read"
  | "orders.write"
  | "dispatch"
  | "whatsapp"
  | "finance"
  | "customers"
  | "staff"
  | "audit";
const permissions: Record<Role, readonly Permission[]> = {
  OWNER: [
    "dispatch",
    "catalog",
    "settings",
    "orders.read",
    "orders.write",
    "whatsapp",
    "finance",
    "customers",
    "staff",
    "audit",
  ],
  ADMIN: [
    "dispatch",
    "catalog",
    "settings",
    "orders.read",
    "orders.write",
    "whatsapp",
    "finance",
    "customers",
    "staff",
    "audit",
  ],
  MANAGER: [
    "dispatch",
    "catalog",
    "settings",
    "orders.read",
    "orders.write",
    "whatsapp",
    "finance",
    "customers",
    "audit",
  ],
  CASHIER: ["orders.read", "orders.write", "finance", "customers", "dispatch"],
  ATTENDANT: [
    "orders.read",
    "orders.write",
    "whatsapp",
    "customers",
    "dispatch",
  ],
  KITCHEN: ["orders.read", "orders.write"],
  DELIVERY: ["orders.read", "orders.write"],
};
export function can(role: string, permission: Permission) {
  return permissions[role as Role]?.includes(permission) ?? false;
}

export function canChangeOrderStatus(role: string, status: string) {
  if (!can(role, "orders.write")) return false;
  const limits: Partial<Record<Role, readonly string[]>> = {
    DELIVERY: ["DELIVERING", "FINISHED"],
    KITCHEN: ["PREPARING", "READY"],
  };
  return limits[role as Role]?.includes(status) ?? true;
}

export function canGrantRole(actorRole: string, grantedRole: Role) {
  return (
    can(actorRole, "staff") &&
    (grantedRole !== "OWNER" || actorRole === "OWNER")
  );
}
