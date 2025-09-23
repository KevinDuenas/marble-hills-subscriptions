// Cart and Subscription Management - Updated for new 3-step flow
class CartManager {
  constructor() {
    this.frequencyText = {
      "2weeks": "Every 2 weeks",
      "4weeks": "Every 4 weeks",
      "6weeks": "Every 6 weeks",
    };
    
    // Default milestone configuration - will be updated by main manager
    this.milestoneConfig = {
      milestone1Items: 6,
      milestone1Discount: 5.0,
      milestone2Items: 10,
      milestone2Discount: 10.0,
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

  // Method to update milestone config from main manager
  updateMilestoneConfig(config) {
    this.milestoneConfig = config;
    
    
    // Update selling plans with dynamic configuration
    this.sellingPlans = {
      [config.milestone1Discount.toString()]: {
        "2weeks": config.milestone1_2weeks,
        "4weeks": config.milestone1_4weeks,
        "6weeks": config.milestone1_6weeks
      },
      [config.milestone2Discount.toString()]: {
        "2weeks": config.milestone2_2weeks,
        "4weeks": config.milestone2_4weeks,
        "6weeks": config.milestone2_6weeks
      }
    };
    
    console.log('CartManager: Updated milestone config and selling plans:', this.milestoneConfig, this.sellingPlans);
  }

  getSellingPlanId(totalCount, frequency) {
    console.log('CartManager: Getting selling plan for count:', totalCount, 'frequency:', frequency);
    
    let discountTier = "0";
    
    const config = this.milestoneConfig || window.mainSubscriptionManager?.milestoneConfig || {
      milestone1Items: 6,
      milestone1Discount: 5.0,
      milestone2Items: 10,
      milestone2Discount: 10.0,
    };
    
    console.log('CartManager: Milestone config:', config);
    
    if (totalCount >= config.milestone2Items) {
      discountTier = config.milestone2Discount.toString();
    } else if (totalCount >= config.milestone1Items) {
      discountTier = config.milestone1Discount.toString();
    }
    
    console.log('CartManager: Discount tier:', discountTier);
    console.log('CartManager: Available selling plans:', this.sellingPlans);
    console.log('CartManager: Looking for selling plan with tier:', discountTier, 'and frequency:', frequency);
    
    if (this.sellingPlans[discountTier] && this.sellingPlans[discountTier][frequency]) {
      const planId = this.sellingPlans[discountTier][frequency];
      console.log('CartManager: ✅ Found selling plan:', planId, 'for tier:', discountTier, 'frequency:', frequency);
      
      // Validate that the plan ID is not empty or null
      if (!planId || planId.trim() === '') {
        console.warn('CartManager: ⚠️ Selling plan ID is empty for tier:', discountTier, 'frequency:', frequency);
        return null;
      }
      
      return planId;
    }
    
    console.warn('CartManager: ❌ No selling plan found for tier:', discountTier, 'frequency:', frequency);
    console.warn('CartManager: Available tiers:', Object.keys(this.sellingPlans));
    if (this.sellingPlans[discountTier]) {
      console.warn('CartManager: Available frequencies for tier', discountTier + ':', Object.keys(this.sellingPlans[discountTier]));
    }
    return null;
  }

  async createSubscription(subscriptionData) {
    try {
      console.log('CartManager: Starting subscription creation with data:', subscriptionData);
      
      // Disable cart protection during subscription creation
      if (window.cartProtection) {
        window.cartProtection.isProtectionActive = false;
      }
      
      const selectedProducts = subscriptionData.selectedProducts || [];
      const oneTimeOffers = subscriptionData.oneTimeOffers || [];
      
      console.log('CartManager: Selected products:', selectedProducts.length);
      console.log('CartManager: One time offers:', oneTimeOffers.length);
      
      // Calculate discount
      const totalCount = selectedProducts.reduce((sum, product) => sum + product.quantity, 0);
      const config = this.milestoneConfig || window.mainSubscriptionManager?.milestoneConfig || {
        milestone1Items: 6,
        milestone1Discount: 5.0,
        milestone2Items: 10,
        milestone2Discount: 10.0,
      };
      
      let discount = 0;
      if (totalCount >= config.milestone2Items) {
        discount = config.milestone2Discount;
      } else if (totalCount >= config.milestone1Items) {
        discount = config.milestone1Discount;
      }

      console.log('CartManager: Calculated discount:', discount);

      // Prepare all cart items
      const allCartItems = [];
      
      // Add individual subscription products with selling plans
      for (const product of selectedProducts) {
        console.log('CartManager: Preparing subscription product:', product.title);
        const cartItem = await this.prepareSubscriptionProduct(product, subscriptionData, totalCount);
        if (cartItem) {
          allCartItems.push(cartItem);
          console.log('CartManager: Added subscription product to cart:', cartItem.id);
        }
      }
      
      // Add one-time offers
      for (const offer of oneTimeOffers) {
        console.log('CartManager: Preparing one-time offer:', offer.title);
        const cartItem = await this.prepareOfferProduct(offer);
        if (cartItem) {
          allCartItems.push(cartItem);
          console.log('CartManager: Added one-time offer to cart:', cartItem.id);
        }
      }
      
      console.log('CartManager: Total cart items prepared:', allCartItems.length);

      if (allCartItems.length === 0) {
        console.error('CartManager: No products to add to cart');
        throw new Error("No products to add to cart");
      }

      // Create Draft Order instead of adding to cart
      console.log('CartManager: Creating draft order...');
      const draftOrderResponse = await this.createDraftOrder(allCartItems, subscriptionData);

      console.log('CartManager: Draft order response:', draftOrderResponse);

      if (draftOrderResponse.success) {
        console.log('CartManager: ✅ SUCCESS! Subscription created successfully');
        console.log('CartManager: Redirecting to checkout:', draftOrderResponse.checkout_url);
        // Successfully created subscription, redirect
        window.location.href = draftOrderResponse.checkout_url;
      } else {
        console.error('CartManager: Draft order failed:', draftOrderResponse.error);
        throw new Error(draftOrderResponse.error || "Failed to create checkout");
      }
    } catch (error) {
      console.error('CartManager: Subscription creation failed:', error);
      // Re-enable cart protection on error
      if (window.cartProtection) {
        setTimeout(() => {
          window.cartProtection.checkSubscriptionCart();
        }, 100);
      }
      throw error;
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
        const config = this.milestoneConfig || window.mainSubscriptionManager?.milestoneConfig || {
          milestone1Items: 6,
          milestone1Discount: 5.0,
          milestone2Items: 10,
          milestone2Discount: 10.0,
        };
        
        let discountPercentage = 0;
        if (totalCount >= config.milestone2Items) discountPercentage = config.milestone2Discount;
        else if (totalCount >= config.milestone1Items) discountPercentage = config.milestone1Discount;
        
        // Calculate discounted price
        const discountedPrice = totalPrice * (1 - discountPercentage / 100);
        bundleItem.properties._discounted_price = `$${parseFloat(discountedPrice).toFixed(2)}`;
        bundleItem.properties._discount_amount = `${discountPercentage}%`;
        
      }
      return bundleItem;
      
    } catch (error) {
      console.error("Cart Manager Error:", error);
      return null;
    }
  }

  async prepareSubscriptionProduct(product, subscriptionData, totalCount) {
    try {
      console.log('CartManager: Preparing subscription product:', product.title);
      
      // Use the selected variant directly
      const variantId = product.selectedVariant?.id;
      
      console.log('CartManager: Variant ID for subscription:', variantId);
      
      if (!variantId) {
        console.error('CartManager: No variant ID found for subscription product:', product);
        return null;
      }

      // Get the appropriate selling plan
      const sellingPlanId = this.getSellingPlanId(totalCount, subscriptionData.frequency);
      
      console.log('CartManager: Selling plan ID:', sellingPlanId);
      console.log('CartManager: Total count:', totalCount, 'Frequency:', subscriptionData.frequency);
      
      const cartItem = {
        id: variantId,
        quantity: product.quantity,
        properties: {
          _subscription_type: "custom",
          _frequency: subscriptionData.frequency,
          _frequency_text: this.frequencyText[subscriptionData.frequency] || subscriptionData.frequency,
          _product_title: product.title,
          _selected_variant: product.selectedVariant.title,
          _quantity: product.quantity.toString(),
          _custom_selection: "true",
          _protected_item: "true", // Mark for cart protection
          _is_subscription: "true",
          _recurring: "true"
        },
      };

      // Add selling plan if available (THIS IS CRITICAL FOR SUBSCRIPTIONS)
      if (sellingPlanId) {
        cartItem.selling_plan = sellingPlanId;
        console.log('CartManager: Added selling plan to subscription product:', sellingPlanId);
        
        // Add selling plan info to properties for tracking
        cartItem.properties._selling_plan_id = sellingPlanId;
        cartItem.properties._has_selling_plan = "true";
      } else {
        console.warn('CartManager: No selling plan found for subscription product - this will be a one-time purchase!');
        cartItem.properties._has_selling_plan = "false";
      }

      console.log('CartManager: Final subscription cart item:', cartItem);
      return cartItem;
    } catch (error) {
      console.error("CartManager: Error preparing subscription product:", error);
      return null;
    }
  }
  
  async prepareOfferProduct(offer) {
    try {
      console.log('CartManager: Preparing real $0 Shopify product offer:', offer);

      // All offers are now real Shopify products with variant IDs
      let variantId = offer.variantId || offer.id;

      // Extract numeric ID from GraphQL format if present
      if (variantId && variantId.includes('gid://')) {
        variantId = variantId.split('/').pop();
      }

      console.log('CartManager: Using real Shopify variant ID:', variantId);

      if (!variantId) {
        console.error('CartManager: No variant ID found for offer:', offer);
        console.error('CartManager: All one-time offers must be real $0 Shopify products');
        return null;
      }

      // For real $0 Shopify products, we don't need to override pricing
      // The product's catalog price should already be $0
      const originalPrice = parseFloat(offer.price) || 0;
      const discountPercentage = offer.discountPercentage || 0;

      const cartItem = {
        id: variantId,
        quantity: offer.quantity || 1,
        // Don't set price - let Shopify use the catalog price ($0)
        properties: {
          _first_box_addon: "true",
          _offer_product: "true",
          _one_time_only: "true",
          _product_title: offer.title,
          _quantity: (offer.quantity || 1).toString(),
          _original_price: originalPrice.toFixed(2),
          _discount_percentage: discountPercentage.toString(),
          _is_shopify_zero_product: "true", // Mark as real $0 Shopify product
          // Copy over properties from the offer
          ...(offer.properties || {})
        },
      };

      // Log real $0 Shopify products
      if (originalPrice === 0) {
        console.log('✅ CartManager: Real $0 Shopify product prepared!');
        console.log('✅ CartManager: Product details:', {
          shopifyVariantId: cartItem.id,
          title: offer.title,
          isRealShopifyProduct: cartItem.properties._is_real_shopify_product === "true",
          catalogPrice: '$0 (from Shopify catalog)'
        });

        // Log the successful real product approach
        const debugLog = JSON.parse(localStorage.getItem('zeroOfferDebug') || '[]');
        debugLog.push({
          timestamp: new Date().toISOString(),
          action: 'REAL_ZERO_SHOPIFY_PRODUCT',
          data: {
            shopifyVariantId: cartItem.id,
            title: offer.title,
            approach: 'Real $0 Shopify catalog product'
          }
        });
        localStorage.setItem('zeroOfferDebug', JSON.stringify(debugLog));
      }

      console.log('CartManager: Prepared cart item for offer:', cartItem);
      return cartItem;
    } catch (error) {
      console.error("CartManager: Error preparing offer product:", error);
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
      console.error("Cart Manager Error:", error);
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
      console.error("Cart Manager Error:", error);
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
      console.error("Cart Manager Error:", error);
      return null;
    }
  }

  async createDraftOrder(cartItems, subscriptionData) {
    try {
      console.log('🔍 CartManager: createDraftOrder called with:', {
        cartItemsLength: cartItems.length,
        allCartItems: cartItems.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          type: item.type,
          properties: item.properties,
          hasCustomPricing: item.properties?._custom_pricing === "true"
        }))
      });

      const discountedOffers = cartItems.filter(item =>
        item.properties && item.properties._discount_applied === "true"
      );

      // Since all one-time offers are now real $0 Shopify products, we can use regular Cart API
      const realShopifyProducts = cartItems.filter(item =>
        item.properties && item.properties._is_real_shopify_product === "true"
      );

      // Only virtual products (if any) would require Draft Orders now
      const virtualProducts = cartItems.filter(item =>
        item.properties && item.properties._is_virtual_product === "true"
      );

      // Check which items specifically require Draft Order API (should be none now)
      const requiresDraftOrder = cartItems.filter(item =>
        item.properties && item.properties._requires_draft_order === "true"
      );

      console.log('CartManager: Analyzing cart items for API selection:', {
        cartItemsCount: cartItems.length,
        realShopifyProductsCount: realShopifyProducts.length,
        virtualProductsCount: virtualProducts.length,
        requiresDraftOrderCount: requiresDraftOrder.length,
        firstItem: cartItems[0] ? {
          id: cartItems[0].id,
          price: cartItems[0].price,
          isRealShopifyProduct: cartItems[0].properties?._is_real_shopify_product === "true",
          requiresDraftOrder: cartItems[0].properties?._requires_draft_order === "true",
          type: cartItems[0].type
        } : null
      });

      // Use Draft Order API ONLY for virtual products (should be rare/never now)
      // All $0 one-time offers are now real Shopify products and can use regular Cart API
      if (requiresDraftOrder.length > 0 || virtualProducts.length > 0) {
        console.log('CartManager: Using Draft Order API for virtual products');
        console.log('CartManager: Reasons for using Draft Order API:', {
          hasRequiresDraftOrder: requiresDraftOrder.length > 0,
          hasVirtualProducts: virtualProducts.length > 0,
          note: "All $0 one-time offers are now real Shopify products"
        });

        // Draft Orders should only be used for virtual products now (rare case)
        console.log('CartManager: Note - Draft Orders now only used for virtual products, not $0 offers');

        return await this.createDraftOrderWithDiscounts(cartItems, subscriptionData);
      } else {
        console.log('CartManager: Using regular Cart API - all items are real Shopify products');
        console.log('CartManager: Cart items for regular cart:', cartItems.map(item => ({
          id: item.id,
          price: item.price,
          type: item.type,
          isRealShopifyProduct: item.properties?._is_real_shopify_product === "true"
        })));
        return await this.createRegularSubscription(cartItems, subscriptionData);
      }
      
    } catch (error) {
      console.error("Cart Manager Error:", error);
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

      // Apply custom price for discounted offers OR $0 offers
      if (item.properties && item.properties._discount_applied === "true") {
        lineItem.price = item.price;
      } else if (item.price === 0) {
        // Critical: Set $0 price for zero offers
        lineItem.price = 0;
        console.log('CartManager: Setting $0 price for offer:', item.id);
      }

      // Add selling plan for subscription items
      if (item.selling_plan) {
        lineItem.selling_plan_id = item.selling_plan;
      }

      return lineItem;
    });

    // Draft Order payload - adjust to match API.draft-order.jsx format
    const draftOrderData = {
      items: cartItems.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: Math.round((item.price || 0) * 100), // Convert to cents
        properties: item.properties,
        selling_plan: item.selling_plan
      })),
      customerEmail: subscriptionData.customerEmail,
      frequency: subscriptionData.frequency
    };

    // Debug logging for $0 offers in Draft Order
    const zeroItemsInDraft = draftOrderData.items.filter(item => item.price === 0);
    if (zeroItemsInDraft.length > 0) {
      console.log('CartManager: Draft Order contains $0 items:', zeroItemsInDraft);

      const debugLog = JSON.parse(localStorage.getItem('zeroOfferDebug') || '[]');
      debugLog.push({
        timestamp: new Date().toISOString(),
        action: 'DRAFT_ORDER_WITH_ZERO_ITEMS',
        data: {
          zeroItemsCount: zeroItemsInDraft.length,
          zeroItems: zeroItemsInDraft
        }
      });
      localStorage.setItem('zeroOfferDebug', JSON.stringify(debugLog));
    }

    try {
      
      // Create Draft Order via our Remix app endpoint
      // Try multiple possible URLs for the API endpoint
      // Primary endpoint based on app proxy configuration (apps/subscription)
      const possibleUrls = [
        'https://marble-hills-subscriptions-production.up.railway.app/apps/subscription/draft-order', // Direct to production server
        '/apps/subscription/draft-order',     // PRIMARY: App proxy URL with virtual product support
        '/api/draft-order',                    // Fallback: Direct API route
        '/api/subscription/draft-order',       // Alternative path
        '/api/create-draft-order',
        '/webhooks/draft-order',
        window.location.origin + '/api/draft-order'
      ];
      
      let response;
      let lastError;

      console.log('CartManager: Attempting Draft Order API calls...');

      for (const url of possibleUrls) {
        try {
          console.log(`CartManager: Trying Draft Order API: ${url}`);

          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(draftOrderData)
          });

          console.log(`CartManager: Response from ${url}: status ${response.status}`);

          if (response.status !== 404) {
            console.log(`CartManager: Using Draft Order API endpoint: ${url}`);
            break;
          }
        } catch (error) {
          console.log(`CartManager: Error with ${url}:`, error.message);
          lastError = error;
        }
      }
      
      if (!response) {
        throw lastError || new Error("No API endpoint accessible");
      }

      const responseText = await response.text();

      console.log('CartManager: Draft Order API response text:', responseText);

      if (!response.ok) {
        console.error(`CartManager: Draft Order API failed with status ${response.status}:`, responseText);
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
      
      if (result.success && result.checkout_url) {
        
        return {
          success: true,
          checkout_url: result.checkout_url
        };
      } else {
        throw new Error(result.error || `API returned success: ${result.success}`);
      }

    } catch (error) {
      console.error("Cart Manager Error:", error);

      // CRITICAL: Do NOT fallback to Cart API if we have custom offers with unique variant IDs
      // as they don't exist in Shopify's catalog and will cause "Cannot find variant" errors
      const hasCustomOffers = cartItems.some(item =>
        item.properties && item.properties._custom_pricing === "true"
      );

      if (hasCustomOffers) {
        console.error('CartManager: ❌ CANNOT fallback to Cart API - custom offers with unique variant IDs detected');

        const debugLog = JSON.parse(localStorage.getItem('zeroOfferDebug') || '[]');
        debugLog.push({
          timestamp: new Date().toISOString(),
          action: 'DRAFT_ORDER_FAILED_NO_FALLBACK',
          error: error.message,
          customOffers: cartItems.filter(item => item.properties && item.properties._custom_pricing === "true")
        });
        localStorage.setItem('zeroOfferDebug', JSON.stringify(debugLog));

        return {
          success: false,
          error: `Draft Order API required for custom offers but failed: ${error.message}`
        };
      }

      // Fallback to regular cart only for standard products
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

      // All items should be added to cart, whether subscription products, Shopify one-time offers, or custom one-time offers
      // The Shopify Cart API can handle all valid variant IDs (real or generated)
      const allCartItems = cartItems;

      // Calculate total discount amount for cart-level discount code
      let totalOfferDiscount = 0;
      const discountedOffers = allCartItems.filter(item =>
        item.properties && item.properties._discount_applied === "true"
      );

      discountedOffers.forEach(offer => {
        const originalPrice = parseFloat(offer.properties._original_price);
        const discountAmount = parseFloat(offer.properties._savings_amount);
        totalOfferDiscount += discountAmount * offer.quantity;
      });
      
      console.log('DEBUG: Cart items received:', cartItems);

      // Debug: Check if $0 offers made it to this point
      const zeroOffersReceived = allCartItems.filter(item => item.price === 0);
      if (zeroOffersReceived.length > 0) {
        const debugLog = JSON.parse(localStorage.getItem('zeroOfferDebug') || '[]');
        debugLog.push({
          timestamp: new Date().toISOString(),
          action: 'ZERO_OFFERS_IN_ALL_CART_ITEMS',
          data: {
            zeroOffersCount: zeroOffersReceived.length,
            zeroOffers: zeroOffersReceived.map(item => ({
              id: item.id,
              price: item.price,
              title: item.title || 'no title',
              quantity: item.quantity
            }))
          }
        });
        localStorage.setItem('zeroOfferDebug', JSON.stringify(debugLog));
      }

      // Format cart items for Shopify Cart API
      const formattedCartItems = allCartItems.map(item => ({
        id: item.id,
        quantity: item.quantity,
        // Don't set price for real $0 Shopify products - let catalog price be used
        properties: item.properties,
        selling_plan: item.selling_plan // Keep selling plans for subscription products
      }));

      // Add all items to cart (subscription products, Shopify offers, and custom offers)
      if (allCartItems.length > 0) {

        console.log('✅ CartManager: Sending real Shopify products to Cart API:', formattedCartItems);

        // Log real $0 Shopify products being added
        const realZeroProducts = allCartItems.filter(item =>
          item.properties && item.properties._is_shopify_zero_product === "true"
        );

        if (realZeroProducts.length > 0) {
          console.log('✅ CartManager: Adding real $0 Shopify products to cart:', realZeroProducts.map(item => ({
            shopifyVariantId: item.id,
            title: item.properties._product_title,
            catalogPrice: '$0'
          })));

          // Log the successful approach
          const debugLog = JSON.parse(localStorage.getItem('zeroOfferDebug') || '[]');
          debugLog.push({
            timestamp: new Date().toISOString(),
            action: 'ADDING_REAL_ZERO_SHOPIFY_PRODUCTS',
            data: {
              realZeroProductsCount: realZeroProducts.length,
              approach: 'Real $0 Shopify catalog products via Cart API'
            }
          });
          localStorage.setItem('zeroOfferDebug', JSON.stringify(debugLog));
        }

        const response = await fetch("/cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: formattedCartItems,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Cart API Error:', errorData);

          // Special error handling for real $0 products
          if (realZeroProducts.length > 0) {
            console.error('❌ CartManager: Cart API failed with real $0 Shopify products - Error:', errorData);
          }

          throw new Error(`Failed to add products: ${errorData.message || 'Unknown error'}`);
        }

        // Success with real $0 products
        if (realZeroProducts.length > 0) {
          console.log('✅ CartManager: Cart API SUCCESS - Real $0 Shopify products added');

          // Log success
          const debugLog = JSON.parse(localStorage.getItem('zeroOfferDebug') || '[]');
          debugLog.push({
            timestamp: new Date().toISOString(),
            action: 'CART_API_SUCCESS_REAL_PRODUCTS',
            data: {
              message: 'Real $0 Shopify products added successfully via Cart API',
              realZeroProductsCount: realZeroProducts.length
            }
          });
          localStorage.setItem('zeroOfferDebug', JSON.stringify(debugLog));
        }
      }
      
      // Get cart after adding all products  
      const cartResponse = await fetch("/cart.js");
      if (!cartResponse.ok) {
        throw new Error("Failed to get cart data");
      }

      const cartData = await cartResponse.json();

      // Debug: Check if $0 offers are actually in the cart
      const currentCartItems = cartData.items || [];
      const zeroOfferFormattedItems = formattedCartItems.filter(item => item.price === 0);
      if (zeroOfferFormattedItems.length > 0) {
        console.log('🔥 CartManager: CHECKING CART CONTENTS FOR $0 OFFERS...');
        console.log('🔥 CartManager: Items we tried to add with $0:', zeroOfferFormattedItems.map(item => ({id: item.id, price: item.price, title: item.properties._product_title})));
        console.log('🔥 CartManager: Items actually in cart:', currentCartItems.map(item => ({id: item.variant_id, price: item.price, title: item.title})));

        // Check if our $0 offers made it to the cart
        zeroOfferFormattedItems.forEach(zeroOffer => {
          const foundInCart = currentCartItems.find(cartItem => cartItem.variant_id.toString() === zeroOffer.id.toString());

          // Persistent logging
          const debugLog = JSON.parse(localStorage.getItem('zeroOfferDebug') || '[]');

          if (foundInCart) {
            console.log(`🔥 CartManager: ✅ $0 offer found in cart:`, foundInCart);
            debugLog.push({
              timestamp: new Date().toISOString(),
              action: 'FOUND_IN_CART',
              data: {
                offerId: zeroOffer.id,
                foundItem: {
                  variant_id: foundInCart.variant_id,
                  price: foundInCart.price,
                  title: foundInCart.title,
                  quantity: foundInCart.quantity
                }
              }
            });
          } else {
            console.log(`🔥 CartManager: ❌ $0 offer NOT found in cart! ID: ${zeroOffer.id}`);
            debugLog.push({
              timestamp: new Date().toISOString(),
              action: 'NOT_FOUND_IN_CART',
              data: {
                offerId: zeroOffer.id,
                allCartItems: currentCartItems.map(item => ({
                  variant_id: item.variant_id,
                  price: item.price,
                  title: item.title
                }))
              }
            });
          }

          localStorage.setItem('zeroOfferDebug', JSON.stringify(debugLog));
        });
      }

      // Calculate totals
      const selectedProducts = subscriptionData.selectedProducts || [];
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
            has_one_time_offers: ((subscriptionData.oneTimeOffers || []).length > 0).toString(),
            offer_count: (subscriptionData.oneTimeOffers || []).length.toString(),
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
      console.error("Cart Manager Error:", error);
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
