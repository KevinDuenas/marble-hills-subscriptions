// One-Time Offer Manager for Step 3
class OneTimeOfferManager {
  constructor() {
    this.offerProducts = [];
    this.selectedOffers = [];
    
    // Initialize email validation when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeEmailValidation();
        this.updateAddToCartButtonState(); // Set initial state
      });
    } else {
      // DOM already loaded
      this.initializeEmailValidation();
      this.updateAddToCartButtonState(); // Set initial state
    }
  }

  async loadOfferProducts() {
    try {
      // Get shop domain from current URL
      const shopDomain = window.location.hostname;
      const shopName = shopDomain.replace('.myshopify.com', '');
      
      console.log('OneTimeOfferManager: Loading offers for shop:', shopName, 'from domain:', shopDomain);
      
      // Fetch offers from our app proxy API
      const apiUrl = `/apps/subscription/api/one-time-offers?shop=${shopName}`;
      console.log('OneTimeOfferManager: Fetching from API:', apiUrl);
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      console.log('OneTimeOfferManager: API response:', data);

      if (data.offers && data.offers.length > 0) {
        console.log('OneTimeOfferManager: Found', data.offers.length, 'offers');
        this.offerProducts = data.offers;
        this.displayOfferProducts();
      } else {
        console.log('OneTimeOfferManager: No offers found, displaying demo offers');
        this.displayDemoOffers();
      }
      
      setTimeout(() => {
        this.initializeEmailValidation();
        this.updateAddToCartButtonState();
      }, 100);
      
    } catch (error) {
      console.error('Error loading One Time Offers:', error);
      this.displayDemoOffers();
      
      setTimeout(() => {
        this.initializeEmailValidation();
        this.updateAddToCartButtonState();
      }, 100);
    }
  }


  // Calculate discount percentage from price vs comparedAtPrice
  calculateDiscountPercentage(price, comparedAtPrice) {
    if (comparedAtPrice > 0 && price > 0 && comparedAtPrice > price) {
      const discountAmount = comparedAtPrice - price;
      const discountPercentage = Math.round((discountAmount / comparedAtPrice) * 100);
      return discountPercentage;
    }
    
    return 0; // No discount
  }

  // Calculate discounted price
  calculateDiscountedPrice(originalPrice, discountPercentage) {
    if (discountPercentage === 0) return originalPrice;
    
    const discount = (originalPrice * discountPercentage) / 100;
    return originalPrice - discount;
  }

  // Generate a valid-looking Shopify variant ID from database ID
  generateVariantId(databaseId) {
    // Convert database ID hash to a numeric string that looks like a Shopify variant ID
    let hash = 0;
    for (let i = 0; i < databaseId.length; i++) {
      const char = databaseId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure positive number and make it 14-digit like real Shopify variant IDs
    const positiveHash = Math.abs(hash);
    const variantId = String(positiveHash).padStart(14, '9');
    return variantId;
  }


  displayOfferProducts() {
    const offerProductsContainer = document.getElementById('offer-products-grid');
    if (!offerProductsContainer) return;

    console.log('OneTimeOfferManager: Displaying', this.offerProducts.length, 'offer products');

    const offerCards = this.offerProducts.map(offer => {
      // Extract numeric variant ID from GraphQL ID if present
      let variantId = offer.shopifyVariantId;
      if (variantId && variantId.includes('gid://')) {
        variantId = variantId.split('/').pop();
      }
      
      console.log('OneTimeOfferManager: Processing offer:', offer.title, 'variantId:', variantId);
      
      const isSelected = this.selectedOffers.some(selectedOffer => selectedOffer.id === offer.id);
      const currentPrice = parseFloat(offer.price) || 0;
      const comparedAtPrice = parseFloat(offer.comparedAtPrice) || 0;
      const discountPercentage = this.calculateDiscountPercentage(currentPrice, comparedAtPrice);
      const hasDiscount = discountPercentage > 0;
      
      return `
        <div class="product-card offer-product-card ${isSelected ? 'selected' : ''}" data-product-id="${offer.id}">
          ${hasDiscount ? `<div class="discount-badge">${discountPercentage}% OFF</div>` : ''}
          
          <div class="product-image">
            ${offer.imageUrl ? `<img src="${offer.imageUrl}" alt="${offer.title}">` : '<div class="no-image">No image</div>'}
          </div>
          
          <div class="product-info">
            <div class="product-info-row">
              <div class="product-title">${offer.title}</div>
              <div class="product-price-container">
                ${hasDiscount ? `<div class="original-price">$${comparedAtPrice.toFixed(2)}</div>` : ''}
                <div class="offer-price">$${currentPrice.toFixed(2)}</div>
              </div>
            </div>
            
            ${offer.description ? `<p class="product-description">${offer.description}</p>` : ''}
            
            <div class="product-actions">
              <button class="add-offer-btn ${isSelected ? 'selected' : ''}" 
                      onclick="window.oneTimeOfferManager.toggleOffer('${offer.id}')">
                ${isSelected ? 'Added ✓' : 'Add to First Box'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    offerProductsContainer.innerHTML = offerCards;
    
    // Update button state after displaying products
    this.updateAddToCartButtonState();
  }

  displayDemoOffers() {
    const offerProductsContainer = document.getElementById('offer-products-grid');
    if (!offerProductsContainer) {
      return;
    }

    // Demo offers if no products found
    const demoOffers = [
      {
        id: 'demo1',
        title: 'Premium Steak Cut',
        description: 'Exclusive cut for first-time subscribers',
        originalPrice: '$39.99',
        offerPrice: '$19.99'
      },
      {
        id: 'demo2',
        title: 'Gourmet Seasoning Set',
        description: 'Professional grade seasonings',
        originalPrice: '$24.99',
        offerPrice: '$12.49'
      },
      {
        id: 'demo3',
        title: 'Artisan Sides Bundle',
        description: 'Handcrafted side dishes',
        originalPrice: '$29.99',
        offerPrice: '$14.99'
      }
    ];

    const offerCards = demoOffers.map(offer => {
      const isSelected = this.selectedOffers.some(selected => selected.id === offer.id);
      
      return `
        <div class="offer-product-card ${isSelected ? 'selected' : ''}" data-product-id="${offer.id}">
          <div class="product-image">
            <div style="color: #999; display: flex; align-items: center; justify-content: center; height: 100%;">Demo Product</div>
          </div>
          
          <div class="product-info">
            <div class="product-info-row">
              <div class="product-title">${offer.title}</div>
              <div class="product-price">${offer.offerPrice}</div>
            </div>
            <p class="product-description">${offer.description}</p>
            
            <div class="offer-pricing">
              <span class="original-price">${offer.originalPrice}</span>
            </div>
            
            <div class="product-actions">
              <button class="add-offer-btn ${isSelected ? 'selected' : ''}" onclick="window.oneTimeOfferManager.toggleDemoOffer('${offer.id}', '${offer.title}', '${offer.offerPrice}')">
                ${isSelected ? 'Added ✓' : 'Add to First Box'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    offerProductsContainer.innerHTML = offerCards;
    
    // Update button state after displaying demo products
    this.updateAddToCartButtonState();
  }

  toggleOffer(offerId) {
    console.log('OneTimeOfferManager: Toggle offer called for:', offerId);

    const offer = this.offerProducts.find(p => p.id === offerId);
    if (!offer) {
      console.error('OneTimeOfferManager: Offer not found:', offerId);
      return;
    }

    console.log('OneTimeOfferManager: Found offer:', offer);

    const existingOfferIndex = this.selectedOffers.findIndex(selectedOffer => selectedOffer.id === offerId);

    if (existingOfferIndex > -1) {
      // Remove offer
      console.log('OneTimeOfferManager: Removing offer:', offer.title);
      this.selectedOffers.splice(existingOfferIndex, 1);
    } else {
      // SINGLE SELECTION: Remove any existing offers first
      this.selectedOffers = [];

      // Add new offer
      const price = parseFloat(offer.price) || 0;
      const comparedAtPrice = parseFloat(offer.comparedAtPrice) || 0;

      console.log('OneTimeOfferManager: Adding offer with price:', price, 'comparedAtPrice:', comparedAtPrice);

      const discountPercentage = this.calculateDiscountPercentage(price, comparedAtPrice);
      const savingsAmount = comparedAtPrice > price ? (comparedAtPrice - price) : 0;

      console.log('OneTimeOfferManager: Calculated discount:', discountPercentage, '%, savings:', savingsAmount);

      // CRITICAL: Special logging for $0 offers
      if (price === 0) {
        console.log('🚨 ZERO DOLLAR OFFER DETECTED! 🚨');
        console.log('OneTimeOfferManager: Processing $0 offer:', offer.title);
        const debugLog = JSON.parse(localStorage.getItem('zeroOfferDebug') || '[]');
        debugLog.push({
          timestamp: new Date().toISOString(),
          action: 'ZERO_OFFER_SELECTED',
          offer: {
            id: offerId,
            title: offer.title,
            price: price,
            originalShopifyVariantId: offer.shopifyVariantId
          }
        });
        localStorage.setItem('zeroOfferDebug', JSON.stringify(debugLog));
      }
      
      // SIMPLIFIED APPROACH: Always use real Shopify variant IDs
      // All one-time offers are now real $0 products created in the admin
      let variantIdToUse;

      if (!offer.shopifyVariantId) {
        console.error('OneTimeOfferManager: No Shopify variant ID found for offer:', offer.title);
        console.error('OneTimeOfferManager: All one-time offers must be real $0 products created in Shopify admin');
        return; // Skip offers without real Shopify variant IDs
      }

      // Extract numeric ID from GraphQL format if present
      variantIdToUse = offer.shopifyVariantId.includes('gid://')
        ? offer.shopifyVariantId.split('/').pop()
        : offer.shopifyVariantId;

      console.log('OneTimeOfferManager: Using real Shopify $0 product variant:', variantIdToUse, 'for offer:', offer.title);

      const offerData = {
        id: offerId, // Keep original ID for UI tracking
        variantId: variantIdToUse,
        title: offer.title,
        image: offer.imageUrl || "",
        price: price,
        quantity: 1,
        type: "real-shopify-offer", // Real $0 Shopify product
        discountPercentage: discountPercentage,
        originalShopifyVariantId: offer.shopifyVariantId,
        properties: {
          _offer_position: offer.position,
          _offer_description: offer.description || '',
          _original_price: price,
          _savings_amount: savingsAmount,
          _discount_percentage: discountPercentage,
          _is_one_time_offer: "true",
          _is_real_shopify_product: "true", // Always true now
          _product_title: offer.title,
          _shopify_variant_id: variantIdToUse,
          // No custom pricing needed - these are real $0 products
          _custom_pricing: "false",
          _requires_draft_order: "false" // Never needed for real products
        }
      };

      // One-time offers don't need selling plans - they are one-time purchases
      console.log('OneTimeOfferManager: Real $0 Shopify product configured for offer:', offer.title, 'variant:', variantIdToUse);

      this.selectedOffers.push(offerData);
      console.log('OneTimeOfferManager: Offer added! Selected offers now:', this.selectedOffers);
    }

    this.updateOfferUI(offerId);
  }

  toggleDemoOffer(offerId, title, price) {
    const existingOfferIndex = this.selectedOffers.findIndex(offer => offer.id === offerId);
    
    if (existingOfferIndex > -1) {
      // Remove offer
      this.selectedOffers.splice(existingOfferIndex, 1);
    } else {
      // SINGLE SELECTION: Remove any existing offers first
      this.selectedOffers = [];
      
      // Add demo offer with valid variant ID
      const priceInCents = parseFloat(price.replace('$', '')) * 100;
      const validVariantId = this.generateVariantId(offerId);
      this.selectedOffers.push({
        id: validVariantId,
        title: title,
        image: "",
        price: priceInCents,
        selectedVariant: { id: validVariantId, title: title, price: priceInCents },
        quantity: 1,
        type: "one-time-offer"
      });
    }

    this.updateOfferUI(offerId);
  }

  updateOfferUI(productId) {
    // Update ALL offer cards since we only allow single selection
    const allCards = document.querySelectorAll('.offer-product-card');
    
    allCards.forEach(card => {
      const cardProductId = card.dataset.productId;
      // Check both direct ID match and generated variant ID match
      const isSelected = this.selectedOffers.some(offer => 
        offer.id == cardProductId || 
        offer.id == this.generateVariantId(cardProductId)
      );
      const button = card.querySelector('.add-offer-btn') || card.querySelector('.add-to-first-box-btn');
      
      card.classList.toggle('selected', isSelected);
      
      if (button) {
        button.classList.toggle('selected', isSelected);
        button.textContent = isSelected ? 'Added ✓' : 'Add to First Box';
      }
    });
    
    // Update the final Add to Cart button state
    this.updateAddToCartButtonState();
  }

  updateAddToCartButtonState() {
    const addToCartBtn = document.getElementById('final-add-to-cart-btn');
    const skipOfferBtn = document.getElementById('skip-offer-btn');
    const emailInput = document.getElementById('customer-email');
    
    console.log('OneTimeOfferManager: Updating button state');
    console.log('OneTimeOfferManager: Add to cart button found:', !!addToCartBtn);
    
    if (!addToCartBtn) return;
    
    // Check if email is valid
    const emailValue = emailInput ? emailInput.value.trim() : '';
    const isEmailValid = this.isValidEmail(emailValue);
    
    // Check if at least one offer is selected
    const hasSelectedOffer = this.selectedOffers.length > 0;
    
    console.log('OneTimeOfferManager: Email valid:', isEmailValid);
    console.log('OneTimeOfferManager: Has selected offer:', hasSelectedOffer);
    console.log('OneTimeOfferManager: Selected offers count:', this.selectedOffers.length);
    
    // Enable button only if BOTH conditions are met: valid email AND selected offer
    const shouldEnable = isEmailValid && hasSelectedOffer;
    
    console.log('OneTimeOfferManager: Should enable button:', shouldEnable);
    
    addToCartBtn.disabled = !shouldEnable;
    
    // Update button appearance
    if (shouldEnable) {
      addToCartBtn.style.opacity = '1';
      addToCartBtn.style.cursor = 'pointer';
    } else {
      addToCartBtn.style.opacity = '0.6';
      addToCartBtn.style.cursor = 'not-allowed';
    }
    
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Initialize email validation listener
  initializeEmailValidation() {
    const emailInput = document.getElementById('customer-email');
    
    if (emailInput && !emailInput.hasAttribute('data-validation-initialized')) {
      // Mark as initialized to prevent duplicate listeners
      emailInput.setAttribute('data-validation-initialized', 'true');
      
      // Update button state on email input
      emailInput.addEventListener('input', () => {
        this.updateAddToCartButtonState();
      });
      
      // Update button state on email blur (when user leaves field)
      emailInput.addEventListener('blur', () => {
        this.updateAddToCartButtonState();
      });
      
    }
  }

  getSelectedOffers() {
    console.log('OneTimeOfferManager: getSelectedOffers called, current selectedOffers:', this.selectedOffers);

    // Ensure variant IDs are in numeric format for cart API
    const processedOffers = this.selectedOffers.map(offer => {
      // For custom offers, ALWAYS use the unique variantId we generated
      // This ensures we bypass Shopify's catalog pricing completely
      let variantId = offer.variantId;

      // Extract numeric ID from GraphQL format if present (only for real Shopify variants)
      if (variantId && variantId.includes('gid://')) {
        variantId = variantId.split('/').pop();
      }

      const processedOffer = {
        ...offer,
        id: variantId, // Use the unique variant ID as the item ID for cart
        variantId: variantId
      };

      console.log('OneTimeOfferManager: Processing offer for cart:', processedOffer);

      // CRITICAL: Debug logging for $0 offers
      if (offer.price === 0) {
        console.log('🚨 ZERO DOLLAR OFFER BEING SENT TO CART! 🚨');
        console.log('OneTimeOfferManager: $0 offer data for cart:', {
          id: processedOffer.id,
          variantId: processedOffer.variantId,
          title: processedOffer.title,
          price: processedOffer.price,
          properties: processedOffer.properties
        });

        const debugLog = JSON.parse(localStorage.getItem('zeroOfferDebug') || '[]');
        debugLog.push({
          timestamp: new Date().toISOString(),
          action: 'ZERO_OFFER_SENT_TO_CART',
          offer: {
            id: processedOffer.id,
            variantId: processedOffer.variantId,
            title: processedOffer.title,
            price: processedOffer.price,
            hasCustomPricing: processedOffer.properties?._custom_pricing === "true",
            hasProductTitle: !!processedOffer.properties?._product_title
          }
        });
        localStorage.setItem('zeroOfferDebug', JSON.stringify(debugLog));
      }

      return processedOffer;
    });

    console.log('OneTimeOfferManager: Returning processed offers to cart:', processedOffers);
    return processedOffers;
  }

  // Get selected variant from dropdown for a product
  getSelectedVariant(productId) {
    const variantSelector = document.querySelector(`select[data-product-id="${productId}"]`);
    if (variantSelector) {
      const selectedOption = variantSelector.options[variantSelector.selectedIndex];
      const variantId = selectedOption.value;
      const price = selectedOption.getAttribute('data-price');
      const comparedPrice = selectedOption.getAttribute('data-compared-price');
      
      return {
        id: variantId,
        title: selectedOption.text,
        price: price,
        compare_at_price: comparedPrice
      };
    }
    return null;
  }

  clearSelectedOffers() {
    this.selectedOffers = [];
    
    // Update UI
    document.querySelectorAll('.offer-product-card').forEach(card => {
      card.classList.remove('selected');
      const button = card.querySelector('.add-offer-btn') || card.querySelector('.add-to-first-box-btn');
      if (button) {
        button.classList.remove('selected');
        button.textContent = 'Add to First Box';
      }
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
  window.oneTimeOfferManager = new OneTimeOfferManager();
});