from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import logging
import os
import json
from datetime import datetime
import time
import asyncio
import threading
import traceback
from dotenv import load_dotenv
from wallet_tracking import track_wallet
from pydantic import BaseModel, Field
from decimal import Decimal
import httpx
from jupiter import Jupiter
from base58 import b58decode
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.signature import Signature
from typing import Dict, Any
import base64
from contextlib import asynccontextmanager
from trade_manager import trade_bp
from copytrading import copytrading_bp
import requests
import aiohttp

app = Flask(__name__)

# Configure CORS to allow requests from the frontend
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

app.register_blueprint(trade_bp)
app.register_blueprint(copytrading_bp)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Constants
WALLET_ADDRESS = os.getenv("WALLET_ADDRESS")
if not WALLET_ADDRESS:
    raise ValueError("WALLET_ADDRESS environment variable is not set")

RPC_URL = os.getenv("SOLANA_MAINNET_RPC", "https://api.mainnet-beta.solana.com")
JUPITER_API_URL = os.getenv("JUPITER_QUOTE_API", "https://quote-api.jup.ag/v6")

print(f"Using RPC URL: {RPC_URL}")  # Debug log
print(f"Using wallet address: {WALLET_ADDRESS}")  # Debug log

# Global HTTP client
client = None

@asynccontextmanager
async def lifespan(app: Flask):
    # Startup
    global client
    client = httpx.AsyncClient(timeout=30.0)
    print("Starting up Flask app...")
    yield
    # Shutdown
    print("Shutting down Flask app...")
    await client.aclose()

# Pydantic Models with enhanced documentation
class TokenRequest(BaseModel):
    token_address: str
    percentage: float = Field(..., gt=0, le=100)

class SwapRequest(BaseModel):
    input_token: str = Field(
        ..., 
        description="Input token mint address",
        example="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    )
    output_token: str = Field(
        ..., 
        description="Output token mint address",
        example="So11111111111111111111111111111111111111112"
    )
    amount: str = Field(
        ..., 
        description="Amount in base units (considering token decimals)",
        example="1000000"
    )
    slippage: float = Field(
        default=0.5,
        ge=0,
        le=100,
        description="Slippage tolerance in percentage",
        example=0.5
    )

class SellRequest(BaseModel):
    token_address: str = Field(
        ..., 
        description="Token mint address to sell",
        example="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    )
    amount: str = Field(
        default=None,
        description="Specific amount to sell in base units",
        example="1000000"
    )
    percentage: float = Field(
        default=None,
        ge=0,
        le=100,
        description="Percentage of balance to sell",
        example=50.0
    )
    slippage: float = Field(
        default=0.5,
        ge=0,
        le=100,
        description="Slippage tolerance in percentage",
        example=0.5
    )

class TokenResponse(BaseModel):
    calculated_amount: str = Field(
        ..., 
        description="Calculated token amount",
        example="50.5"
    )
    token_balance: str = Field(
        ..., 
        description="Total token balance",
        example="100.0"
    )
    decimals: int = Field(
        ..., 
        description="Token decimals",
        example=6
    )

class WalletBalance(BaseModel):
    token_address: str = Field(
        ..., 
        description="Token mint address",
        example="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    )
    balance: str = Field(
        ..., 
        description="Token balance",
        example="100.0"
    )
    decimals: int = Field(
        ..., 
        description="Token decimals",
        example=6
    )
    usd_value: float = Field(
        default=None,
        description="USD value of token balance",
        example=100.50
    )

class BuyRequest(BaseModel):
    token_address: str = Field(
        ..., 
        description="Token mint address to buy",
        example="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    )
    amount_in_sol: float = Field(
        ..., 
        gt=0,
        description="Amount of SOL to spend",
        example=0.1
    )
    slippage: float = Field(
        default=0.5,
        ge=0,
        le=100,
        description="Slippage tolerance in percentage",
        example=0.5
    )

async def get_token_info(token_address: str) -> Dict:
    """Get token info from Solana RPC"""
    try:
        print(f"Getting token info for {token_address}")  # Debug log
        
        # First get the token account
        async with httpx.AsyncClient() as client:
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getTokenAccountsByOwner",
                "params": [
                    WALLET_ADDRESS,
                    {
                        "mint": token_address
                    },
                    {
                        "encoding": "jsonParsed"
                    }
                ]
            }
            print(f"Sending RPC request: {payload}")  # Debug log
            
            response = await client.post(
                RPC_URL,
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                }
            )
            
            print(f"Token account response: {response.text}")  # Debug log
            
            if response.status_code != 200:
                raise Exception(
                    f"RPC error: {response.status_code}: {response.text}"
                )
                
            data = response.json()
            if "error" in data:
                raise Exception(
                    f"RPC error: {data['error']}"
                )
                
            if not data["result"]["value"]:
                raise Exception(
                    f"No token account found for {token_address}"
                )
                
            # Get the first token account
            token_account = data["result"]["value"][0]
            return token_account["account"]["data"]["parsed"]["info"]
            
    except httpx.RequestError as e:
        print(f"HTTP Request failed: {str(e)}")  # Debug log
        raise Exception(
            f"Failed to connect to Solana RPC: {str(e)}"
        )
    except Exception as e:
        print(f"Error getting token info: {str(e)}")  # Debug log
        raise Exception(
            f"Error getting token info: {str(e)}"
        )

async def get_native_sol_balance() -> int:
    """Get native SOL balance from Solana RPC"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                RPC_URL,
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getBalance",
                    "params": [WALLET_ADDRESS]
                }
            )
            
            print(f"SOL balance response: {response.text}")  # Debug log
            
            if response.status_code != 200:
                raise Exception(
                    f"RPC error: {response.status_code}: {response.text}"
                )
                
            data = response.json()
            if "error" in data:
                raise Exception(
                    f"RPC error: {data['error']}"
                )
                
            return data["result"]["value"]
            
    except Exception as e:
        print(f"Error getting SOL balance: {str(e)}")  # Debug log
        raise Exception(
            f"Error getting SOL balance: {str(e)}"
        )

async def get_token_balance(token_address: str) -> int:
    """
    Get token balance from Solana
    
    Args:
        token_address: SPL token mint address
        
    Returns:
        int: Token balance
        
    Raises:
        Exception: If token account not found or RPC error
    """
    token_info = await get_token_info(token_address)
    return int(token_info["tokenAmount"]["amount"])

# Token address to symbol mapping
TOKEN_MAPPING = {
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": "MSOL",
    "bonk9Y3xZ4wQJ4Fp6tHGYQp6qYuLKnHV5FDCztxhHBA": "BONK",
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": "JUP"
}

# Token Calculation Endpoints
@app.route("/api/calculate", methods=["POST"])
async def calculate_token_amount():
    """Calculate token amount based on percentage"""
    try:
        print(f"Received request: {request.json}")  # Debug log
        
        # Validate percentage
        request_data = request.get_json()
        if not 0 < request_data["percentage"] <= 100:
            raise Exception(
                "Percentage must be between 0 and 100"
            )
        
        # Check if it's native SOL
        if request_data["token_address"] == "So11111111111111111111111111111111111111112":
            token_info = await get_native_sol_balance()
        else:
            token_info = await get_token_info(request_data["token_address"])
            
        print(f"Token info: {token_info}")  # Debug log
        
        # Extract balance and decimals
        balance = int(token_info["tokenAmount"]["amount"])
        decimals = token_info["tokenAmount"]["decimals"]
        
        # Calculate amount
        amount = (Decimal(str(balance)) * Decimal(str(request_data["percentage"]))) / Decimal('100')
        
        # Convert to human readable format
        human_amount = str(amount / Decimal(str(10 ** decimals)))
        human_balance = str(Decimal(str(balance)) / Decimal(str(10 ** decimals)))
        
        print(f"Calculation results: amount={human_amount}, balance={human_balance}")  # Debug log
        
        return jsonify({
            "token_address": request_data["token_address"],
            "percentage": request_data["percentage"],
            "balance": human_balance,
            "amount": human_amount,
            "decimals": decimals
        })
        
    except Exception as e:
        print(f"Error in calculate_token_amount: {str(e)}")  # Error log
        raise Exception(
            f"Internal server error: {str(e)}"
        )

# Jupiter Integration Endpoints
@app.route("/api/jupiter/quote", methods=["POST"])
async def get_jupiter_quote():
    try:
        request_data = request.get_json()
        params = {
            "inputMint": request_data["input_token"],
            "outputMint": request_data["output_token"],
            "amount": request_data["amount"],
            "slippageBps": int(request_data["slippage"] * 100)
        }
        response = client.get(f"{JUPITER_API_URL}/quote", params=params)
        return jsonify(response.json())
    except Exception as e:
        raise Exception(
            f"Jupiter quote error: {str(e)}"
        )

@app.route("/api/jupiter/swap", methods=["POST"])
async def execute_jupiter_swap():
    try:
        request_data = request.get_json()
        quote = await get_jupiter_quote()
        return jsonify({"status": "not_implemented", "quote": quote})
    except Exception as e:
        raise Exception(
            f"Swap error: {str(e)}"
        )

# Buy Endpoint
@app.route("/api/buy", methods=["POST"])
async def buy_token():
    """
    Buy a token using SOL
    """
    try:
        request_data = request.get_json()
        # Initialize Jupiter client
        jupiter = Jupiter()
        
        # Get keypair from environment
        private_key = b58decode(os.getenv("PRIVATE_KEY"))
        keypair = Keypair.from_bytes(private_key)
        
        logger = logging.getLogger(__name__)
        logger.info(f"Initiating buy order for {request_data['amount_in_sol']} SOL worth of token {request_data['token_address']}")
        logger.info(f"Using wallet: {keypair.pubkey()}")

        # Get current token price
        price_data = await get_token_price(request_data["token_address"])
        current_price = price_data["price"]
        logger.info(f"Current token price: ${current_price}")

        # Convert SOL to lamports
        amount_lamports = int(request_data["amount_in_sol"] * 1_000_000_000)  # 1 SOL = 1B lamports

        # Get current SOL balance
        sol_balance = await get_native_sol_balance()
        
        if sol_balance < amount_lamports:
            raise Exception(
                f"Insufficient SOL balance. Need {amount_lamports/1e9} SOL but have {sol_balance/1e9} SOL"
            )

        # Execute swap with retries
        max_retries = 3
        retry_count = 0
        last_error = None
        
        while retry_count < max_retries:
            try:
                # Execute the swap
                swap_result = await jupiter.place_order(
                    keypair,
                    "So11111111111111111111111111111111111111112",  # SOL
                    request_data["token_address"],  # Target token
                    amount_lamports,
                    9  # SOL decimals
                )
                
                if not swap_result.get('success', False):
                    error_msg = swap_result.get('error', 'Unknown error')
                    logger.error(f"Swap error on attempt {retry_count + 1}: {error_msg}")
                    last_error = error_msg
                    retry_count += 1
                    await asyncio.sleep(1)  # Wait before retry
                    continue
                    
                # If we got here, swap was successful
                tx_sig = swap_result.get('txid')
                if not tx_sig:
                    error_msg = "No transaction ID in successful response"
                    logger.error(error_msg)
                    raise Exception(error_msg)
                    
                logger.info(f"Buy transaction: https://solscan.io/tx/{tx_sig}")
                
                # Calculate approximate token amount received
                token_amount = request_data["amount_in_sol"] / current_price
                
                # Record successful trade with transaction link
                trade = {
                    "token_address": request_data["token_address"],
                    "buy_price": current_price,
                    "transaction_link": f"https://solscan.io/tx/{tx_sig}",
                    "amount_in_sol": request_data["amount_in_sol"],
                    "token_amount": token_amount,
                    "result": "success"
                }
                
                return jsonify(trade)
                
            except Exception as e:
                logger.error(f"Error on attempt {retry_count + 1}: {str(e)}")
                last_error = str(e)
                retry_count += 1
                if retry_count < max_retries:
                    await asyncio.sleep(1)  # Wait before retry
                    
        # If we got here, all retries failed
        error_msg = f"Failed to execute buy after {max_retries} attempts. Last error: {last_error}"
        logger.error(error_msg)
        
        # Record failed trade
        token_amount = request_data["amount_in_sol"] / current_price
        trade = {
            "token_address": request_data["token_address"],
            "buy_price": current_price,
            "transaction_link": "",
            "amount_in_sol": request_data["amount_in_sol"],
            "token_amount": token_amount,
            "result": "fail"
        }
        
        raise Exception(
            error_msg
        )
        
    except Exception as e:
        error_msg = f"Error placing buy order: {str(e)}\n{traceback.format_exc()}"
        logger = logging.getLogger(__name__)
        logger.error(error_msg)
        
        # Record failed trade
        try:
            token_amount = request_data["amount_in_sol"] / current_price
            trade = {
                "token_address": request_data["token_address"],
                "buy_price": current_price,
                "transaction_link": "",
                "amount_in_sol": request_data["amount_in_sol"],
                "token_amount": token_amount,
                "result": "fail"
            }
        except Exception as trade_error:
            logger.error(f"Failed to record failed trade: {str(trade_error)}")
            
        raise Exception(
            error_msg
        )

# Trade Endpoints
@app.route("/api/trades", methods=["GET"])
async def get_all_trades():
    """Get all trades"""
    return jsonify([])

@app.route("/api/trades/active", methods=["GET"])
def get_active_trades():
    try:
        # Get current time
        current_time = datetime.now()
        
        # Load trades from tracked_trades.json
        trades_file = os.path.join(os.path.dirname(__file__), 'ui', 'src', 'data', 'tracked_trades.json')
        with open(trades_file, 'r') as f:
            all_trades = json.load(f)
        
        # Filter for active trades (trades within the last 5 minutes)
        active_trades = []
        for trade_id, trade in all_trades.items():
            trade_time = datetime.fromisoformat(trade['date_time'])
            if current_time - trade_time <= datetime.timedelta(minutes=5):
                trade['id'] = trade_id
                active_trades.append(trade)
        
        # Sort by date_time descending
        active_trades.sort(key=lambda x: x['date_time'], reverse=True)
        
        return jsonify(active_trades)
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route("/api/trades/<trade_id>", methods=["GET"])
async def get_trade(trade_id: str):
    """Get a specific trade"""
    return jsonify({})

@app.route("/api/trades/<trade_id>/close", methods=["POST"])
async def close_trade(trade_id: str):
    """Close a trade"""
    try:
        return jsonify({})
    except Exception as e:
        raise Exception(
            f"Error closing trade: {str(e)}"
        )

@app.route("/api/trades/update", methods=["POST"])
async def update_trades():
    """Update prices for all active trades"""
    try:
        return jsonify({"success": True, "message": "Trade prices updated"})
    except Exception as e:
        raise Exception(
            f"Error updating trades: {str(e)}"
        )

@app.route("/api/trades/stats", methods=["GET"])
async def get_trade_stats():
    """
    Get trading statistics within a specified timeframe.
    If no timeframe is specified, returns statistics for all trades.
    """
    try:
        return jsonify({})
    except Exception as e:
        raise Exception(
            f"Error getting trade statistics: {str(e)}"
        )

# Sell Endpoints
@app.route("/api/sell/all", methods=["POST"])
async def sell_all_tokens():
    try:
        request_data = request.get_json()
        token_info = await get_token_info(request_data["token_address"])
        return jsonify({"status": "not_implemented", "balance": token_info["tokenAmount"]})
    except Exception as e:
        raise Exception(
            f"Sell error: {str(e)}"
        )

@app.route("/api/sell/max", methods=["POST"])
async def sell_max_tokens():
    try:
        request_data = request.get_json()
        token_info = await get_token_info(request_data["token_address"])
        return jsonify({"status": "not_implemented", "max_amount": token_info["tokenAmount"]})
    except Exception as e:
        raise Exception(
            f"Sell error: {str(e)}"
        )

@app.route("/api/sell/percentage", methods=["POST"])
async def sell_percentage():
    try:
        request_data = request.get_json()
        if request_data["percentage"] is None:
            raise Exception(
                "Percentage is required"
            )
        calc_response = await calculate_token_amount(TokenRequest(
            token_address=request_data["token_address"],
            percentage=request_data["percentage"]
        ))
        return jsonify({
            "status": "not_implemented",
            "amount_to_sell": calc_response["amount"]
        })
    except Exception as e:
        raise Exception(
            f"Sell error: {str(e)}"
        )

# Price Endpoints
@app.route('/price/<token_address>/<api_key>', methods=['GET'])
def get_token_price_from_tracker(token_address, api_key):
    """
    Fetch the price of a Solana token using the Solana Tracker Public Data API.

    Args:
        token_address (str): The public address of the token.
        api_key (str): Your Solana Tracker API key.

    Returns:
        JSON response with price_usd field
    """
    # Define the base URL of the Solana Tracker Public Data API
    base_url = "https://data.solanatracker.io"

    # Set the request headers with your API key
    headers = {
        "accept": "application/json",
        "x-api-key": api_key
    }

    try:
        # Construct the request URL
        url = f"{base_url}/price?token={token_address}"

        # Make the API request
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise an error for HTTP error codes

        # Parse the JSON response
        data = response.json()

        # Extract the token price in USD
        if "price" in data:
            return jsonify({"price_usd": data["price"]})
        else:
            print("Price information not available in the API response.")
            return jsonify({"error": "Price not available"}), 404

    except requests.exceptions.RequestException as e:
        print(f"An error occurred while fetching the token price: {e}")
        return jsonify({"error": str(e)}), 500

async def fetch_price(session, token_address, api_key):
    """Fetch price for a single token"""
    url = f"https://data.solanatracker.io/price?token={token_address}"
    headers = {
        "accept": "application/json",
        "x-api-key": api_key
    }
    try:
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                return token_address, data.get('price', 0), None
            else:
                return token_address, 0, f"Failed to get price: {response.status}"
    except Exception as e:
        return token_address, 0, str(e)

@app.route('/api/refresh-prices', methods=['POST'])
async def refresh_prices():
    try:
        trades_path = os.path.join(os.path.dirname(__file__), 'ui', 'src', 'data', 'trades.json')
        with open(trades_path, 'r') as f:
            trades = json.load(f)
        
        updated_trades = {}
        errors = []
        api_key = "8d88754c-64e7-4482-b293-28b4f3579f5c"
        
        # Get list of active trades that need price updates
        active_trades = {
            trade_id: trade for trade_id, trade in trades.items() 
            if trade['status'] == 'active' and trade.get('token_address')
        }
        
        # Fetch all prices concurrently
        async with aiohttp.ClientSession() as session:
            tasks = [
                fetch_price(session, trade['token_address'], api_key)
                for trade in active_trades.values()
            ]
            results = await asyncio.gather(*tasks)
        
        # Process results and update trades
        for trade_id, trade in trades.items():
            if trade_id in active_trades:
                token_address = trade['token_address']
                # Find matching result
                for result_addr, price, error in results:
                    if result_addr == token_address:
                        if error:
                            errors.append({"trade_id": trade_id, "error": error})
                        elif price > 0:
                            trade['current_price'] = price
                            entry_price = float(trade.get('buy_price', 0))
                            if entry_price > 0:
                                pnl = ((price - entry_price) / entry_price) * 100
                                trade['pnl'] = round(pnl, 2)
                                trade['profit'] = round((price - entry_price) * trade['token_amount'], 4)
                        break
            
            updated_trades[trade_id] = trade
        
        # Save updated trades back to file
        with open(trades_path, 'w') as f:
            json.dump(updated_trades, f, indent=2)
        
        return jsonify({
            "success": True,
            "data": updated_trades,
            "warnings": [error["error"] for error in errors] if errors else []
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/get_price/<token_address>", methods=["GET"])
async def get_token_price(token_address: str):
    """
    Get token price and market data
    """
    try:
        return jsonify({
            "success": True,
            "data": {
                "price": 0,
                "raw_price": 0,
                "market_cap": 0,
                "volume_24h": 0
            }
        })
    except Exception as e:
        error_msg = f"Error fetching price: {str(e)}"
        logger = logging.getLogger(__name__)
        logger.error(error_msg)
        raise Exception(
            error_msg
        )

# Store active tracking tasks
wallet_tracking_tasks = {}

@app.route('/api/track-wallet', methods=['POST'])
def track_wallet_endpoint():
    try:
        data = request.get_json()
        if not data:
            logger.error("No JSON data received")
            return jsonify({'error': 'No data provided'}), 400
            
        wallet_address = data.get('address')
        if not wallet_address:
            logger.error("No wallet address provided")
            return jsonify({'error': 'Wallet address is required'}), 400

        logger.info(f"Received request to track wallet: {wallet_address}")

        if wallet_address in wallet_tracking_tasks:
            logger.info(f"Wallet {wallet_address} is already being tracked")
            return jsonify({'message': f'Already tracking wallet {wallet_address}'}), 200

        try:
            # Create background task for wallet tracking
            def track():
                try:
                    def on_trade(trade):
                        try:
                            # Store trade in tracked_trades.json
                            trades_file = os.path.join('ui', 'src', 'data', 'tracked_trades.json')
                            os.makedirs(os.path.dirname(trades_file), exist_ok=True)
                            
                            try:
                                with open(trades_file, 'r') as f:
                                    trades = json.load(f)
                            except (FileNotFoundError, json.JSONDecodeError):
                                trades = {}

                            trade_id = f"tracked_trade_{len(trades) + 1}"
                            trades[trade_id] = {
                                **trade,
                                'wallet_group': wallet_address,
                                'transactionLink': f'https://solscan.io/tx/{trade["signature"]}',
                                'tokenLink': f'https://solscan.io/token/{trade["tokenAddress"]}',
                                'buy_price': trade['value'],
                                'date_time': datetime.now().isoformat()
                            }

                            with open(trades_file, 'w') as f:
                                json.dump(trades, f, indent=2)
                                
                            logger.info(f"Saved new trade for wallet {wallet_address}")
                        except Exception as e:
                            logger.error(f"Error saving trade: {str(e)}")

                    logger.info(f"Starting tracking for wallet {wallet_address}")
                    
                    # Create new event loop for this thread
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    # Run the async function
                    loop.run_until_complete(track_wallet(wallet_address, on_trade))
                    
                except Exception as e:
                    logger.error(f"Error in tracking thread: {str(e)}")
                finally:
                    loop.close()

            task = threading.Thread(target=track)
            task.daemon = True
            task.start()
            wallet_tracking_tasks[wallet_address] = task
            
            logger.info(f"Successfully started tracking wallet {wallet_address}")
            return jsonify({
                'message': f'Started tracking wallet {wallet_address}',
                'status': 'success'
            }), 200
        except Exception as e:
            logger.error(f"Error creating tracking task: {str(e)}")
            return jsonify({'error': f'Failed to create tracking task: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Unexpected error in track_wallet_endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stop-tracking', methods=['POST'])
def stop_tracking():
    try:
        data = request.get_json()
        if not data:
            logger.error("No JSON data received")
            return jsonify({'error': 'No data provided'}), 400
            
        wallet_address = data.get('address')
        if not wallet_address:
            logger.error("No wallet address provided")
            return jsonify({'error': 'Wallet address is required'}), 400

        logger.info(f"Received request to stop tracking wallet: {wallet_address}")

        if wallet_address not in wallet_tracking_tasks:
            logger.warning(f"Wallet {wallet_address} is not being tracked")
            return jsonify({'error': 'Wallet is not being tracked'}), 404

        try:
            # Remove from tracking tasks
            del wallet_tracking_tasks[wallet_address]
            logger.info(f"Successfully stopped tracking wallet {wallet_address}")
            return jsonify({'message': f'Stopped tracking wallet {wallet_address}'}), 200
        except Exception as e:
            logger.error(f"Error stopping tracking: {str(e)}")
            return jsonify({'error': f'Failed to stop tracking: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Unexpected error in stop_tracking: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(port=8005, debug=True)
