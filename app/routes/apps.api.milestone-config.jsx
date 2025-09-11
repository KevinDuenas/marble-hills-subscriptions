import { json } from "@remix-run/node";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    
    if (!shop) {
      return json({ error: "Shop parameter required" }, { status: 400 });
    }

    let config = await prisma.subscriptionConfig.findUnique({
      where: { shop: shop }
    });

    if (!config) {
      // Return default configuration
      config = {
        milestone1Items: 6,
        milestone1Discount: 5.0,
        milestone1SubscriptionId: null,
        milestone2Items: 10,
        milestone2Discount: 10.0,
        milestone2SubscriptionId: null,
      };
    }

    return json(config);
  } catch (error) {
    console.error("Error loading milestone config:", error);
    // Return default configuration on error
    return json({
      milestone1Items: 6,
      milestone1Discount: 5.0,
      milestone1SubscriptionId: null,
      milestone2Items: 10,
      milestone2Discount: 10.0,
      milestone2SubscriptionId: null,
    });
  }
};