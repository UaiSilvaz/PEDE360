import { db } from "@/lib/db";
export async function publicStore(slug: string) {
  return db.merchant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      phone: true,
      address: true,
      deliveryState: true,
      deliveryCityId: true,
      deliveryCity: true,
      logoUrl: true,
      coverUrl: true,
      primaryColor: true,
      appearance: true,
      isOpen: true,
      estimatedTime: true,
      deliveryMinimum: true,
      pickupMinimum: true,
      paymentMethods: true,
      categories: {
        where: { active: true },
        orderBy: { position: "asc" },
        select: { id: true, name: true, imageUrl: true },
      },
      deliveryZones: {
        where: { active: true },
        select: { id: true, name: true, fee: true },
      },
      products: {
        where: {
          active: true,
          OR: [{ categoryId: null }, { category: { active: true } }],
        },
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          featured: true,
          categoryId: true,
          optionGroups: {
            orderBy: { position: "asc" },
            include: {
              options: {
                where: { active: true },
                orderBy: { position: "asc" },
              },
            },
          },
        },
      },
    },
  });
}
