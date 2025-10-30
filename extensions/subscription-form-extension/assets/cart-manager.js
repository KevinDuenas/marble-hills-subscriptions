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
    
  }

  getSellingPlanId(totalCount, frequency) {
    
    let discountTier = "0";
    
    const config = this.milestoneConfig || window.mainSubscriptionManager?.milestoneConfig || {
      milestone1Items: 6,
      milestone1Discount: 5.0,
      milestone2Items: 10,
      milestone2Discount: 10.0,
    };
    
    
    if (totalCount >= config.milestone2Items) {
      discountTier = config.milestone2Discount.toString();
    } else if (totalCount >= config.milestone1Items) {
      discountTier = config.milestone1Discount.toString();
    }
    
    
    if (this.sellingPlans[discountTier] && this.sellingPlans[discountTier][frequency]) {
      const planId = this.sellingPlans[discountTier][frequency];
      
      // Validate that the plan ID is not empty or null
      if (!planId || planId.trim() === '') {
        return null;
      }
      
      return planId;
    }
    
    if (this.sellingPlans[discountTier]) {
    }
    return null;
  }

  async createSubscription(subscriptionData) {
    try {

      // Check if there are one-time offers
      if (subscriptionData.oneTimeOffers && subscriptionData.oneTimeOffers.length > 0) {
        // Process one-time offers for inclusion in subscription
      }

      // CRITICAL: Mark that we're starting subscription creation
      // This completely disables cart protection to avoid any interference
      if (window.cartProtection) {
        window.cartProtection.startSubscriptionCreation();
      }
      
      const selectedProducts = subscriptionData.selectedProducts || [];
      const oneTimeOffers = subscriptionData.oneTimeOffers || [];
      
      
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
      for (const offer of oneTimeOffers) {
        const cartItem = await this.prepareOfferProduct(offer);
        if (cartItem) {
          allCartItems.push(cartItem);
        }
      }
      

      if (allCartItems.length === 0) {
        throw new Error("No products to add to cart");
      }

      // Add all items to cart using regular Cart API
      const result = await this.addToCartWithSubscription(allCartItems, discount, subscriptionData);

      if (result.success) {
        // IMPORTANT: Don't finish subscription creation yet
        // We're about to redirect to checkout, so cart protection shouldn't interfere
        window.location.href = "/checkout";
      } else {
        throw new Error(result.error || "Failed to add products to cart");
      }
    } catch (error) {
      // On error, finish subscription creation to re-enable protection
      if (window.cartProtection) {
        window.cartProtection.finishSubscriptionCreation();
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
      return null;
    }
  }

  async prepareSubscriptionProduct(product, subscriptionData, totalCount) {
    try {
      
      // Use the selected variant directly
      const variantId = product.selectedVariant?.id;
      
      
      if (!variantId) {
        return null;
      }

      // Get the appropriate selling plan
      const sellingPlanId = this.getSellingPlanId(totalCount, subscriptionData.frequency);
      
      
      const cartItem = {
        id: parseInt(variantId), // Ensure numeric ID for Shopify Cart API
        quantity: parseInt(product.quantity),
        properties: {
          _subscription_type: "custom",
          _frequency: subscriptionData.frequency,
          _frequency_text: this.frequencyText[subscriptionData.frequency] || subscriptionData.frequency,
          _product_title: product.title || "Unknown Product",
          _selected_variant: product.selectedVariant?.title || "Default",
          _quantity: product.quantity.toString(),
          _custom_selection: "true",
          _protected_item: "true", // Mark for cart protection
          _is_subscription: "true",
          _recurring: "true"
        },
      };

      // Add selling plan if available (THIS IS CRITICAL FOR SUBSCRIPTIONS)
      if (sellingPlanId) {
        cartItem.selling_plan = sellingPlanId.toString(); // Ensure string for Shopify API

        // Add selling plan info to properties for tracking
        cartItem.properties._selling_plan_id = sellingPlanId.toString();
        cartItem.properties._has_selling_plan = "true";
      } else {
        cartItem.properties._has_selling_plan = "false";
      }

      // Validate cart item before returning
      if (!cartItem.id || cartItem.quantity <= 0) {
        return null;
      }

      // Clean up any undefined properties that could cause cart errors
      if (cartItem.properties) {
        Object.keys(cartItem.properties).forEach(key => {
          if (cartItem.properties[key] === undefined || cartItem.properties[key] === null) {
            delete cartItem.properties[key];
          }
        });
      }

      return cartItem;
    } catch (error) {
      return null;
    }
  }
  
  async prepareOfferProduct(offer) {
    try {
      // All offers are now real $0 Shopify products with variant IDs
      // IMPORTANT: Use variantId, NOT id - the id is for tracking, variantId is for Shopify
      let variantId = offer.variantId;

      // Validate that variantId exists
      if (!variantId) {
        return null;
      }

      // Extract numeric ID from GraphQL format if present
      if (variantId.includes('gid://')) {
        variantId = variantId.split('/').pop();
      }

      // Validate variantId is a valid number
      const numericVariantId = parseInt(variantId);
      if (isNaN(numericVariantId)) {
        return null;
      }

      const cartItem = {
        id: parseInt(variantId), // Ensure numeric ID for Shopify Cart API
        quantity: parseInt(offer.quantity || 1),
        properties: {
          _first_box_addon: "true",
          _offer_product: "true",
          _one_time_only: "true",
          _product_title: offer.title,
          _quantity: (offer.quantity || 1).toString(),
          // Copy over properties from the offer
          ...(offer.properties || {})
        },
      };

      // Validate cart item before returning
      if (!cartItem.id || cartItem.quantity <= 0) {
        return null;
      }

      // Clean up any undefined properties that could cause cart errors
      if (cartItem.properties) {
        Object.keys(cartItem.properties).forEach(key => {
          if (cartItem.properties[key] === undefined || cartItem.properties[key] === null) {
            delete cartItem.properties[key];
          }
        });
      }

      return cartItem;
    } catch (error) {
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
      return null;
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

      // All items should be added to cart
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

      // Format cart items for Shopify Cart API
      const formattedCartItems = allCartItems.map(item => ({
        id: item.id,
        quantity: item.quantity,
        properties: item.properties,
        selling_plan: item.selling_plan // Keep selling plans for subscription products
      }));

      // Add all items to cart
      if (allCartItems.length > 0) {
        // Debug: Log exact payload being sent to Shopify

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

          // Try to get more specific error information
          if (errorData.description) {
          }
          if (errorData.errors) {
          }

          const errorMessage = errorData.description || errorData.message || errorData.errors || 'Unknown cart error';
          throw new Error(`Failed to add products to cart: ${errorMessage}`);
        }
      }
      
      // Get cart after adding all products  
      const cartResponse = await fetch("/cart.js");
      if (!cartResponse.ok) {
        throw new Error("Failed to get cart data");
      }

      const cartData = await cartResponse.json();


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

      // NOTE: We don't re-enable cart protection here
      // The isCreatingSubscription flag will remain true until page redirect
      // This prevents any interference during checkout redirect

      return { success: true, cart: cartData };
    } catch (error) {
      // On error, finish subscription creation to re-enable protection
      if (window.cartProtection) {
        window.cartProtection.finishSubscriptionCreation();
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
