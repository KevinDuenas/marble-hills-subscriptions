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
    
    this.init();
  }

  init() {
    this.initializeNavigation();
    this.showStep(1);
  }

  showStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > this.maxSteps) {
      console.error('Subscription Error: Invalid step number:', stepNumber);
      return;
    }

    this.currentStep = stepNumber;

    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
      step.classList.remove('active');
    });

    // Show current step
    const currentStepElement = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
    if (currentStepElement) {
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
    // Add delay to ensure Step 3 DOM is ready
    setTimeout(() => {
      if (window.oneTimeOfferManager) {
        window.oneTimeOfferManager.loadOfferProducts();
        
        // Initialize Step 3 navigation
        this.initializeStep3Navigation();
      } else {
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
        this.handleFinalAddToCart(false); // Include offers
      });
    }

    // Skip offer link
    const skipOfferLink = document.getElementById('skip-offer-btn');
    if (skipOfferLink) {
      skipOfferLink.addEventListener('click', (e) => {
        e.preventDefault();
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
      
      console.log("Navigation buttons found:", { prevBtn, nextBtn });
      
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          console.log("Previous button clicked");
          this.goToStep(1);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          console.log("Next button clicked");
          if (!nextBtn.disabled) {
            const selectedFrequency = document.querySelector('input[name="frequency"]:checked');
            if (selectedFrequency) {
              this.subscriptionData.frequency = selectedFrequency.value;
              console.log("Frequency selected:", selectedFrequency.value);
              this.goToStep(3);
            } else {
              console.log("No frequency selected");
            }
          } else {
            console.log("Next button is disabled");
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
          console.log("Frequency selected:", radio.value);
          if (nextBtn) {
            nextBtn.disabled = false;
            console.log("Next button enabled");
          }
        });
      });
    }, 200);

    // Step 3: Final actions
    const addToCartBtn = document.getElementById('final-add-to-cart-btn');
    const skipOfferBtn = document.getElementById('skip-offer-btn');

    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        this.handleFinalAddToCart();
      });
    }

    if (skipOfferBtn) {
      skipOfferBtn.addEventListener('click', (e) => {
        e.preventDefault();
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
      const response = await fetch("/products.json?limit=50");
      const data = await response.json();

      let hasOfferProducts = false;
      if (data.products) {
        
        // Filter products that are tagged with "sb-one-time-offer"
        const offerProducts = data.products.filter(product => {
          if (!product.tags) return false;
          
          // Handle tags as string or array
          let tagsArray = [];
          if (typeof product.tags === 'string') {
            tagsArray = product.tags.split(',').map(tag => tag.trim());
          } else if (Array.isArray(product.tags)) {
            tagsArray = product.tags;
          }
          
          return tagsArray.includes('sb-one-time-offer');
        });
        
        hasOfferProducts = offerProducts.length > 0;
      }

      if (hasOfferProducts) {
        this.showStep(3);
      } else {
        this.skipOffersAndCheckout();
      }
    } catch (error) {
      console.error('Subscription Error: Failed to load one-time offers:', error);
      this.skipOffersAndCheckout();
    }
  }

  skipOffersAndCheckout() {
    // Clear any selected offers
    this.subscriptionData.oneTimeOffers = [];
    // Proceed directly to final cart creation
    this.handleFinalAddToCart(true); // true = skip offers
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
    
    // Update floating cart button state - require minimum 6 items
    const selectFrequencyBtn = document.getElementById('select-frequency-btn');
    if (selectFrequencyBtn) {
      const totalCount = products.reduce((sum, product) => sum + product.quantity, 0);
      selectFrequencyBtn.disabled = totalCount < 6;
    }
  }

  updateFrequencySummary() {
    const selectedFrequency = document.querySelector('input[name="frequency"]:checked');
    const cartMessage = document.getElementById('cart-message-step2');
    const cartDetails = document.getElementById('cart-details-step2');
    const nextBtn = document.getElementById('frequency-next-btn');

    // Get cart info from Step 1
    const selectedProducts = this.subscriptionData.selectedProducts || [];
    const totalCount = selectedProducts.reduce((sum, product) => sum + product.quantity, 0);
    const totalPrice = selectedProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    
    // Calculate discount
    let discountPercentage = 0;
    if (totalCount >= 10) {
      discountPercentage = 10;
    } else if (totalCount >= 6) {
      discountPercentage = 5;
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

      // Create subscription through cart manager
      if (window.cartManager) {
        await window.cartManager.createSubscription(this.subscriptionData);
      } else {
        // Wait a bit and retry - sometimes CartManager loads after MainSubscriptionManager
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (window.cartManager) {
          await window.cartManager.createSubscription(this.subscriptionData);
        } else {
          throw new Error('Cart manager not available');
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.mainSubscriptionManager = new MainSubscriptionManager();
});