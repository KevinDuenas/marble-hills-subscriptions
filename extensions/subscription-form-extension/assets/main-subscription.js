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
    const currentStepElement = document.querySelector(`[data-step="${stepNumber}"]`);
    if (currentStepElement) {
      currentStepElement.classList.add('active');
      
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
        // Frequency selection step - no special initialization needed
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
    if (window.oneTimeOfferManager) {
      console.log("OneTimeOfferManager found, loading offers");
      window.oneTimeOfferManager.loadOfferProducts();
    } else {
      console.log("OneTimeOfferManager not ready, waiting...");
      // Wait for OneTimeOfferManager to initialize
      setTimeout(() => {
        this.initializeOfferStep();
      }, 100);
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
      const nextBtn = document.querySelector('.next-btn');
      
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
          const selectedFrequency = document.querySelector('input[name="frequency"]:checked');
          if (selectedFrequency) {
            this.subscriptionData.frequency = selectedFrequency.value;
            this.goToStep(3);
          } else {
            console.log("No frequency selected");
          }
        });
      }
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
    // Only validate when going forward, allow going back without validation
    if (stepNumber < this.currentStep || this.validateCurrentStep()) {
      this.showStep(stepNumber);
    } else {
      console.log('Validation failed, cannot proceed to step:', stepNumber);
    }
  }

  validateCurrentStep() {
    switch (this.currentStep) {
      case 1:
        // Must have selected products
        return this.subscriptionData.selectedProducts.length > 0;
      case 2:
        // Must have selected frequency
        return this.subscriptionData.frequency !== null;
      case 3:
        // No validation needed
        return true;
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
      console.log('Select frequency button state - Total items:', totalCount, 'Disabled:', totalCount < 6);
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
        this.subscriptionData.oneTimeOffers = window.oneTimeOfferManager.getSelectedOffers();
      }

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