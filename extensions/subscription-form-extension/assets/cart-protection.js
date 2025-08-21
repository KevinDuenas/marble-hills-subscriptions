// Cart Protection System - All or Nothing for Subscription Items
class CartProtection {
  constructor() {
    this.isSubscriptionCart = false;
    this.subscriptionItems = new Set();
    this.isProtectionActive = false;
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
    
    console.log("🛡️ Cart Protection System initialized");
  }

  async checkSubscriptionCart() {
    try {
      const response = await this.originalFetch.call(window, '/cart.js');
      const cart = await response.json();
      
      // Check if cart has subscription attributes
      if (cart.attributes && cart.attributes.subscription_type) {
        this.isSubscriptionCart = true;
        
        // Store subscription item keys for tracking
        cart.items.forEach(item => {
          if (item.properties && (item.properties._subscription_type || item.properties._protected_item)) {
            this.subscriptionItems.add(item.key);
          }
        });
        
        console.log("🔒 Subscription cart detected with protection enabled");
        console.log("Protected items:", Array.from(this.subscriptionItems));
        
        this.isProtectionActive = true;
      }
    } catch (error) {
      console.error("Error checking subscription cart:", error);
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
    if (!this.isProtectionActive) {
      return this.originalFetch(url, options);
    }

    console.log("🚨 Cart modification detected:", url, options);

    // If it's a clear request, allow it
    if (url.includes('/cart/clear.js')) {
      return this.originalFetch.call(window, url, options);
    }

    // For ANY modification to subscription cart, clear everything
    // This is the "all or nothing" approach
    if (url.includes('/cart/change') || url.includes('/cart/update') || url.includes('/cart/remove')) {
      console.log("🛡️ Cart modification blocked - clearing entire cart");
      this.showProtectionWarning();
      return this.clearEntireCart();
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
            console.log(`🔍 Detected quantity change to 0 for line ${data.line}`);
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
      console.error("Error checking subscription modification:", error);
      return false;
    }
  }

  async clearEntireCart() {
    try {
      console.log("🧹 Clearing entire cart due to protection rule");
      
      // Clear cart and reset protection - use call to maintain proper context
      const response = await this.originalFetch.call(window, '/cart/clear.js', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        console.log("✅ Cart cleared successfully");
        this.isProtectionActive = false;
        this.subscriptionItems.clear();
        
        // Force page refresh to update cart UI
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.error("❌ Failed to clear cart:", response.status);
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
    } catch (error) {
      console.error("Error clearing cart:", error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to clear cart" 
      }), { 
        status: 200, // Return 200 to prevent original action
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
  }

  showProtectionWarning() {
    // Create warning message
    const warning = document.createElement('div');
    warning.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff6b35;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 600;
        animation: slideDown 0.3s ease-out;
      ">
        🛡️ No puedes modificar productos individuales de una suscripción.<br>
        Se ha limpiado todo el carrito. Volviendo a la tienda...
      </div>
      <style>
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      </style>
    `;
    
    document.body.appendChild(warning);
    
    // Remove warning after 3 seconds
    setTimeout(() => {
      if (warning.parentNode) {
        warning.parentNode.removeChild(warning);
      }
    }, 3000);
  }

  addVisualProtection() {
    if (!this.isProtectionActive) return;

    // Add protection notice to cart
    const style = document.createElement('style');
    style.textContent = `
      .cart-protection-notice {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 16px;
        margin: 10px 0;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .cart-item[data-subscription="true"] {
        border-left: 4px solid #667eea;
        background: rgba(102, 126, 234, 0.05);
      }
      
      .cart-item[data-subscription="true"] .cart-item__remove {
        opacity: 0.5;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    // Add notice to cart areas
    this.addProtectionNotices();
  }

  addProtectionNotices() {
    // Add notices to common cart selectors
    const cartSelectors = [
      '.cart',
      '.cart-drawer',
      '.cart-items',
      '#cart-drawer',
      '.mini-cart'
    ];

    cartSelectors.forEach(selector => {
      const cartElement = document.querySelector(selector);
      if (cartElement && !cartElement.querySelector('.cart-protection-notice')) {
        const notice = document.createElement('div');
        notice.className = 'cart-protection-notice';
        notice.innerHTML = '🛡️ Suscripción Protegida - Los productos van juntos';
        cartElement.insertBefore(notice, cartElement.firstChild);
      }
    });
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
          
          console.log("🛡️ Cart item removal blocked");
          self.showProtectionWarning();
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
        button.title = 'No puedes remover productos individuales de una suscripción';
        
        // Add click handler to show warning
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.showProtectionWarning();
          this.clearEntireCart();
          return false;
        });
      }
    });
  }
}

// Initialize cart protection when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure cart is loaded
  setTimeout(() => {
    window.cartProtection = new CartProtection();
  }, 500);
});

// Also initialize on page load for themes that load cart via AJAX
window.addEventListener('load', function() {
  if (!window.cartProtection) {
    setTimeout(() => {
      window.cartProtection = new CartProtection();
    }, 1000);
  }
});