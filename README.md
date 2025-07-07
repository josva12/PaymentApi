# 🇰🇪 Kenyan Payment API

A production-grade payment API for Kenya that integrates with DARAJA M-Pesa, Equity Bank, and other Kenyan payment providers. Built with Node.js, Express, TypeScript, and React.

## 🚀 Features

### ✅ Payment API Core Standards
- **RESTful Endpoints**: `/api/v1/payments`, `/api/v1/transactions/:id`
- **Standard Response Format**: `{ success, message, data, error }`
- **Transaction Status Codes**: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`, `REFUNDED`
- **Idempotency Support**: Prevent duplicate charges using unique keys
- **Payment Metadata**: Track gateway used, timestamps, fees, etc.

### 🔒 Security & Authentication
- **JWT Auth with Refresh Tokens**: Secure login/token management
- **RBAC (Admin, Merchant, User)**: Role-based access to sensitive routes
- **Encrypted Payload Fields (AES-256)**: Encrypt card numbers, CVVs, etc.
- **TLS (HTTPS) Enforced**: Ensure all connections are encrypted
- **Rate Limiting & Abuse Protection**: Protect endpoints from brute-force and DoS attacks
- **Audit Logs for Transactions**: Track who did what and when

### 💳 Payment-Specific Features
- **Create Payment Intent**: Start payment flow with optional expiration
- **Validate Payment Callback**: Secure webhooks from providers
- **Payment Gateway Abstraction**: M-Pesa, Equity Bank, Airtel Money, etc.
- **Currency Handling**: Multi-currency support with conversion logs
- **Refund Endpoint**: Securely trigger partial or full refunds
- **Webhook Retry Mechanism**: Resend failed callbacks using exponential backoff

### 🧪 Validation & Error Handling
- **Schema Validation (DTOs)**: Input sanitization and validation
- **Custom Exceptions & Error Codes**: Properly categorized errors
- **Graceful Fallbacks**: Handle gateway downtime or failure
- **Logging Sensitive Failures**: Log with redacted info for traceability

### 📖 Documentation & Developer Usability
- **OpenAPI Spec (Swagger)**: Clear docs for each endpoint
- **Postman Collection**: Share with QA or external devs
- **Rate Limit Docs**: List rate policies for endpoints
- **Webhook Format Guide**: Show expected webhook payloads & secrets

## 🛠️ Tech Stack

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **Drizzle ORM** with **PostgreSQL**
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Winston** for logging
- **Helmet** for security headers
- **Rate Limiting** for abuse protection

### Frontend
- **React 18** with **TypeScript**
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **React Query** for data fetching
- **React Hook Form** with **Zod** validation

### Payment Integrations
- **DARAJA M-Pesa API** (STK Push, Paybill, Till)
- **Equity Bank API** (Bank transfers)
- **Airtel Money API** (Mobile money)

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Redis (optional, for caching)
- DARAJA API credentials
- Equity Bank API credentials (optional)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/kenyan-payment-api.git
cd kenyan-payment-api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_BASE_URL=http://localhost:5000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/kenyan_payment_api

# DARAJA M-Pesa API Configuration
DARAJA_BASE_URL=https://sandbox.safaricom.co.ke
DARAJA_CONSUMER_KEY=your_consumer_key_here
DARAJA_CONSUMER_SECRET=your_consumer_secret_here
DARAJA_PASSKEY=your_passkey_here
DARAJA_SHORTCODE=174379
```

### 4. Database Setup
```bash
# Push schema to database
npm run db:push

# Or generate and run migrations
npm run db:generate
npm run db:migrate
```

### 5. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "merchant1",
  "email": "merchant@example.com",
  "password": "securepassword123",
  "role": "merchant"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "merchant1",
  "password": "securepassword123"
}
```

### Payments

#### Create Payment Intent
```http
POST /api/v1/payments/create-intent
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 1000,
  "currency": "KES",
  "provider": "mpesa",
  "paymentMethod": "stk_push",
  "phone": "254712345678",
  "reference": "ORDER-123",
  "description": "Payment for order #123"
}
```

#### Initiate Payment
```http
POST /api/v1/payments/initiate/:transactionId
Authorization: Bearer <jwt_token>
```

#### Get Transaction Status
```http
GET /api/v1/transactions/:transactionId
Authorization: Bearer <jwt_token>
```

### Webhooks

#### M-Pesa Webhook
```http
POST /api/v1/webhooks/mpesa
Content-Type: application/json

{
  "Body": {
    "stkCallback": {
      "ResultCode": 0,
      "CheckoutRequestID": "ws_CO_1234567890",
      "CallbackMetadata": {
        "Item": [
          {
            "Name": "MpesaReceiptNumber",
            "Value": "NLJ12345678"
          },
          {
            "Name": "Amount",
            "Value": 1000
          }
        ]
      }
    }
  }
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `JWT_SECRET` | JWT signing secret | Required |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `DARAJA_CONSUMER_KEY` | M-Pesa consumer key | Required |
| `DARAJA_CONSUMER_SECRET` | M-Pesa consumer secret | Required |
| `DARAJA_PASSKEY` | M-Pesa passkey | Required |
| `DARAJA_SHORTCODE` | M-Pesa shortcode | Required |

### Payment Providers

#### M-Pesa (DARAJA)
- STK Push for mobile payments
- Paybill integration
- Till number integration
- Webhook callbacks

#### Equity Bank
- Bank transfer integration
- Account balance checking
- Transaction status queries

#### Airtel Money
- Mobile money integration
- STK push functionality

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 📊 Monitoring

### Health Check
```http
GET /api/health
```

### Metrics
```http
GET /api/metrics
```

### Logs
Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes (general), 10 requests per minute (payments)
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Protection**: Parameterized queries with Drizzle ORM
- **XSS Protection**: Helmet.js security headers
- **CORS Configuration**: Restrictive CORS policies
- **Audit Logging**: Track all sensitive operations
- **Account Lockout**: Lock accounts after 5 failed login attempts

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure production database
- Set up SSL certificates
- Configure production payment provider credentials

## 📈 Performance

- **Response Time**: < 200ms for most operations
- **Throughput**: 1000+ requests per second
- **Uptime**: 99.9% target
- **Database**: Optimized queries with proper indexing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [API Docs](docs/api.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/kenyan-payment-api/issues)
- **Email**: support@kenyanpay.com

## 🙏 Acknowledgments

- [DARAJA API](https://developer.safaricom.co.ke/) for M-Pesa integration
- [Equity Bank](https://equitybank.co.ke/) for banking APIs
- [Drizzle ORM](https://orm.drizzle.team/) for database management
- [Express.js](https://expressjs.com/) for the web framework

---

**Made with ❤️ for Kenya's digital payment ecosystem** 