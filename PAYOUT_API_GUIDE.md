# CreoCash Payout API Integration Guide

## 🔌 Payout API Status

### ✅ Currently Integrated (Production-Ready)
- **PesaPal (Campaign Funding)**: Full integration for M-Pesa, Airtel Money, cards, bank transfers
- **M-Pesa Payouts**: Safaricom Daraja B2C API for Kenya mobile money transfers
- **PayPal Payouts**: International payout processing via PayPal Payouts API
- **Wise API**: International bank transfers with multi-currency support
- **Rapyd API**: Global payment coverage for 100+ countries (Kenya-friendly)
- **Escrow System**: Automatic fund management and balance tracking

### 🚫 Not Available in Kenya
- **Stripe**: Not supported in Kenya - PesaPal used instead for local payments

### 🔧 Complete Payout Coverage

## 1. M-Pesa Payouts (Safaricom Daraja API)

### Required Environment Variables:
```env
MPESA_CONSUMER_KEY=your-mpesa-consumer-key
MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
MPESA_SHORTCODE=your-business-shortcode
MPESA_PASSKEY=your-passkey
MPESA_INITIATOR_NAME=your-initiator-name
MPESA_SECURITY_CREDENTIAL=your-security-credential
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
```

### Setup Process:
1. **Register with Safaricom**: Get approved for Daraja API access
2. **Get Shortcode**: Business shortcode for B2C transactions
3. **Security Credential**: Encrypted initiator password
4. **Test in Sandbox**: Use sandbox environment first
5. **Go Live**: Switch to production URLs

### Features:
- Real-time B2C payments to any Kenyan M-Pesa number
- Automatic USD to KES conversion (130 KES/USD)
- Phone number format handling (+254, 07xx, etc.)
- Callback handling for payment confirmation
- Detailed transaction tracking

## 2. PayPal Payouts API

### Required Environment Variables:
```env
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_BASE_URL=https://api.sandbox.paypal.com
```

### Setup Process:
1. **PayPal Business Account**: Get approved for Payouts API
2. **API Credentials**: Create app in PayPal Developer Dashboard
3. **Payout Permissions**: Enable mass payment capabilities
4. **Compliance**: Complete KYC/AML requirements
5. **Production**: Switch to live environment

### Features:
- Batch payouts to multiple recipients
- Email-based recipient identification
- Multiple currency support (USD primary)
- Automatic fee calculation
- Comprehensive reporting

## 3. Stripe Connect (Bank & Card Payouts)

### Required Environment Variables:
```env
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_CONNECT_CLIENT_ID=your-stripe-connect-client-id
```

### Setup Process:
1. **Stripe Account**: Business account with Connect platform access
2. **Connected Accounts**: Automatic account creation for recipients
3. **Bank Account Support**: US, EU, and 25+ countries
4. **Card Payout Support**: Debit card instant transfers
5. **Compliance**: Automatic KYC/AML handling

### Features:
- Instant bank transfers in supported countries
- Debit card payouts (minutes to hours)
- Credit card reverse transfers
- Multi-currency support (USD, EUR, GBP, etc.)
- Automatic tax reporting (1099s, etc.)

## 4. Wise API (International Bank Transfers)

### Required Environment Variables:
```env
WISE_API_TOKEN=your-wise-api-token
WISE_PROFILE_ID=your-wise-profile-id
WISE_BASE_URL=https://api.sandbox.transferwise.tech
```

### Features:
- Low-cost international transfers (80+ countries)
- Real exchange rates
- Multi-currency account support
- SWIFT network coverage
- Transparent fee structure

## 5. Rapyd Global Payouts

### Required Environment Variables:
```env
RAPYD_ACCESS_KEY=your-rapyd-access-key
RAPYD_SECRET_KEY=your-rapyd-secret-key
RAPYD_BASE_URL=https://sandboxapi.rapyd.net
```

### Features:
- 100+ countries coverage
- Multiple payout methods per country:
  - Bank transfers
  - Card transfers  
  - Cash pickup locations
  - Mobile wallets
  - Digital wallets

## 🔄 Current Fallback Behavior

**If APIs not configured:**
- System logs simulation messages
- Database tracks payout requests normally
- Admin dashboard shows pending status
- Ready for real API integration when credentials provided

## 💰 Testing Payout Flow

### Development Testing:
```bash
# Test clipper payout request
curl -X POST /api/payouts \
  -H "Content-Type: application/json" \
  -d '{"amount":"50","paymentMethod":"mobile_money","paymentDetails":{"phoneNumber":"+254712345678"}}'

# Admin process payout
curl -X POST /api/payouts/{payout_id}/process
```

### Production Checklist:
- [ ] M-Pesa Daraja API credentials configured
- [ ] PayPal Payouts API approved and configured
- [ ] Webhook endpoints secured and tested
- [ ] Currency conversion rates updated
- [ ] Compliance and legal requirements met
- [ ] Customer support processes defined

## 🛡️ Security Features

- **Environment-based Configuration**: Sandbox vs Production
- **Encrypted Credentials**: Secure storage of API keys
- **Callback Verification**: Webhook signature validation
- **Amount Validation**: Escrow balance verification
- **Audit Trail**: Complete transaction logging
- **Error Handling**: Graceful failure management

## 📊 Monitoring & Analytics

- **Payment Success Rates**: Track completion percentages
- **Processing Times**: Monitor payout speed
- **Cost Analysis**: Fee optimization
- **Regional Performance**: Method effectiveness by geography
- **User Satisfaction**: Payout experience tracking

## 🚀 Next Steps for Production

1. **Obtain API Credentials**: Register with payment providers
2. **Complete Compliance**: KYC/AML requirements
3. **Test Integration**: Sandbox environment testing
4. **Security Audit**: Payment flow security review
5. **Go Live**: Production deployment with monitoring

## 📋 Complete Payment Method Coverage

### ✅ Available Payment Methods (Kenya-Compatible):
1. **mobile_money**: M-Pesa, Airtel Money (Kenya/Africa via Daraja API)
2. **bank_transfer**: Local bank transfers (Kenya banks)
3. **wise_transfer**: International bank transfers via Wise API
4. **paypal**: International PayPal payouts
5. **rapyd_bank**: Global bank transfers via Rapyd (Kenya supported)
6. **rapyd_card**: Global card transfers via Rapyd (Kenya supported)
7. **rapyd_cash**: Cash pickup at agent locations via Rapyd
8. **crypto**: Cryptocurrency wallet transfers

### 🌍 Global Coverage:
- **Kenya**: M-Pesa, Airtel Money, bank transfers
- **United States**: ACH, wire transfers, debit cards, PayPal
- **Europe**: SEPA transfers, Wise, cards, PayPal
- **Asia**: Local bank transfers, digital wallets (Rapyd)
- **Latin America**: Cash pickup, bank transfers (Rapyd)
- **Africa**: Mobile money, bank transfers, cash pickup
- **Middle East**: Bank transfers, cards, digital wallets

### 💰 Processing Times:
- **M-Pesa**: 2-10 minutes
- **Debit Cards**: 30 minutes - 2 hours
- **ACH/Bank Transfer**: 1-3 business days
- **Wire Transfer**: 1-2 business days
- **International Wire**: 2-5 business days
- **PayPal**: 1-3 business days
- **Cash Pickup**: Instant (when collected)

The system is architected to seamlessly integrate real payment APIs when credentials are provided, with robust fallback mechanisms for development and testing.