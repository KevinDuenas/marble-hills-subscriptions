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
        this.showProtectionWarning();
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
      console.error("Error checking subscription modification:", error);
      return false;
    }
  }

  async clearEntireCart() {
    try {
      // Disable protection temporarily to avoid recursion
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
        // Force page refresh to update cart UI
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
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
      console.error("Error clearing cart:", error);
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

  showProtectionWarning() {
    // Create professional system notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div class="cart-protection-notification" style="
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #ffffff;
        color: #1a1a1a;
        border: 1px solid #e1e5e9;
        border-left: 4px solid #0066cc;
        padding: 16px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        min-width: 320px;
        max-width: 480px;
        animation: slideInDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      ">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            background: #0066cc;
            border-radius: 50%;
            flex-shrink: 0;
            margin-top: 1px;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <div style="font-weight: 600; margin-bottom: 4px; color: #1a1a1a;">
              Subscription Protected
            </div>
            <div style="color: #666; font-size: 13px; margin-bottom: 8px;">
              Items cannot be modified individually. Cart has been cleared.
            </div>
            <div style="font-size: 12px; color: #888;">
              Redirecting to subscription builder...
            </div>
          </div>
        </div>
      </div>
      <style>
        @keyframes slideInDown {
          from { 
            opacity: 0; 
            transform: translate(-50%, -20px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translate(-50%, 0) scale(1); 
          }
        }
        .cart-protection-notification {
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
      </style>
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideInDown 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 200);
      }
    }, 2500);
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
        button.style.cursor = 'not-allowed';
        button.title = 'Subscription items are protected - removing one item will clear the entire cart';
        
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

// Initialize cart protection only if we're not on checkout pages
document.addEventListener('DOMContentLoaded', function() {
  // Skip initialization on checkout pages
  if (window.location.pathname.includes('/checkout') || 
      window.location.pathname.includes('/thank') ||
      window.location.pathname.includes('/orders')) {
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
  // Skip on checkout pages
  if (window.location.pathname.includes('/checkout') || 
      window.location.pathname.includes('/thank') ||
      window.location.pathname.includes('/orders')) {
    return;
  }
  
  if (!window.cartProtection) {
    setTimeout(() => {
      window.cartProtection = new CartProtection();
    }, 1500);
  }
});