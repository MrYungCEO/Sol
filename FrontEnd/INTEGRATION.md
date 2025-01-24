# Backend-Frontend Integration Guide

This guide explains how to fully integrate the backend Flask API with the React frontend.

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [API Integration](#api-integration)
5. [WebSocket Integration](#websocket-integration)
6. [Testing the Integration](#testing-the-integration)
7. [Troubleshooting](#troubleshooting)

## Environment Setup

1. Create a `.env` file in the root directory:

```bash
# Backend Environment Variables
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_ADDRESS=your_wallet_address
HELIUS_API_KEY=your_helius_api_key
JUPITER_API_KEY=your_jupiter_api_key

# Frontend Environment Variables
VITE_API_URL=http://localhost:8005
VITE_WS_URL=ws://localhost:8005/trades/ws
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

2. Create a `.env` file in the Backend directory:

```bash
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_ADDRESS=your_wallet_address
HELIUS_API_KEY=your_helius_api_key
JUPITER_API_KEY=your_jupiter_api_key
```

## Backend Setup

1. Install backend dependencies:

```bash
cd Backend
pip install -r requirements.txt
```

2. Start the Flask server:

```bash
python server.py
```

The backend server will run on `http://localhost:8005`.

## Frontend Setup

1. Install frontend dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`.

## API Integration

The frontend communicates with the backend through several services:

### 1. API Service (`src/services/api.ts`)
- Handles all HTTP requests to the backend
- Uses environment variables for API URLs
- Includes error handling and response parsing

### 2. WebSocket Service (`src/services/WebSocketService.ts`)
- Manages real-time communication
- Handles connection, reconnection, and message parsing
- Emits events for trade updates

### 3. Trade Service (`src/services/TradeService.ts`)
- Manages trade-related operations
- Handles trade execution and monitoring
- Processes trade updates

### 4. Settings Service (`src/contexts/SettingsContext.tsx`)
- Manages application settings
- Syncs settings between frontend and backend
- Handles settings persistence

## API Endpoints

The backend provides the following main endpoints:

### Trade Endpoints
- `GET /api/trades/active` - Get active trades
- `GET /api/trades` - Get trade history
- `POST /api/trades/update` - Update trade prices
- `POST /api/trades/{trade_id}/close` - Close a trade

### Wallet Endpoints
- `GET /api/wallet/balances` - Get wallet balances
- `GET /api/wallet/transactions` - Get transactions
- `POST /api/track-wallet` - Start tracking a wallet
- `POST /api/stop-tracking` - Stop tracking a wallet

### Settings Endpoints
- `GET /api/settings` - Get application settings
- `POST /api/settings` - Update settings
- `POST /api/test-connection` - Test API connection

### Trading Endpoints
- `POST /api/buy` - Execute buy order
- `POST /api/sell` - Execute sell order
- `POST /api/sell/all` - Sell all tokens
- `POST /api/sell/percentage` - Sell percentage of tokens

## WebSocket Integration

1. Connect to WebSocket:

```typescript
// In your component
const ws = new WebSocketService(
  import.meta.env.VITE_WS_URL,
  handleMessage,
  handleConnect,
  handleDisconnect,
  handleError
);

useEffect(() => {
  ws.connect();
  return () => ws.disconnect();
}, []);
```

2. Handle WebSocket messages:

```typescript
const handleMessage = (data: any) => {
  switch (data.type) {
    case 'trade':
      handleTrade(data.trade);
      break;
    case 'price_update':
      handlePriceUpdate(data.price);
      break;
    // ... handle other message types
  }
};
```

## Testing the Integration

1. Test API Connection:

```typescript
const testConnection = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/test-connection`);
    if (response.ok) {
      console.log('API connection successful');
    }
  } catch (error) {
    console.error('API connection failed:', error);
  }
};
```

2. Test WebSocket Connection:

```typescript
const testWebSocket = () => {
  const ws = new WebSocket(import.meta.env.VITE_WS_URL);
  
  ws.onopen = () => {
    console.log('WebSocket connection successful');
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket connection failed:', error);
  };
};
```

## Troubleshooting

### Common Issues

1. CORS Errors
- Ensure CORS is properly configured in the backend
- Check that the frontend is using the correct API URL
- Verify that all required headers are being sent

2. WebSocket Connection Issues
- Check if the WebSocket URL is correct
- Ensure the backend WebSocket server is running
- Verify network connectivity and firewall settings

3. API Errors
- Check the API endpoint URLs
- Verify request/response formats
- Check backend logs for detailed error messages

### Solutions

1. CORS Issues:
```python
# In server.py
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

2. WebSocket Issues:
```typescript
// In WebSocketService.ts
private reconnect() {
  if (this.reconnectAttempts < WS_MAX_RECONNECT_ATTEMPTS) {
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), WS_RECONNECT_DELAY);
  }
}
```

3. API Issues:
```typescript
// In api.ts
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }
  return response.json();
};
```

## File Structure

```
project/
├── Backend/
│   ├── server.py
│   ├── api_routes.py
│   ├── trade_manager.py
│   ├── copytrading.py
│   └── ...
├── src/
│   ├── services/
│   │   ├── api.ts
│   │   ├── WebSocketService.ts
│   │   └── TradeService.ts
│   ├── contexts/
│   │   ├── SettingsContext.tsx
│   │   └── NotificationContext.tsx
│   └── components/
│       ├── Dashboard/
│       ├── Trading/
│       └── Settings/
├── .env
└── .env.example
```

## Next Steps

1. Start both servers:
```bash
# Terminal 1 - Backend
cd Backend
python server.py

# Terminal 2 - Frontend
npm run dev
```

2. Test the connection in the Settings page
3. Monitor the backend logs for any errors
4. Check the browser console for frontend issues

Remember to handle errors appropriately and provide feedback to users through the notification system.