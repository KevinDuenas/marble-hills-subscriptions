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
    const offers = await prisma.oneTimeOffer.findMany({
      where: { 
        shop: `${shop}.myshopify.com`,
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
    return json({ error: 'Failed to fetch offers' }, { status: 500 });
  }
};