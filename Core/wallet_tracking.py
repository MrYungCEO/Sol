from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.signature import Signature
import os
import sys
import json
import time
import asyncio
import aiohttp
import websockets
from colorama import init, Fore, Back, Style
import argparse
from typing import Optional, List, Dict, Any, Callable, Union
from datetime import datetime
from constants import *
from websockets.client import connect
from websockets.exceptions import WebSocketException, ConnectionClosedError
from websockets.legacy.protocol import WebSocketCommonProtocol

# Initialize colorama
init(autoreset=True)

def log_info(msg: str):
    """Print info message with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{Fore.CYAN}[{timestamp}] ℹ {Style.RESET_ALL}{msg}")

def log_success(msg: str):
    """Print success message with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{Fore.GREEN}[{timestamp}] ✓ {Style.RESET_ALL}{msg}")

def log_warning(msg: str):
    """Print warning message with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{Fore.YELLOW}[{timestamp}] ⚠ {Style.RESET_ALL}{msg}")

def log_error(msg: str):
    """Print error message with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{Fore.RED}[{timestamp}] ✖ {Style.RESET_ALL}{msg}")

def log_debug(msg: str):
    """Print debug message with timestamp"""
    if os.getenv('DEBUG'):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"{Fore.MAGENTA}[{timestamp}] 🔍 {Style.RESET_ALL}{msg}")

# Constants
HELIUS_API_KEY = "10fc4931-f192-4403-ab41-808bf0b80a67"

# Constants for token classification
SOL_ADDRESS = "So11111111111111111111111111111111111111112"
STABLECOINS = {
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
    "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": "stSOL",
}

def is_sol(mint: str) -> bool:
    """Check if token is SOL"""
    return mint.lower() == SOL_ADDRESS.lower()

def is_stablecoin(mint: str) -> bool:
    """Check if token is a stablecoin"""
    return mint.upper() in [addr.upper() for addr in STABLECOINS.keys()]

def is_sol_or_stable(mint: str) -> bool:
    """Check if token is SOL or a stablecoin"""
    return is_sol(mint) or is_stablecoin(mint)

def get_token_symbol(mint: str) -> str:
    """Get token symbol from mint address"""
    if is_sol(mint):
        return 'SOL'
    return STABLECOINS.get(mint, mint[:4] + '...' + mint[-4:])

import time
from functools import wraps

def rate_limit(calls: int, period: float):
    """Rate limiting decorator"""
    min_interval = period / calls
    last_called = [0.0]  # List to store last call time

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            now = time.time()
            elapsed = now - last_called[0]
            if elapsed < min_interval:
                sleep_time = min_interval - elapsed
                await asyncio.sleep(sleep_time)
            
            try:
                result = await func(*args, **kwargs)
                last_called[0] = time.time()
                return result
            except Exception as e:
                if "429" in str(e):  # Rate limit error
                    log_warning("Rate limit hit, waiting before retry...")
                    await asyncio.sleep(1)  # Wait 1 second before retry
                    return await wrapper(*args, **kwargs)
                raise
        return wrapper
    return decorator

# Update RPC endpoints to use Helius
RPC_ENDPOINTS = [
    f"https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}",
    "https://api.mainnet-beta.solana.com",  # Fallback
]

class RPCClient:
    def __init__(self, endpoint: str = RPC_ENDPOINTS[0]):
        self.current_endpoint_index = 0
        self.endpoints = RPC_ENDPOINTS
        self.session = None
        self.failed_endpoints = set()
        self.endpoint = endpoint

    async def ensure_session(self):
        """Ensure aiohttp session exists"""
        if not self.session:
            self.session = aiohttp.ClientSession()

    async def rotate_endpoint(self):
        """Rotate to next working RPC endpoint"""
        self.current_endpoint_index = (self.current_endpoint_index + 1) % len(self.endpoints)
        self.endpoint = self.endpoints[self.current_endpoint_index]
        log_info(f"Rotated to endpoint: {self.endpoint}")

    async def make_request(self, method: str, params: list) -> Optional[Dict]:
        """Make RPC request with retries"""
        await self.ensure_session()
        
        for _ in range(3):  # Try up to 3 times
            try:
                request = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": method,
                    "params": params
                }
                
                async with self.session.post(self.endpoint, json=request, timeout=30) as response:
                    if response.status == 200:
                        result = await response.json()
                        if "error" in result:
                            log_error(f"RPC error: {result['error']}")
                            await self.rotate_endpoint()
                            continue
                        return result
                    else:
                        log_error(f"HTTP error {response.status}: {await response.text()}")
                        await self.rotate_endpoint()
                        
            except Exception as e:
                log_error(f"Request error: {e}")
                await self.rotate_endpoint()
                
        return None

    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None

    async def get_signatures(self, pubkey: str, limit: int = 5) -> List[str]:
        """Get signatures with retries and endpoint rotation"""
        result = await self.make_request(
            "getSignaturesForAddress",
            [pubkey, {"limit": limit}]
        )
        if result and "result" in result:
            return [tx["signature"] for tx in result["result"]]
        return []

    async def get_transaction(self, signature: str) -> Optional[Dict]:
        """Get transaction details"""
        result = await self.make_request(
            "getTransaction",
            [signature, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}]
        )
        if result and "result" in result:
            return result["result"]
        return None

async def get_signatures_for_address(rpc_client: RPCClient, address: str, limit: int = 1) -> List[str]:
    """Get recent transaction signatures for an address"""
    try:
        signatures = await rpc_client.get_signatures(address, limit)
        return signatures
        
    except Exception as e:
        log_error(f"Error getting signatures: {e}")
        return []

async def handle_account_update(msg):
    """Handle account update message from WebSocket"""
    try:
        if not isinstance(msg, dict):
            log_error("Invalid message format")
            return
            
        # Get transaction info
        tx = msg.get('transaction')
        if not tx or not tx.get('meta'):
            return
            
        signature = msg.get('signature')
        if not signature:
            return
            
        log_info(f"\nNew transaction detected: {signature}")
        
        # Skip failed transactions
        if tx['meta'].get('err'):
            log_warning("Transaction failed, skipping...")
            return
            
        # Get pre and post balances
        pre_balances = tx['meta'].get('preTokenBalances', [])
        post_balances = tx['meta'].get('postTokenBalances', [])
        
        if not pre_balances or not post_balances:
            return
            
        # Calculate balance changes for each token
        changes = []
        for post in post_balances:
            pre = next((p for p in pre_balances 
                       if p['accountIndex'] == post['accountIndex'] 
                       and p['mint'] == post['mint']), None)
                       
            if not pre:
                continue
                
            pre_amount = float(pre['uiTokenAmount'].get('uiAmount', 0) or 0)
            post_amount = float(post['uiTokenAmount'].get('uiAmount', 0) or 0)
            diff = post_amount - pre_amount
            
            if abs(diff) < 0.000001:  # Filter out dust
                continue
                
            changes.append({
                'mint': post['mint'],
                'amount': abs(diff),
                'direction': 'in' if diff > 0 else 'out'
            })
            
        if len(changes) < 2:
            return
            
        # Sort changes by amount (largest first)
        changes.sort(key=lambda x: x['amount'], reverse=True)
        
        # Look for pairs of token movements
        swaps = []
        i = 0
        while i < len(changes) - 1:
            current = changes[i]
            next_change = changes[i + 1]
            
            current_is_sol_stable = is_sol_or_stable(current['mint'])
            next_is_sol_stable = is_sol_or_stable(next_change['mint'])
            
            # One token must be SOL/stable and other must not be
            if current_is_sol_stable != next_is_sol_stable:
                if current['direction'] == 'out' and next_change['direction'] == 'in':
                    swaps.append({
                        'fromMint': current['mint'],
                        'toMint': next_change['mint'],
                        'fromAmount': current['amount'],
                        'toAmount': next_change['amount']
                    })
                elif current['direction'] == 'in' and next_change['direction'] == 'out':
                    swaps.append({
                        'fromMint': next_change['mint'],
                        'toMint': current['mint'],
                        'fromAmount': next_change['amount'],
                        'toAmount': current['amount']
                    })
                i += 2
            else:
                i += 1
                
        if not swaps:
            return
            
        # Get most significant swap
        significant_swap = max(swaps, key=lambda x: max(x['fromAmount'], x['toAmount']))
        
        # Classify trade type
        from_is_sol_stable = is_sol_or_stable(significant_swap['fromMint'])
        to_is_sol_stable = is_sol_or_stable(significant_swap['toMint'])
        
        trade = None
        
        # If sending SOL/stable and receiving token = BUY
        if from_is_sol_stable and not to_is_sol_stable:
            trade = {
                'type': 'buy',
                'token_address': significant_swap['toMint'],
                'value': significant_swap['fromAmount'],
                'token_amount': significant_swap['toAmount'],
                'signature': signature,
                'timestamp': int(time.time())
            }
            
        # If sending token and receiving SOL/stable = SELL
        elif not from_is_sol_stable and to_is_sol_stable:
            trade = {
                'type': 'sell',
                'token_address': significant_swap['fromMint'],
                'value': significant_swap['toAmount'],
                'token_amount': significant_swap['fromAmount'],
                'signature': signature,
                'timestamp': int(time.time())
            }
            
        if trade:
            await on_trade(trade)
            
    except Exception as e:
        log_error(f"Error handling account update: {str(e)}")
        import traceback
        traceback.print_exc()

from datetime import datetime, timezone
import time

def format_time_ago(timestamp):
    """Format timestamp as time ago"""
    now = time.time()
    diff = now - timestamp
    
    if diff < 60:
        return f"{int(diff)}s ago"
    elif diff < 3600:
        return f"{int(diff/60)}m ago"
    elif diff < 86400:
        return f"{int(diff/3600)}h ago"
    else:
        return f"{int(diff/86400)}d ago"

def format_address(address):
    """Format address to show first and last 4 chars"""
    if not address:
        return "Unknown"
    return f"{address[:4]}...{address[-4:]}"

def format_value(value):
    """Format USD value with appropriate precision"""
    if value >= 1000:
        return f"${value:,.0f}"
    elif value >= 100:
        return f"${value:.1f}"
    else:
        return f"${value:.2f}"

async def track_wallet(wallet_address: str, on_trade: Callable[[Dict[str, Any]], None]):
    """
    Track a wallet's trades in real-time
    
    Args:
        wallet_address: The wallet address to track
        on_trade: Callback function that receives trade details
    """
    rpc_client = RPCClient()
    ws_url = f"wss://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}"
    last_signature = None
    retry_count = 0
    processed_sigs = set()  # Keep track of processed signatures
    
    while True:  # Keep trying to reconnect
        try:
            # Get initial signature
            initial_sigs = await get_signatures_for_address(rpc_client, wallet_address, 1)
            if initial_sigs:
                last_signature = initial_sigs[0]
                processed_sigs.add(last_signature)
                log_info(f"Starting tracking: {format_address(wallet_address)}")
            
            async with websockets.connect(ws_url) as websocket:
                # Subscribe to account notifications
                subscribe_msg = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "accountSubscribe",
                    "params": [
                        wallet_address,
                        {"encoding": "jsonParsed", "commitment": "finalized"}
                    ]
                }
                
                await websocket.send(json.dumps(subscribe_msg))
                response = await websocket.recv()
                log_info(f"Subscription response: {response}")
                
                while True:
                    try:
                        msg = await websocket.recv()
                        data = json.loads(msg)
                        
                        if "params" in data:
                            # Get latest transactions
                            sigs = await get_signatures_for_address(rpc_client, wallet_address, 10)
                            
                            if sigs:
                                # Process new signatures
                                new_sigs = [sig for sig in sigs if sig not in processed_sigs]
                                
                                if new_sigs:
                                    log_info(f"Found {len(new_sigs)} new transactions")
                                    
                                    for sig in new_sigs:
                                        try:
                                            tx = await rpc_client.get_transaction(sig)
                                            
                                            if tx is None:
                                                log_warning(f"Transaction {sig} not found")
                                                continue

                                            route = await parse_route(tx)
                                            
                                            if route and route['type'] in ['buy', 'sell']:
                                                log_info(f"Found {route['type']} trade in tx {sig}")
                                                
                                                # Add transaction signature and wallet group
                                                route['signature'] = sig
                                                route['wallet_group'] = wallet_address
                                                route['date_time'] = datetime.now().isoformat()
                                                
                                                # Call the trade handler
                                                if on_trade:
                                                    await on_trade(route)
                                                
                                                # Print transaction details
                                                await print_transaction(sig, route, tx.get('blockTime'))
                                            
                                        except Exception as e:
                                            log_error(f"Error processing transaction {sig}: {str(e)}")
                                            import traceback
                                            traceback.print_exc()  # Print full stack trace for debugging
                                            
                                        processed_sigs.add(sig)
                                        
                                        # Keep processed signatures list manageable
                                        if len(processed_sigs) > 1000:
                                            processed_sigs.clear()
                                            processed_sigs.add(sig)
                                
                                last_signature = sigs[0]
                                
                    except (websockets.exceptions.ConnectionClosed, 
                            websockets.exceptions.ConnectionClosedError):
                        log_warning("WebSocket connection closed, reconnecting...")
                        break
                        
                    except Exception as e:
                        log_error(f"Error in WebSocket loop: {str(e)}")
                        import traceback
                        traceback.print_exc()  # Print full stack trace for debugging
                        continue
                        
        except Exception as e:
            retry_count += 1
            wait_time = min(retry_count * 5, 30)  # Exponential backoff
            log_error(f"Connection error (retry {retry_count}): {str(e)}")
            import traceback
            traceback.print_exc()  # Print full stack trace for debugging
            await asyncio.sleep(wait_time)
            continue

async def parse_route(tx: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse transaction route and determine if it's a buy, sell, or swap
    Returns dict with html, type, value, tokenAddress, and tokenAmount
    """
    try:
        if not tx.get('meta', {}).get('innerInstructions'):
            log_debug('No inner instructions found')
            return {
                'html': '<span class="text-gray-500">No route</span>', 
                'type': None, 
                'value': 0, 
                'tokenAddress': None,
                'tokenAmount': 0,
                'amount_in_sol': 0
            }

        log_debug(f"Processing transaction balances:")
        log_debug(f"Pre balances: {json.dumps(tx.get('meta', {}).get('preTokenBalances'), indent=2)}")
        log_debug(f"Post balances: {json.dumps(tx.get('meta', {}).get('postTokenBalances'), indent=2)}")
        
        swaps = []
        pre_balances = tx.get('meta', {}).get('preTokenBalances', [])
        post_balances = tx.get('meta', {}).get('postTokenBalances', [])
        balances_by_owner = {}

        for post in post_balances:
            pre = next((p for p in pre_balances 
                       if p['accountIndex'] == post['accountIndex'] 
                       and p['mint'] == post['mint']), None)

            if pre:
                pre_amount = pre.get('uiTokenAmount', {}).get('uiAmount', 0) or 0
                post_amount = post.get('uiTokenAmount', {}).get('uiAmount', 0) or 0
                diff = post_amount - pre_amount
                owner = post.get('owner')

                if owner not in balances_by_owner:
                    balances_by_owner[owner] = []

                if abs(diff) > 0.001:
                    balances_by_owner[owner].append({
                        'mint': post['mint'],
                        'amount': abs(diff),
                        'direction': 'in' if diff > 0 else 'out'
                    })

        max_changes = 0
        main_owner = None
        for owner, owner_changes in balances_by_owner.items():
            if len(owner_changes) > max_changes:
                max_changes = len(owner_changes)
                main_owner = owner

        if not main_owner:
            log_debug('No significant changes found')
            return {
                'html': '<span class="text-gray-500">No route</span>', 
                'type': None, 
                'value': 0, 
                'tokenAddress': None,
                'tokenAmount': 0,
                'amount_in_sol': 0
            }

        main_owner_changes = balances_by_owner[main_owner]
        main_owner_changes.sort(key=lambda x: x['amount'], reverse=True)

        i = 0
        while i < len(main_owner_changes) - 1:
            current = main_owner_changes[i]
            next_change = main_owner_changes[i + 1]

            current_is_sol_or_stable = is_sol_or_stable(current['mint'])
            next_is_sol_or_stable = is_sol_or_stable(next_change['mint'])

            if current_is_sol_or_stable != next_is_sol_or_stable:
                if current['direction'] == 'out' and next_change['direction'] == 'in':
                    swaps.append({
                        'fromMint': current['mint'],
                        'toMint': next_change['mint'],
                        'fromAmount': current['amount'],
                        'toAmount': next_change['amount']
                    })
                elif current['direction'] == 'in' and next_change['direction'] == 'out':
                    swaps.append({
                        'fromMint': next_change['mint'],
                        'toMint': current['mint'],
                        'fromAmount': next_change['amount'],
                        'toAmount': current['amount']
                    })
                i += 2
            else:
                i += 1

        if not swaps:
            log_debug('No swaps found')
            return {
                'html': '<span class="text-gray-500">No route</span>', 
                'type': None, 
                'value': 0, 
                'tokenAddress': None,
                'tokenAmount': 0,
                'amount_in_sol': 0
            }

        significant_swap = max(swaps, key=lambda swap: max(swap['fromAmount'], swap['toAmount']))

        from_is_sol_or_stable = is_sol_or_stable(significant_swap['fromMint'])
        to_is_sol_or_stable = is_sol_or_stable(significant_swap['toMint'])

        trade_type = None
        route_html = None
        token_address = None
        token_amount = None
        amount_in_sol = None

        if from_is_sol_or_stable and not to_is_sol_or_stable:
            trade_type = 'sell'
            token_symbol = get_token_symbol(significant_swap['toMint'])
            route_html = f'<span class="text-green-500">{token_symbol}</span>'
            token_address = significant_swap['toMint']
            token_amount = significant_swap['toAmount']
            amount_in_sol = significant_swap['fromAmount']  # Store SOL amount
        elif not from_is_sol_or_stable and to_is_sol_or_stable:
            trade_type = 'buy'
            token_symbol = get_token_symbol(significant_swap['fromMint'])
            route_html = f'<span class="text-red-500">{token_symbol}</span>'
            token_address = significant_swap['fromMint']
            token_amount = significant_swap['fromAmount']
            amount_in_sol = significant_swap['toAmount']  # Store SOL amount

        if not trade_type or not route_html:
            log_debug('Could not classify trade type')
            return {
                'html': '<span class="text-gray-500">No route</span>', 
                'type': None, 
                'value': 0, 
                'tokenAddress': None,
                'tokenAmount': 0,
                'amount_in_sol': 0
            }

        return {
            'html': route_html,
            'type': trade_type,
            'value': 0,  # Not using this anymore
            'tokenAddress': token_address,
            'tokenAmount': token_amount,
            'amount_in_sol': amount_in_sol
        }

    except Exception as error:
        log_error(f'Error parsing route: {str(error)}')
        return {
            'html': '<span class="text-gray-500">No route</span>', 
            'type': None, 
            'value': 0, 
            'tokenAddress': None,
            'tokenAmount': 0,
            'amount_in_sol': 0
        }

async def print_transaction(signature: str, route: dict, block_time: Optional[int] = None):
    """Print transaction details in a formatted way"""
    try:
        time_str = format_time_ago(block_time) if block_time else "Unknown time"
        token_symbol = get_token_symbol(route['tokenAddress'])
        
        # Create a box around the transaction details
        print(f"\n{Fore.CYAN}{'='*50}")
        print(f"{Fore.CYAN}Transaction Details")
        print(f"{Fore.CYAN}{'='*50}{Style.RESET_ALL}")
        
        # Print each detail with proper formatting
        print(f"{Fore.WHITE}🔗 Transaction:{Style.RESET_ALL} {Fore.CYAN}{signature}{Style.RESET_ALL}")
        print(f"{Fore.WHITE}⏰ Time:{Style.RESET_ALL} {time_str}")
        
        # Color code the trade type
        type_color = Fore.GREEN if route['type'] == 'buy' else Fore.RED
        print(f"{Fore.WHITE}📊 Type:{Style.RESET_ALL} {type_color}{route['type'].upper()}{Style.RESET_ALL}")
        
        print(f"{Fore.WHITE}🪙 Token:{Style.RESET_ALL} {Fore.YELLOW}{token_symbol}{Style.RESET_ALL}")
        print(f"{Fore.WHITE}💵 Value:{Style.RESET_ALL} ${route['amount_in_sol']:.2f}")
        print(f"{Fore.WHITE}📈 Amount:{Style.RESET_ALL} {route['tokenAmount']:.6f}")
        
        # Add bottom border
        print(f"{Fore.CYAN}{'='*50}{Style.RESET_ALL}")
        
        # Print transaction URL
        print(f"{Fore.WHITE}🔍 View on Solscan:{Style.RESET_ALL} {Fore.BLUE}https://solscan.io/tx/{signature}{Style.RESET_ALL}\n")
        
    except Exception as e:
        log_error(f"Error printing transaction: {str(e)}")

from get_sell_percentage import analyze_token_transfer

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--wallet', type=str, required=True)
    args = parser.parse_args()
    
    log_info("\nWallet Tracking Bot")
    log_info("=====================")
    
    # Initialize tracking manager
    from tracking_manager import TrackingManager
    tracking_manager = TrackingManager()
    
    async def handle_trade(trade):
        """Handle new trade by logging it to tracked_trades.json"""
        try:
            # Load existing trades
            trades = {}
            if os.path.exists(r'C:\Users\yunge\Desktop\backupsnipe\Core\ui\src\data\tracked_trades.json'):
                with open(r'C:\Users\yunge\Desktop\backupsnipe\Core\ui\src\data\tracked_trades.json', 'r') as f:
                    trades = json.load(f)
            
            # Get next trade ID
            trade_id = f"tracked_trade_{len(trades) + 1}"
            
            # Find any active trades for this token
            active_trade = None
            for t_id, t in trades.items():
                if t['token_address'] == trade['tokenAddress'] and t['status'] == 'active':
                    active_trade = t
                    break
            
            # Handle trade based on type
            if trade['type'] == 'buy':
                # Start tracking new trade
                trade_data = {
                    "id": trade_id,
                    "date_time": datetime.now().isoformat(),
                    "token_address": trade['tokenAddress'],
                    "buy_price": trade.get('buy_price', 0),
                    "close_price": None,
                    "current_price": trade.get('current_price', 0),
                    "profit_percentage": 0.0,
                    "status": "active",
                    "result": "success",
                    "transaction_link": f"https://solscan.io/tx/{trade['signature']}",
                    "amount_in_sol": trade.get('amount_in_sol', 0),
                    "token_amount": trade.get('tokenAmount', 0),
                    "wallet_group": trade.get('wallet_group'),
                    "type": trade['type'],
                    "sell_percentage": 0.0
                }
                trades[trade_id] = trade_data
                log_success(f"Started tracking new trade: {trade_id}")
                
            elif trade['type'] == 'sell':
                sell_percentage = analyze_token_transfer(
                    trade['signature'],
                    args.wallet,
                    trade['tokenAddress']
                )
                log_info(f"Calculated sell percentage: {sell_percentage}%")
                
                # If we have an active trade for this token, close it
                if active_trade:
                    active_trade['status'] = 'closed'
                    active_trade['close_price'] = trade.get('current_price', 0)
                    active_trade['sell_percentage'] = sell_percentage
                    
                    # Calculate profit percentage if we have buy and sell prices
                    if active_trade['buy_price'] and active_trade['close_price']:
                        profit_percentage = ((active_trade['close_price'] - active_trade['buy_price']) / active_trade['buy_price']) * 100
                        active_trade['profit_percentage'] = profit_percentage
                    
                    log_success(f"Closed trade {active_trade['id']} with {sell_percentage}% sold and {active_trade.get('profit_percentage', 0)}% profit")
                
                # Record the sell transaction
                trade_data = {
                    "id": trade_id,
                    "date_time": datetime.now().isoformat(),
                    "token_address": trade['tokenAddress'],
                    "buy_price": active_trade['buy_price'] if active_trade else 0,
                    "close_price": trade.get('current_price', 0),
                    "current_price": trade.get('current_price', 0),
                    "profit_percentage": active_trade.get('profit_percentage', 0) if active_trade else 0,
                    "status": "untracked",  # Mark sell transactions as untracked
                    "result": "success",
                    "transaction_link": f"https://solscan.io/tx/{trade['signature']}",
                    "amount_in_sol": trade.get('amount_in_sol', 0),
                    "token_amount": trade.get('tokenAmount', 0),
                    "wallet_group": trade.get('wallet_group'),
                    "type": trade['type'],
                    "sell_percentage": sell_percentage
                }
                trades[trade_id] = trade_data
                
            # Save updated trades
            with open(r'C:\Users\yunge\Desktop\backupsnipe\Core\ui\src\data\tracked_trades.json', 'w') as f:
                json.dump(trades, f, indent=2)
                
        except Exception as e:
            log_error(f"Error logging trade: {str(e)}")
    
    await track_wallet(args.wallet, handle_trade)

if __name__ == "__main__":
    asyncio.run(main())
