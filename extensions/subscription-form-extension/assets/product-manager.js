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
    const productsGrid = document.querySelector(".products-grid");
    if (productsGrid) {
      productsGrid.innerHTML = '<div class="loading-products"><p>Loading products...</p></div>';
    }

    try {
      await this.loadSubscriptionProducts();
      this.updateProgressBar();
      this.updateFloatingCart();
    } catch (error) {
      console.error("Product Manager Error: Failed to load products:", error);
      if (productsGrid) {
        productsGrid.innerHTML = '<div class="loading-products"><p>Error loading products. Please try again.</p></div>';
      }
    }
  }

  // Load all products from "subscriptions" collection with metafield filtering
  async loadSubscriptionProducts() {

    try {
      // Fetch products (tags are included by default)
      const apiUrl = "/collections/subscriptions/products.json";
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.products && data.products.length > 0) {
        // Filter products that have subscription metafield
        const filteredProducts = this.filterSubscriptionProducts(data.products);
        this.allProducts = filteredProducts;

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
          throw new Error("No subscription-eligible products found");
        }
      } else {
        throw new Error("No products found in subscriptions collection");
      }
    } catch (error) {
      console.error("Product Manager Error: Failed to load subscription products:", error);
      
      // Fallback to general products (tags included by default)
      try {
        const fallbackUrl = "/products.json?limit=50";
        const generalResponse = await fetch(fallbackUrl);
        
        if (!generalResponse.ok) {
          throw new Error(`Fallback HTTP error! status: ${generalResponse.status}`);
        }
        const generalData = await generalResponse.json();

        if (generalData.products && generalData.products.length > 0) {
          // Also filter fallback products
          const filteredFallback = this.filterSubscriptionProducts(generalData.products);
          this.allProducts = filteredFallback;
          this.createProductCategories(this.allProducts);
          this.displayProducts(this.allProducts);
        } else {
          throw new Error("No products found in general products either");
        }
      } catch (fallbackError) {
        console.error("Product Manager Error: Fallback also failed:", fallbackError);
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
    const filteredProducts = products.filter(product => {
      // Check if product has subscription eligibility metafield
      const isSubscriptionEligible = this.hasSubscriptionMetafield(product);
      
      return isSubscriptionEligible;
    });

    return filteredProducts;
  }

  // Check if product has subscription eligibility based on tags
  hasSubscriptionMetafield(product) {
    
    // Primary method: Check for subscription tags
    if (product.tags && Array.isArray(product.tags)) {
      const lowerTags = product.tags.map(tag => tag.toLowerCase());
      
      // Check for subscription eligibility tags with sb- prefix
      const subscriptionTags = [
        'sb-subscription',
        'sb-subscription-eligible', 
        'sb-eligible',
        'sb-suscripcion',
        'sb-suscripcion-elegible'
      ];
      
      const hasEligibilityTag = subscriptionTags.some(eligibleTag => 
        lowerTags.some(tag => tag === eligibleTag || tag.includes(eligibleTag))
      );
      
      if (hasEligibilityTag) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  // Create categories dynamically from sb-category- tags
  createProductCategories(products) {
    
    // Start with Best Sellers category
    const categories = {
      "best-sellers": { title: "Best Sellers", products: [] }
    };

    products.forEach((product) => {
      // Get all categories this product belongs to
      const productCategories = this.getProductCategories(product);

      // Add to each category (create if doesn't exist)
      productCategories.forEach(categoryKey => {
        if (!categories[categoryKey]) {
          // Create new category dynamically
          const categoryTitle = this.formatCategoryTitle(categoryKey);
          categories[categoryKey] = { title: categoryTitle, products: [] };
        }
        
        categories[categoryKey].products.push(product);
      });

      // Also check if product should be in Best Sellers
      if (this.isProductBestSeller(product)) {
        categories["best-sellers"].products.push(product);
      }
    });

    this.productsByCollection = categories;
    
    this.updateCategoriesSidebar();
  }

  // Check if product should be in Best Sellers category
  isProductBestSeller(product) {
    if (product.tags && Array.isArray(product.tags)) {
      const lowerTags = product.tags.map(tag => tag.toLowerCase());
      
      const bestSellerTags = [
        'sb-best-seller',
        'sb-popular', 
        'sb-bestseller',
        'sb-mejor-vendido'
      ];
      
      return bestSellerTags.some(tag => 
        lowerTags.some(productTag => productTag === tag || productTag.includes(tag))
      );
    }
    return false;
  }

  // Get the default category to display (Best Sellers first, then first non-empty)
  getDefaultCategory() {
    
    // Priority 1: Best Sellers if it has products
    if (this.productsByCollection["best-sellers"] && 
        this.productsByCollection["best-sellers"].products.length > 0) {
      return "best-sellers";
    }
    
    // Priority 2: First category with products (excluding best-sellers)
    const categoryWithProducts = Object.keys(this.productsByCollection).find(key => 
      key !== "best-sellers" && this.productsByCollection[key].products.length > 0
    );
    
    if (categoryWithProducts) {
      return categoryWithProducts;
    }
    
    return null;
  }

  // Select category in sidebar visually
  selectCategoryInSidebar(categoryKey) {
    // Remove active class from all categories
    const allCategoryItems = document.querySelectorAll('.category-item');
    allCategoryItems.forEach(item => {
      item.classList.remove('active');
    });
    
    // Add active class to selected category
    const selectedCategory = document.querySelector(`[data-collection="${categoryKey}"]`);
    if (selectedCategory) {
      selectedCategory.classList.add('active');
    }
  }

  // Get all categories this product belongs to from sb-category- tags
  getProductCategories(product) {
    
    const categories = [];
    
    if (product.tags && Array.isArray(product.tags)) {
      // Look for sb-category- tags
      product.tags.forEach(tag => {
        if (tag.startsWith('sb-category-')) {
          // Extract category name after sb-category-
          const categoryName = tag.substring('sb-category-'.length);
          if (categoryName) {
            categories.push(categoryName);
          }
        }
      });
    }
    
    // If no sb-category- tags found, put in best-sellers
    if (categories.length === 0) {
      categories.push("best-sellers");
    }
    
    return categories;
  }
  
  // Format category key into a display title
  formatCategoryTitle(categoryKey) {
    // Simply capitalize first letter and replace dashes/underscores with spaces
    return categoryKey
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  updateCategoriesSidebar() {
    const sidebar = document.querySelector(".categories-sidebar");
    if (!sidebar) return;

    let categoriesHTML = "";
    const defaultCategory = this.getDefaultCategory();

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
    
    // Also create mobile popup categories
    this.createMobileCategoriesPopup(categoriesWithProducts, defaultCategory);
  }

  displayProducts(products) {
    const productsGrid = document.querySelector(".products-grid");

    if (!products || products.length === 0) {
      if (productsGrid) {
        productsGrid.innerHTML = '<div class="no-products"><h3>No products found</h3><p>No products available in this category.</p></div>';
      }
      return;
    }

    const productCards = products
      .map((product) => {
        const selectedProduct = this.selectedProducts.find(p => p.id === product.id);
        const isSelected = !!selectedProduct;
        const selectedVariant = selectedProduct ? selectedProduct.selectedVariant : 
                               (this.preSelectedVariants?.[product.id] || product.variants[0]);
        const imageSrc = (product.images && product.images[0]?.src) || "";
        const price = selectedVariant ? `$${parseFloat(selectedVariant.price).toFixed(2)}` : "$0.00";

        // Generate variant options - check if variants exist
        const variantOptions = (product.variants && product.variants.length > 0) ? 
          product.variants.map(variant => 
            `<option value="${variant.id}" ${selectedVariant && selectedVariant.id === variant.id ? 'selected' : ''}>
              ${variant.title}
            </option>`
          ).join('') : 
          '<option value="">Default</option>';

        // Generate button styles based on selection state
        const buttonStyle = isSelected ? 
          'background: #dc3545 !important; color: white !important; border: 1px solid #dc3545 !important; display: block !important; visibility: visible !important; opacity: 1 !important;' :
          'background: #f7931e !important; color: white !important; border: 1px solid #f7931e !important;';

        return `
          <div class="product-card ${isSelected ? 'selected' : ''}" data-product-id="${product.id}">
            
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
            
            <div class="product-controls">
              <button class="add-to-cart-btn ${isSelected ? 'remove-mode' : ''}" style="${buttonStyle}" onclick="window.productManager.addProduct(${product.id})">
                ${isSelected ? 'Remove from Cart' : 'Add to Cart'}
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    if (productsGrid) {
      productsGrid.innerHTML = productCards;
    }
    
    this.updateProgressBar();
    this.updateFloatingCart();
  }

  addProduct(productId) {
    const product = this.findProductById(productId);
    if (!product) return;

    const existingProduct = this.selectedProducts.find(p => p.id === productId);
    
    if (existingProduct) {
      // Product already selected - remove it instead
      this.removeProduct(productId);
      return;
    }
    
    // Add new product with quantity 1 (fixed)
    // Use pre-selected variant if available, otherwise use first variant
    const selectedVariant = this.preSelectedVariants?.[productId] || 
                           ((product.variants && product.variants.length > 0) ? product.variants[0] : null);
    
    if (!selectedVariant) {
      console.error(`Product Manager Error: No variants found for product ${productId}`);
      return;
    }
    
    // Add the product (no inventory check needed since quantity is always 1)
    this.selectedProducts.push({
      id: productId,
      title: product.title,
      image: (product.images && product.images[0]?.src) || "",
      price: selectedVariant.price,
      selectedVariant: selectedVariant,
      quantity: 1, // Always 1 - variants define the pieces
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

  // Remove updateQuantity method since products are now single-unit only

  // Get product with full inventory data
  async getProductWithInventory(productId) {
    try {
      const product = this.findProductById(productId);
      if (!product) return null;
      
      // Try to get product handle from the product object or construct it
      const handle = product.handle || product.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const response = await fetch(`/products/${handle}.js`);
      
      if (response.ok) {
        const fullProduct = await response.json();
        return fullProduct;
      }
    } catch (error) {
      // Silently fail for product data fetch
    }
    return null;
  }

  // Get available inventory for a variant
  async getAvailableInventory(variant, productId = null) {
    // First check the simple 'available' field from Shopify
    if (variant.hasOwnProperty('available') && !variant.available) {
      return 0; // Out of stock
    }
    
    // If we have inventory management fields, use them
    if (variant.hasOwnProperty('inventory_management')) {
      // Return null if inventory tracking is disabled
      if (!variant.inventory_management || variant.inventory_policy === 'continue') {
        return null; // Unlimited inventory
      }
      
      // Return available quantity
      const quantity = variant.inventory_quantity || 0;
      return quantity;
    }
    
    // If no inventory management data and product is marked as available, assume unlimited
    if (variant.available !== false) {
      return null; // Unlimited
    }
    
    return null; // Default to unlimited if we can't determine
  }

  // Update inventory status in the UI
  updateInventoryStatus(productId, availableInventory, productTitle) {
    const placeholder = document.querySelector(`.inventory-status-placeholder[data-product-id="${productId}"]`);
    const addButton = document.querySelector(`.product-card[data-product-id="${productId}"] .add-to-cart-btn`);
    const quantityStepper = document.querySelector(`.product-card[data-product-id="${productId}"] .quantity-stepper`);
    
    if (placeholder) {
      let statusHtml = '';
      let buttonDisabled = false;
      let buttonText = 'Add to Cart';
      let hideQuantityElements = false;
      
      if (availableInventory !== null) {
        if (availableInventory <= 0) {
          // Don't show the red out of stock badge - only update button and hide quantity elements
          placeholder.remove(); // Remove placeholder without replacement
          buttonDisabled = true;
          buttonText = 'Out of Stock';
          hideQuantityElements = true;
        } else if (availableInventory <= 5) {
          statusHtml = `<div class="inventory-status low-stock">Only ${availableInventory} left</div>`;
        } else {
          // Remove placeholder if stock is normal
          placeholder.remove();
        }
      } else {
        // Remove placeholder if inventory is unlimited
        placeholder.remove();
      }
      
      if (statusHtml) {
        placeholder.outerHTML = statusHtml;
      } else if (availableInventory <= 0) {
        placeholder.remove(); // Just remove placeholder for out of stock
      }
      
      // Update button state
      if (addButton) {
        addButton.disabled = buttonDisabled;
        addButton.textContent = buttonText;
        if (buttonDisabled) {
          addButton.style.cssText = 'background: #E8DCC6 !important; color: #8B7355 !important; cursor: not-allowed !important;';
        } else {
          addButton.style.cssText = '';
        }
      }
      
      // For quantity stepper: only add inline style when out of stock to override CSS
      if (quantityStepper && hideQuantityElements) {
        quantityStepper.style.cssText = 'display: none !important;';
      } else if (quantityStepper) {
        // Remove any inline display style to let CSS take control
        quantityStepper.style.display = '';
      }
    }
  }

  // Show checking status immediately when variant changes
  showInventoryChecking(productId) {
    const card = document.querySelector(`[data-product-id="${productId}"]`);
    if (!card) return;
    
    // Remove any existing inventory status
    const existingStatus = card.querySelector('.inventory-status, .inventory-status-placeholder');
    if (existingStatus) {
      existingStatus.remove();
    }
    
    // Add checking placeholder after variant selector
    const variantSelector = card.querySelector('.variant-selector');
    if (variantSelector) {
      const placeholder = document.createElement('div');
      placeholder.className = 'inventory-status-placeholder';
      placeholder.setAttribute('data-product-id', productId);
      placeholder.textContent = 'Checking availability...';
      variantSelector.insertAdjacentElement('afterend', placeholder);
    }
  }

  // Show inventory warning to user
  showInventoryWarning(productId, availableInventory) {
    const card = document.querySelector(`[data-product-id="${productId}"]`);
    if (!card) return;
    
    // Create or update warning message
    let warning = card.querySelector('.inventory-warning');
    if (!warning) {
      warning = document.createElement('div');
      warning.className = 'inventory-warning';
      const productControls = card.querySelector('.product-controls');
      if (productControls) {
        productControls.appendChild(warning);
      }
    }
    
    const message = availableInventory <= 0 
      ? 'Out of stock' 
      : `Only ${availableInventory} available`;
      
    warning.textContent = message;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (warning && warning.parentNode) {
        warning.remove();
      }
    }, 3000);
  }

  // Handle variant selection change
  updateVariant(productId, variantId) {
    const product = this.findProductById(productId);
    if (!product || !product.variants) return;
    
    const newVariant = product.variants.find(v => v.id.toString() === variantId.toString());
    if (!newVariant) return;
    
    // If product is selected, update the selected variant and check inventory
    const selectedProduct = this.selectedProducts.find(p => p.id === productId);
    if (selectedProduct) {
      const currentQuantity = selectedProduct.quantity;
      
      // Show checking status immediately
      this.showInventoryChecking(productId);
      
      // Check inventory asynchronously
      this.getAvailableInventory(newVariant, productId).then(availableInventory => {
        // Check if current quantity exceeds new variant's inventory
        if (availableInventory !== null && currentQuantity > availableInventory) {
          // Adjust quantity to available inventory or remove if none available
          if (availableInventory <= 0) {
            this.removeProduct(productId);
            this.showInventoryWarning(productId, availableInventory);
            return;
          } else {
            selectedProduct.quantity = availableInventory;
            this.showInventoryWarning(productId, availableInventory);
          }
        }
        
        // Update the selected variant and price
        selectedProduct.selectedVariant = newVariant;
        selectedProduct.price = newVariant.price;
        
        this.updateProductUI(productId);
        this.updateFloatingCart();
        
        // Update inventory status in UI
        this.updateInventoryStatus(productId, availableInventory, product.title);
      });
    } else {
      // Store variant selection for when product is added
      if (!this.preSelectedVariants) {
        this.preSelectedVariants = {};
      }
      this.preSelectedVariants[productId] = newVariant;
      
      // Show checking status immediately
      this.showInventoryChecking(productId);
      
      // Update price in the card UI for non-selected products
      this.updateProductPriceInCard(productId, newVariant.price);
      
      // Update inventory status for the new variant selection
      const product = this.findProductById(productId);
      this.getAvailableInventory(newVariant, productId).then(availableInventory => {
        this.updateInventoryStatus(productId, availableInventory, product.title);
      });
    }
  }

  // Update only the price in a product card (for non-selected products when variant changes)
  updateProductPriceInCard(productId, newPrice) {
    const productCard = document.querySelector(`.product-card[data-product-id="${productId}"]`);
    if (productCard) {
      const priceElement = productCard.querySelector('.product-price');
      if (priceElement) {
        priceElement.textContent = `$${parseFloat(newPrice).toFixed(2)}`;
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
    
    // Update button text and state
    const addButton = card.querySelector('.add-to-cart-btn');
    
    if (addButton) {
      if (isSelected) {
        addButton.textContent = 'Remove from Cart';
        addButton.classList.add('remove-mode');
        // Style as red remove button
        addButton.style.cssText = `
          background: #dc3545 !important;
          color: white !important;
          border: 1px solid #dc3545 !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        `;
      } else {
        addButton.textContent = 'Add to Cart';
        addButton.classList.remove('remove-mode');
        // Reset to default orange styles
        addButton.style.cssText = `
          background: #f7931e !important;
          color: white !important;
          border: 1px solid #f7931e !important;
        `;
      }
    }
  }

  updateProgressBar() {
    const progressFill = document.querySelector('.progress-fill');
    const milestones = document.querySelectorAll('.milestone');
    const progressText = document.querySelector('.progress-text');

    const totalCount = this.selectedProducts.length; // Count products, not quantities
    
    // Get milestone configuration (use config from main manager or fallback to defaults)
    const config = this.milestoneConfig || window.mainSubscriptionManager?.milestoneConfig || {
      milestone1Items: 6,
      milestone1Discount: 5.0,
      milestone2Items: 10,
      milestone2Discount: 10.0,
    };
    
    // Update progress bar fill based on dynamic configuration
    let percentage = 0;
    if (totalCount >= config.milestone2Items) {
      percentage = 100;
    } else if (totalCount >= config.milestone1Items) {
      // Between milestone1 and milestone2: 50% to 100%
      const range = config.milestone2Items - config.milestone1Items;
      percentage = 50 + ((totalCount - config.milestone1Items) / range) * 50;
    } else {
      // 0 to milestone1: 0% to 50%
      percentage = (totalCount / config.milestone1Items) * 50;
    }
    
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
    } else {
      console.error('Product Manager Error: Progress fill element not found');
    }

    // Update milestones with dynamic configuration
    milestones.forEach((milestone, index) => {
      const threshold = index === 0 ? config.milestone1Items : config.milestone2Items;
      const discount = index === 0 ? config.milestone1Discount : config.milestone2Discount;
      const isActive = totalCount >= threshold;
      
      milestone.classList.toggle('active', isActive);
      
      const milestoneText = milestone.querySelector('.milestone-text');
      if (milestoneText) {
        if (isActive) {
          milestoneText.textContent = `You've got ${discount}% OFF`;
        } else {
          milestoneText.textContent = `Add ${threshold}, get ${discount}% OFF`;
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

    const totalCount = this.selectedProducts.length; // Count products, not quantities
    const totalPrice = this.selectedProducts.reduce((sum, product) => {
      // Always use the price from selectedVariant to ensure accuracy
      const price = product.selectedVariant ? product.selectedVariant.price : product.price;
      return sum + parseFloat(price); // Convert to number before adding
    }, 0);
    
    // Calculate discount using milestone configuration
    const milestoneConfig = this.milestoneConfig || window.mainSubscriptionManager?.milestoneConfig || {
      milestone1Items: 6,
      milestone1Discount: 5.0,
      milestone2Items: 10,
      milestone2Discount: 10.0,
    };
    
    let discount = 0;
    if (totalCount >= milestoneConfig.milestone2Items) {
      discount = milestoneConfig.milestone2Discount;
    } else if (totalCount >= milestoneConfig.milestone1Items) {
      discount = milestoneConfig.milestone1Discount;
    }

    const discountedPrice = totalPrice * (1 - discount / 100);

    if (cartMessage && cartDetails) {
      // Use the milestone configuration already defined above

      // Get messages from configuration or use defaults with dynamic values
      const config = window.subscriptionConfig?.messages || {};
      const messages = {
        noItems: config.noItems || `Choose at least ${milestoneConfig.milestone1Items} items for ${milestoneConfig.milestone1Discount}% recurring savings`,
        building: config.building || `Add {remaining} more for ${milestoneConfig.milestone1Discount}% recurring savings`, 
        firstMilestone: config.fivePercent || `Great! Add {remaining} more for ${milestoneConfig.milestone2Discount}% recurring savings`,
        maxDiscount: config.tenPercent || `Amazing! You've unlocked ${milestoneConfig.milestone2Discount}% recurring savings`
      };

      if (totalCount >= milestoneConfig.milestone2Items) {
        // State 3: Maximum discount achieved
        cartMessage.textContent = messages.maxDiscount;
        cartDetails.innerHTML = `${totalCount} selected: <span class="original-price">$${parseFloat(totalPrice).toFixed(2)}</span> <span class="discount-price">$${parseFloat(discountedPrice).toFixed(2)} (${milestoneConfig.milestone2Discount}% OFF)</span>`;
      } else if (totalCount >= milestoneConfig.milestone1Items) {
        // State 2: First discount achieved, show progress to next level
        const remaining = milestoneConfig.milestone2Items - totalCount;
        cartMessage.textContent = messages.firstMilestone.replace('{remaining}', remaining);
        cartDetails.innerHTML = `${totalCount} selected: <span class="original-price">$${parseFloat(totalPrice).toFixed(2)}</span> <span class="discount-price">$${parseFloat(discountedPrice).toFixed(2)} (${milestoneConfig.milestone1Discount}% OFF)</span>`;
      } else if (totalCount >= 1) {
        // State 1: Building towards first discount
        const remaining = milestoneConfig.milestone1Items - totalCount;
        cartMessage.textContent = messages.building.replace('{remaining}', remaining);
        cartDetails.textContent = `${totalCount} selected: $${parseFloat(totalPrice).toFixed(2)}`;
      } else {
        // State 0: No items selected
        cartMessage.textContent = messages.noItems;
        cartDetails.textContent = "0 selected: $0.00";
      }
    }
  }

  // Removed duplicate method - using the more complete version below

  // Mobile Categories Popup Functions
  createMobileCategoriesPopup(categoriesWithProducts, defaultCategory) {
    const popupList = document.querySelector('.categories-popup-list');
    const categoriesButton = document.getElementById('categories-toggle');
    const selectedCategoryDisplay = document.getElementById('selected-category-display');
    
    if (!popupList) return;

    let popupHTML = "";
    
    categoriesWithProducts.forEach(([handle, data]) => {
      const isActive = handle === defaultCategory;
      const badgeCount = data.products.length;
      
      const activeClass = isActive ? 'active' : '';
      
      popupHTML += `
        <button class="category-item ${activeClass}" data-collection="${handle}" onclick="window.productManager.selectCategoryFromPopup('${handle}')">
          ${data.title}
          <span class="category-badge" style="display: none;">${badgeCount}</span>
        </button>
      `;
    });

    popupList.innerHTML = popupHTML;
    
    // Update button text with current category
    if (selectedCategoryDisplay && this.productsByCollection[defaultCategory]) {
      selectedCategoryDisplay.textContent = this.productsByCollection[defaultCategory].title;
    }
    
    // Store current selected category for mobile
    this.currentMobileCategory = defaultCategory;
    
    // Force update active state after DOM insertion
    setTimeout(() => {
      const popupItems = document.querySelectorAll('.categories-popup-list .category-item');
      popupItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.collection === defaultCategory) {
          item.classList.add('active');
        }
      });
    }, 50);
    
    // Initialize popup handlers
    this.initializeMobilePopupHandlers();
  }

  initializeMobilePopupHandlers() {
    const categoriesToggle = document.getElementById('categories-toggle');
    const categoriesClose = document.getElementById('categories-close');
    const popup = document.getElementById('categories-popup');
    const overlay = document.getElementById('popup-overlay');

    if (categoriesToggle) {
      categoriesToggle.addEventListener('click', () => {
        this.openCategoriesPopup();
      });
    }

    if (categoriesClose) {
      categoriesClose.addEventListener('click', () => {
        this.closeCategoriesPopup();
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        this.closeCategoriesPopup();
      });
    }
  }

  openCategoriesPopup() {
    const popup = document.getElementById('categories-popup');
    const overlay = document.getElementById('popup-overlay');
    
    if (popup && overlay) {
      overlay.classList.add('active');
      popup.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
  }

  closeCategoriesPopup() {
    const popup = document.getElementById('categories-popup');
    const overlay = document.getElementById('popup-overlay');
    
    if (popup && overlay) {
      popup.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = ''; // Restore scroll
    }
  }

  selectCategoryFromPopup(categoryHandle) {
    
    // Update products display
    if (this.productsByCollection[categoryHandle]) {
      this.displayProducts(this.productsByCollection[categoryHandle].products);
      this.selectCategoryInSidebar(categoryHandle);
      
      // Update mobile button text
      const selectedCategoryDisplay = document.getElementById('selected-category-display');
      if (selectedCategoryDisplay) {
        selectedCategoryDisplay.textContent = this.productsByCollection[categoryHandle].title;
      }
      
      // Update active states in popup
      const popupItems = document.querySelectorAll('.categories-popup-list .category-item');
      popupItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.collection === categoryHandle) {
          item.classList.add('active');
        }
      });
      
      // Store current selected category
      this.currentMobileCategory = categoryHandle;
      
      // Close popup
      this.closeCategoriesPopup();
    }
  }

  // Also update desktop category selection to sync with mobile
  initializeCategoryHandlers() {
    const categoryItems = document.querySelectorAll('.categories-sidebar .category-item');
    categoryItems.forEach(item => {
      item.addEventListener('click', () => {
        
        const collection = item.dataset.collection;
        if (this.productsByCollection[collection]) {
          this.displayProducts(this.productsByCollection[collection].products);
          
          // Update desktop sidebar active states
          document.querySelectorAll('.categories-sidebar .category-item').forEach(sidebarItem => {
            sidebarItem.classList.remove('active');
          });
          item.classList.add('active');
          
          // Update mobile button text when desktop category changes
          const selectedCategoryDisplay = document.getElementById('selected-category-display');
          if (selectedCategoryDisplay && this.productsByCollection[collection]) {
            selectedCategoryDisplay.textContent = this.productsByCollection[collection].title;
          }
          
          // Update mobile popup active states
          const popupItems = document.querySelectorAll('.categories-popup-list .category-item');
          popupItems.forEach(popupItem => {
            popupItem.classList.remove('active');
            if (popupItem.dataset.collection === collection) {
              popupItem.classList.add('active');
            }
          });
          
          this.currentMobileCategory = collection;
        }
      });
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
  window.productManager = new ProductManager();
});