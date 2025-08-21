import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
  try {
    console.log("=== UPDATE BUNDLE PRICE ENDPOINT CALLED ===");
    
    const { admin, session } = await authenticate.admin(request);
    
    if (!session) {
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { variantId, price } = body;

    if (!variantId || !price) {
      return json({ success: false, error: "Missing variantId or price" }, { status: 400 });
    }

    console.log(`Updating variant ${variantId} to price $${price}`);

    // Update variant price using Admin API
    const response = await fetch(`https://${session.shop}/admin/api/2024-01/variants/${variantId}.json`, {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        variant: {
          id: variantId,
          price: price.toString()
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Shopify API Error:", errorData);
      return json({ 
        success: false, 
        error: `Failed to update variant price: ${response.statusText}`,
        details: errorData 
      }, { status: response.status });
    }

    const result = await response.json();
    console.log("✅ Variant price updated successfully:", result.variant.price);

    return json({
      success: true,
      variant_id: result.variant.id,
      new_price: result.variant.price
    });

  } catch (error) {
    console.error("❌ Error updating bundle price:", error);
    return json({ 
      success: false, 
      error: "Internal server error", 
      details: error.message 
    }, { status: 500 });
  }
}

export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}