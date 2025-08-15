# Extension Structure and Logic Requirements

## Current State Analysis

### Current Extension Structure
- **Location**: `extensions/subscription-form-extension/`
- **Type**: Shopify theme extension
- **Main Components**:
  - `blocks/subscription-form.liquid` - Main template with 4-step wizard
  - `assets/` - 8 separate files (3 JS modules, 4 CSS files, 1 main JS)
  - `locales/en.default.json` - i18n support
  - `shopify.extension.toml` - Configuration

### Current Flow Logic (OLD - 4 steps)
1. **Step 1**: Subscription type selection (Curated vs Custom)
2. **Step 2**: Box size selection (Basic vs Premium) 
3. **Step 3**: Frequency selection (2, 4, 6 weeks)
4. **Step 4**: Product selection with different behaviors:
   - **Curated**: Select one bundle/box from filtered options
   - **Custom**: Select multiple individual products with quantities and discount tiers (5% at 6+ items, 10% at 10+ items)

### New Flow Logic (NEW - 3 steps)
1. **Step 1**: Product selection with variant selectors, quantities, discount progress bar, and floating cart summary
2. **Step 2**: Frequency selection (2, 4, 6 weeks) with Previous/Next navigation
3. **Step 3**: One-time offer with 3 product cards, email capture, and final cart action

### Current JavaScript Architecture
- **SubscriptionManager**: Main flow controller, step navigation, validation
- **ProductManager**: Product loading, filtering, category management, discount calculations
- **CartManager**: Cart operations, subscription creation, Shopify cart integration

### Current Styling Structure
- **base-styles.css**: Core layout, transitions, buttons
- **subscription-options.css**: Step 1-3 option styling
- **product-selection.css**: Step 4 product grid and selection
- **summary.css**: Final summary and success states

## Requirements for New Structure

### 1. Structural Changes Required

#### File Organization
- [ ] **Consolidate or restructure CSS files**
  - Current: 4 separate CSS files
  - Proposed: [SPECIFY NEW STRUCTURE]

- [ ] **Consolidate or restructure JavaScript modules**
  - Current: 3 separate JS classes + 1 main loader
  - Proposed: [SPECIFY NEW STRUCTURE]

- [ ] **Template modifications**
  - Current: Single Liquid file with 4 steps
  - Proposed: [SPECIFY CHANGES TO STEPS/STRUCTURE]

#### Extension Configuration
- [ ] **Update shopify.extension.toml settings**
  - Current settings: Basic "Subscription Builder" block
  - Proposed: [SPECIFY NEW SETTINGS/BLOCKS]

### 2. Logic Flow Changes Required

#### Navigation Logic
- [x] **Step progression changes**
  - Current: Linear 4-step flow (subscription type → box size → frequency → products)
  - Proposed: **3-step flow** (products → frequency → one-time offer)

- [x] **Validation logic updates**
  - Current: Step-by-step validation with alerts
  - Proposed: **Dynamic validation** with real-time button state updates and floating progress

#### Subscription Types (REMOVED)
- [x] **Remove subscription type selection**
  - Current: Curated vs Custom box selection in Step 1
  - Proposed: **Single subscription type** - all users follow custom product selection flow

- [x] **Remove box size selection**
  - Current: Basic vs Premium box filtering
  - Proposed: **Single product pool** - all products available regardless of "box size"

#### Product Management
- [x] **Product loading and filtering**
  - Current: Collection-based loading with metafield/tag filtering by box size
  - Proposed: **Load all subscription products** without box size filtering from `/collections/subscriptions/products.json`

- [x] **Category organization**
  - Current: Dynamic categories based on product metadata with "All Boxes" for curated
  - Proposed: **Keep existing categories** (Best Sellers, Steak, Pork, Poultry, Sea food, Sides, Desserts) - remove "All Boxes"

- [x] **Discount calculation**
  - Current: Quantity-based tiers (5% at 6+, 10% at 10+) for custom only
  - Proposed: **Same discount tiers for all users** - 5% at 6+ products, 10% at 10+ products

### 3. Cart Integration Changes

#### Cart Preparation
- [x] **Cart item structure**
  - Current: Different properties for curated vs custom (`_subscription_type`, `_bundle_title` vs `_custom_selection`)
  - Proposed: **Simplified structure** - all products use custom-style properties:
    - `_subscription_type: "custom"` (always)
    - `_frequency: [selected frequency]`
    - `_product_title: [product name]`
    - `_selected_variant: [variant title]` (new)
    - `_quantity: [quantity]`
    - `_first_box_addon: "true"` (for one-time offers)

- [x] **Subscription metadata**
  - Current: Cart attributes for subscription type, frequency, discount, product counts
  - Proposed: **Enhanced metadata structure**:
    - `subscription_type: "custom"` (always)
    - `frequency: [2weeks|4weeks|6weeks]`
    - `discount_percentage: [0|5|10]`
    - `product_count: [total quantity]`
    - `unique_products: [number of different products]`
    - `customer_email: [from one-time offer]` (new)
    - `has_one_time_offers: [true|false]` (new)

#### Checkout Integration
- [x] **Redirect behavior**
  - Current: Automatic redirect to /cart after 3 seconds
  - Proposed: **Direct cart redirect** from Step 3 "Add to Cart" button, no success page delay

### 4. UI/UX Changes Required

#### New Step 1: Product Selection (Complete Redesign)
- [x] **Header section**
  - Title: "Select Cuts"
  - Subtitle: "Add more, save more. You can change your cuts month to month"
  - Step indicator: "Step 1/2:" with "Next step: Choose Frequency"

- [x] **Progress bar with milestones** (3 states)
  - **State 1 (0-5 products)**: Empty progress bar
    - Left milestone: "Add 6, get 5% OFF" (inactive)
    - Right milestone: "Add 10, get 10% OFF" (inactive)
    - Center text: "Add more, save more"
  
  - **State 2 (6-9 products)**: Partial progress bar (orange fill ~60%)
    - Left milestone: "You've got 5% OFF" (active with filled circle)
    - Right milestone: "Add 10, get 10% OFF" (inactive)
    - Center text: "Add more, save more"
  
  - **State 3 (10+ products)**: Full progress bar (orange fill 100%)
    - Left milestone: Hidden or minimal
    - Right milestone: "You've got 10% OFF" (active with filled circle)
    - Center text: "Add more, save more"
  
  - Progress bar visual: Orange fill with rounded edges
  - Milestone indicators: Black circles (filled when active, outline when inactive)
  - Progress calculated based on total product quantity

- [x] **Product grid layout**
  - Left sidebar: Categories (Best Sellers, Steak, Pork, Poultry, Sea food, Sides, Desserts)
  - Main content: 3-column product grid with scroll
  - Each product card includes:
    - Product image
    - Product title and price
    - **Variant selector dropdown** (new requirement)
    - Quantity display (default: 2)
    - "Add to Cart" button that becomes quantity stepper after first add

- [x] **Floating bottom cart summary** (2 states)
  - **State 1 (Less than 10 products)**: Call to action state
    - Left side: "Choose at least 10 for 10% OFF"
    - Second line: "X selected: $XX.XX $XX.XX (X% OFF)" - shows original price crossed out with discount
    - Right side: "Select Frequency" button (disabled until products added)
  
  - **State 2 (10+ products reached)**: Achievement state
    - Left side: "Congratulations! You've got 10% OFF"
    - Second line: "X selected: $XX.XX $XX.XX (10% OFF)" - shows pricing with discount applied
    - Right side: "Select Frequency" button (enabled)
  
  - Always visible at bottom of screen
  - Background: Light gray/cream color
  - Button styling: Orange/coral rounded button

#### New Step 2: Frequency Selection (Simplified)
- [x] **Header**
  - Title: "How often do you want to receive your box?"
  - Subtitle: "Pause or cancel anytime"

- [x] **Frequency options**
  - Radio buttons: "Every 2 weeks", "Every 4 weeks", "Every 6 weeks"
  - Clean, centered layout

- [x] **Navigation**
  - "Previous" button (left) and "Next" button (right)
  - Standard button styling

#### New Step 3: One-Time Offer (New Addition)
- [x] **Header**
  - Title: "One Time Offer!"
  - Subtitle: "Add these exclusive deals to your first box"

- [x] **Product cards**
  - 3 promotional products in horizontal layout
  - Each card shows discount badge (e.g., "50% OFF")
  - Product image, title, description
  - "Add to First Box" button

- [x] **Email capture**
  - Email input field: "Write your email"
  - Disclaimer text about marketing emails and privacy policy

- [x] **Final actions**
  - Primary: "Add to Cart" button
  - Secondary: "No thanks, continue without offer" link

#### Visual Design Updates
- [x] **Step indicator/progress**
  - Current: Implicit step progression
  - Proposed: **Explicit step counter** in header ("Step 1/2") and progress bar for product selection

- [x] **Loading states and feedback**
  - Current: Simple loading spinner and success state
  - Proposed: **Real-time cart updates** and **floating cart summary** with live totals

#### Responsive Design
- [ ] **Mobile optimization**
  - Current: Basic responsive grid layouts
  - Proposed: [SPECIFY MOBILE-SPECIFIC REQUIREMENTS]

#### Accessibility
- [ ] **A11y improvements**
  - Current: Basic form structure
  - Proposed: [SPECIFY ACCESSIBILITY REQUIREMENTS]

### 5. Performance and Technical Changes

#### Code Organization
- [x] **Module structure**
  - Current: Global window objects with separate class files (SubscriptionManager, ProductManager, CartManager)
  - Proposed: **Streamlined classes**:
    - Remove SubscriptionManager (no longer needed for subscription type logic)
    - Enhanced ProductManager with variant selection support
    - Enhanced CartManager with one-time offer support
    - New OneTimeOfferManager for Step 3 functionality

- [x] **Asset loading strategy**
  - Current: All files loaded on every page (4 CSS + 3 JS files)
  - Proposed: **Consolidated assets**:
    - Combine CSS files or lazy-load step-specific styles
    - Keep modular JS but remove unused subscription type logic

#### API Integration
- [x] **Product API calls**
  - Current: Multiple fetch calls to /collections/*.json and /products.json with complex filtering
  - Proposed: **Simplified API strategy**:
    - Single call to `/collections/subscriptions/products.json` (no box size filtering)
    - Additional call for one-time offer products (specific collection or tagged products)
    - Variant data fetching for selected products

- [x] **Error handling**
  - Current: Basic try/catch with alerts
  - Proposed: **Enhanced error handling**:
    - Toast notifications instead of alerts
    - Graceful fallbacks for API failures
    - Retry mechanisms for network issues

### 6. Data Management Changes

#### State Management
- [x] **Subscription data structure**
  - Current: `{ type, boxSize, frequency, selectedProducts }`
  - Proposed: **Simplified structure**: `{ frequency, selectedProducts, oneTimeOffers, customerEmail }`

- [x] **Product selection state**
  - Current: `{ id, title, image, quantity, type }`
  - Proposed: **Enhanced selection model**: `{ id, title, image, price, selectedVariant: { id, title, price }, quantity, isOneTimeOffer: boolean }`

#### Persistence
- [x] **Session/local storage**
  - Current: No persistence (resets on page reload)
  - Proposed: **Optional localStorage** for cart persistence across page reloads (improve UX)

### 7. Integration Points

#### Theme Integration
- [ ] **CSS variable integration**
  - Current: Hardcoded colors and styles
  - Proposed: [SPECIFY THEME INTEGRATION]

- [ ] **Liquid template integration**
  - Current: Standalone block
  - Proposed: [SPECIFY THEME TEMPLATE INTEGRATION]

#### App Backend Integration
- [ ] **Shopify App API calls**
  - Current: No direct app integration
  - Proposed: [SPECIFY APP API INTEGRATION]

- [ ] **Webhook/event handling**
  - Current: Standard Shopify cart events
  - Proposed: [SPECIFY NEW EVENT HANDLING]

## Implementation Priority

### Phase 1: Core Structure Changes
- [x] Remove old 4-step Liquid template structure
- [x] Create new 3-step template (Product Selection → Frequency → One-Time Offer)
- [x] Remove subscription type and box size selection logic
- [x] Update CSS structure for new layout requirements

### Phase 2: Product Selection Logic (Step 1)
- [x] Implement variant selector dropdowns in product cards
- [x] Add floating bottom cart summary with real-time updates
- [x] Create progress bar with discount milestones
- [x] Update ProductManager to handle variants and remove box size filtering
- [x] Implement 3-column responsive grid layout

### Phase 3: Navigation and Step 2
- [x] Implement simplified frequency selection (Step 2)
- [x] Add Previous/Next button navigation between steps
- [x] Update navigation logic to skip old subscription type/box size steps

### Phase 4: One-Time Offer Implementation (Step 3)
- [x] Create OneTimeOfferManager class
- [x] Implement 3-card promotional product layout
- [x] Add email capture functionality
- [x] Integrate one-time offers with main cart flow
- [x] Update cart attributes and metadata structure

### Phase 5: Performance and Polish
- [x] Consolidate or optimize CSS/JS asset loading
- [x] Implement enhanced error handling with toast notifications
- [x] Add localStorage persistence for better UX
- [x] Test and optimize API calls for variant data

---

**Note**: This requirements document should be filled out with specific details about the desired changes to guide the implementation. Each `[SPECIFY...]` placeholder should be replaced with concrete requirements.