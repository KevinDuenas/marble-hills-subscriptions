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
      firstItem: items?.[0] ? {
        id: items[0].id,
        hasPrice: !!items[0].price,
        hasSellingPlan: !!items[0].selling_plan
      } : null
    });

    if (!items || items.length === 0) {
      return json({ success: false, error: "No items provided" }, { status: 400 });
    }

    // Prepare line items for draft order
    const lineItems = items.map(item => {
      const lineItem = {
        variant_id: item.id,
        quantity: item.quantity
      };

      // Add properties if they exist
      if (item.properties) {
        lineItem.custom_properties = Object.entries(item.properties).map(([key, value]) => ({
          name: key,
          value: value.toString()
        }));
      }

      // Add selling plan if exists
      if (item.selling_plan) {
        lineItem.selling_plan_id = item.selling_plan;
        console.log(`Adding selling plan ${item.selling_plan} to item ${item.id}`);
      }

      // Add custom price if provided (for bundle)
      if (item.price) {
        lineItem.price = (item.price / 100).toFixed(2); // Convert cents to dollars
        console.log(`Setting custom price: $${lineItem.price} for item ${item.id}`);
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