import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
  try {
    // For embedded apps, use different authentication
    const { admin, session } = await authenticate.admin(request);
    
    if (!session) {
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items, customerEmail, frequency } = body;

    if (!items || items.length === 0) {
      return json({ success: false, error: "No items provided" }, { status: 400 });
    }

    // Prepare line items for draft order
    const lineItems = items.map(item => {
      const isCustomOffer = item.properties && item.properties._custom_pricing === "true";

      const lineItem = {
        quantity: item.quantity,
        custom_properties: []
      };

      if (isCustomOffer) {
        // For custom one-time offers, create a virtual product
        lineItem.title = item.properties._product_title || "One-Time Offer";
        lineItem.price = (item.price / 100).toFixed(2); // Convert cents to dollars
        lineItem.requires_shipping = true;
        console.log(`Creating virtual product for custom offer: ${lineItem.title} at $${lineItem.price}`);

        // CRITICAL: Special logging for $0 virtual products
        if (lineItem.price === "0.00") {
          console.log('🚨 CREATING $0 VIRTUAL PRODUCT! 🚨');
          console.log('Virtual product details:', {
            title: lineItem.title,
            price: lineItem.price,
            originalPriceCents: item.price,
            itemId: item.id,
            hasCustomPricing: item.properties._custom_pricing
          });
        }
      } else {
        // For real Shopify products, use variant_id
        lineItem.variant_id = item.id;

        // Add selling plan if exists
        if (item.selling_plan) {
          lineItem.selling_plan_id = item.selling_plan;
        }

        // Add custom price if provided (including $0 prices)
        if (typeof item.price === 'number') {
          lineItem.price = (item.price / 100).toFixed(2); // Convert cents to dollars
          console.log(`Setting custom price for Shopify variant ${item.id}: $${lineItem.price}`);
        }
      }

      // Add properties if they exist
      if (item.properties) {
        lineItem.custom_properties = Object.entries(item.properties).map(([key, value]) => ({
          name: key,
          value: value.toString()
        }));
      }

      return lineItem;
    });

    // Create draft order
    const draftOrderData = {
      draft_order: {
        line_items: lineItems,
        use_customer_default_address: false,
        note: `Subscription order - ${frequency}`,
        note_attributes: [
          {
            name: "_subscription_frequency",
            value: frequency
          },
          {
            name: "_created_from",
            value: "subscription_form"
          }
        ]
      }
    };

    // Add customer email if provided
    if (customerEmail) {
      draftOrderData.draft_order.email = customerEmail;
    }

    console.log("Creating draft order with data:", JSON.stringify(draftOrderData, null, 2));

    // Create draft order using Admin API
    const response = await fetch(`https://${session.shop}/admin/api/2023-10/draft_orders.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draftOrderData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Shopify API Error:", errorData);
      return json({ 
        success: false, 
        error: `Failed to create draft order: ${response.statusText}`,
        details: errorData 
      }, { status: response.status });
    }

    const draftOrder = await response.json();
    
    console.log("Draft order created successfully:", draftOrder.draft_order.id);

    // Return checkout URL
    return json({
      success: true,
      draft_order_id: draftOrder.draft_order.id,
      checkout_url: draftOrder.draft_order.invoice_url,
      total_price: draftOrder.draft_order.total_price
    });

  } catch (error) {
    console.error("Error creating draft order:", error);
    return json({ 
      success: false, 
      error: "Internal server error", 
      details: error.message 
    }, { status: 500 });
  }
}

// Only allow POST requests
export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}