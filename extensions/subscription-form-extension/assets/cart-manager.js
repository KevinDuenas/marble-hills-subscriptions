// Cart and Subscription Management - Updated for new 3-step flow
class CartManager {
  constructor() {
    this.frequencyText = {
      "2weeks": "Every 2 weeks",
      "4weeks": "Every 4 weeks",
      "6weeks": "Every 6 weeks",
    };
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

      // Prepare all cart items (subscription products + offers)
      const allCartItems = [];
      
      // Add subscription products
      for (const product of selectedProducts) {
        const cartItem = await this.prepareSubscriptionProduct(product, subscriptionData);
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

      // Add to cart
      const cartResponse = await this.addToCartWithSubscription(
        allCartItems,
        discount,
        subscriptionData
      );

      if (cartResponse.success) {
        // Direct redirect to cart (no delay)
        window.location.href = "/cart";
      } else {
        throw new Error(cartResponse.error || "Error adding to cart");
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

  async prepareSubscriptionProduct(product, subscriptionData) {
    try {
      // Use the selected variant directly
      const variantId = product.selectedVariant?.id;
      
      if (!variantId) {
        console.error(`No variant found for product ${product.id}`);
        return null;
      }

      return {
        id: variantId,
        quantity: product.quantity,
        properties: {
          _subscription_type: "custom",
          _frequency: subscriptionData.frequency,
          _product_title: product.title,
          _selected_variant: product.selectedVariant.title,
          _quantity: product.quantity.toString(),
          _custom_selection: "true",
        },
      };
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

  async addToCartWithSubscription(cartItems, discount = 0, subscriptionData) {
    try {
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
            subscription_type: "custom", // Always custom now
            frequency: subscriptionData.frequency,
            discount_percentage: discount.toString(),
            product_count: totalCount.toString(),
            unique_products: selectedProducts.length.toString(),
            customer_email: subscriptionData.customerEmail || "",
            has_one_time_offers: (oneTimeOffers.length > 0).toString(),
            offer_count: oneTimeOffers.length.toString()
          },
        }),
      });

      return { success: true, cart: cartData };
    } catch (error) {
      console.error("Cart error:", error);
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
