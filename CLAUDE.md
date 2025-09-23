# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Shopify CLI (includes tunnel and hot reload)
- `npm run build` - Build the app for production using Remix
- `npm run start` - Start production server
- `npm run setup` - Initialize database (generate Prisma client and run migrations)

### Shopify CLI
- `npm run config:link` - Link app configuration
- `npm run config:use` - Switch app configuration
- `npm run generate` - Generate app extensions/components
- `npm run deploy` - Deploy app to Shopify
- `npm run env` - Manage environment variables

### Code Quality
- `npm run lint` - Run ESLint with caching
- `npm run graphql-codegen` - Generate GraphQL types and schemas

### Database
- `npm run prisma` - Access Prisma CLI directly
- Database is SQLite by default (dev.sqlite in prisma/)

## Architecture

### Shopify App Structure
This is a Shopify subscription app built with:
- **Framework**: Remix (React-based) with Shopify App Remix package
- **Database**: Prisma ORM with SQLite (configurable for production databases)
- **Authentication**: Shopify OAuth handled by `@shopify/shopify-app-remix`
- **UI**: Shopify Polaris design system
- **API**: GraphQL Admin API (January 2025 version)

### App Configuration
- **shopify.app.toml**: Main app configuration including scopes, webhooks, and URLs
- **shopify.web.toml**: Web app specific configuration
- Current scopes: `write_products`
- Embedded app running in Shopify Admin iframe

### Key Architecture Components

#### Core App Files
- `app/shopify.server.js`: Shopify app initialization and authentication setup
- `app/db.server.js`: Database connection and Prisma client
- `app/routes/`: Remix routes including app pages and webhook handlers
- `app/routes/app.jsx`: Main app container with Shopify App Bridge integration

#### Theme Extension
- `extensions/subscription-form-extension/`: Shopify theme extension for subscription form
- **NEW 3-Step Flow** (completely redesigned from 4-step to 3-step):
  1. **Step 1: Product Selection** - Product grid with categories, variant selection, quantity controls, progress bar with discount milestones
  2. **Step 2: Frequency Selection** - Radio button options for delivery frequency (2, 4, 6 weeks)
  3. **Step 3: One-Time Offers** - Additional products with discounts and email capture
- **Progress Bar System**: Visual progress with discount milestones (5% at 6 items in middle, 10% at 10 items at end)
- **Floating Cart Summary**: Bottom-fixed cart with real-time updates, discount calculations, and "Select Frequency" button
- CSS modules: base-styles.css, subscription-options.css, product-selection.css, summary.css
- JavaScript modules: main-subscription.js, product-manager.js, one-time-offer-manager.js, cart-manager.js

#### Database Schema
- Single `Session` model for Shopify session storage
- Uses Prisma with SQLite for development
- Session includes shop data, access tokens, and user information

### Development Workflow
1. Run `npm run dev` to start development with Shopify CLI tunnel
2. App automatically opens in development store
3. Extension is built and deployed automatically during development
4. Use Shopify CLI commands for configuration and deployment

### Key Integration Points
- Shopify Admin API for product and subscription management
- Shopify App Bridge for embedded app experience  
- Theme extension integrates with storefront for customer-facing subscription flow
- Webhook handlers for app lifecycle events (uninstall, scope updates)

### Extension Structure (Updated 3-Step Flow)
The subscription form extension is a streamlined 3-step wizard:

#### Step 1: Product Selection
- **Header**: "Select Cuts" with step indicator (Step 1/2: Next step: Choose Frequency) positioned right-aligned and vertically centered
- **Progress Bar**: Visual progress with discount milestones:
  - 5% discount milestone positioned at 50% of bar (6 items)
  - 10% discount milestone positioned at 100% of bar (10 items)
  - Linear progress calculation: 0-6 items = 0%-50%, 6-10 items = 50%-100%
- **Product Grid**: Categories sidebar + 3-column product grid with:
  - Variant selection dropdowns
  - Quantity controls (default: 2 per product)
  - Add/Remove buttons
  - Selected product visual indicators
- **Floating Cart**: Bottom-fixed cart summary with:
  - Real-time count and pricing updates
  - Discount calculations and display
  - "Select Frequency" button (disabled until 6+ items)

#### Step 2: Frequency Selection
- **Orange Background Container**: Centered layout with orange background (#fff4e6) and padding
- **Custom Radio Buttons**: Black border circles with filled center when selected
- **Large Text**: Font size 24px and font-weight 700 for frequency options
- **Frequency Options**: Radio buttons for 2, 4, 6 weeks delivery frequency
- **Identical Floating Cart**: Uses same `floating-cart-summary` class as Step 1 with:
  - Same styling, positioning, and layout as Step 1
  - Left side shows "Select your delivery frequency" initially
  - Changes to "Frequency: Every X weeks" when option selected
  - Right side has Previous (gray) and Next (orange) buttons side by side
  - Previous button allows returning to Step 1 without validation
  - Next button enabled only after frequency selection

#### Step 3: One-Time Offers
- Grid of promotional products with discounts
- Email capture field
- Final "Add to Cart" or "Skip Offer" actions

### Technical Implementation Notes

#### JavaScript Architecture
- **MainSubscriptionManager**: Controls step navigation and state management
- **ProductManager**: Handles product loading, selection, and cart updates
- **OneTimeOfferManager**: Manages promotional offers in step 3
- **CartManager**: Handles cart creation and Shopify integration

#### Key Bug Fixes Implemented
1. **Progress Bar Visibility**: Fixed CSS issues by applying styles directly via JavaScript with `!important` flags
2. **Product Loading**: Added fallback mechanisms for product API calls
3. **Navigation Logic**: Modified `goToStep()` to allow backward navigation without validation
4. **Button States**: Updated Select Frequency button to require minimum 6 items
5. **Stepper Styling**: Implemented proper alignment and removed unwanted border lines
6. **Tag-Based Filtering**: Switched from metafield to dynamic sb- prefix tag-based product filtering system
7. **Category Selection**: Implemented default category selection with Best Sellers priority
8. **Mobile Responsive Headers**: Fixed element ordering with CSS flexbox order properties
9. **Step 2 UI Redesign**: Complete redesign with orange background and custom radio buttons
10. **Floating Cart Layout**: Fixed side-by-side layout with `!important` CSS overrides

#### Critical CSS Patterns
- Use `cssText` with `!important` for critical progress bar styles
- Flexbox layout for header alignment with `align-items: center`
- Absolute positioning for progress milestones at exact percentages
- Force display properties when elements aren't rendering properly
- **Floating Cart Layout**: Use `!important` overrides to ensure side-by-side layout:
  ```css
  .floating-cart-summary {
    display: flex !important;
    flex-direction: row !important;
    justify-content: space-between !important;
    align-items: center !important;
  }
  ```
- **Product Filtering**: Dynamic tag-based system using `sb-` prefix tags (see Dynamic Tag-Based Product System section)
- **Custom Radio Buttons**: Use `appearance: none` and `::after` pseudo-elements for styling
- **Mobile Header Ordering**: Use CSS `order` property instead of `flex-direction: column-reverse`

#### API Integration
- Primary: `/collections/subscriptions/products.json`
- Fallback: `/products.json?limit=50`
- Error handling with retry mechanisms and user feedback

### Recent Implementation Updates

#### Step 2 Floating Cart Implementation
- **Identical Design**: Step 2 now uses exact same `floating-cart-summary` class as Step 1
- **Layout Structure**: 
  - `cart-summary-left`: Contains frequency selection text/status
  - `cart-summary-right`: Contains Previous and Next buttons
- **Dynamic Content**: 
  - Shows "Select your delivery frequency" initially
  - Updates to "Frequency: Every X weeks" when frequency selected
  - JavaScript function `updateFrequencySummary()` handles real-time updates
- **Button Layout**: Previous (gray) and Next (orange) buttons side by side
- **CSS Override Strategy**: Used `!important` flags to force proper flexbox layout

#### Dynamic Tag-Based Product System (sb- Prefix)
**UPDATED SYSTEM**: All product tags now use "sb-" prefix (Subscription Builder) to prevent conflicts with other store tags and ensure organization.

**Subscription Eligibility Tags** (Required - at least one needed):
- `sb-subscription`
- `sb-subscription-eligible`
- `sb-eligible`
- `sb-suscripcion`
- `sb-suscripcion-elegible`

**Dynamic Category System**:
- **Format**: `sb-category-[CategoryName]` or `sb-category-[CategoryName]-#[Position]`
- **Examples**:
  - `sb-category-Steaks` → Creates "Steaks" category (position 999)
  - `sb-category-Steaks-#1` → Creates "Steaks" category (position 1, appears first after Best Sellers)
  - `sb-category-Premium-Cuts-#2` → Creates "Premium Cuts" category (position 2)
  - `sb-category-chicken_wings-#5` → Creates "Chicken Wings" category (position 5)
- **Category Ordering**: Use `-#[number]` suffix to control display order
  - Best Sellers always appears first (if populated)
  - Categories with `-#1`, `-#2`, etc. appear in ascending order
  - Categories without position numbers appear last (position 999)
- **Case Sensitive**: `sb-category-Steak` ≠ `sb-category-steak` (creates different categories)
- **Multiple Categories**: Products can have multiple `sb-category-` tags to appear in multiple categories
- **Auto-formatting**: Category names auto-format (capitalize first letters, replace dashes/underscores with spaces)

**Best Sellers Tags**:
- `sb-best-seller`
- `sb-popular`
- `sb-bestseller`
- `sb-mejor-vendido`

**One-Time Offers Tag**:
- `sb-one-time-offer`

**Example Product Tagging**:
```
Product with tags: [
  "sb-subscription",           // Required for eligibility
  "sb-category-Steaks-#1",    // Appears in Steaks category (position 1)
  "sb-category-Premium-#3",   // Also appears in Premium category (position 3)
  "sb-category-BBQ",          // Also appears in BBQ category (position 999)
  "sb-best-seller"            // Also appears in Best Sellers (always first)
]
Result: Product appears in 4 categories
Display order: Best Sellers → Steaks → Premium → BBQ
```

**System Behavior**:
- Categories are created dynamically based on `sb-category-` tags found in products
- No predefined category mapping - any name after `sb-category-` becomes a category
- Best Sellers remains special category, shown first when populated
- Products without `sb-category-` tags default to Best Sellers
- **API Fallback**: Graceful degradation when subscription collection not available

#### Mobile Responsive Design
- **Header Order**: Step indicator above title on mobile using CSS `order` property
- **Category Display**: Horizontal scrolling category pills on mobile
- **Progress Bar**: Maintains visibility and functionality across screen sizes

### Latest Updates (August 2025)

#### Dynamic Category System Implementation
**Major Update**: Completely revamped the product categorization system to be fully dynamic and conflict-free.

**Key Changes**:
1. **sb- Prefix System**: All app-specific tags now use "sb-" prefix to prevent conflicts with store tags
2. **Dynamic Category Creation**: Categories are created automatically from `sb-category-[name]` tags
3. **Case Sensitive Categories**: `sb-category-Steak` creates different category than `sb-category-steak`
4. **Multiple Category Support**: Products can appear in multiple categories with multiple `sb-category-` tags
5. **Auto-formatting**: Category names automatically format with proper capitalization and spacing

**Implementation Files Modified**:
- `extensions/subscription-form-extension/assets/product-manager.js`:
  - Updated `hasSubscriptionMetafield()` to check for `sb-subscription*` tags
  - Replaced `getProductCategory()` with `getProductCategories()` for multiple category support
  - Added `formatCategoryTitle()` for automatic category name formatting
  - Modified `createProductCategories()` to create categories dynamically
- `extensions/subscription-form-extension/assets/one-time-offer-manager.js`:
  - Updated to filter products with `sb-one-time-offer` tag

**Developer Guidelines**:
- Always use `sb-` prefix for all Subscription Builder related tags
- Use `sb-subscription` (or variants) for subscription eligibility
- Use `sb-category-[Name]` or `sb-category-[Name]-#[Position]` format for categories
- Use `sb-best-seller` (or variants) for best seller designation
- Use `sb-one-time-offer` for promotional offers
- Products can have multiple category tags to appear in multiple categories
- Category names are case-sensitive and preserve exact formatting after prefix
- **Category Ordering**: Add `-#[number]` to control category display order (1 = first after Best Sellers)

### Critical System Architecture Changes (September 2025)

#### One-Time Offers System Overhaul
**MAJOR CHANGE**: Completely removed Draft Orders dependency and simplified to use only real $0 Shopify products.

**Key System Changes**:
1. **Removed Draft Orders API**: Eliminated all `createDraftOrder()` functions and related logic
2. **Real $0 Products Only**: All one-time offers are now created as actual Shopify products with $0 pricing
3. **Simplified Cart API Usage**: All products (subscription + offers) use standard Shopify Cart API
4. **Admin Price Management**: GraphQL mutations automatically set variant prices to $0 on creation/update

**Critical GraphQL Updates**:
- **Deprecated Mutation Fixed**: Replaced `productVariantUpdate` with `productVariantsBulkUpdate`
- **Proper Array Syntax**: Updated all mutations to use bulk update format:
  ```graphql
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
      }
      userErrors {
        field
        message
      }
    }
  }
  ```

**Removed Functions from cart-manager.js**:
- `createDraftOrder()` - Legacy Draft Orders API function
- `createDraftOrderWithDiscounts()` - Draft Orders with discount codes
- `createRegularSubscription()` - Unused wrapper function
- `createSubscriptionWithOfferDiscounts()` - Unused discount code generator
- `createRegularSubscriptionWithDiscountNote()` - Unused function
- Virtual product detection and price override logic
- Complex debugging systems for Draft Orders

**Simplified Architecture Flow**:
1. **Admin App**: Creates real $0 Shopify products using `productVariantsBulkUpdate`
2. **Extension**: Uses real Shopify variant IDs from database
3. **Cart Manager**: Adds all products using standard Cart API
4. **Checkout**: Standard Shopify checkout with real products

**Admin Interface Changes**:
- **Removed Price Fields**: No price input in one-time offers admin (always $0)
- **Real Product Creation**: Creates actual Shopify products with variants
- **Automatic Pricing**: GraphQL mutations ensure $0 pricing on all variants
- **Error Handling**: Proper validation for GraphQL mutation responses

**UI/UX Improvements**:
- **FREE Label**: One-time offer cards show "FREE" instead of "$0.00"
- **Simplified Display**: Cleaner product cards without complex pricing logic
- **Better Error Messages**: Clear feedback when product creation fails

**Technical Benefits**:
- **Reduced Complexity**: 50% less code in cart-manager.js
- **Better Performance**: No Draft Orders API calls or virtual product generation
- **Improved Reliability**: Uses standard Shopify Cart API throughout
- **Easier Debugging**: Simpler data flow with real products only
- **Future-Proof**: No dependency on deprecated APIs

**Migration Notes**:
- All existing Draft Orders logic has been removed
- System now exclusively uses real Shopify products
- No backward compatibility with virtual product IDs
- All one-time offers must be created through admin app

**Critical Code Locations**:
- `app/routes/app.one-time-offers.jsx`: Admin interface with GraphQL mutations
- `extensions/subscription-form-extension/assets/cart-manager.js`: Simplified Cart API logic
- `extensions/subscription-form-extension/assets/one-time-offer-manager.js`: Real product handling