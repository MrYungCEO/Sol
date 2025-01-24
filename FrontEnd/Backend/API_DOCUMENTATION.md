# Solana Trading API Documentation

## Base URL
```
http://localhost:8000
```

## Authentication
Currently using environment variables for wallet configuration. Token-based authentication recommended for production.

## Endpoints

### Token Calculations

#### Calculate Token Amount
Calculate a specific percentage of your token balance.

```http
POST /calculate
```

**Request Body:**
```json
{
    "token_address": "string",
    "percentage": float
}
```

**Parameters:**
- `token_address`: SPL Token mint address
- `percentage`: Value between 0 and 100

**Response:**
```json
{
    "calculated_amount": "string",
    "token_balance": "string",
    "decimals": integer
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/calculate" \
     -H "Content-Type: application/json" \
     -d '{"token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "percentage": 30}'
```

### Jupiter Integration

#### Get Quote
Get a quote for token swaps using Jupiter.

```http
POST /jupiter/quote
```

**Request Body:**
```json
{
    "input_token": "string",
    "output_token": "string",
    "amount": "string",
    "slippage": float
}
```

**Parameters:**
- `input_token`: Input token mint address
- `output_token`: Output token mint address
- `amount`: Amount in base units
- `slippage`: Slippage tolerance (0-100)

**Response:**
Jupiter quote response with route information.

#### Execute Swap
Execute a token swap via Jupiter.

```http
POST /jupiter/swap
```

**Request Body:** Same as quote endpoint
**Response:** Transaction details

### Sell Operations

#### Sell All Tokens
Sell entire token balance.

```http
POST /sell/all
```

**Request Body:**
```json
{
    "token_address": "string",
    "slippage": float
}
```

#### Sell Maximum Amount
Sell maximum possible amount considering liquidity.

```http
POST /sell/max
```

**Request Body:**
```json
{
    "token_address": "string",
    "slippage": float
}
```

#### Sell Percentage
Sell a specific percentage of holdings.

```http
POST /sell/percentage
```

**Request Body:**
```json
{
    "token_address": "string",
    "percentage": float,
    "slippage": float
}
```

### Wallet Operations

#### Get Wallet Balances
Retrieve all token balances.

```http
GET /wallet/balances
```

**Response:**
```json
{
    "balances": [
        {
            "token_address": "string",
            "balance": "string",
            "decimals": integer,
            "usd_value": float
        }
    ]
}
```

#### Get Wallet Transactions
Get recent transactions.

```http
GET /wallet/transactions
```

**Query Parameters:**
- `limit`: Number of transactions (default: 10)

### Health Check

#### Check API Status
```http
GET /health
```

**Response:**
```json
{
    "status": "healthy"
}
```

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Token/Account not found |
| 500 | Server Error |

## Rate Limits
- Default: 100 requests per minute
- Jupiter endpoints: 50 requests per minute
- Wallet tracking: 20 requests per minute

## Best Practices

1. **Error Handling**
   - Always check response status codes
   - Handle network timeouts gracefully
   - Implement retry logic for failed requests

2. **Performance**
   - Use connection pooling
   - Implement caching where appropriate
   - Batch requests when possible

3. **Security**
   - Never expose private keys
   - Validate all input
   - Use HTTPS in production
   - Implement rate limiting

## WebSocket Support (Future)

Real-time updates planned for:
- Price changes
- Transaction notifications
- Wallet balance updates

## Examples

### Python
```python
import httpx

async def calculate_percentage():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/calculate",
            json={
                "token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                "percentage": 30
            }
        )
        return response.json()
```

### JavaScript
```javascript
async function calculatePercentage() {
    const response = await fetch('http://localhost:8000/calculate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            percentage: 30
        })
    });
    return await response.json();
}
```

## Support

For issues and feature requests, please create an issue in the repository.
