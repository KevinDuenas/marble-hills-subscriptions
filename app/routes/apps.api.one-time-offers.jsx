import { json } from "@remix-run/node";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  try {
    // Get shop from the request URL parameters
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');
    
    if (!shop) {
      return json({ error: 'Shop parameter required' }, { status: 400 });
    }

    // Get active One Time Offers for this shop
    // Handle both shop formats: "shop-name" and "shop-name.myshopify.com"
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    
    const offers = await prisma.oneTimeOffer.findMany({
      where: { 
        shop: shopDomain,
        active: true 
      },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        position: true,
        title: true,
        description: true,
        price: true,
        comparedAtPrice: true,
        imageUrl: true,
        shopifyProductId: true,
        shopifyVariantId: true
      }
    });

    return json({ offers }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error fetching one time offers:', error);
    return json({ error: 'Failed to fetch offers' }, { status: 500 });
  }
};