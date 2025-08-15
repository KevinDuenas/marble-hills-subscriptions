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
- Multi-step subscription builder with:
  - Subscription type selection (Curated vs Custom)
  - Box size selection
  - Frequency options (2, 4, 6 weeks)
  - Product selection with dynamic discounts
- CSS modules: base-styles.css, subscription-options.css, product-selection.css, summary.css
- JavaScript modules: subscription-manager.js, product-manager.js, cart-manager.js

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

### Extension Structure
The subscription form extension is a multi-step wizard that:
1. Determines subscription type (curated vs custom boxes)
2. Handles box sizing and pricing
3. Manages delivery frequency selection
4. Provides product selection interface with discount tiers
5. Integrates with cart management for subscription creation