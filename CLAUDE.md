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
- Centered layout with frequency options (2, 4, 6 weeks)
- Navigation: Previous (no validation) and Next (requires frequency selection)
- Previous button allows returning to Step 1 with cart preserved

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

#### Critical CSS Patterns
- Use `cssText` with `!important` for critical progress bar styles
- Flexbox layout for header alignment with `align-items: center`
- Absolute positioning for progress milestones at exact percentages
- Force display properties when elements aren't rendering properly

#### API Integration
- Primary: `/collections/subscriptions/products.json`
- Fallback: `/products.json?limit=50`
- Error handling with retry mechanisms and user feedback