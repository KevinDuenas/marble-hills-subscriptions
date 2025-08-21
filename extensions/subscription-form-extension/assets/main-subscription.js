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
    console.log("Initializing Main Subscription Manager");
    this.initializeNavigation();
    this.showStep(1);
  }

  showStep(stepNumber) {
    console.log(`Showing step: ${stepNumber}`);
    
    if (stepNumber < 1 || stepNumber > this.maxSteps) {
      console.error(`Invalid step number: ${stepNumber}`);
      return;
    }

    this.currentStep = stepNumber;

    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
      step.classList.remove('active');
    });

    // Show current step
    const currentStepElement = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
    console.log(`Step ${stepNumber} element found:`, currentStepElement);
    if (currentStepElement) {
      currentStepElement.classList.add('active');
      console.log(`Step ${stepNumber} classes after activation:`, currentStepElement.className);
      
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
      console.log("ProductManager found, loading products");
      window.productManager.loadAllProducts();
    } else {
      console.log("ProductManager not ready, waiting...");
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
        console.log("OneTimeOfferManager found, loading offers");
        window.oneTimeOfferManager.loadOfferProducts();
        
        // Initialize Step 3 navigation
        this.initializeStep3Navigation();
      } else {
        console.log("OneTimeOfferManager not ready, waiting...");
        // Wait for OneTimeOfferManager to initialize
        setTimeout(() => {
          this.initializeOfferStep();
        }, 100);
      }
    }, 100);
  }

  initializeStep3Navigation() {
    // Add to Cart button
    const addToCartBtn = document.getElementById('offer-add-btn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        this.handleFinalAddToCart(false); // Include offers
      });
    }

    // Skip offer link
    const skipOfferLink = document.getElementById('offer-skip-link');
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
    const addToCartBtn = document.getElementById('final-add-to-cart');
    const skipOfferBtn = document.getElementById('skip-offer');

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
    console.log(`goToStep called with: ${stepNumber}, current step: ${this.currentStep}`);
    
    // Only validate when going forward, allow going back without validation
    if (stepNumber < this.currentStep || this.validateCurrentStep()) {
      console.log(`Validation passed, showing step ${stepNumber}`);
      this.showStep(stepNumber);
    } else {
      console.log('Validation failed, cannot proceed to step:', stepNumber);
      console.log('Current step validation result:', this.validateCurrentStep());
    }
  }

  validateCurrentStep() {
    console.log('Validating current step:', this.currentStep);
    console.log('Current subscription data:', this.subscriptionData);
    
    switch (this.currentStep) {
      case 1:
        // Must have selected products
        const hasProducts = this.subscriptionData.selectedProducts.length > 0;
        console.log('Step 1 validation - has products:', hasProducts);
        return hasProducts;
      case 2:
        // Must have selected frequency
        const hasFrequency = this.subscriptionData.frequency !== null && this.subscriptionData.frequency !== undefined && this.subscriptionData.frequency !== '';
        console.log('Step 2 validation - has frequency:', hasFrequency, 'frequency value:', this.subscriptionData.frequency);
        return hasFrequency;
      case 3:
        // No validation needed
        console.log('Step 3 validation - always true');
        return true;
      default:
        console.log('Default validation - always true');
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
      console.log('Select frequency button state - Total items:', totalCount, 'Disabled:', totalCount < 6);
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
      
      console.log('Frequency selected:', frequencyText);
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
        console.log('Email captured:', this.subscriptionData.customerEmail);
      }

      // Add one-time offers if not skipped
      if (!skipOffers && window.oneTimeOfferManager) {
        const selectedOffers = window.oneTimeOfferManager.getSelectedOffers();
        this.subscriptionData.oneTimeOffers = selectedOffers;
        console.log('One-time offers added:', selectedOffers);
      } else {
        this.subscriptionData.oneTimeOffers = [];
        console.log('Skipping one-time offers');
      }

      console.log('Final subscription data:', this.subscriptionData);

      // Show loading state
      this.showLoadingState();

      // Create subscription through cart manager
      if (window.cartManager) {
        await window.cartManager.createSubscription(this.subscriptionData);
      } else {
        throw new Error('Cart manager not available');
      }

    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('There was an error creating your subscription. Please try again.');
      this.hideLoadingState();
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