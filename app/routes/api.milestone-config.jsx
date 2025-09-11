import { json } from "@remix-run/node";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  try {
    // Try to authenticate, but don't fail if no session
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
        milestone1_2weeks: "689100587309",
        milestone1_4weeks: "689157964077", 
        milestone1_6weeks: "689157996845",
        milestone2Items: 10,
        milestone2Discount: 10.0,
        milestone2_2weeks: "689425580333",
        milestone2_4weeks: "689425613101",
        milestone2_6weeks: "689425645869",
      };
    }

    return json(config);
  } catch (error) {
    console.error("Error loading milestone config:", error);
    // Return default configuration on error
    return json({
      milestone1Items: 6,
      milestone1Discount: 5.0,
      milestone1_2weeks: "689100587309",
      milestone1_4weeks: "689157964077", 
      milestone1_6weeks: "689157996845",
      milestone2Items: 10,
      milestone2Discount: 10.0,
      milestone2_2weeks: "689425580333",
      milestone2_4weeks: "689425613101",
      milestone2_6weeks: "689425645869",
    });
  }
};