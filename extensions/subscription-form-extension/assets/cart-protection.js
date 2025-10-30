// Cart Protection System - All or Nothing for Subscription Items
class CartProtection {
  constructor() {
    this.isSubscriptionCart = false;
    this.subscriptionItems = new Set();
    this.isProtectionActive = false;
    this.isCreatingSubscription = false; // NEW: Flag to disable protection during subscription creation
    this.originalFetch = window.fetch;

    this.init();
  }

  init() {
    // Check if current cart is a subscription cart
    this.checkSubscriptionCart();
    
    // Override fetch to intercept cart modifications
    this.interceptCartModifications();
    
    // Monitor DOM changes for cart updates
    this.observeCartChanges();
    
    // Add visual indicators
    this.addVisualProtection();
    
    // Block remove buttons initially
    setTimeout(() => this.blockRemoveButtons(), 1000);
  }

  async checkSubscriptionCart() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      // Check if cart has subscription attributes AND subscription items
      if (cart.attributes && cart.attributes.subscription_type === 'custom') {
        this.isSubscriptionCart = true;
        
        // Store subscription item keys for tracking
        let hasSubscriptionItems = false;
        cart.items.forEach(item => {
          if (item.properties && (item.properties._subscription_type || item.properties._protected_item)) {
            this.subscriptionItems.add(item.key);
            hasSubscriptionItems = true;
          }
        });
        
        // Only activate protection if we actually have subscription items
        this.isProtectionActive = hasSubscriptionItems && cart.items.length > 0;
      }
    } catch (error) {
    }
  }

  interceptCartModifications() {
    const self = this;
    
    // Override fetch for cart API calls
    window.fetch = function(url, options = {}) {
      // Check if it's a cart modification request
      if (self.isCartModificationRequest(url, options)) {
        return self.handleCartModification(url, options);
      }
      
      // For non-cart requests, use original fetch
      return self.originalFetch.call(this, ...arguments);
    };

    // Also override common cart modification methods used by themes
    this.overrideShopifyCart();
  }

  isCartModificationRequest(url, options) {
    const cartEndpoints = [
      '/cart/update.js',
      '/cart/change.js', 
      '/cart/remove.js',
      '/cart/clear.js'
    ];
    
    return cartEndpoints.some(endpoint => url.includes(endpoint)) ||
           (url.includes('/cart/') && (options.method === 'POST' || options.method === 'PUT'));
  }

  async handleCartModification(url, options) {
    // CRITICAL: If we're creating a subscription, allow ALL cart operations
    if (this.isCreatingSubscription) {
      return this.originalFetch.call(window, url, options);
    }

    if (!this.isProtectionActive) {
      return this.originalFetch.call(window, url, options);
    }

    // If it's a clear or add request, allow it (needed for subscription creation)
    if (url.includes('/cart/clear.js') || url.includes('/cart/add.js')) {
      return this.originalFetch.call(window, url, options);
    }

    // For modification requests (change/update/remove), check if we have subscription items
    if (url.includes('/cart/change') || url.includes('/cart/update') || url.includes('/cart/remove')) {
      // Only protect if we currently have subscription items
      if (this.subscriptionItems.size > 0) {
        return this.clearEntireCart();
      }
    }

    // Allow other requests
    return this.originalFetch.call(window, url, options);
  }

  async isModifyingSubscriptionItems(options) {
    try {
      // Parse the request body to check which items are being modified
      const body = options.body;
      
      if (typeof body === 'string') {
        // Handle both URLSearchParams and JSON formats
        if (body.startsWith('{')) {
          // JSON format (like from cart drawer)
          const data = JSON.parse(body);
          
          // Check for line item changes
          if (data.line && data.quantity === 0) {
            return true; // Any quantity change to 0 triggers protection
          }
          
          if (data.quantity !== undefined && data.quantity === 0) {
            return true;
          }
        } else {
          // URLSearchParams format
          const data = new URLSearchParams(body);
          
          // Check for quantity changes that would affect subscription items
          for (const [key, value] of data) {
            if (key.startsWith('updates[') && value === '0') {
              // Someone is trying to remove an item
              const itemKey = key.match(/updates\[([^\]]+)\]/)?.[1];
              if (this.subscriptionItems.has(itemKey)) {
                return true;
              }
            }
          }
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  async clearEntireCart() {
    try {
      // Disable protection temporarily to avoid recursion
      const wasProtectionActive = this.isProtectionActive;
      this.isProtectionActive = false;
      this.subscriptionItems.clear();

      // Use original fetch without interception
      const response = await fetch('/cart/clear.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // CRITICAL: Never reload if we're creating a subscription
        // Only reload if protection was active AND we're not creating subscription
        if (wasProtectionActive && !this.isCreatingSubscription) {
          // Force page refresh to update cart UI
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }

        // Return a successful response to prevent the original modification
        return new Response(JSON.stringify({
          success: true,
          message: "Cart cleared due to subscription protection",
          items: [],
          item_count: 0,
          total_price: 0
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          }
        });
      }

      return response;
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to clear cart"
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
  }


  addVisualProtection() {
    // Skip visual protection to avoid UI conflicts
    return;
  }

  addProtectionNotices() {
    // Skip adding notices - they interfere with normal cart flow
    return;
  }

  overrideShopifyCart() {
    const self = this;
    
    // Override Shopify cart methods if they exist
    if (window.Shopify && window.Shopify.onItemAdded) {
      const originalOnItemAdded = window.Shopify.onItemAdded;
      window.Shopify.onItemAdded = function() {
        self.checkSubscriptionCart();
        return originalOnItemAdded.apply(this, arguments);
      };
    }

    // Override jQuery cart handlers if they exist
    if (window.jQuery) {
      const $ = window.jQuery;
      $(document).on('click', '[data-cart-remove], .cart-remove, .cart__remove', function(e) {
        if (self.isProtectionActive) {
          e.preventDefault();
          e.stopPropagation();
          
          self.clearEntireCart();
          
          return false;
        }
      });
    }
  }

  observeCartChanges() {
    // Monitor for dynamically added cart elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && this.isProtectionActive) {
          this.addProtectionNotices();
          this.blockRemoveButtons();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  blockRemoveButtons() {
    // Disable/hide remove buttons for subscription items
    const removeButtons = document.querySelectorAll('[data-cart-remove], .cart-remove, .cart__remove, .remove');

    removeButtons.forEach(button => {
      if (this.isProtectionActive) {
        button.style.opacity = '0.3';
        button.style.pointerEvents = 'none';
        button.style.cursor = 'not-allowed';
        button.title = 'Subscription items are protected - removing one item will clear the entire cart';

        // Add click handler to clear cart
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.clearEntireCart();
          return false;
        });
      }
    });
  }

  // PUBLIC METHODS: For external use by cart-manager.js
  startSubscriptionCreation() {
    this.isCreatingSubscription = true;
    this.isProtectionActive = false;
  }

  finishSubscriptionCreation() {
    this.isCreatingSubscription = false;
    // Re-check subscription cart status after creation
    setTimeout(() => {
      this.checkSubscriptionCart();
    }, 500);
  }
}

// Helper function to detect if we're on a checkout-related page
function isCheckoutPage() {
  const path = window.location.pathname.toLowerCase();
  const checkoutPaths = ['/checkout', '/thank', '/orders', '/account', '/wallets'];

  return checkoutPaths.some(checkoutPath => path.includes(checkoutPath)) ||
         window.Shopify?.Checkout !== undefined; // Shopify Checkout object exists
}

// Initialize cart protection only if we're not on checkout pages
document.addEventListener('DOMContentLoaded', function() {
  // CRITICAL: Never initialize on checkout-related pages
  if (isCheckoutPage()) {
    return;
  }

  // Small delay to ensure cart is loaded
  setTimeout(() => {
    if (!window.cartProtection) {
      window.cartProtection = new CartProtection();
    }
  }, 1000);
});

// Also initialize on page load for themes that load cart via AJAX
window.addEventListener('load', function() {
  // CRITICAL: Never initialize on checkout-related pages
  if (isCheckoutPage()) {
    return;
  }

  if (!window.cartProtection) {
    setTimeout(() => {
      window.cartProtection = new CartProtection();
    }, 1500);
  }
});