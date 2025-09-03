// Cart and Subscription Management - Updated for new 3-step flow
class CartManager {
  constructor() {
    this.frequencyText = {
      "2weeks": "Every 2 weeks",
      "4weeks": "Every 4 weeks",
      "6weeks": "Every 6 weeks",
    };
    
    // Bundle Product Configuration
    this.bundleProduct = {
      variantId: "51266685731117",
      productId: "10096558113069",
      basePrice: 0.01 // Current base price in dollars
    };
    
    // Selling Plan IDs for different discount tiers
    this.sellingPlans = {
      // 6-9 products (5% discount)
      "5": {
        "2weeks": "689100587309",
        "4weeks": "689157964077", 
        "6weeks": "689157996845"
      },
      // 10+ products (10% discount)
      "10": {
        "2weeks": "689425580333",
        "4weeks": "689425613101",
        "6weeks": "689425645869"
      }
    };
  }

  getSellingPlanId(totalCount, frequency) {
    let discountTier = "0";
    
    if (totalCount >= 10) {
      discountTier = "10";
    } else if (totalCount >= 6) {
      discountTier = "5";
    }
    
    console.log(`Getting selling plan for ${totalCount} products, ${frequency} frequency, ${discountTier}% discount`);
    
    if (this.sellingPlans[discountTier] && this.sellingPlans[discountTier][frequency]) {
      const planId = this.sellingPlans[discountTier][frequency];
      console.log(`Found selling plan ID: ${planId}`);
      return planId;
    }
    
    console.warn(`No selling plan found for ${discountTier}% discount and ${frequency} frequency`);
    return null;
  }

  async createSubscription(subscriptionData) {
    try {
      console.log("Creating subscription with data:", subscriptionData);
      
      const selectedProducts = subscriptionData.selectedProducts || [];
      const oneTimeOffers = subscriptionData.oneTimeOffers || [];
      
      // Calculate discount
      const totalCount = selectedProducts.reduce((sum, product) => sum + product.quantity, 0);
      let discount = 0;
      if (totalCount >= 10) {
        discount = 10;
      } else if (totalCount >= 6) {
        discount = 5;
      }

      // Prepare all cart items
      const allCartItems = [];
      
      // Add individual subscription products with selling plans
      for (const product of selectedProducts) {
        const cartItem = await this.prepareSubscriptionProduct(product, subscriptionData, totalCount);
        if (cartItem) {
          allCartItems.push(cartItem);
        }
      }
      
      // Add one-time offers
      console.log('🎁 Processing one-time offers in CartManager:');
      console.log('   - Offers received:', oneTimeOffers);
      console.log('   - Offers count:', oneTimeOffers.length);
      
      for (const offer of oneTimeOffers) {
        console.log(`   - Processing offer: ${offer.title}`);
        const cartItem = await this.prepareOfferProduct(offer);
        if (cartItem) {
          console.log(`   ✅ Offer prepared successfully:`, cartItem);
          allCartItems.push(cartItem);
        } else {
          console.log(`   ❌ Failed to prepare offer: ${offer.title}`);
        }
      }
      

      if (allCartItems.length === 0) {
        throw new Error("No products to add to cart");
      }

      // Create Draft Order instead of adding to cart
      const draftOrderResponse = await this.createDraftOrder(allCartItems, subscriptionData);

      if (draftOrderResponse.success) {
        // Redirect to Draft Order checkout
        window.location.href = draftOrderResponse.checkout_url;
      } else {
        throw new Error(draftOrderResponse.error || "Failed to create checkout");
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error; // Re-throw to be handled by caller
    }
  }

  showLoading() {
    document.querySelector(".form-step.active").style.display = "none";
    document.querySelector(".loading-state").style.display = "block";
    document.querySelector(".loading-state p").textContent =
      "Creando tu suscripción...";
  }

  hideLoading() {
    document.querySelector(".loading-state").style.display = "none";
    document.querySelector(".form-step.active").style.display = "block";
  }

  async prepareSubscriptionBundle(selectedProducts, subscriptionData, totalCount) {
    try {
      // Calculate total price of all selected products
      const totalPrice = selectedProducts.reduce((sum, product) => {
        return sum + (product.price * product.quantity);
      }, 0);

      // Get the appropriate selling plan
      const sellingPlanId = this.getSellingPlanId(totalCount, subscriptionData.frequency);
      
      // Build comprehensive product details for line item properties
      const productDetails = selectedProducts.map((product, index) => {
        return {
          [`_product_${index + 1}_title`]: product.title,
          [`_product_${index + 1}_variant`]: product.selectedVariant.title,
          [`_product_${index + 1}_quantity`]: product.quantity.toString(),
          [`_product_${index + 1}_price`]: parseFloat(product.price).toFixed(2),
          [`_product_${index + 1}_id`]: product.id.toString()
        };
      }).reduce((acc, curr) => ({ ...acc, ...curr }), {});

      const bundleItem = {
        id: this.bundleProduct.variantId,
        quantity: 1, // Always 1 bundle
        // Remove price property - Shopify Cart API doesn't support price overrides
        properties: {
          _subscription_type: "bundle",
          _frequency: subscriptionData.frequency,
          _total_products: totalCount.toString(),
          _total_price: parseFloat(totalPrice).toFixed(2),
          _bundle_created: new Date().toISOString(),
          _frequency_text: this.frequencyText[subscriptionData.frequency],
          _calculated_total: `$${parseFloat(totalPrice).toFixed(2)}`,
          _price_override: "true",
          ...productDetails
        },
      };

      // Add selling plan if available (for discount)
      if (sellingPlanId) {
        bundleItem.selling_plan = sellingPlanId;
        
        // Calculate discount info
        let discountPercentage = 0;
        if (totalCount >= 10) discountPercentage = 10;
        else if (totalCount >= 6) discountPercentage = 5;
        
        // Calculate discounted price
        const discountedPrice = totalPrice * (1 - discountPercentage / 100);
        bundleItem.properties._discounted_price = `$${parseFloat(discountedPrice).toFixed(2)}`;
        bundleItem.properties._discount_amount = `${discountPercentage}%`;
        
        console.log(`✅ Bundle created:`);
        console.log(`   - ${totalCount} products`);
        console.log(`   - ${this.frequencyText[subscriptionData.frequency]}`);
        console.log(`   - ${discountPercentage}% discount (Selling Plan: ${sellingPlanId})`);
        console.log(`   - Original price: $${parseFloat(totalPrice).toFixed(2)}`);
        console.log(`   - Discounted price: $${parseFloat(discountedPrice).toFixed(2)}`);
      } else {
        console.log(`❌ No selling plan applied (${totalCount} products, ${subscriptionData.frequency})`);
      }

      console.log("Bundle details:", bundleItem);
      return bundleItem;
      
    } catch (error) {
      console.error("Error preparing subscription bundle:", error);
      return null;
    }
  }

  async prepareSubscriptionProduct(product, subscriptionData, totalCount) {
    try {
      // Use the selected variant directly
      const variantId = product.selectedVariant?.id;
      
      if (!variantId) {
        console.error(`No variant found for product ${product.id}`);
        return null;
      }

      // Get the appropriate selling plan
      const sellingPlanId = this.getSellingPlanId(totalCount, subscriptionData.frequency);
      
      const cartItem = {
        id: variantId,
        quantity: product.quantity,
        properties: {
          _subscription_type: "custom",
          _frequency: subscriptionData.frequency,
          _product_title: product.title,
          _selected_variant: product.selectedVariant.title,
          _quantity: product.quantity.toString(),
          _custom_selection: "true",
          _protected_item: "true", // Mark for cart protection
        },
      };

      // Add selling plan if available
      if (sellingPlanId) {
        cartItem.selling_plan = sellingPlanId;
        console.log(`Added selling plan ${sellingPlanId} to product ${product.title}`);
      }

      return cartItem;
    } catch (error) {
      console.error(`Error preparing product ${product.id}:`, error);
      return null;
    }
  }
  
  async prepareOfferProduct(offer) {
    try {
      const variantId = offer.selectedVariant?.id;
      
      if (!variantId) {
        console.error(`No variant found for offer ${offer.id}`);
        return null;
      }

      // Calculate discount information
      const originalPrice = parseFloat(offer.selectedVariant.price);
      const discountPercentage = this.getOfferDiscount(offer);
      const discountedPrice = this.calculateDiscountedPrice(originalPrice, discountPercentage);

      return {
        id: variantId,
        quantity: offer.quantity,
        price: discountedPrice,
        properties: {
          _first_box_addon: "true",
          _offer_product: "true",
          _one_time_only: "true",
          _product_title: offer.title,
          _selected_variant: offer.selectedVariant.title,
          _quantity: offer.quantity.toString(),
          _original_price: originalPrice.toFixed(2),
          _discount_percentage: discountPercentage.toString(),
          _discounted_price: discountedPrice.toFixed(2),
          _savings_amount: (originalPrice - discountedPrice).toFixed(2),
          _discount_applied: "true",
        },
      };
    } catch (error) {
      console.error(`Error preparing offer ${offer.id}:`, error);
      return null;
    }
  }

  // Extract discount percentage from offer object (from OneTimeOfferManager)
  getOfferDiscount(offer) {
    // Check if discount info was passed from OneTimeOfferManager
    if (offer.discountPercentage !== undefined) {
      return offer.discountPercentage;
    }
    
    // Fallback: check if it's stored in properties
    if (offer.selectedVariant && offer.selectedVariant.discountPercentage !== undefined) {
      return offer.selectedVariant.discountPercentage;
    }
    
    // Default: no discount
    return 0;
  }

  // Calculate discounted price
  calculateDiscountedPrice(originalPrice, discountPercentage) {
    if (discountPercentage === 0) return originalPrice;
    
    const discount = (originalPrice * discountPercentage) / 100;
    return originalPrice - discount;
  }

  async findProductByHandle(handle) {
    try {
      const response = await fetch(`/products/${handle}.js`);
      if (response.ok) {
        const product = await response.json();
        return product.variants[0]?.id || null;
      }
      return null;
    } catch (error) {
      console.error("Error finding product by handle:", error);
      return null;
    }
  }

  async getFirstAvailableProduct() {
    try {
      const response = await fetch("/products.json?limit=1");
      const data = await response.json();

      if (data.products && data.products.length > 0) {
        return data.products[0].variants[0].id;
      }

      return null;
    } catch (error) {
      console.error("Error getting demo product:", error);
      return null;
    }
  }

  async getProductVariantId(productId) {
    try {
      const response = await fetch(`/products.json?limit=250`);
      const data = await response.json();

      const product = data.products.find((p) => p.id === productId);
      if (product && product.variants.length > 0) {
        return product.variants[0].id;
      }

      return null;
    } catch (error) {
      console.error("Error getting product variant:", error);
      return null;
    }
  }

  async createDraftOrder(cartItems, subscriptionData) {
    try {
      console.log("Creating subscription with individual products:", cartItems);
      
      // Check if we have discounted one-time offers
      const discountedOffers = cartItems.filter(item => 
        item.properties && item.properties._discount_applied === "true"
      );

      if (discountedOffers.length > 0) {
        console.log("🎁 One-time offers with discounts detected - using enhanced cart with discount code");
        return await this.createSubscriptionWithOfferDiscounts(cartItems, subscriptionData, discountedOffers);
      } else {
        console.log("📦 Regular subscription - using Cart API");
        return await this.createRegularSubscription(cartItems, subscriptionData);
      }
      
    } catch (error) {
      console.error("❌ Error creating subscription:", error);
      return {
        success: false,
        error: "Network error creating checkout"
      };
    }
  }

  async createRegularSubscription(cartItems, subscriptionData) {
    // Calculate discount for display
    const selectedProducts = subscriptionData.selectedProducts || [];
    const totalCount = selectedProducts.reduce((sum, product) => sum + product.quantity, 0);
    let discount = 0;
    if (totalCount >= 10) {
      discount = 10;
    } else if (totalCount >= 6) {
      discount = 5;
    }
    
    // Use the regular cart API with individual products and selling plans
    const result = await this.addToCartWithSubscription(cartItems, discount, subscriptionData);
    
    if (result.success) {
      console.log("✅ Subscription products added to cart successfully!");
      console.log(`   - ${cartItems.length} items added`);
      console.log(`   - ${discount}% discount applied via selling plans`);
      
      // Redirect to checkout
      window.location.href = "/checkout";
      
      return {
        success: true,
        checkout_url: "/checkout"
      };
    } else {
      throw new Error(result.error || "Failed to add products to cart");
    }
  }

  async createDraftOrderWithDiscounts(cartItems, subscriptionData) {
    console.log("🔒 Creating Draft Order with custom pricing for one-time offer discounts");
    
    // Prepare line items for Draft Order
    const lineItems = cartItems.map(item => {
      const lineItem = {
        variant_id: item.id,
        quantity: item.quantity,
        properties: []
      };

      // Add properties as array for Draft Order
      if (item.properties) {
        Object.keys(item.properties).forEach(key => {
          lineItem.properties.push({
            name: key,
            value: item.properties[key]
          });
        });
      }

      // Apply custom price for discounted offers
      if (item.properties && item.properties._discount_applied === "true") {
        lineItem.price = item.price; // Use discounted price
        console.log(`💰 Custom price applied: ${item.properties._product_title} = $${item.price.toFixed(2)}`);
      }

      // Add selling plan for subscription items
      if (item.selling_plan) {
        lineItem.selling_plan_id = item.selling_plan;
      }

      return lineItem;
    });

    // Draft Order payload
    const draftOrderData = {
      draft_order: {
        line_items: lineItems,
        customer: subscriptionData.customerEmail ? {
          email: subscriptionData.customerEmail
        } : null,
        note: `Subscription created: ${subscriptionData.frequency} frequency`,
        custom_attributes: [
          { key: "subscription_type", value: "custom" },
          { key: "frequency", value: subscriptionData.frequency },
          { key: "has_one_time_offers", value: "true" },
          { key: "created_via", value: "subscription_builder" }
        ],
        use_customer_default_address: true
      }
    };

    console.log("📝 Draft Order payload:", JSON.stringify(draftOrderData, null, 2));

    try {
      console.log("🌐 Making request to Draft Order API...");
      console.log("   - URL: /api/create-draft-order");
      console.log("   - Method: POST");
      console.log("   - Headers: Content-Type: application/json");
      
      // Create Draft Order via our Remix app endpoint
      // Try multiple possible URLs for the API endpoint
      const possibleUrls = [
        '/api/create-draft-order',
        '/webhooks/draft-order',
        '/apps/api/create-draft-order', 
        '/apps/subscription/api/create-draft-order',
        '/apps/subscription/webhooks/draft-order',
        window.location.origin + '/api/create-draft-order'
      ];
      
      let response;
      let lastError;
      
      for (const url of possibleUrls) {
        try {
          console.log(`🌐 Trying URL: ${url}`);
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(draftOrderData)
          });
          
          console.log(`📡 Response for ${url}: ${response.status} ${response.statusText}`);
          
          if (response.status !== 404) {
            console.log(`✅ Found working endpoint: ${url}`);
            break; // Exit loop if we get something other than 404
          }
        } catch (error) {
          console.log(`❌ Failed ${url}:`, error.message);
          lastError = error;
        }
      }
      
      if (!response) {
        console.error("❌ All API endpoints failed");
        throw lastError || new Error("No API endpoint accessible");
      }

      console.log("📡 Response received:");
      console.log(`   - Status: ${response.status} ${response.statusText}`);
      console.log(`   - OK: ${response.ok}`);
      console.log(`   - Headers:`, response.headers);

      const responseText = await response.text();
      console.log("📄 Raw response body:", responseText);

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        console.error(`❌ Response body: ${responseText}`);
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      let result;
      try {
        result = JSON.parse(responseText);
        console.log("✅ Parsed JSON response:", result);
      } catch (parseError) {
        console.error("❌ Failed to parse JSON response:", parseError);
        console.error("❌ Raw response was:", responseText);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
      
      if (result.success && result.checkout_url) {
        console.log("✅ Draft Order created successfully!");
        console.log(`   - Draft Order ID: ${result.draft_order_id}`);
        console.log(`   - Checkout URL: ${result.checkout_url}`);
        
        // TEMPORARY: Don't redirect immediately for debugging
        console.log("🚫 REDIRECT DISABLED FOR DEBUGGING");
        console.log("🚫 Would redirect to:", result.checkout_url);
        console.log("🚫 Copy logs now before they disappear!");
        
        // Show alert with checkout URL for manual testing
        alert(`Draft Order created! Checkout URL: ${result.checkout_url}\n\nCheck console logs now, then manually go to checkout.`);
        
        // Uncomment this line when debugging is done:
        // window.location.href = result.checkout_url;
        
        return {
          success: true,
          checkout_url: result.checkout_url
        };
      } else {
        console.error("❌ Draft Order API returned failure:", result);
        throw new Error(result.error || `API returned success: ${result.success}`);
      }

    } catch (error) {
      console.error("❌ Draft Order creation failed:", error);
      console.error("❌ Error type:", typeof error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);
      console.log("🔄 Fallback: Using regular cart with notification about discount");
      
      // Fallback to regular cart but add note about discount
      return await this.createRegularSubscriptionWithDiscountNote(cartItems, subscriptionData);
    }
  }

  async createSubscriptionWithOfferDiscounts(cartItems, subscriptionData, discountedOffers) {
    // Calculate total discount amount
    let totalDiscountAmount = 0;
    discountedOffers.forEach(offer => {
      const savings = parseFloat(offer.properties._savings_amount);
      totalDiscountAmount += savings * offer.quantity;
    });

    // Generate subscription-specific discount code
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const discountCode = `SUBSCRIPTION-OTO-${randomSuffix}`;
    
    // Add all items to cart 
    const result = await this.addToCartWithSubscription(cartItems, 0, subscriptionData);
    
    if (result.success) {
      // Update cart with subscription and discount information
      await fetch("/cart/update.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attributes: {
            ...result.cart.attributes,
            is_subscription_order: "true",
            subscription_discount_code: discountCode,
            subscription_discount_amount: totalDiscountAmount.toFixed(2),
            has_oto_discounts: "true",
            oto_savings_total: totalDiscountAmount.toFixed(2),
          },
          note: `Subscription Order - Discount Code: ${discountCode} - Amount: $${totalDiscountAmount.toFixed(2)}`
        }),
      });

      // Redirect to checkout with discount code
      window.location.href = `/checkout?discount=${discountCode}`;
      
      return {
        success: true,
        checkout_url: `/checkout?discount=${discountCode}`,
        discount_code: discountCode,
        discount_amount: totalDiscountAmount
      };
    } else {
      throw new Error(result.error || "Failed to add products to cart");
    }
  }

  async createRegularSubscriptionWithDiscountNote(cartItems, subscriptionData) {
    const result = await this.addToCartWithSubscription(cartItems, 0, subscriptionData);
    
    if (result.success) {
      window.location.href = "/checkout";
      
      return {
        success: true,
        checkout_url: "/checkout"
      };
    } else {
      throw new Error(result.error || "Failed to add products to cart");
    }
  }

  async addToCartWithSubscription(cartItems, discount = 0, subscriptionData) {
    try {
      // Temporarily disable cart protection during subscription creation
      if (window.cartProtection) {
        window.cartProtection.isProtectionActive = false;
      }
      
      // Clear cart
      await fetch("/cart/clear.js", { method: "POST" });

      // Calculate total discount amount for cart-level discount code
      let totalOfferDiscount = 0;
      const discountedOffers = cartItems.filter(item => 
        item.properties && item.properties._discount_applied === "true"
      );

      discountedOffers.forEach(offer => {
        const originalPrice = parseFloat(offer.properties._original_price);
        const discountAmount = parseFloat(offer.properties._savings_amount);
        totalOfferDiscount += discountAmount * offer.quantity;
      });

      console.log(`💰 One-time offer discount calculation:`);
      console.log(`   - Discounted offers: ${discountedOffers.length}`);
      console.log(`   - Total discount amount: $${totalOfferDiscount.toFixed(2)}`);

      // Add all items to cart (including offers at full price)
      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cartItems.map(item => ({
            id: item.id,
            quantity: item.quantity,
            properties: item.properties,
            selling_plan: item.selling_plan // Keep selling plans for subscriptions
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Error adding to cart");
      }

      const cartData = await response.json();
      
      // Calculate totals
      const selectedProducts = subscriptionData.selectedProducts || [];
      const oneTimeOffers = subscriptionData.oneTimeOffers || [];
      const totalCount = selectedProducts.reduce((sum, product) => sum + product.quantity, 0);

      // Update cart attributes with enhanced metadata
      await fetch("/cart/update.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attributes: {
            subscription_type: "custom", // Individual products with selling plans
            frequency: subscriptionData.frequency,
            discount_percentage: discount.toString(),
            product_count: totalCount.toString(),
            unique_products: selectedProducts.length.toString(),
            customer_email: subscriptionData.customerEmail || "",
            has_one_time_offers: (oneTimeOffers.length > 0).toString(),
            offer_count: oneTimeOffers.length.toString(),
            subscription_created: new Date().toISOString(),
            frequency_text: this.frequencyText[subscriptionData.frequency] || subscriptionData.frequency,
            // Add detailed pricing information  
            calculated_total: selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0),
            display_price: `$${selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2)}`,
            subscription_note: `Custom subscription with ${totalCount} products and ${discount}% discount`,
            // One-time offer discount information
            oto_discount_total: totalOfferDiscount.toFixed(2),
            oto_discount_count: discountedOffers.length.toString(),
            oto_discount_note: totalOfferDiscount > 0 ? `$${totalOfferDiscount.toFixed(2)} discount on one-time offers` : "",
          },
        }),
      });

      // Re-enable cart protection after successful cart creation
      setTimeout(() => {
        if (window.cartProtection) {
          window.cartProtection.checkSubscriptionCart();
        }
      }, 500);

      return { success: true, cart: cartData };
    } catch (error) {
      console.error("Cart error:", error);
      
      // Re-enable protection even on error
      if (window.cartProtection) {
        window.cartProtection.isProtectionActive = false;
      }
      
      return { success: false, error: error.message };
    }
  }

  showFinalSummary(subscriptionData, selectedProducts, discount = 0) {
    document.querySelector(".loading-state").style.display = "none";
    document.querySelector(".success-state").style.display = "block";

    const summaryContainer = document.getElementById("final-summary");

    let summaryHTML = `
      <div class="summary-item">
        <strong>Tipo de Plan:</strong>
        <span>${subscriptionData.type === "curated" ? "Caja Curada" : "Caja Personalizada"}</span>
      </div>
    `;

    if (subscriptionData.type === "curated") {
      // Show selected bundle information
      if (selectedProducts.length > 0) {
        const selectedBundle = selectedProducts[0];
        summaryHTML += `
          <div class="summary-item">
            <strong>Bundle Seleccionado:</strong>
            <span>${selectedBundle.title}</span>
          </div>
        `;
      }

      if (subscriptionData.boxSize) {
        summaryHTML += `
          <div class="summary-item">
            <strong>Tamaño de Caja:</strong>
            <span>${this.boxSizeText[subscriptionData.boxSize] || subscriptionData.boxSize}</span>
          </div>
        `;
      }
    } else {
      // Show custom products information
      const totalCount = selectedProducts.reduce(
        (sum, product) => sum + product.quantity,
        0,
      );
      const uniqueCount = selectedProducts.length;

      summaryHTML += `
        <div class="summary-item">
          <strong>Productos Seleccionados:</strong>
          <span>${totalCount} productos (${uniqueCount} diferentes)</span>
        </div>
      `;

      if (discount > 0) {
        summaryHTML += `
          <div class="summary-item">
            <strong>Descuento Aplicado:</strong>
            <span style="color: #28a745;">${discount}%</span>
          </div>
        `;
      }
    }

    summaryHTML += `
      <div class="summary-item">
        <strong>Frecuencia:</strong>
        <span>${this.frequencyText[subscriptionData.frequency] || subscriptionData.frequency}</span>
      </div>
    `;

    // Show product list for custom box
    if (subscriptionData.type === "custom" && selectedProducts.length > 0) {
      summaryHTML += '<div class="selected-products-list">';

      selectedProducts.forEach((product) => {
        summaryHTML += `
          <div class="selected-product-item">
            ${
              product.image
                ? `<img src="${product.image}" alt="${product.title}" class="selected-product-image">`
                : '<div class="selected-product-image" style="background: #f8f9fa; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;">Sin imagen</div>'
            }
            <div class="selected-product-title">
              ${product.title}
              ${product.quantity > 1 ? `<span class="product-quantity-badge">×${product.quantity}</span>` : ""}
            </div>
          </div>
        `;
      });

      summaryHTML += "</div>";
    }

    summaryContainer.innerHTML = summaryHTML;
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  window.cartManager = new CartManager();
});
