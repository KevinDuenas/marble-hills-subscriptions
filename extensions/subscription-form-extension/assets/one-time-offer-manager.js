// One-Time Offer Manager for Step 3
class OneTimeOfferManager {
  constructor() {
    this.offerProducts = [];
    this.selectedOffers = [];
  }

  async loadOfferProducts() {
    console.log("Loading one-time offer products...");

    try {
      // Load products tagged with "one-time-offer"
      const response = await fetch("/products.json?limit=50");
      const data = await response.json();

      if (data.products) {
        // Filter products that are tagged as "one-time-offer"
        this.offerProducts = data.products.filter(product => 
          product.tags && product.tags.includes('one-time-offer')
        );

        // Limit to maximum 3 products
        this.offerProducts = this.offerProducts.slice(0, 3);

        console.log(`Found ${this.offerProducts.length} one-time offer products`);
        
        if (this.offerProducts.length > 0) {
          this.displayOfferProducts();
        } else {
          console.log("No one-time offer products found, showing demo offers");
          this.displayDemoOffers();
        }
      }
    } catch (error) {
      console.error("Error loading offer products:", error);
      this.displayDemoOffers();
    }
  }

  displayOfferProducts() {
    const offerProductsContainer = document.getElementById('offer-products-grid');
    if (!offerProductsContainer) return;

    const offerCards = this.offerProducts.map(product => {
      const isSelected = this.selectedOffers.some(offer => offer.id === product.id);
      const imageSrc = (product.images && product.images[0]?.src) || "";
      const price = product.variants[0] ? parseFloat(product.variants[0].price) : 0;
      const formattedPrice = `$${(price / 100).toFixed(2)}`;
      
      return `
        <div class="product-card offer-product-card ${isSelected ? 'selected' : ''}" data-product-id="${product.id}">
          <div class="product-image">
            ${imageSrc ? `<img src="${imageSrc}" alt="${product.title}">` : '<div class="no-image">No image</div>'}
          </div>
          
          <div class="product-info">
            <h3 class="product-title">${product.title}</h3>
            
            <div class="product-variants">
              <select class="variant-select" data-product-id="${product.id}">
                ${product.variants.map(variant => `
                  <option value="${variant.id}" data-price="${variant.price}">
                    ${variant.title} - $${(variant.price / 100).toFixed(2)}
                  </option>
                `).join('')}
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
  }

  displayDemoOffers() {
    console.log("Attempting to display demo offers");
    const offerProductsContainer = document.getElementById('offer-products-grid');
    console.log("Offer products container found:", offerProductsContainer);
    if (!offerProductsContainer) {
      console.error("offer-products-grid container not found!");
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
            <h3 class="product-title">${offer.title}</h3>
            <p>${offer.description}</p>
            
            <div class="offer-pricing">
              <span class="original-price">${offer.originalPrice}</span>
              <span class="offer-price">${offer.offerPrice}</span>
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

    console.log("Demo offers HTML generated:", offerCards);
    offerProductsContainer.innerHTML = offerCards;
    console.log("Demo offers HTML set to container");
  }

  toggleOffer(productId) {
    const product = this.offerProducts.find(p => p.id === productId);
    if (!product) return;

    const existingOfferIndex = this.selectedOffers.findIndex(offer => offer.id === productId);
    
    if (existingOfferIndex > -1) {
      // Remove offer
      this.selectedOffers.splice(existingOfferIndex, 1);
    } else {
      // Add offer
      this.selectedOffers.push({
        id: productId,
        title: product.title,
        image: (product.images && product.images[0]?.src) || "",
        price: product.variants[0]?.price || 0,
        selectedVariant: product.variants[0],
        quantity: 1,
        type: "one-time-offer"
      });
    }

    this.updateOfferUI(productId);
    console.log("Selected offers:", this.selectedOffers);
  }

  toggleDemoOffer(offerId, title, price) {
    const existingOfferIndex = this.selectedOffers.findIndex(offer => offer.id === offerId);
    
    if (existingOfferIndex > -1) {
      // Remove offer
      this.selectedOffers.splice(existingOfferIndex, 1);
    } else {
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
    console.log("Selected demo offers:", this.selectedOffers);
  }

  updateOfferUI(productId) {
    const card = document.querySelector(`[data-product-id="${productId}"]`);
    if (!card) return;

    const isSelected = this.selectedOffers.some(offer => offer.id === productId);
    const button = card.querySelector('.add-offer-btn') || card.querySelector('.add-to-first-box-btn');
    
    card.classList.toggle('selected', isSelected);
    
    if (button) {
      button.classList.toggle('selected', isSelected);
      button.textContent = isSelected ? 'Added ✓' : 'Add to First Box';
    }
  }

  getSelectedOffers() {
    return this.selectedOffers;
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