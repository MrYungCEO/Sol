from flask import Flask, jsonify, request, Response, make_response
from flask_cors import CORS, cross_origin
from flask_sock import Sock
import os
import json
import logging
import requests
import asyncio
import aiohttp
import time
import threading
import traceback
from datetime import datetime, timedelta
from decimal import Decimal
from dotenv import load_dotenv
from wallet_tracking import (
    RPCClient, parse_route, print_transaction,
    print_transaction_async, log_info, log_warning,
    log_error, format_address, track_wallet as wallet_tracker
)
from pydantic import BaseModel, Field
from base58 import b58decode
from solders.keypair import Keypair
from typing import Dict, Any
from functools import wraps
import queue
from typing import Callable
import websockets
from websockets.client import connect
from websockets.exceptions import WebSocketException, ConnectionClosedError
import asyncio
from price import get_token_price

# Import and reload jupiter module
import jupiter
import importlib
importlib.reload(jupiter)
from jupiter import Jupiter

# Import token buyer after jupiter is reloaded
from token_buyer import TokenBuyer

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
TRADES_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "data", "trades.json")
TRACKED_TRADES_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "data", "tracked_trades.json")
SETTINGS_FILE = os.path.join(DATA_DIR, "settings.json")
SOLANA_RPC_URL = os.getenv('SOLANA_RPC_URL', 'https://api.mainnet-beta.solana.com')
WALLET_ADDRESS = os.getenv('WALLET_ADDRESS')
DEFAULT_TEST_WALLET = "j1oeQoPeuEDmjvyMwBmCWexzCQup77kbKKxV59CnYbd"
HELIUS_API_KEY = os.getenv('HELIUS_API_KEY')

# Initialize trades files if they don't exist
for file_path in [TRADES_FILE, TRACKED_TRADES_FILE]:
    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            json.dump({}, f, indent=2)

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Initialize Flask app
app = Flask(__name__)
sock = Sock(app)

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

@app.after_request
def after_request(response):
    """Add CORS headers after each request"""
    origin = request.headers.get('Origin')
    if origin == 'http://localhost:5173':
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = '3600'
    return response

def handle_options_request():
    """Handle OPTIONS request"""
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response
    return None

def cors_response(f):
    """Decorator to handle CORS and return proper headers"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Handle OPTIONS request
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            response.headers.add('Access-Control-Max-Age', '3600')
            return response
        
        try:
            result = f(*args, **kwargs)
            
            # Add CORS headers to the response
            if isinstance(result, tuple):
                response = make_response(result[0])
                status_code = result[1]
                response.status_code = status_code
            else:
                response = make_response(result)
            
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            response.headers.add('Access-Control-Max-Age', '3600')
            
            return response
            
        except Exception as e:
            logger.error(f"Error in route handler: {str(e)}")
            error_response = make_response(jsonify({"error": str(e)}), 500)
            error_response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173'
            error_response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            error_response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            error_response.headers['Access-Control-Allow-Credentials'] = 'true'
            error_response.headers['Access-Control-Max-Age'] = '3600'
            return error_response
            
    return decorated_function

@app.errorhandler(Exception)
def handle_error(error):
    logger.error(f"Error: {str(error)}")
    logger.error(traceback.format_exc())
    response = make_response(jsonify({
        "error": str(error),
        "status": "error"
    }), 500)
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

@app.errorhandler(404)
def not_found_error(error):
    logger.error(f"404 Error: {str(error)}")
    response = make_response(jsonify({
        "error": str(error),
        "status": "error"
    }), 404)
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

async def get_token_info(token_address: str) -> Dict[str, Any]:
    """Get token information from the blockchain"""
    try:
        # For testing, return mock data
        return {
            "address": token_address,
            "symbol": "TEST",
            "name": "Test Token",
            "decimals": 9
        }
    except Exception as e:
        logger.error(f"Error getting token info: {str(e)}")
        raise

@app.route('/api/buy', methods=['POST', 'OPTIONS'])
@cross_origin()
def buy_token():
    """Buy token endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        # Get token address and amount
        token_address = data.get('tokenAddress')
        amount = data.get('amount')
        
        if not token_address or not amount:
            return jsonify({'error': 'Missing tokenAddress or amount'}), 400
            
        try:
            amount_in_sol = float(amount)
            if amount_in_sol <= 0:
                return jsonify({'error': 'Amount must be greater than 0'}), 400
        except (TypeError, ValueError):
            return jsonify({'error': 'Invalid amount format'}), 400
            
        # Import the TokenBuyer from buy.py
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from buy import TokenBuyer
        
        # Initialize buyer
        buyer = TokenBuyer()
        
        # Run buy order
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Execute the buy order first
            result = loop.run_until_complete(buyer.buy_token(amount_in_sol, token_address))
            
            if isinstance(result, dict) and 'error' in result:
                error_msg = result['error']
                logger.error(f"Buy order failed: {error_msg}")
                return jsonify({'error': error_msg}), 500
            
            # Extract txid from URL
            txid = result.replace("https://solscan.io/tx/", "")
            
            # Wait a bit for token balance to update
            loop.run_until_complete(asyncio.sleep(2))
            
            # Get token amount from get_token_balance
            initial_balance = loop.run_until_complete(buyer.get_token_balance(token_address))
            
            # Wait and try again if balance is 0
            if initial_balance == 0:
                loop.run_until_complete(asyncio.sleep(3))
                initial_balance = loop.run_until_complete(buyer.get_token_balance(token_address))
            
            token_amount = initial_balance if initial_balance > 0 else 0
            
            # Calculate price and profit metrics
            buy_price = amount_in_sol / token_amount if token_amount > 0 else 0
            current_price = buy_price  # Initially same as buy price
            profit = 0  # No profit yet since just bought
            profit_percentage = 0  # No profit percentage yet
            
            # Log success
            logging.info(f"Buy order completed successfully: {result}")
            logging.info(f"Token amount received: {token_amount}")
            logging.info(f"Buy price: {buy_price} SOL per token")
            
            # Save trade to trades.json
            trade_data = {
                "id": f"trade_{int(time.time())}",
                "date_time": datetime.now().isoformat(),
                "token_address": token_address,
                "buy_price": buy_price,
                "close_price": 0,  # Not closed yet
                "current_price": current_price,
                "profit": profit,
                "profit_percentage": profit_percentage,
                "status": "active",
                "result": "success",
                "transaction_link": txid,
                "amount_in_sol": amount_in_sol,
                "token_amount": token_amount,
                "signature": txid
            }
            
            save_trade(trade_data)
            
            # Return transaction URL
            return jsonify({
                'success': True,
                'transactionUrl': result
            })
            
        except Exception as e:
            logging.error(f"Error executing buy order: {str(e)}")
            logging.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500
            
        finally:
            loop.close()
            
    except Exception as e:
        logging.error(f"Error in buy endpoint: {str(e)}")
        logging.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/sell', methods=['POST', 'OPTIONS'])
@cors_response
def sell_token():
    """Sell token endpoint"""
    try:
        # Log request
        logger.info(f"Sell token request: {request.json}")
        
        # Validate request
        if not request.is_json:
            raise ValueError("Request must be JSON")
            
        data = request.json
        required_fields = ["tokenAddress", "amount"]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")
                
        # Get token info
        token_info = asyncio.run(get_token_info(data["tokenAddress"]))
        if not token_info:
            raise ValueError(f"Token not found: {data['tokenAddress']}")
            
        # Return success
        return jsonify({
            "status": "success",
            "message": "Sell order placed successfully",
            "data": {
                "tokenAddress": data["tokenAddress"],
                "amount": data["amount"],
                "tokenInfo": token_info
            }
        })
        
    except Exception as e:
        logger.error(f"Error in sell_token: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@app.route('/api/wallet/balances', methods=['GET', 'OPTIONS'])
def get_wallet_balances():
    """Get wallet balances"""
    try:
        # Handle OPTIONS request
        options_response = handle_options_request()
        if options_response:
            return options_response

        # Mock data for testing
        balances = {
            "status": "success",
            "data": {
                "balances": [
                    {
                        "token": "SOL",
                        "balance": 10.5,
                        "usd_value": 850.25
                    },
                    {
                        "token": "USDC",
                        "balance": 1000.0,
                        "usd_value": 1000.0
                    },
                    {
                        "token": "RAY",
                        "balance": 50.0,
                        "usd_value": 75.50
                    }
                ],
                "total_usd_value": 1925.75,
                "last_updated": datetime.now().isoformat()
            }
        }
        
        response = make_response(jsonify(balances))
        return response

    except Exception as e:
        logger.error(f"Error in get_wallet_balances: {str(e)}")
        response = make_response(jsonify({
            "error": str(e),
            "status": "error"
        }), 500)
        return response

@app.route('/api/sell/max', methods=['POST', 'OPTIONS'])
@cors_response
def sell_max():
    """Sell maximum amount of tokens"""
    try:
        if not request.is_json:
            raise ValueError("Request must be JSON")
            
        data = request.get_json()
        if 'token_address' not in data:
            raise ValueError("token_address is required")
            
        # Mock response for testing
        return jsonify({
            "status": "success",
            "message": "Maximum sell order placed successfully",
            "data": {
                "tokenAddress": data["token_address"],
                "amount": "max"
            }
        })
    except ValueError as e:
        return jsonify({
            "error": f"Sell error: {str(e)}",
            "status": "error"
        }), 400
    except Exception as e:
        logger.error(f"Error in sell_max: {str(e)}")
        return jsonify({
            "error": f"Sell error: {str(e)}",
            "status": "error"
        }), 500

@app.route('/api/calculate', methods=['POST', 'OPTIONS'])
@cors_response
def calculate_amount():
    """Calculate token amount based on percentage"""
    try:
        if not request.is_json:
            raise ValueError("Request must be JSON")
            
        data = request.get_json()
        if 'percentage' not in data:
            raise ValueError("percentage is required")
            
        percentage = float(data['percentage'])
        if percentage < 0 or percentage > 100:
            raise ValueError("percentage must be between 0 and 100")
            
        # Mock calculation for testing
        total_amount = 1000
        calculated_amount = total_amount * (percentage / 100)
        
        return jsonify({
            "status": "success",
            "data": {
                "percentage": percentage,
                "calculatedAmount": calculated_amount
            }
        })
    except ValueError as e:
        return jsonify({
            "error": f"Internal server error: {str(e)}",
            "status": "error"
        }), 400
    except Exception as e:
        logger.error(f"Error in calculate_amount: {str(e)}")
        return jsonify({
            "error": f"Internal server error: {str(e)}",
            "status": "error"
        }), 500

@app.route('/api/settings', methods=['GET', 'POST'])
async def handle_settings():
    """Handle settings requests"""
    try:
        settings_file = os.path.join(DATA_DIR, "settings.json")
        
        if request.method == 'GET':
            # Return settings from file
            if os.path.exists(settings_file):
                with open(settings_file, 'r') as f:
                    settings = json.load(f)
                return jsonify(settings)
            return jsonify({})
            
        elif request.method == 'POST':
            # Save settings to file
            settings = request.get_json()
            
            # Create data directory if it doesn't exist
            os.makedirs(DATA_DIR, exist_ok=True)
            
            # Save settings
            with open(settings_file, 'w') as f:
                json.dump(settings, f, indent=2)
            
            return jsonify(settings)
            
    except Exception as e:
        logger.error(f"Error handling settings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/test-connection', methods=['GET'])
def test_connection():
    try:
        # Check if we have required settings
        settings = load_settings()
        if not settings.get('api', {}).get('heliusApiKey'):
            return jsonify({'error': 'No Helius API key configured'}), 400
        if not settings.get('api', {}).get('rpcUrl'):
            return jsonify({'error': 'No RPC URL configured'}), 400
        if not settings.get('wallet', {}).get('address'):
            return jsonify({'error': 'No wallet address configured'}), 400

        # Test RPC connection
        try:
            response = requests.get(settings['api']['rpcUrl'])
            if response.status_code != 200:
                return jsonify({'error': 'RPC connection failed'}), 400
        except Exception as e:
            return jsonify({'error': f'RPC connection failed: {str(e)}'}), 400

        # Test Helius API
        try:
            headers = {'Authorization': f'Bearer {settings["api"]["heliusApiKey"]}'}
            response = requests.get('https://api.helius.xyz/v0/status', headers=headers)
            if response.status_code != 200:
                return jsonify({'error': 'Helius API connection failed'}), 400
        except Exception as e:
            return jsonify({'error': f'Helius API connection failed: {str(e)}'}), 400

        return jsonify({'message': 'Connection successful'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/price', methods=['GET', 'OPTIONS'])
def get_token_price():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', '*')
        response.headers.add('Access-Control-Allow-Methods', '*')
        return response
        
    token_address = request.args.get('address')
    if not token_address:
        return jsonify({'error': 'Token address required'}), 400
        
    try:
        # Get SOL price in USD from Jupiter API
        sol_price_url = "https://price.jup.ag/v4/price?ids=SOL"
        sol_response = requests.get(sol_price_url)
        sol_data = sol_response.json()
        sol_price = sol_data['data']['SOL']['price']
        
        # Get token price in SOL from Jupiter API
        token_price_url = f"https://price.jup.ag/v4/price?ids={token_address}"
        token_response = requests.get(token_price_url)
        token_data = token_response.json()
        
        if token_address in token_data['data']:
            token_price_usd = token_data['data'][token_address]['price']
            token_price_sol = token_price_usd / sol_price
            
            return jsonify({
                'price_usd': token_price_usd,
                'price_sol': token_price_sol
            })
        else:
            return jsonify({'error': 'Token price not found'}), 404
            
    except Exception as e:
        logger.error(f"Error getting price: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Global variables for wallet tracking
active_tracking_tasks = {}
trade_queue = queue.Queue()
event_loop = None
stop_events = {}  # Dictionary to store stop events for each wallet
global_stop_event = threading.Event()  # Global stop event for trade processing
rpc_client = None
websocket_clients = set()  # Set to store active WebSocket connections

def process_trades():
    """Process trades from the queue and print them"""
    while not global_stop_event.is_set():
        try:
            trade = trade_queue.get(timeout=1)  # 1 second timeout
            if trade:
                # Save trade to file
                save_trade(trade)

                # Print trade details
                if event_loop and not event_loop.is_closed():
                    asyncio.run_coroutine_threadsafe(
                        print_transaction_async(
                            trade.get('signature', ''),
                            trade,
                            trade.get('blockTime')
                        ),
                        event_loop
                    )
        except queue.Empty:
            continue
        except Exception as e:
            logger.error(f"Error processing trade: {str(e)}")
            continue

def start_background_tasks():
    """Start background tasks for trade processing"""
    global event_loop
    
    def run_event_loop():
        global event_loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        event_loop = loop
        loop.run_forever()
    
    # Start event loop in a separate thread
    loop_thread = threading.Thread(target=run_event_loop, daemon=True)
    loop_thread.start()
    
    # Start trade processing in a separate thread
    trade_thread = threading.Thread(target=process_trades, daemon=True)
    trade_thread.start()

start_background_tasks()

async def print_transaction_async(signature: str, route: dict, block_time: int):
    """Async version of print_transaction"""
    try:
        if route and isinstance(route, dict):
            trade_type = route.get('type', 'unknown')
            token_address = route.get('tokenAddress')
            token_amount = route.get('tokenAmount', 0)
            amount_in_sol = route.get('amountInSol', 0)
            
            if trade_type and token_address:
                log_info(f"Found {trade_type} trade in tx {signature}")
                
                # Load existing tracked trades
                tracked_trades = {}
                
                if os.path.exists(TRACKED_TRADES_FILE):
                    try:
                        with open(TRACKED_TRADES_FILE, 'r') as f:
                            tracked_trades = json.load(f)
                    except json.JSONDecodeError:
                        logger.warning("Error reading tracked trades file")
                
                # Create trade data
                trade_id = f"tracked_trade_{len(tracked_trades) + 1}"
                trade_data = {
                    "id": trade_id,
                    "type": trade_type,
                    "tokenAddress": token_address,
                    "tokenAmount": token_amount,
                    "amountInSol": amount_in_sol,
                    "signature": signature,
                    "date_time": datetime.now().isoformat(),
                    "transactionLink": f"https://solscan.io/tx/{signature}",
                    "html": f"<span class=\"text-{'green' if trade_type == 'buy' else 'red'}-500\">{token_address[:4]}...{token_address[-4:]}</span>",
                    "value": 0
                }
                
                # Add to tracked trades
                tracked_trades[trade_id] = trade_data
                
                # Save to file
                os.makedirs(os.path.dirname(TRACKED_TRADES_FILE), exist_ok=True)
                with open(TRACKED_TRADES_FILE, 'w') as f:
                    json.dump(tracked_trades, f, indent=2)
                
                # Broadcast to WebSocket clients
                message = {
                    'type': 'trade',
                    'data': trade_data
                }
                
                dead_clients = set()
                for client in websocket_clients:
                    try:
                        await client.send(json.dumps(message))
                    except Exception as e:
                        dead_clients.add(client)
                        logger.error(f"Error sending to WebSocket client: {str(e)}")
                
                # Remove dead clients
                websocket_clients.difference_update(dead_clients)
                
                return trade_data
                
    except Exception as e:
        log_error(f"Error in print_transaction_async: {str(e)}")
        return None

@app.route('/api/track-wallet', methods=['POST', 'OPTIONS'])
@cors_response
def track_wallet_endpoint():
    """Start tracking a wallet endpoint"""
    try:
        data = request.get_json()
        wallet_address = data.get('wallet_address')
        
        if not wallet_address:
            return jsonify({
                'error': 'No wallet address provided',
                'status': 'error'
            }), 400
            
        # Stop existing tracking task if it exists
        if wallet_address in active_tracking_tasks:
            active_tracking_tasks[wallet_address].cancel()
            del active_tracking_tasks[wallet_address]
        
        # Start tracking in a new thread
        def track_wallet_thread():
            try:
                # Create a new event loop for this thread
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                # Run the tracking function
                task = loop.create_task(wallet_tracker(wallet_address, on_trade_callback))
                active_tracking_tasks[wallet_address] = task
                
                # Run the event loop
                loop.run_forever()
            except Exception as e:
                logger.error(f"Error in tracking thread: {str(e)}")
                logger.error(traceback.format_exc())
            finally:
                loop.close()
        
        thread = threading.Thread(target=track_wallet_thread)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'message': f'Started tracking wallet: {wallet_address}',
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error in track_wallet_endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/api/stop-tracking', methods=['POST', 'OPTIONS'])
def stop_tracking():
    """Stop tracking a wallet"""
    try:
        # Handle OPTIONS request
        options_response = handle_options_request()
        if options_response:
            return options_response

        # For testing purposes, accept requests without a body
        data = request.get_json() if request.is_json else {}
        
        # Use the specified test wallet address if none provided
        wallet_address = data.get('wallet_address', DEFAULT_TEST_WALLET)
        
        # Log the stop tracking request
        logger.info(f"Stopping wallet tracking for address: {wallet_address}")
        
        # Set stop event and wait for thread to terminate
        if wallet_address in active_tracking_tasks:
            # Set the stop event
            if wallet_address in stop_events:
                stop_events[wallet_address].set()
                
            # Get the tracking thread
            tracking_thread = active_tracking_tasks[wallet_address]
            
            # Wait for a short time for the thread to terminate
            tracking_thread.join(timeout=2.0)
            
            # Clean up
            del active_tracking_tasks[wallet_address]
            if wallet_address in stop_events:
                del stop_events[wallet_address]
                
            logger.info(f"Removed tracking thread for wallet: {wallet_address}")
        
        # Update the tracked wallet status in the file
        tracked_wallets_file = os.path.join(DATA_DIR, "tracked_wallets.json")
        tracked_wallets = {}
        
        if os.path.exists(tracked_wallets_file):
            try:
                with open(tracked_wallets_file, 'r') as f:
                    tracked_wallets = json.load(f)
            except json.JSONDecodeError:
                logger.warning("Error reading tracked wallets file")
        
        if wallet_address in tracked_wallets:
            tracked_wallets[wallet_address]["status"] = "inactive"
            tracked_wallets[wallet_address]["stopped_at"] = datetime.now().isoformat()
            tracked_wallets[wallet_address]["last_updated"] = datetime.now().isoformat()
            
            # Save the updated tracked wallets
            with open(tracked_wallets_file, 'w') as f:
                json.dump(tracked_wallets, f, indent=2)
                
            logger.info(f"Successfully stopped tracking wallet: {wallet_address}")
            
            response = make_response(jsonify({
                "status": "success",
                "message": f"Stopped tracking wallet {wallet_address}",
                "data": {
                    "wallet_address": wallet_address,
                    "tracking_status": "inactive",
                    "stopped_at": tracked_wallets[wallet_address]["stopped_at"],
                    "last_updated": tracked_wallets[wallet_address]["last_updated"]
                }
            }))
        else:
            logger.warning(f"Wallet not found in tracking list: {wallet_address}")
            response = make_response(jsonify({
                "status": "success",
                "message": f"Wallet {wallet_address} was not being tracked",
                "data": {
                    "wallet_address": wallet_address,
                    "tracking_status": "not_found"
                }
            }))
        
        return response

    except Exception as e:
        logger.error(f"Error in stop_tracking: {str(e)}")
        logger.error(traceback.format_exc())
        response = make_response(jsonify({
            "error": str(e),
            "status": "error"
        }), 500)
        return response

@app.route('/api/copytrading/wallets', methods=['GET', 'OPTIONS'])
@cors_response
def get_copytrading_wallets():
    """Get list of tracked wallets"""
    try:
        # Mock data for testing
        wallets = [
            {
                "address": "5ZWj7a1f8tWkjBESHKgrLmXshuXxqeY9SYcfbshpAqPG",
                "name": "Wallet 1",
                "balance": 1000.5,
                "tracking_since": "2024-01-23T00:00:00Z"
            },
            {
                "address": "7nYabs9dUhvxYwdTnrWVBL9MYXoMk4UgYwjKaX3kKPuY",
                "name": "Wallet 2",
                "balance": 500.25,
                "tracking_since": "2024-01-22T00:00:00Z"
            }
        ]
        return jsonify({
            "status": "success",
            "data": wallets
        })
    except Exception as e:
        logger.error(f"Error in get_tracked_wallets: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@app.route('/api/tracked-wallets', methods=['GET', 'OPTIONS'])
def get_tracked_wallets():
    """Get list of tracked wallets"""
    try:
        # Handle OPTIONS request
        options_response = handle_options_request()
        if options_response:
            return options_response

        tracked_wallets_file = os.path.join(DATA_DIR, "tracked_wallets.json")
        if os.path.exists(tracked_wallets_file):
            with open(tracked_wallets_file, 'r') as f:
                tracked_wallets = json.load(f)
        else:
            tracked_wallets = {}

        response = make_response(jsonify({
            "status": "success",
            "data": {
                "wallets": tracked_wallets,
                "total_count": len(tracked_wallets),
                "active_count": len([w for w in tracked_wallets.values() if w["status"] == "active"])
            }
        }))
        return response

    except Exception as e:
        logger.error(f"Error getting tracked wallets: {str(e)}")
        logger.error(traceback.format_exc())
        response = make_response(jsonify({
            "error": str(e),
            "status": "error"
        }), 500)
        return response

async def on_trade_callback(trade_details: dict):
    """Callback function for trade events"""
    try:
        if trade_details:
            trade_queue.put(trade_details)
    except Exception as e:
        logger.error(f"Error in trade callback: {str(e)}")

async def get_signatures_for_address(rpc_client: RPCClient, address: str, limit: int = 10) -> list:
    """Get transaction signatures for an address"""
    try:
        signatures = await rpc_client.get_signatures(address, limit)
        return signatures
    except Exception as e:
        logger.error(f"Error getting signatures for {address}: {str(e)}")
        return []

def save_trade(trade_data: dict):
    """Save trade to trades.json"""
    try:
        # First save to tracked_trades.json
        tracked_trades_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "data", "tracked_trades.json")
        if os.path.exists(tracked_trades_file):
            with open(tracked_trades_file, 'r') as f:
                tracked_trades = json.load(f)
        else:
            tracked_trades = {}
        
        tracked_trades[trade_data["id"]] = trade_data
        with open(tracked_trades_file, 'w') as f:
            json.dump(tracked_trades, f, indent=2)
            
        # Then save to trades.json
        trades_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "data", "trades.json")
        if os.path.exists(trades_file):
            with open(trades_file, 'r') as f:
                trades = json.load(f)
        else:
            trades = {}
            
        trades[trade_data["id"]] = trade_data
        with open(trades_file, 'w') as f:
            json.dump(trades, f, indent=2)
            
        logger.info(f"Trade saved successfully: {trade_data['id']}")
        
    except Exception as e:
        logger.error(f"Error saving trade: {str(e)}")
        raise

@sock.route('/trades/ws')
def trade_websocket(ws):
    """WebSocket endpoint for real-time trade updates"""
    try:
        # Add client to set of active connections
        websocket_clients.add(ws)
        logger.info("WebSocket client connected")
        
        while True:
            try:
                # Keep connection alive with ping/pong
                message = ws.receive()
                if message == "ping":
                    ws.send("pong")
                    continue
                
                # Handle other messages if needed
                try:
                    data = json.loads(message)
                    logger.info(f"Received message: {data}")
                except json.JSONDecodeError:
                    logger.warning(f"Received non-JSON message: {message}")
                
            except Exception as e:
                logger.error(f"WebSocket error: {str(e)}")
                break
    except Exception as e:
        logger.error(f"Error in WebSocket handler: {str(e)}")
    finally:
        # Remove client from set when disconnected
        websocket_clients.discard(ws)
        logger.info("WebSocket client disconnected")

def log_info(message: str):
    """Log info message with timestamp"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] ℹ {message}")

def log_warning(message: str):
    """Log warning message with timestamp"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠ {message}")

def log_error(message: str):
    """Log error message with timestamp"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] ✖ {message}")

def format_address(address: str) -> str:
    """Format address for display"""
    if not address:
        return ""
    return f"{address[:4]}...{address[-4:]}"

@app.route("/buy", methods=["POST"])
async def buy():
    try:
        data = request.get_json()
        token_address = data.get("token_address")
        amount_in_sol = data.get("amount_in_sol")
        
        # Get initial price from Solana Tracker API
        api_key = "8d88754c-64e7-4482-b293-28b4f3579f5c"
        initial_price = get_token_price(token_address, api_key)
        
        # Generate trade ID
        trade_id = str(int(time.time() * 1000000))
        
        # Execute buy transaction
        transaction_link = "dummy_link"  # Replace with actual transaction
        token_amount = 1000  # Replace with actual amount
        signature = "dummy_signature"  # Replace with actual signature
        
        trade_data = {
            "id": trade_id,
            "date_time": datetime.now().isoformat(),
            "token_address": token_address,
            "buy_price": initial_price,
            "close_price": 0,
            "current_price": initial_price,
            "profit": 0,
            "profit_percentage": 0,
            "status": "active",
            "result": "success",
            "transaction_link": transaction_link,
            "amount_in_sol": amount_in_sol,
            "token_amount": token_amount,
            "signature": signature
        }
        
        # Save trade data
        with open("../src/data/trades.json", "r") as f:
            trades = json.load(f)
        
        trades[trade_id] = trade_data
        
        with open("../src/data/trades.json", "w") as f:
            json.dump(trades, f, indent=2)
            
        return jsonify({"success": True, "trade_id": trade_id})
        
    except Exception as e:
        print(f"Error in buy: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

async def update_trade_prices():
    """Update current prices for all active trades every 30 seconds"""
    while True:
        try:
            # Only update trades.json, not tracked_trades.json
            trades_file = "../src/data/trades.json"
            
            with open(trades_file, "r") as f:
                trades = json.load(f)
            
            api_key = "8d88754c-64e7-4482-b293-28b4f3579f5c"
            modified = False
            
            for trade_id, trade in trades.items():
                if trade.get("status") == "active":
                    token_address = trade.get("token_address")
                    if token_address:  # Skip if token_address is missing
                        current_price = get_token_price(token_address, api_key)
                        
                        if current_price is not None:
                            trade["current_price"] = current_price
                            # Calculate profit and profit percentage
                            if trade.get("buy_price"):
                                trade["profit"] = (current_price - trade["buy_price"]) * trade["token_amount"]
                                trade["profit_percentage"] = ((current_price - trade["buy_price"]) / trade["buy_price"]) * 100
                            modified = True
            
            if modified:
                with open(trades_file, "w") as f:
                    json.dump(trades, f, indent=2)
            
            await asyncio.sleep(30)  # Wait for 30 seconds before next update
            
        except Exception as e:
            print(f"Error updating prices: {str(e)}")
            await asyncio.sleep(30)  # Still wait 30 seconds on error

if __name__ == "__main__":
    # Start the price update task
    loop = asyncio.get_event_loop()
    loop.create_task(update_trade_prices())
    app.run(host='localhost', port=8005, debug=True)
