// Main Subscription Flow Manager
class MainSubscriptionManager {
  constructor() {
    this.currentStep = 1;
    this.maxSteps = 3;
    this.subscriptionData = {
      frequency: null,
      selectedProducts: [],
      oneTimeOffers: [],
      customerEmail: null
    };
    
    // Default milestone configuration - will be loaded from API
    this.milestoneConfig = {
      milestone1Items: 6,
      milestone1Discount: 5.0,
      milestone1_2weeks: "689100587309",
      milestone1_4weeks: "689157964077", 
      milestone1_6weeks: "689157996845",
      milestone2Items: 10,
      milestone2Discount: 10.0,
      milestone2_2weeks: "689425580333",
      milestone2_4weeks: "689425613101",
      milestone2_6weeks: "689425645869",
    };
    
    this.init();
  }

  async init() {
    await this.loadMilestoneConfig();
    this.initializeNavigation();
    this.showStep(1);
  }

  async loadMilestoneConfig() {
    try {
      // Get shop name without duplicating .myshopify.com
      let shopName = window.Shopify?.shop || window.location.hostname;
      
      // Ensure we have the full domain format
      if (!shopName.includes('.myshopify.com')) {
        shopName = `${shopName}.myshopify.com`;
      }
      
      console.log('MainSubscriptionManager: Attempting to load milestone config from API for shop:', shopName);
      const response = await fetch(`/apps/subscription/api/milestone-config?shop=${shopName}`);
      
      if (response.ok) {
        const config = await response.json();
        console.log('MainSubscriptionManager: Successfully loaded milestone config from API:', config);
        this.milestoneConfig = config;
        
        // Update any existing managers with new config
        if (window.productManager) {
          window.productManager.milestoneConfig = this.milestoneConfig;
          window.productManager.updateProgressBar();
        }
        if (window.cartManager) {
          window.cartManager.updateMilestoneConfig(this.milestoneConfig);
        }
        
        console.log('MainSubscriptionManager: Updated all managers with new config');
      } else {
        console.warn('MainSubscriptionManager: Could not load milestone config from API (status:', response.status, '), using defaults');
        console.warn('MainSubscriptionManager: Default config being used:', this.milestoneConfig);
        
        // Ensure CartManager gets the default config too
        if (window.cartManager) {
          window.cartManager.updateMilestoneConfig(this.milestoneConfig);
          console.log('MainSubscriptionManager: Updated CartManager with default config');
        }
      }
    } catch (error) {
      console.warn('MainSubscriptionManager: Error loading milestone config:', error, 'Using defaults');
      console.warn('MainSubscriptionManager: Default config being used:', this.milestoneConfig);
      
      // Ensure CartManager gets the default config even on error
      if (window.cartManager) {
        window.cartManager.updateMilestoneConfig(this.milestoneConfig);
        console.log('MainSubscriptionManager: Updated CartManager with default config after error');
      }
    }
  }

  showStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > this.maxSteps) {
      console.error('Subscription Error: Invalid step number:', stepNumber);
      return;
    }

    console.log(`MainSubscriptionManager: Transitioning to step ${stepNumber}`);
    this.currentStep = stepNumber;

    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
      step.classList.remove('active');
    });

    // Show current step
    const currentStepElement = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
    if (currentStepElement) {
      console.log(`MainSubscriptionManager: Found and showing step ${stepNumber} element`);
      currentStepElement.classList.add('active');
      
      // Show/hide floating carts based on step - both use same class now
      const floatingCartStep1 = document.querySelector('.floating-cart-summary:not(#floating-cart-step2)');
      if (floatingCartStep1) {
        floatingCartStep1.style.display = stepNumber === 1 ? 'block' : 'none';
      }
      
      const floatingCartStep2 = document.getElementById('floating-cart-step2');
      if (floatingCartStep2) {
        floatingCartStep2.style.display = stepNumber === 2 ? 'block' : 'none';
      }
      
      // Initialize step-specific functionality
      this.initializeStepLogic(stepNumber);
    } else {
      console.error(`Step element not found: ${stepNumber}`);
    }
  }

  initializeStepLogic(stepNumber) {
    switch (stepNumber) {
      case 1:
        // Product selection step - wait for ProductManager to be ready
        this.initializeProductStep();
        break;
      case 2:
        // Frequency selection step - update cart summary
        this.updateFrequencySummary();
        break;
      case 3:
        // One-time offer step
        this.initializeOfferStep();
        break;
    }
  }

  initializeProductStep() {
    if (window.productManager) {
      window.productManager.loadAllProducts();
    } else {
      // Wait for ProductManager to initialize
      setTimeout(() => {
        this.initializeProductStep();
      }, 100);
    }
  }

  initializeOfferStep() {
    console.log('MainSubscriptionManager: Initializing offer step');
    
    // Add delay to ensure Step 3 DOM is ready
    setTimeout(() => {
      if (window.oneTimeOfferManager) {
        console.log('MainSubscriptionManager: OneTimeOfferManager found, loading offers');
        window.oneTimeOfferManager.loadOfferProducts();
        
        // Initialize Step 3 navigation
        this.initializeStep3Navigation();
      } else {
        console.log('MainSubscriptionManager: OneTimeOfferManager not found, waiting...');
        // Wait for OneTimeOfferManager to initialize
        setTimeout(() => {
          this.initializeOfferStep();
        }, 100);
      }
    }, 100);
  }

  initializeStep3Navigation() {
    // Add to Cart button
    const addToCartBtn = document.getElementById('final-add-to-cart-btn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        this.showButtonLoading(addToCartBtn, 'Adding to cart...');
        this.handleFinalAddToCart(false); // Include offers
      });
    }

    // Skip offer link
    const skipOfferLink = document.getElementById('skip-offer-btn');
    if (skipOfferLink) {
      skipOfferLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showButtonLoading(skipOfferLink, 'Adding to cart...');
        this.handleFinalAddToCart(true); // Skip offers
      });
    }
  }

  initializeNavigation() {
    // Step 1: Select Frequency button (floating cart)
    const selectFrequencyBtn = document.getElementById('select-frequency-btn');
    if (selectFrequencyBtn) {
      selectFrequencyBtn.addEventListener('click', () => {
        if (!selectFrequencyBtn.disabled) {
          this.goToStep(2);
        }
      });
    }

    // Step 2: Navigation buttons - wait for DOM elements
    setTimeout(() => {
      const prevBtn = document.querySelector('.prev-btn');
      const nextBtn = document.getElementById('frequency-next-btn'); // Use ID instead of class
      
      
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          this.goToStep(1);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (!nextBtn.disabled) {
            const selectedFrequency = document.querySelector('input[name="frequency"]:checked');
            if (selectedFrequency) {
              this.subscriptionData.frequency = selectedFrequency.value;

              // Show loading state on Next button
              this.showButtonLoading(nextBtn, 'Checking offers...');

              this.goToStep(3);
            }
          }
        });
      }

      // Add frequency selection listeners
      const frequencyInputs = document.querySelectorAll('input[name="frequency"]');
      frequencyInputs.forEach(input => {
        input.addEventListener('change', () => {
          this.updateFrequencySummary();
        });
      });
    }, 100);

    // Step 2: Frequency selection validation - wait for DOM
    setTimeout(() => {
      const nextBtn = document.querySelector('.next-btn');
      document.querySelectorAll('input[name="frequency"]').forEach(radio => {
        radio.addEventListener('change', () => {
          if (nextBtn) {
            nextBtn.disabled = false;
          }
        });
      });
    }, 200);

    // Step 3: Final actions
    const addToCartBtn = document.getElementById('final-add-to-cart-btn');
    const skipOfferBtn = document.getElementById('skip-offer-btn');

    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        // Show loading state on Add to Cart button
        this.showButtonLoading(addToCartBtn, 'Adding to cart...');
        this.handleFinalAddToCart();
      });
    }

    if (skipOfferBtn) {
      skipOfferBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Show loading state on Skip Offer button
        this.showButtonLoading(skipOfferBtn, 'Adding to cart...');
        this.handleFinalAddToCart(true); // Skip offers
      });
    }
  }

  goToStep(stepNumber) {
    // Special handling for Step 3: check if one-time offers exist
    if (stepNumber === 3) {
      this.checkOneTimeOffersAndProceed();
      return;
    }
    
    // Only validate when going forward, allow going back without validation
    if (stepNumber < this.currentStep || this.validateCurrentStep()) {
      this.showStep(stepNumber);
    }
  }

  async checkOneTimeOffersAndProceed() {
    try {
      console.log('MainSubscriptionManager: Checking for one-time offers...');

      // Get shop name from current URL
      let shopName = window.Shopify?.shop || window.location.hostname;

      // Ensure we have the shop name without .myshopify.com
      if (shopName.includes('.myshopify.com')) {
        shopName = shopName.replace('.myshopify.com', '');
      }

      console.log('MainSubscriptionManager: Fetching offers for shop:', shopName);

      // Check our dedicated one-time offers API
      const response = await fetch(`/apps/subscription/api/one-time-offers?shop=${shopName}`);
      const data = await response.json();

      console.log('MainSubscriptionManager: One-time offers response:', data);

      let hasOfferProducts = false;
      if (data.offers && Array.isArray(data.offers)) {
        hasOfferProducts = data.offers.length > 0;
        console.log('MainSubscriptionManager: Found', data.offers.length, 'one-time offers');
      }

      // Hide loading state from Step 2 Next button
      const nextBtn = document.getElementById('frequency-next-btn');
      if (nextBtn) {
        this.hideButtonLoading(nextBtn, 'Next');
      }

      if (hasOfferProducts) {
        console.log('MainSubscriptionManager: Proceeding to Step 3 with offers');
        this.showStep(3);
      } else {
        console.log('MainSubscriptionManager: No offers found, skipping to checkout');
        this.skipOffersAndCheckout();
      }
    } catch (error) {
      console.error('MainSubscriptionManager: Failed to load one-time offers:', error);
      console.log('MainSubscriptionManager: Error occurred, skipping to checkout');

      // Hide loading state on error
      const nextBtn = document.getElementById('frequency-next-btn');
      if (nextBtn) {
        this.hideButtonLoading(nextBtn, 'Next');
      }

      this.skipOffersAndCheckout();
    }
  }

  skipOffersAndCheckout() {
    // Clear any selected offers
    this.subscriptionData.oneTimeOffers = [];

    // Add delay to ensure all components are initialized
    setTimeout(() => {
      this.handleFinalAddToCart(true); // true = skip offers
    }, 1000); // Increased delay for better initialization
  }

  validateCurrentStep() {
    switch (this.currentStep) {
      case 1:
        return this.subscriptionData.selectedProducts.length > 0;
      case 2:
        return this.subscriptionData.frequency !== null && this.subscriptionData.frequency !== undefined && this.subscriptionData.frequency !== '';
      case 3:
      default:
        return true;
    }
  }

  updateSelectedProducts(products) {
    this.subscriptionData.selectedProducts = products;
    
    // Update floating cart button state - require minimum 6 products
    const selectFrequencyBtn = document.getElementById('select-frequency-btn');
    if (selectFrequencyBtn) {
      const totalProducts = products.length; // Count products, not quantity
      selectFrequencyBtn.disabled = totalProducts < this.milestoneConfig.milestone1Items;
    }
  }

  updateFrequencySummary() {
    const selectedFrequency = document.querySelector('input[name="frequency"]:checked');
    const cartMessage = document.getElementById('cart-message-step2');
    const cartDetails = document.getElementById('cart-details-step2');
    const nextBtn = document.getElementById('frequency-next-btn');

    // Get cart info from Step 1
    const selectedProducts = this.subscriptionData.selectedProducts || [];
    const totalCount = selectedProducts.length; // Count products, not quantities
    const totalPrice = selectedProducts.reduce((sum, product) => sum + parseFloat(product.price), 0); // No multiplication by quantity
    
    // Calculate discount using milestone configuration
    let discountPercentage = 0;
    if (totalCount >= this.milestoneConfig.milestone2Items) {
      discountPercentage = this.milestoneConfig.milestone2Discount;
    } else if (totalCount >= this.milestoneConfig.milestone1Items) {
      discountPercentage = this.milestoneConfig.milestone1Discount;
    }
    
    const discountAmount = totalPrice * (discountPercentage / 100);
    const finalPrice = totalPrice - discountAmount;

    if (selectedFrequency && cartMessage && cartDetails) {
      // Get frequency text
      const frequencyText = selectedFrequency.parentElement.querySelector('span').textContent;
      
      // Build cart summary with frequency
      let cartSummary = `${totalCount} selected: $${finalPrice.toFixed(2)}`;
      if (discountPercentage > 0) {
        cartSummary = `${totalCount} selected: $${totalPrice.toFixed(2)} → $${finalPrice.toFixed(2)} (${discountPercentage}% OFF)`;
      }
      cartSummary += ` • Frequency: ${frequencyText}`;
      
      // Update display
      cartMessage.style.display = 'none';
      cartDetails.style.display = 'block';
      cartDetails.innerHTML = cartSummary;
      
      // Enable next button
      if (nextBtn) {
        nextBtn.disabled = false;
      }
      
    } else {
      // Show cart info without frequency
      if (cartMessage && cartDetails) {
        if (totalCount > 0) {
          cartMessage.style.display = 'none';
          cartDetails.style.display = 'block';
          
          let cartSummary = `${totalCount} selected: $${finalPrice.toFixed(2)}`;
          if (discountPercentage > 0) {
            cartSummary = `${totalCount} selected: $${totalPrice.toFixed(2)} → $${finalPrice.toFixed(2)} (${discountPercentage}% OFF)`;
          }
          cartSummary += ' • Select your delivery frequency';
          
          cartDetails.innerHTML = cartSummary;
        } else {
          cartMessage.style.display = 'block';
          cartDetails.style.display = 'none';
        }
      }
      
      // Disable next button
      if (nextBtn) {
        nextBtn.disabled = true;
      }
    }
  }

  async handleFinalAddToCart(skipOffers = false) {
    try {
      // Capture email if provided
      const emailInput = document.getElementById('customer-email');
      if (emailInput && emailInput.value.trim()) {
        this.subscriptionData.customerEmail = emailInput.value.trim();
      }

      // Add one-time offers if not skipped
      if (!skipOffers && window.oneTimeOfferManager) {
        const selectedOffers = window.oneTimeOfferManager.getSelectedOffers();
        this.subscriptionData.oneTimeOffers = selectedOffers;
      } else {
        this.subscriptionData.oneTimeOffers = [];
      }

      // Create subscription through cart manager with improved retry logic
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        if (window.cartManager) {
          await window.cartManager.createSubscription(this.subscriptionData);
          break; // Success, exit loop
        } else {
          console.log(`MainSubscriptionManager: CartManager not ready, attempt ${retryCount + 1}/${maxRetries}`);

          if (retryCount === maxRetries - 1) {
            // Last attempt - try to initialize manually
            console.warn('MainSubscriptionManager: Last attempt - initializing CartManager...');
            if (typeof CartManager !== 'undefined') {
              window.cartManager = new CartManager();
              await window.cartManager.createSubscription(this.subscriptionData);
              break;
            } else {
              throw new Error('CartManager class not loaded after multiple attempts');
            }
          } else {
            // Wait longer with each retry
            const waitTime = 500 * (retryCount + 1); // 500ms, 1000ms, 1500ms
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
          }
        }
      }

    } catch (error) {
      console.error('Subscription Error: Failed to create subscription:', error);
    }
  }

  showLoadingState() {
    document.querySelector('.form-step.active').classList.remove('active');
    document.querySelector('.loading-state').style.display = 'block';
  }

  hideLoadingState() {
    document.querySelector('.loading-state').style.display = 'none';
    this.showStep(this.currentStep);
  }

  showButtonLoading(button, loadingText = 'Loading...') {
    if (!button) return;

    // Store original text and state
    button.dataset.originalText = button.textContent;
    button.dataset.originalDisabled = button.disabled;

    // Show loading state
    button.textContent = loadingText;
    button.disabled = true;
    button.style.opacity = '0.7';
    button.style.cursor = 'not-allowed';
  }

  hideButtonLoading(button, originalText = null) {
    if (!button) return;

    // Restore original state
    button.textContent = originalText || button.dataset.originalText || 'Next';
    button.disabled = button.dataset.originalDisabled === 'true';
    button.style.opacity = '';
    button.style.cursor = '';

    // Clean up data attributes
    delete button.dataset.originalText;
    delete button.dataset.originalDisabled;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.mainSubscriptionManager = new MainSubscriptionManager();
  
  // Ensure CartManager is initialized with default config if it exists
  setTimeout(() => {
    if (window.cartManager && window.mainSubscriptionManager) {
      console.log('MainSubscriptionManager: Initializing CartManager with config on DOM load');
      window.cartManager.updateMilestoneConfig(window.mainSubscriptionManager.milestoneConfig);
    }
  }, 100); // Small delay to ensure CartManager is loaded
});