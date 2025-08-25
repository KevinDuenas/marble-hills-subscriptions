// Product Management Module - Updated for new 3-step flow
class ProductManager {
  constructor() {
    this.selectedProducts = [];
    this.productsByCollection = {};
    this.allProducts = [];
    this.preSelectedVariants = {}; // Store variant selections before products are added
    this.DISCOUNT_THRESHOLDS = {
      6: 5,
      10: 10,
    };
  }

  async loadAllProducts() {
    console.log("Loading all subscription products...");

    const productsGrid = document.querySelector(".products-grid");
    if (productsGrid) {
      productsGrid.innerHTML = '<div class="loading-products"><p>Loading products...</p></div>';
    }

    try {
      await this.loadSubscriptionProducts();
      this.updateProgressBar();
      this.updateFloatingCart();
    } catch (error) {
      console.error("Error loading products:", error);
      if (productsGrid) {
        productsGrid.innerHTML = '<div class="loading-products"><p>Error loading products. Please try again.</p></div>';
      }
    }
  }

  // Load all products from "subscriptions" collection with metafield filtering
  async loadSubscriptionProducts() {
    console.log("Loading subscription products...");

    try {
      // Fetch products (tags are included by default)
      const apiUrl = "/collections/subscriptions/products.json";
      console.log("Fetching from:", apiUrl);
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("API response:", data);

      if (data.products && data.products.length > 0) {
        // Filter products that have subscription metafield
        const filteredProducts = this.filterSubscriptionProducts(data.products);
        this.allProducts = filteredProducts;
        console.log(`Found ${this.allProducts.length} subscription-eligible products (filtered from ${data.products.length} total)`);

        if (this.allProducts.length > 0) {
          // Group products by categories using metafields
          this.createProductCategories(this.allProducts);

          // Show priority category (Best Sellers first, then first non-empty category)
          const priorityCategory = this.getDefaultCategory();
          if (priorityCategory) {
            this.displayProducts(this.productsByCollection[priorityCategory].products);
            this.selectCategoryInSidebar(priorityCategory);
          }
        } else {
          console.log("No subscription-eligible products found, trying fallback");
          throw new Error("No subscription-eligible products found");
        }
      } else {
        console.log("No products in subscriptions collection, trying fallback");
        throw new Error("No products found in subscriptions collection");
      }
    } catch (error) {
      console.error("Error loading subscription products:", error);
      console.log("Trying fallback to general products...");
      
      // Fallback to general products (tags included by default)
      try {
        const fallbackUrl = "/products.json?limit=50";
        console.log("Trying fallback URL:", fallbackUrl);
        const generalResponse = await fetch(fallbackUrl);
        
        if (!generalResponse.ok) {
          throw new Error(`Fallback HTTP error! status: ${generalResponse.status}`);
        }
        const generalData = await generalResponse.json();
        console.log("Fallback API response:", generalData);

        if (generalData.products && generalData.products.length > 0) {
          // Also filter fallback products
          const filteredFallback = this.filterSubscriptionProducts(generalData.products);
          this.allProducts = filteredFallback;
          console.log(`Using ${this.allProducts.length} filtered general products as fallback (from ${generalData.products.length} total)`);
          this.createProductCategories(this.allProducts);
          this.displayProducts(this.allProducts);
        } else {
          throw new Error("No products found in general products either");
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        this.displayErrorMessage("Unable to load products. Please refresh the page.");
      }
    }
  }

  displayErrorMessage(message) {
    const productsGrid = document.querySelector(".products-grid");
    if (productsGrid) {
      productsGrid.innerHTML = `
        <div class="no-products">
          <h3>Error Loading Products</h3>
          <p>${message}</p>
          <button onclick="window.productManager.loadAllProducts()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #f7931e; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Try Again
          </button>
        </div>
      `;
    }
  }

  // Filter products that are eligible for subscriptions based on metafields
  filterSubscriptionProducts(products) {
    console.log("Filtering products by subscription metafields...");
    
    const filteredProducts = products.filter(product => {
      // Check if product has subscription eligibility metafield
      const isSubscriptionEligible = this.hasSubscriptionMetafield(product);
      
      if (isSubscriptionEligible) {
        console.log(`✓ Product ${product.title} is subscription eligible`);
      } else {
        console.log(`✗ Product ${product.title} is NOT subscription eligible`);
      }
      
      return isSubscriptionEligible;
    });

    console.log(`Filtered ${filteredProducts.length} subscription products from ${products.length} total products`);
    return filteredProducts;
  }

  // Check if product has subscription eligibility based on tags
  hasSubscriptionMetafield(product) {
    console.log(`\n--- Checking eligibility for product: ${product.title} ---`);
    console.log('Product tags:', product.tags);
    
    // Primary method: Check for subscription tags
    if (product.tags && Array.isArray(product.tags)) {
      const lowerTags = product.tags.map(tag => tag.toLowerCase());
      
      // Check for subscription eligibility tags
      const subscriptionTags = [
        'subscription',
        'subscription-eligible', 
        'eligible',
        'suscripcion',
        'suscripcion-elegible'
      ];
      
      const hasEligibilityTag = subscriptionTags.some(eligibleTag => 
        lowerTags.some(tag => tag === eligibleTag || tag.includes(eligibleTag))
      );
      
      if (hasEligibilityTag) {
        console.log(`✅ Product ${product.title} is subscription eligible (found tag)`);
        return true;
      } else {
        console.log(`❌ Product ${product.title} - No subscription eligibility tag found`);
        console.log('Expected tags:', subscriptionTags);
        console.log('Product tags:', lowerTags);
        return false;
      }
    } else {
      console.log(`❌ Product ${product.title} has no tags`);
      return false;
    }
  }

  // Create categories for products (simplified, no "All Boxes")
  createProductCategories(products) {
    console.log(`\n=== createProductCategories called ===`);
    console.log('Input products:', products);
    console.log('Input products count:', products.length);
    
    const categories = {
      "best-sellers": { title: "Best Sellers", products: [] },
      steak: { title: "Steak", products: [] },
      pork: { title: "Pork", products: [] },
      poultry: { title: "Poultry", products: [] },
      seafood: { title: "Sea food", products: [] },
      sides: { title: "Sides", products: [] },
      desserts: { title: "Desserts", products: [] },
    };

    products.forEach((product) => {
      const productCategory = this.getProductCategory(product);
      console.log(`Product "${product.title}" primary category: "${productCategory}"`);

      // Add to primary category
      if (categories[productCategory]) {
        categories[productCategory].products.push(product);
        console.log(`✅ Added to primary category "${productCategory}". New count: ${categories[productCategory].products.length}`);
      } else {
        console.log(`❌ Category "${productCategory}" not found, using best-sellers`);
        // Default to best sellers if no category found
        categories["best-sellers"].products.push(product);
      }

      // Also check if product should be in Best Sellers
      if (productCategory !== "best-sellers" && this.isProductBestSeller(product)) {
        categories["best-sellers"].products.push(product);
        console.log(`✅ Also added to Best Sellers. New count: ${categories["best-sellers"].products.length}`);
      }
    });

    console.log('Final categories structure:');
    Object.entries(categories).forEach(([key, category]) => {
      console.log(`- ${key}: ${category.products.length} products`);
    });

    this.productsByCollection = categories;
    
    // Show which category we're trying to display
    const firstCategory = Object.keys(this.productsByCollection)[0];
    console.log('First category to display:', firstCategory);
    if (firstCategory && this.productsByCollection[firstCategory]) {
      console.log('Products in first category:', this.productsByCollection[firstCategory].products.length);
    }
    
    this.updateCategoriesSidebar();
  }

  // Check if product should be in Best Sellers category
  isProductBestSeller(product) {
    if (product.tags && Array.isArray(product.tags)) {
      const lowerTags = product.tags.map(tag => tag.toLowerCase());
      
      const bestSellerTags = [
        'best-seller',
        'popular', 
        'bestseller',
        'mejor-vendido'
      ];
      
      return bestSellerTags.some(tag => 
        lowerTags.some(productTag => productTag === tag || productTag.includes(tag))
      );
    }
    return false;
  }

  // Get the default category to display (Best Sellers first, then first non-empty)
  getDefaultCategory() {
    console.log(`\n=== getDefaultCategory called ===`);
    
    // Priority 1: Best Sellers if it has products
    if (this.productsByCollection["best-sellers"] && 
        this.productsByCollection["best-sellers"].products.length > 0) {
      console.log('Using Best Sellers as default (has products)');
      return "best-sellers";
    }
    
    // Priority 2: First category with products
    const categoryWithProducts = Object.keys(this.productsByCollection).find(key => 
      this.productsByCollection[key].products.length > 0
    );
    
    if (categoryWithProducts) {
      console.log(`Using ${categoryWithProducts} as default (first with products)`);
      return categoryWithProducts;
    }
    
    console.log('No categories with products found');
    return null;
  }

  // Select category in sidebar visually
  selectCategoryInSidebar(categoryKey) {
    console.log(`Selecting category in sidebar: ${categoryKey}`);
    
    // Remove active class from all categories
    const allCategoryItems = document.querySelectorAll('.category-item');
    allCategoryItems.forEach(item => {
      item.classList.remove('active');
    });
    
    // Add active class to selected category
    const selectedCategory = document.querySelector(`[data-collection="${categoryKey}"]`);
    if (selectedCategory) {
      selectedCategory.classList.add('active');
      console.log(`✅ Category ${categoryKey} marked as active`);
    } else {
      console.log(`❌ Category element not found for: ${categoryKey}`);
    }
  }

  // Get product category from tags (simplified tag-based categorization)
  getProductCategory(product) {
    console.log(`Getting category for product: ${product.title}`);
    console.log('Product tags:', product.tags);
    
    // Primary method: Check tags for category
    if (product.tags && Array.isArray(product.tags)) {
      const lowerTags = product.tags.map((tag) => tag.toLowerCase());

      // Check for specific category tags first
      const categoryMappings = {
        'steak': ['steak', 'beef', 'carne', 'res'],
        'pork': ['pork', 'cerdo', 'cochino'],
        'poultry': ['poultry', 'chicken', 'pollo', 'ave'],
        'seafood': ['seafood', 'fish', 'pescado', 'mariscos'],
        'sides': ['sides', 'side', 'acompañante', 'guarnicion'],
        'desserts': ['desserts', 'dessert', 'postre', 'dulce'],
        'best-sellers': ['best-seller', 'popular', 'bestseller', 'mejor-vendido']
      };

      // Find matching category
      for (const [category, keywords] of Object.entries(categoryMappings)) {
        const hasKeyword = keywords.some(keyword => 
          lowerTags.some(tag => tag === keyword || tag.includes(keyword))
        );
        
        if (hasKeyword) {
          console.log(`Category from tags: ${category}`);
          return category;
        }
      }
    }

    // Fallback: Check product type 
    if (product.product_type) {
      const type = product.product_type.toLowerCase();
      if (type.includes("steak") || type.includes("beef")) {
        console.log("Category from product_type: steak");
        return "steak";
      }
      if (type.includes("pork")) {
        console.log("Category from product_type: pork");
        return "pork";
      }
      if (type.includes("poultry") || type.includes("chicken")) {
        console.log("Category from product_type: poultry");
        return "poultry";
      }
      if (type.includes("seafood") || type.includes("fish")) {
        console.log("Category from product_type: seafood");
        return "seafood";
      }
    }

    console.log("Using default category: best-sellers");
    return "best-sellers";
  }

  updateCategoriesSidebar() {
    const sidebar = document.querySelector(".categories-sidebar");
    if (!sidebar) return;

    let categoriesHTML = "";
    const defaultCategory = this.getDefaultCategory();
    console.log('Default category for sidebar:', defaultCategory);

    // Get categories with products, prioritizing order
    const categoriesWithProducts = [];
    
    // First add Best Sellers if it has products
    if (this.productsByCollection["best-sellers"]?.products.length > 0) {
      categoriesWithProducts.push(["best-sellers", this.productsByCollection["best-sellers"]]);
    }
    
    // Then add other categories with products (excluding best-sellers to avoid duplicates)
    for (const [handle, data] of Object.entries(this.productsByCollection)) {
      if (handle !== "best-sellers" && data.products.length > 0) {
        categoriesWithProducts.push([handle, data]);
      }
    }

    // Generate HTML for categories
    categoriesWithProducts.forEach(([handle, data], index) => {
      const isActive = handle === defaultCategory;
      categoriesHTML += `
        <div class="category-item ${isActive ? "active" : ""}" data-collection="${handle}">
          <span>${data.title}</span>
        </div>
      `;
    });

    sidebar.innerHTML = categoriesHTML;
    this.initializeCategoryHandlers();
  }

  displayProducts(products) {
    console.log(`\n=== displayProducts called ===`);
    console.log('Products to display:', products);
    console.log('Products count:', products ? products.length : 0);
    
    const productsGrid = document.querySelector(".products-grid");
    console.log('Products grid element found:', !!productsGrid);

    if (!products || products.length === 0) {
      console.log('❌ No products to display');
      if (productsGrid) {
        productsGrid.innerHTML = '<div class="no-products"><h3>No products found</h3><p>No products available in this category.</p></div>';
      }
      return;
    }

    const productCards = products
      .map((product) => {
        const selectedProduct = this.selectedProducts.find(p => p.id === product.id);
        const isSelected = !!selectedProduct;
        const quantity = selectedProduct ? selectedProduct.quantity : 1; // Default quantity: 1
        const selectedVariant = selectedProduct ? selectedProduct.selectedVariant : 
                               (this.preSelectedVariants?.[product.id] || product.variants[0]);
        const imageSrc = (product.images && product.images[0]?.src) || "";
        const price = selectedVariant ? `$${parseFloat(selectedVariant.price).toFixed(2)}` : "$0.00";

        // Generate variant options - check if variants exist
        const variantOptions = (product.variants && product.variants.length > 0) ? 
          product.variants.map(variant => 
            `<option value="${variant.id}" ${selectedVariant && selectedVariant.id === variant.id ? 'selected' : ''}>
              ${variant.title} - $${parseFloat(variant.price).toFixed(2)}
            </option>`
          ).join('') : 
          '<option value="">Default - $0.00</option>';

        return `
          <div class="product-card ${isSelected ? 'selected' : ''}" data-product-id="${product.id}">
            ${isSelected ? '<div class="selected-badge">✓</div>' : ''}
            
            <div class="product-image">
              ${imageSrc ? `<img src="${imageSrc}" alt="${product.title}">` : '<div style="color: #999; font-size: 0.9rem;">No image</div>'}
            </div>
            
            <div class="product-info-row">
              <div class="product-title">${product.title}</div>
              <div class="product-price">${price}</div>
            </div>
            <div class="product-description">${product.body_html?.replace(/<[^>]*>/g, '').substring(0, 100) || 'Product description'}</div>
            
            <div class="variant-selector">
              <select onchange="window.productManager.updateVariant(${product.id}, this.value)">
                ${variantOptions}
              </select>
            </div>
            
            <div class="quantity-display-container">
              Quantity: <span class="quantity-number">${quantity}</span>
            </div>
            
            <div class="product-controls">
              <button class="add-to-cart-btn" onclick="window.productManager.addProduct(${product.id})">
                Add to Cart
              </button>
              
              <div class="quantity-stepper">
                <button class="quantity-btn" onclick="window.productManager.updateQuantity(${product.id}, -1)">−</button>
                <span class="quantity-value">${quantity}</span>
                <button class="quantity-btn" onclick="window.productManager.updateQuantity(${product.id}, 1)">+</button>
              </div>
              
              <button class="remove-btn" onclick="window.productManager.removeProduct(${product.id})">
                Remove
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    console.log('Generated product cards HTML length:', productCards.length);
    console.log('First 200 chars of HTML:', productCards.substring(0, 200));

    if (productsGrid) {
      productsGrid.innerHTML = productCards;
      console.log('✅ HTML assigned to products grid');
      console.log('Products grid children count after assignment:', productsGrid.children.length);
    } else {
      console.log('❌ Products grid element not found for HTML assignment');
    }
    
    this.updateProgressBar();
    this.updateFloatingCart();
  }

  addProduct(productId) {
    const product = this.findProductById(productId);
    if (!product) return;

    const existingProduct = this.selectedProducts.find(p => p.id === productId);
    
    if (!existingProduct) {
      // Add new product with default quantity of 1
      // Use pre-selected variant if available, otherwise use first variant
      const selectedVariant = this.preSelectedVariants?.[productId] || 
                             ((product.variants && product.variants.length > 0) ? product.variants[0] : null);
      
      if (!selectedVariant) {
        console.error(`No variants found for product ${productId}`);
        return;
      }
      
      this.selectedProducts.push({
        id: productId,
        title: product.title,
        image: (product.images && product.images[0]?.src) || "",
        price: selectedVariant.price,
        selectedVariant: selectedVariant,
        quantity: 1,
        type: "individual"
      });

      // Clear pre-selected variant since product is now added
      if (this.preSelectedVariants?.[productId]) {
        delete this.preSelectedVariants[productId];
      }

      this.updateProductUI(productId);
      this.updateProgressBar();
      this.updateFloatingCart();
      
      // Notify main manager
      if (window.mainSubscriptionManager) {
        window.mainSubscriptionManager.updateSelectedProducts(this.selectedProducts);
      }
    }
  }

  updateVariant(productId, variantId) {
    const product = this.findProductById(productId);
    const variant = product?.variants.find(v => v.id == variantId);
    
    if (!product || !variant) return;

    const selectedProduct = this.selectedProducts.find(p => p.id === productId);
    
    if (selectedProduct) {
      // Update existing product's variant
      selectedProduct.selectedVariant = variant;
      selectedProduct.price = variant.price;
    } else {
      // Store the selected variant for when the product is added later
      if (!this.preSelectedVariants) {
        this.preSelectedVariants = {};
      }
      this.preSelectedVariants[productId] = variant;
    }

    // Update UI to reflect new variant and price
    this.updateProductUI(productId);
    this.updateFloatingCart();
  }

  updateQuantity(productId, change) {
    const product = this.selectedProducts.find(p => p.id === productId);

    if (product) {
      product.quantity += change;

      if (product.quantity <= 0) {
        this.removeProduct(productId);
      } else {
        this.updateProductUI(productId);
        this.updateProgressBar();
        this.updateFloatingCart();
        
        // Notify main manager
        if (window.mainSubscriptionManager) {
          window.mainSubscriptionManager.updateSelectedProducts(this.selectedProducts);
        }
      }
    }
  }

  removeProduct(productId) {
    const index = this.selectedProducts.findIndex(p => p.id === productId);

    if (index > -1) {
      this.selectedProducts.splice(index, 1);
      this.updateProductUI(productId);
      this.updateProgressBar();
      this.updateFloatingCart();
      
      // Notify main manager
      if (window.mainSubscriptionManager) {
        window.mainSubscriptionManager.updateSelectedProducts(this.selectedProducts);
      }
    }
  }

  findProductById(productId) {
    return this.allProducts.find(p => p.id === productId);
  }

  updateProductUI(productId) {
    const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
    if (!card) return;

    const product = this.selectedProducts.find(p => p.id === productId);
    const isSelected = !!product;
    
    // Update card selection state
    card.classList.toggle('selected', isSelected);
    
    // Update price display
    const priceDisplay = card.querySelector('.product-price');
    if (priceDisplay && product && product.selectedVariant) {
      const formattedPrice = `$${parseFloat(product.selectedVariant.price).toFixed(2)}`;
      priceDisplay.textContent = formattedPrice;
    }
    
    // Update quantity display
    const quantityDisplay = card.querySelector('.quantity-number');
    const quantityValue = card.querySelector('.quantity-value');
    
    if (isSelected && product) {
      if (quantityDisplay) quantityDisplay.textContent = product.quantity;
      if (quantityValue) {
        quantityValue.textContent = product.quantity;
        quantityValue.classList.add('bounce');
        setTimeout(() => quantityValue.classList.remove('bounce'), 300);
      }
    } else {
      if (quantityDisplay) quantityDisplay.textContent = '1'; // Default
      if (quantityValue) quantityValue.textContent = '1';
    }
  }

  updateProgressBar() {
    console.log('updateProgressBar called');
    const progressFill = document.querySelector('.progress-fill');
    const milestones = document.querySelectorAll('.milestone');
    const progressText = document.querySelector('.progress-text');

    const totalCount = this.selectedProducts.reduce((sum, product) => sum + product.quantity, 0);
    console.log('Total count for progress bar:', totalCount);
    console.log('Progress bar elements found:', { progressFill: !!progressFill, milestones: milestones.length, progressText: !!progressText });
    
    // Update progress bar fill
    // 50% at 6 items (5% discount in middle), 100% at 10 items (10% discount at end)
    let percentage = 0;
    if (totalCount >= 10) {
      percentage = 100;
    } else if (totalCount >= 6) {
      // Between 6 and 10 items: 50% to 100%
      percentage = 50 + ((totalCount - 6) / 4) * 50;
    } else {
      // 0 to 6 items: 0% to 50%
      percentage = (totalCount / 6) * 50;
    }
    
    console.log('Progress percentage:', percentage);
    
    if (progressFill) {
      // Force styles directly
      progressFill.style.cssText = `
        width: ${percentage}% !important;
        height: 100% !important;
        background: #f7931e !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        transition: width 0.5s ease !important;
        display: block !important;
        z-index: 10 !important;
      `;
      console.log('Progress bar updated to:', percentage + '%');
      console.log('Progress fill computed style width:', window.getComputedStyle(progressFill).width);
    } else {
      console.error('Progress fill element not found');
    }

    // Update milestones
    milestones.forEach((milestone, index) => {
      const threshold = index === 0 ? 6 : 10;
      const isActive = totalCount >= threshold;
      
      milestone.classList.toggle('active', isActive);
      
      const milestoneText = milestone.querySelector('.milestone-text');
      if (milestoneText) {
        if (isActive) {
          const discount = threshold === 6 ? 5 : 10;
          milestoneText.textContent = `You've got ${discount}% OFF`;
        } else {
          milestoneText.textContent = `Add ${threshold}, get ${threshold === 6 ? 5 : 10}% OFF`;
        }
      }
    });

    // Update progress text (always the same)
    if (progressText) {
      progressText.textContent = "Add more, save more";
    }
  }

  updateFloatingCart() {
    const cartMessage = document.getElementById('cart-message');
    const cartDetails = document.getElementById('cart-details');

    const totalCount = this.selectedProducts.reduce((sum, product) => sum + product.quantity, 0);
    const totalPrice = this.selectedProducts.reduce((sum, product) => {
      // Always use the price from selectedVariant to ensure accuracy
      const price = product.selectedVariant ? product.selectedVariant.price : product.price;
      return sum + (price * product.quantity);
    }, 0);
    
    // Calculate discount
    let discount = 0;
    if (totalCount >= 10) {
      discount = 10;
    } else if (totalCount >= 6) {
      discount = 5;
    }

    const discountedPrice = totalPrice * (1 - discount / 100);

    if (cartMessage && cartDetails) {
      if (totalCount >= 10) {
        // State 2: Achievement state
        cartMessage.textContent = "Congratulations! You've got 10% OFF";
        cartDetails.innerHTML = `${totalCount} selected: <span class="original-price">$${parseFloat(totalPrice).toFixed(2)}</span> <span class="discount-price">$${parseFloat(discountedPrice).toFixed(2)} (10% OFF)</span>`;
      } else {
        // State 1: Call to action state
        cartMessage.textContent = "Choose at least 10 for 10% OFF";
        if (discount > 0) {
          cartDetails.innerHTML = `${totalCount} selected: <span class="original-price">$${parseFloat(totalPrice).toFixed(2)}</span> <span class="discount-price">$${parseFloat(discountedPrice).toFixed(2)} (${discount}% OFF)</span>`;
        } else {
          cartDetails.textContent = `${totalCount} selected: $${parseFloat(totalPrice).toFixed(2)}`;
        }
      }
    }
  }

  initializeCategoryHandlers() {
    document.querySelectorAll(".category-item").forEach((item) => {
      item.addEventListener("click", () => {
        document.querySelectorAll(".category-item").forEach((cat) => cat.classList.remove("active"));
        item.classList.add("active");

        const collection = item.dataset.collection;
        if (this.productsByCollection[collection]) {
          this.displayProducts(this.productsByCollection[collection].products);
        }
      });
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
  window.productManager = new ProductManager();
});