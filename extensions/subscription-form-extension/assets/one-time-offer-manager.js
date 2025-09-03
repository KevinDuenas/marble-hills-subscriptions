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
      const response = await fetch("/products.json?limit=50");
      const data = await response.json();

      if (data.products) {
        let filteredProducts = data.products.filter(product => 
          product.tags && product.tags.includes('sb-one-time-offer')
        );

        filteredProducts.sort((a, b) => {
          const priorityA = this.getProductPriority(a);
          const priorityB = this.getProductPriority(b);
          return priorityA - priorityB;
        });

        this.offerProducts = filteredProducts.slice(0, 3);
        
        if (this.offerProducts.length > 0) {
          this.displayOfferProducts();
        } else {
          this.displayDemoOffers();
        }
        
        setTimeout(() => {
          this.initializeEmailValidation();
          this.updateAddToCartButtonState();
        }, 100);
      }
    } catch (error) {
      this.displayDemoOffers();
      
      setTimeout(() => {
        this.initializeEmailValidation();
        this.updateAddToCartButtonState();
      }, 100);
    }
  }

  // Extract priority from product tags (sb-oto-priority-1, sb-oto-priority-2, etc.)
  getProductPriority(product) {
    if (!product.tags) return 999; // No tags = lowest priority
    
    const priorityTag = product.tags.find(tag => tag.startsWith('sb-oto-priority-'));
    if (priorityTag) {
      const priorityNumber = parseInt(priorityTag.split('-').pop());
      return isNaN(priorityNumber) ? 999 : priorityNumber;
    }
    
    return 99; // Default priority (lower than no priority tag)
  }

  // Extract discount percentage from product tags (sb-oto-discount-10, sb-oto-discount-15, etc.)
  getProductDiscount(product) {
    if (!product.tags) return 0;
    
    const discountTag = product.tags.find(tag => tag.startsWith('sb-oto-discount-'));
    if (discountTag) {
      const discountNumber = parseInt(discountTag.split('-').pop());
      return isNaN(discountNumber) ? 0 : discountNumber;
    }
    
    return 0; // No discount
  }

  // Calculate discounted price
  calculateDiscountedPrice(originalPrice, discountPercentage) {
    if (discountPercentage === 0) return originalPrice;
    
    const discount = (originalPrice * discountPercentage) / 100;
    return originalPrice - discount;
  }


  displayOfferProducts() {
    const offerProductsContainer = document.getElementById('offer-products-grid');
    if (!offerProductsContainer) return;

    const offerCards = this.offerProducts.map(product => {
      const isSelected = this.selectedOffers.some(offer => offer.id === product.id);
      const imageSrc = (product.images && product.images[0]?.src) || "";
      const originalPrice = product.variants[0] ? parseFloat(product.variants[0].price) : 0;
      const discountPercentage = this.getProductDiscount(product);
      const discountedPrice = this.calculateDiscountedPrice(originalPrice, discountPercentage);
      const hasDiscount = discountPercentage > 0;
      
      return `
        <div class="product-card offer-product-card ${isSelected ? 'selected' : ''}" data-product-id="${product.id}">
          ${hasDiscount ? `<div class="discount-badge">${discountPercentage}% OFF</div>` : ''}
          
          <div class="product-image">
            ${imageSrc ? `<img src="${imageSrc}" alt="${product.title}">` : '<div class="no-image">No image</div>'}
          </div>
          
          <div class="product-info">
            <div class="product-info-row">
              <div class="product-title">${product.title}</div>
              <div class="product-price-container">
                ${hasDiscount ? `<div class="original-price">$${originalPrice.toFixed(2)}</div>` : ''}
                <div class="offer-price">$${discountedPrice.toFixed(2)}</div>
              </div>
            </div>
            
            <div class="variant-selector">
              <select data-product-id="${product.id}">
                ${product.variants.map(variant => {
                  const variantOriginalPrice = parseFloat(variant.price);
                  const variantDiscountedPrice = this.calculateDiscountedPrice(variantOriginalPrice, discountPercentage);
                  const priceDisplay = hasDiscount ? 
                    `${variant.title} - $${variantDiscountedPrice.toFixed(2)} (was $${variantOriginalPrice.toFixed(2)})` :
                    `${variant.title} - $${variantOriginalPrice.toFixed(2)}`;
                  
                  return `
                    <option value="${variant.id}" data-price="${variant.price}" data-discounted-price="${variantDiscountedPrice}">
                      ${priceDisplay}
                    </option>
                  `;
                }).join('')}
              </select>
            </div>
            
            <div class="product-actions">
              <button class="add-offer-btn ${isSelected ? 'selected' : ''}" 
                      onclick="window.oneTimeOfferManager.toggleOffer(${product.id})">
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

  toggleOffer(productId) {
    const product = this.offerProducts.find(p => p.id === productId);
    if (!product) return;

    const existingOfferIndex = this.selectedOffers.findIndex(offer => offer.id === productId);
    
    if (existingOfferIndex > -1) {
      // Remove offer
      this.selectedOffers.splice(existingOfferIndex, 1);
    } else {
      // SINGLE SELECTION: Remove any existing offers first
      this.selectedOffers = [];
      
      // Add new offer with discount information
      const discountPercentage = this.getProductDiscount(product);
      const selectedVariant = this.getSelectedVariant(productId) || product.variants[0];
      
      this.selectedOffers.push({
        id: productId,
        title: product.title,
        image: (product.images && product.images[0]?.src) || "",
        price: product.variants[0]?.price || 0,
        selectedVariant: selectedVariant,
        quantity: 1,
        type: "one-time-offer",
        discountPercentage: discountPercentage
      });
    }

    this.updateOfferUI(productId);
  }

  toggleDemoOffer(offerId, title, price) {
    const existingOfferIndex = this.selectedOffers.findIndex(offer => offer.id === offerId);
    
    if (existingOfferIndex > -1) {
      // Remove offer
      this.selectedOffers.splice(existingOfferIndex, 1);
    } else {
      // SINGLE SELECTION: Remove any existing offers first
      this.selectedOffers = [];
      
      // Add demo offer
      const priceInCents = parseFloat(price.replace('$', '')) * 100;
      this.selectedOffers.push({
        id: offerId,
        title: title,
        image: "",
        price: priceInCents,
        selectedVariant: { id: offerId, title: title, price: priceInCents },
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
      const isSelected = this.selectedOffers.some(offer => offer.id == cardProductId);
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
    
    if (!addToCartBtn) return;
    
    // Check if email is valid
    const emailValue = emailInput ? emailInput.value.trim() : '';
    const isEmailValid = this.isValidEmail(emailValue);
    
    // Check if at least one offer is selected
    const hasSelectedOffer = this.selectedOffers.length > 0;
    
    // Enable button only if BOTH conditions are met: valid email AND selected offer
    const shouldEnable = isEmailValid && hasSelectedOffer;
    
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
    return this.selectedOffers;
  }

  // Get selected variant from dropdown for a product
  getSelectedVariant(productId) {
    const variantSelector = document.querySelector(`select[data-product-id="${productId}"]`);
    if (variantSelector) {
      const selectedOption = variantSelector.options[variantSelector.selectedIndex];
      const variantId = selectedOption.value;
      const price = selectedOption.getAttribute('data-price');
      const discountedPrice = selectedOption.getAttribute('data-discounted-price');
      
      return {
        id: variantId,
        title: selectedOption.text,
        price: price,
        discountedPrice: discountedPrice
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