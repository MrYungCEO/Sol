# Solana Trading API

A powerful backend API for Solana token operations, including token calculations, swaps via Jupiter, and wallet tracking. Built with FastAPI for high performance and reliability.

## Project Overview

The Solana Trading API is a comprehensive backend system designed for automated trading and wallet monitoring on the Solana blockchain. Here's how the different components work together:

### Core Workflow

1. **Token Management**
   - The system tracks token balances and prices through `price_service.py`
   - Token calculations and conversions are handled by utility modules
   - Real-time price updates maintain accurate valuations

2. **Trading Operations**
   - Buy/sell operations are coordinated through `trade_manager.py`
   - Jupiter DEX integration (`jupiter.py`) provides optimal swap routes
   - Trade tracking maintains history and performance metrics

3. **Wallet Monitoring**
   - Real-time wallet tracking via `wallet_tracking.py`
   - Transaction monitoring and analysis
   - Automatic trade detection and recording

4. **API Layer**
   - FastAPI server (`server.py`) exposes all functionality via REST endpoints
   - Input validation and error handling
   - Async operations for improved performance

### Project Structure

```
Core/
├── server.py              # Main FastAPI application
├── jupiter.py            # Jupiter DEX integration
├── price_service.py      # Token price management
├── trade_manager.py      # Trade execution and tracking
├── tracking_manager.py   # Wallet tracking coordination
├── wallet_tracking.py    # Real-time wallet monitoring
├── constants.py          # System constants
├── config.py            # Configuration management
│
├── Operations/
│   ├── calc_size.py     # Token size calculations
│   ├── get_sell_percentage.py
│   ├── sell_all.py      # Complete sell operation
│   ├── sell_max.py      # Maximum sell operation
│   └── swap.py          # Token swap operations
│
├── tests/               # Test suite
│   ├── test_all.py     # Complete test suite
│   ├── test_api.py     # API endpoint tests
│   ├── test_buy.py     # Buy operation tests
│   ├── test_price.py   # Price service tests
│   ├── test_server.py  # Server tests
│   └── test_trades.py  # Trade operation tests
│
├── static/             # Static resources
├── Reference/          # Documentation and references
│
├── requirements.txt    # Python dependencies
├── .env.example       # Environment variables template
└── API_DOCUMENTATION.md # Detailed API documentation
```

## Features

- 🔢 Token Balance Calculations & Management
- 💱 Jupiter DEX Integration for Token Swaps
- 💰 Advanced Token Selling Strategies
  - Sell All Tokens
  - Sell Maximum Available
  - Sell by Percentage
- 👛 Real-time Wallet Tracking
  - Balance Monitoring
  - Transaction History
  - Multi-wallet Support
- 📊 Trade Management
  - Track Active/Closed Trades
  - Profit/Loss Calculations
  - Trade History
- ⚡ High Performance Async Operations
- 🔒 Comprehensive Input Validation
- 🛡️ Error Handling & Recovery
- 🔄 Automatic Price Updates
- 📈 Market Data Integration

## Prerequisites

- Python 3.8+
- Solana Wallet with SOL balance
- Helius RPC URL (for enhanced RPC capabilities)
- Jupiter DEX API access

## Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd Core
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file based on `.env.example`:
```env
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
WALLET_ADDRESS="your_wallet_address"
```

4. Start the server:
```bash
python server.py
```

The API will be available at `http://localhost:8005`

## API Documentation

### Token Operations

#### Calculate Token Amount
```http
POST /calculate
```
Calculate a percentage of your token balance.

**Request:**
```json
{
    "token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "percentage": 30.5
}
```

**Response:**
```json
{
    "calculated_amount": "50.5",
    "token_balance": "100.0",
    "decimals": 6
}
```

### Price Operations

#### Get Token Price
```http
GET /get_price/{token_address}
```
Get current price and market data for a token.

**Features:**
- Smart caching (30-second duration)
- Rate limiting
- Automatic retries
- Fallback to cached data

### Trade Operations

#### Get All Trades
```http
GET /trades
```

#### Get Active Trades
```http
GET /trades/active
```

#### Get Trade by ID
```http
GET /trades/{trade_id}
```

#### Close Trade
```http
POST /trades/{trade_id}/close
```

#### Get Trade Statistics
```http
GET /trades/stats
```
Get comprehensive trading statistics with optional time filtering.

**Query Parameters:**
- `start_time`: (Optional) Start time in ISO format (e.g., "2025-01-16T00:00:00+00:00")
- `end_time`: (Optional) End time in ISO format (e.g., "2025-01-16T23:59:59+00:00")

**Response:**
```json
{
    "total_trades": 10,
    "successful_trades": 8,
    "failed_trades": 2,
    "active_trades": 3,
    "closed_trades": 7,
    "win_rate": 80.0,
    "total_profit": 1.5,
    "average_profit": 0.15,
    "best_trade": {
        "id": "trade_1",
        "token_address": "...",
        "profit": 0.5,
        ...
    },
    "worst_trade": {
        "id": "trade_2",
        "token_address": "...",
        "profit": -0.1,
        ...
    },
    "start_time": "2025-01-16T00:00:00+00:00",
    "end_time": "2025-01-16T23:59:59+00:00"
}
```

#### Update Trade Prices
```http
POST /trades/update
```

### Buy Operations

#### Buy Token
```http
POST /buy
```
Buy a token using SOL.

**Request:**
```json
{
    "token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount_in_sol": 0.1,
    "slippage": 0.5
}
```

### Sell Operations

#### Sell All Tokens
```http
POST /sell/all
```

**Request:**
```json
{
    "token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "slippage": 0.5
}
```

#### Sell Maximum Available
```http
POST /sell/max
```

#### Sell by Percentage
```http
POST /sell/percentage
```

**Request:**
```json
{
    "token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "percentage": 50.0,
    "slippage": 0.5
}
```

### Wallet Tracking

#### Start Tracking Wallet
```http
POST /track_wallet
```
Start real-time tracking of a wallet's transactions and trades.

**Parameters:**
- `wallet_address`: The Solana wallet address to track

**Response:**
```json
{
    "status": "success",
    "message": "Now tracking wallet: ADDRESS"
}
```

#### Get Wallet Balances
```http
GET /wallet/balances
```

#### Get Wallet Transactions
```http
GET /wallet/transactions
```
Parameters:
- `limit`: Number of transactions (1-100, default: 10)

### Health Check
```http
GET /health
```
Check API health status.

## Error Handling

The API uses standard HTTP status codes:

- 200: Success
- 400: Bad Request (invalid input)
- 404: Not Found
- 500: Internal Server Error

Error responses include detailed messages:
```json
{
    "detail": "Error description"
}
```

## Development

### Running Tests
```bash
python -m pytest
```

### Code Structure

- `server.py`: Main FastAPI application and API endpoints
- `jupiter.py`: Jupiter DEX integration
- `price_service.py`: Token price service
- `trade_manager.py`: Trade management
- `tracking_manager.py`: Wallet tracking
- `wallet_tracking.py`: Real-time wallet monitoring
- `constants.py`: System constants and configurations

## Dependencies

Key dependencies from requirements.txt:
- FastAPI 0.109.0
- Uvicorn 0.27.0
- HTTPX 0.25.2
- Python-dotenv 1.0.0
- Pydantic 2.5.3
- aiofiles 23.2.1
- python-multipart 0.0.6
- Jinja2 3.1.2
