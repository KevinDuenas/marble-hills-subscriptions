// One-Time Offer Manager for Step 3
class OneTimeOfferManager {
  constructor() {
    this.offerProducts = [];
    this.selectedOffers = [];
  }

  async loadOfferProducts() {
    console.log("Loading one-time offer products...");

    try {
      // Load products tagged with "one-time-offer" or from a specific collection
      const response = await fetch("/products.json?limit=50");
      const data = await response.json();

      if (data.products) {
        // Filter products that are tagged as offers
        this.offerProducts = data.products.filter(product => 
          product.tags && (
            product.tags.includes('one-time-offer') ||
            product.tags.includes('first-box-offer') ||
            product.tags.includes('promotional')
          )
        );

        // If no tagged products found, use first 3 products as demo
        if (this.offerProducts.length === 0) {
          this.offerProducts = data.products.slice(0, 3);
        }

        console.log(`Found ${this.offerProducts.length} offer products`);
        this.displayOfferProducts();
      }
    } catch (error) {
      console.error("Error loading offer products:", error);
      this.displayDemoOffers();
    }
  }

  displayOfferProducts() {
    const offerProductsContainer = document.querySelector('.offer-products');
    if (!offerProductsContainer) return;

    const offerCards = this.offerProducts.slice(0, 3).map(product => {
      const isSelected = this.selectedOffers.some(offer => offer.id === product.id);
      const imageSrc = (product.images && product.images[0]?.src) || "";
      const price = product.variants[0] ? `$${(product.variants[0].price / 100).toFixed(2)}` : "$0.00";
      const originalPrice = product.variants[0] ? `$${(product.variants[0].price * 2 / 100).toFixed(2)}` : "$0.00"; // Demo 50% off
      
      return `
        <div class="offer-product-card ${isSelected ? 'selected' : ''}" data-product-id="${product.id}">
          <div class="discount-badge">50% OFF</div>
          
          <div class="offer-product-image">
            ${imageSrc ? `<img src="${imageSrc}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover;">` : '<div style="color: #999;">No image</div>'}
          </div>
          
          <h3>${product.title}</h3>
          <p>${product.body_html?.replace(/<[^>]*>/g, '').substring(0, 80) || 'Special promotional offer'}</p>
          
          <div class="offer-pricing">
            <span class="original-price">${originalPrice}</span>
            <span class="offer-price">${price}</span>
          </div>
          
          <button class="add-to-first-box-btn ${isSelected ? 'selected' : ''}" onclick="window.oneTimeOfferManager.toggleOffer(${product.id})">
            ${isSelected ? 'Added ✓' : 'Add to First Box'}
          </button>
        </div>
      `;
    }).join('');

    offerProductsContainer.innerHTML = offerCards;
  }

  displayDemoOffers() {
    const offerProductsContainer = document.querySelector('.offer-products');
    if (!offerProductsContainer) return;

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
          <div class="discount-badge">50% OFF</div>
          
          <div class="offer-product-image">
            <div style="color: #999; display: flex; align-items: center; justify-content: center; height: 100%;">Demo Product</div>
          </div>
          
          <h3>${offer.title}</h3>
          <p>${offer.description}</p>
          
          <div class="offer-pricing">
            <span class="original-price">${offer.originalPrice}</span>
            <span class="offer-price">${offer.offerPrice}</span>
          </div>
          
          <button class="add-to-first-box-btn ${isSelected ? 'selected' : ''}" onclick="window.oneTimeOfferManager.toggleDemoOffer('${offer.id}', '${offer.title}', '${offer.offerPrice}')">
            ${isSelected ? 'Added ✓' : 'Add to First Box'}
          </button>
        </div>
      `;
    }).join('');

    offerProductsContainer.innerHTML = offerCards;
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
    const button = card.querySelector('.add-to-first-box-btn');
    
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
      const button = card.querySelector('.add-to-first-box-btn');
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