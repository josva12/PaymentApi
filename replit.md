# Payment Integration API for Kenya

## Overview

This is a comprehensive payment integration API designed specifically for Kenyan businesses, enabling seamless payment processing across multiple providers including M-Pesa, Airtel Money, and bank transfers. The system is built as a full-stack web application with a modern React frontend and Express.js backend, designed to facilitate financial inclusion and streamline payment workflows.

## System Architecture

### Backend Architecture
- **Framework**: Express.js with TypeScript for type safety
- **Database**: PostgreSQL with Drizzle ORM for schema management and database operations
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: API key-based authentication with Bearer token support
- **Session Management**: PostgreSQL session storage using connect-pg-simple

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Management**: React Hook Form with Zod validation

### Development Environment
- **Hosting**: Replit-optimized with custom Vite plugins for development
- **Type Checking**: Strict TypeScript configuration across all layers
- **Code Organization**: Monorepo structure with shared types and schemas

## Key Components

### Database Schema
The application uses three main database tables:
- **Users**: Stores user credentials, API keys, and account status
- **Transactions**: Tracks payment transactions with provider-specific metadata
- **Webhooks**: Manages webhook configurations for real-time payment notifications

### API Structure
- **Authentication Endpoints**: User registration and API key management
- **Payment Processing**: Transaction initiation and status tracking
- **Webhook Management**: Real-time payment notifications and callbacks
- **Analytics**: Transaction statistics and reporting

### UI Components
- **Dashboard**: Real-time transaction monitoring and API key management
- **Documentation**: Interactive API reference with code examples
- **API Playground**: Live testing environment for API endpoints
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## Data Flow

1. **User Registration**: Users register and receive API keys for authentication
2. **Payment Initiation**: Clients make authenticated requests to initiate payments
3. **Provider Integration**: System communicates with payment providers (M-Pesa, etc.)
4. **Real-time Updates**: Webhooks provide instant payment status notifications
5. **Analytics**: Transaction data is processed for reporting and insights

## External Dependencies

### Payment Providers
- **M-Pesa Daraja API**: Direct integration for mobile money payments
- **Airtel Money**: Support for alternative mobile payment provider
- **Bank Integration**: PesaLink and custom bank APIs for transfers
- **SACCO Integration**: Custom integrations and file-based processing

### Third-party Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Session Storage**: PostgreSQL-based session management
- **Development Tools**: Replit-specific tooling and error handling

### Frontend Dependencies
- **UI Components**: Comprehensive Radix UI component library
- **Icons**: Lucide React for consistent iconography
- **Date Handling**: Date-fns for date manipulation and formatting
- **Validation**: Zod for runtime type validation and schema generation

## Deployment Strategy

### Development
- **Local Development**: Vite dev server with hot module replacement
- **Database**: Drizzle migrations with push-based schema updates
- **Environment**: Node.js with ES modules for modern JavaScript features

### Production
- **Build Process**: Vite production build with esbuild for server bundling
- **Server**: Express.js server with static file serving
- **Database**: Production PostgreSQL with connection pooling
- **Monitoring**: Request logging and error tracking

### Configuration Management
- **Environment Variables**: DATABASE_URL and other sensitive configuration
- **TypeScript**: Strict type checking across development and production
- **Path Aliases**: Organized imports with @ prefixes for clean code organization

## Changelog

```
Changelog:
- July 02, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```