import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
  try {
    console.log("=== DRAFT ORDER ENDPOINT CALLED ===");
    console.log("Request URL:", request.url);
    console.log("Request method:", request.method);
    console.log("Headers:", Object.fromEntries(request.headers.entries()));
    
    // Use public app proxy authentication for frontend calls
    const { session } = await authenticate.public.appProxy(request);
    console.log("Authentication result - Session exists:", !!session);
    console.log("Shop:", session?.shop);
    
    if (!session) {
      console.error("No session found");
      return json({ success: false, error: "No active session" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
      console.log("Request body parsed successfully:", body);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return json({ success: false, error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { items, customerEmail, frequency } = body;
    console.log("Received data:", {
      itemsCount: items?.length,
      customerEmail,
      frequency,
      allItems: items?.map(item => ({
        id: item.id,
        price: item.price,
        hasSellingPlan: !!item.selling_plan,
        hasCustomPricing: item.properties?._custom_pricing === "true",
        productTitle: item.properties?._product_title
      }))
    });

    if (!items || items.length === 0) {
      return json({ success: false, error: "No items provided" }, { status: 400 });
    }

    // Prepare line items for draft order
    const lineItems = items.map((item, index) => {
      const isCustomOffer = item.properties && item.properties._custom_pricing === "true";

      console.log(`Processing line item ${index + 1}:`, {
        id: item.id,
        price: item.price,
        hasCustomPricing: isCustomOffer,
        properties: item.properties
      });

      const lineItem = {
        quantity: item.quantity,
        custom_properties: []
      };

      if (isCustomOffer) {
        // For custom one-time offers, create a virtual product
        console.log(`🔥 CREATING VIRTUAL PRODUCT for item ${item.id}`);
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
          console.log(`Adding selling plan ${item.selling_plan} to item ${item.id}`);
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
        note: `Subscription order - ${frequency || 'No frequency specified'}`,
        note_attributes: [
          {
            name: "_subscription_frequency",
            value: frequency || ""
          },
          {
            name: "_created_from",
            value: "subscription_form_extension"
          },
          {
            name: "_created_at",
            value: new Date().toISOString()
          }
        ]
      }
    };

    // Add customer email if provided
    if (customerEmail) {
      draftOrderData.draft_order.email = customerEmail;
    }

    console.log("Creating draft order with data:", JSON.stringify(draftOrderData, null, 2));

    // Debug each line item to see if they're properly formatted
    console.log("Line items breakdown:");
    draftOrderData.draft_order.line_items.forEach((item, index) => {
      console.log(`Item ${index + 1}:`, {
        hasVariantId: !!item.variant_id,
        hasTitle: !!item.title,
        hasPrice: !!item.price,
        variantId: item.variant_id,
        title: item.title,
        price: item.price,
        isVirtualProduct: !item.variant_id && !!item.title
      });
    });

    // Create draft order using Admin API
    const apiUrl = `https://${session.shop}/admin/api/2024-01/draft_orders.json`;
    console.log("API URL:", apiUrl);
    console.log("Access token exists:", !!session.accessToken);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draftOrderData),
    });
    
    console.log("Shopify API response status:", response.status);
    console.log("Shopify API response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Shopify API Error:", response.status, errorData);
      
      try {
        const parsedError = JSON.parse(errorData);
        return json({ 
          success: false, 
          error: `Shopify API Error: ${JSON.stringify(parsedError.errors || parsedError)}`,
          status: response.status
        }, { status: 400 });
      } catch {
        return json({ 
          success: false, 
          error: `Shopify API Error: ${response.statusText}`,
          details: errorData,
          status: response.status
        }, { status: 400 });
      }
    }

    const result = await response.json();
    const draftOrder = result.draft_order;
    
    console.log("✅ Draft order created successfully:", {
      id: draftOrder.id,
      total: draftOrder.total_price,
      line_items: draftOrder.line_items?.length
    });

    // Return checkout URL
    return json({
      success: true,
      draft_order_id: draftOrder.id,
      checkout_url: draftOrder.invoice_url,
      total_price: draftOrder.total_price,
      line_items_count: draftOrder.line_items?.length || 0
    });

  } catch (error) {
    console.error("❌ Error creating draft order:", error);
    return json({ 
      success: false, 
      error: "Internal server error", 
      details: error.message 
    }, { status: 500 });
  }
}

// Handle GET requests for testing
export async function loader({ request }) {
  console.log("GET request to draft-order endpoint");
  return json({ 
    message: "Draft Order API endpoint is working", 
    method: "GET",
    url: request.url,
    timestamp: new Date().toISOString()
  });
}