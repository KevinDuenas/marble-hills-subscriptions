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
      for (const offer of oneTimeOffers) {
        const cartItem = await this.prepareOfferProduct(offer);
        if (cartItem) {
          allCartItems.push(cartItem);
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
          [`_product_${index + 1}_price`]: (product.price / 100).toFixed(2),
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
          _total_price: (totalPrice / 100).toFixed(2),
          _bundle_created: new Date().toISOString(),
          _frequency_text: this.frequencyText[subscriptionData.frequency],
          _calculated_total: `$${(totalPrice / 100).toFixed(2)}`,
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
        bundleItem.properties._discounted_price = `$${(discountedPrice / 100).toFixed(2)}`;
        bundleItem.properties._discount_amount = `${discountPercentage}%`;
        
        console.log(`✅ Bundle created:`);
        console.log(`   - ${totalCount} products`);
        console.log(`   - ${this.frequencyText[subscriptionData.frequency]}`);
        console.log(`   - ${discountPercentage}% discount (Selling Plan: ${sellingPlanId})`);
        console.log(`   - Original price: $${(totalPrice / 100).toFixed(2)}`);
        console.log(`   - Discounted price: $${(discountedPrice / 100).toFixed(2)}`);
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

      return {
        id: variantId,
        quantity: offer.quantity,
        properties: {
          _first_box_addon: "true",
          _offer_product: "true",
          _product_title: offer.title,
          _selected_variant: offer.selectedVariant.title,
          _quantity: offer.quantity.toString(),
        },
      };
    } catch (error) {
      console.error(`Error preparing offer ${offer.id}:`, error);
      return null;
    }
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
      
    } catch (error) {
      console.error("❌ Error creating subscription:", error);
      return {
        success: false,
        error: "Network error creating checkout"
      };
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

      // Add items
      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cartItems,
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
            calculated_total: selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0) / 100,
            display_price: `$${(selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0) / 100).toFixed(2)}`,
            subscription_note: `Custom subscription with ${totalCount} products and ${discount}% discount`
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
