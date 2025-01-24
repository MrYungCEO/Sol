import asyncio
import logging
import base58
from solana.rpc.api import Client
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solana.rpc.types import TokenAccountOpts
from jupiter import Jupiter
import traceback
import json
import os
from datetime import datetime
from Backend.price import get_token_price

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
RPC_URL = "https://mainnet.helius-rpc.com/?api-key=10fc4931-f192-4403-ab41-808bf0b80a67"
PRIVATE_KEY = "4R6ksvPGmUhDb261ikzKD6yoU2bKeMdTSpXceMzK6WNAFVFNJbfzirwBAJb6mhL45JdPp4dCEXNpFwqg6EKKm3Ew"
TRADES_FILE = "C:/Users/yunge/Desktop/CopyTraderPro/Backend/data/trades.json"
TRACKED_TRADES_FILE = "C:/Users/yunge/Desktop/CopyTraderPro/Backend/data/tracked_trades.json"
SOLANA_TRACKER_API_KEY = "8d88754c-64e7-4482-b293-28b4f3579f5c"

class TokenSwapper:
    def __init__(self):
        # Initialize Solana client and keypair
        private_key_bytes = base58.b58decode(PRIVATE_KEY)
        self.keypair = Keypair.from_bytes(private_key_bytes)
        self.client = Client(RPC_URL)
        self.async_client = AsyncClient(RPC_URL)
        self.jupiter = Jupiter()

    async def log_trade(self, token_address: str, amount_in_sol: float, txid: str, token_price: float, token_amount: float = None, status: str = "closed", result: str = "success"):
        """Log trade details to JSON file"""
        try:
            # Create trades directory if it doesn't exist
            os.makedirs(os.path.dirname(TRADES_FILE), exist_ok=True)
            
            # Load existing trades
            trades = []
            max_id = 0
            if os.path.exists(TRADES_FILE):
                try:
                    with open(TRADES_FILE, 'r') as f:
                        trades = json.load(f)
                        # Find max ID from existing trades
                        if trades:
                            max_id = max(trade.get('id', 0) for trade in trades)
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON in trades file, starting fresh")
                except Exception as e:
                    logger.error(f"Error reading trades file: {str(e)}")
                    trades = []
            
            # Create new trade entry
            trade = {
                "id": max_id + 1,
                "date_time": datetime.utcnow().isoformat(),
                "token_address": token_address,
                "buy_price": None,  # This is a sell trade
                "close_price": token_price,
                "current_price": token_price,
                "profit": 0.0,  # Calculate if we have buy price
                "profit_percentage": 0.0,  # Calculate if we have buy price
                "status": status,
                "result": result,
                "transaction_link": f"https://solscan.io/tx/{txid}" if txid else "",
                "amount_in_sol": amount_in_sol,
                "token_amount": token_amount if token_amount is not None else 0.0,
                "wallet_group": None
            }
            
            # If this is a sell, try to find and update the corresponding buy trade
            if status == "closed":
                for existing_trade in trades:
                    if (existing_trade.get('token_address') == token_address and 
                        existing_trade.get('status') == 'active'):
                        # Update the existing trade
                        existing_trade['status'] = 'closed'
                        existing_trade['close_price'] = token_price
                        existing_trade['current_price'] = token_price
                        if existing_trade.get('buy_price'):
                            buy_price = existing_trade['buy_price']
                            profit = (token_price - buy_price) * amount_in_sol
                            profit_percentage = ((token_price - buy_price) / buy_price) * 100 if buy_price > 0 else 0
                            existing_trade['profit'] = profit
                            existing_trade['profit_percentage'] = profit_percentage
                        break
            
            # Add new trade to trades list
            trades.append(trade)
            
            # Save updated trades
            try:
                with open(TRADES_FILE, 'w') as f:
                    json.dump(trades, f, indent=4)
                logger.info(f"Trade logged successfully: {trade}")
            except Exception as e:
                logger.error(f"Error writing trades file: {str(e)}")
                raise
            
        except Exception as e:
            logger.error(f"Error saving trade: {str(e)}")
            raise

    async def update_tracked_trade(self, token_address: str, amount_in_sol: float, txid: str, token_price: float, token_amount: float = None):
        """Update tracked trade when selling"""
        try:
            if not os.path.exists(TRACKED_TRADES_FILE):
                logger.warning("No tracked trades file found")
                return
                
            try:
                with open(TRACKED_TRADES_FILE, 'r') as f:
                    tracked_trades = json.load(f)
            except json.JSONDecodeError:
                logger.error("Invalid JSON in tracked trades file")
                return
            except Exception as e:
                logger.error(f"Error reading tracked trades file: {str(e)}")
                return
                
            # Find matching active trade
            for trade_id, trade in tracked_trades.items():
                if (trade.get('token_address') == token_address and 
                    trade.get('status') == 'active'):
                    # Update the trade
                    trade['status'] = 'closed'
                    trade['close_price'] = token_price
                    trade['current_price'] = token_price
                    
                    # Calculate profit
                    if trade.get('buy_price'):
                        buy_price = trade['buy_price']
                        profit = (token_price - buy_price) * amount_in_sol
                        profit_percentage = ((token_price - buy_price) / buy_price) * 100 if buy_price > 0 else 0
                        trade['profit_percentage'] = profit_percentage
                    
                    # Save changes
                    try:
                        with open(TRACKED_TRADES_FILE, 'w') as f:
                            json.dump(tracked_trades, f, indent=4)
                        logger.info(f"Updated tracked trade: {trade}")
                    except Exception as e:
                        logger.error(f"Error writing tracked trades file: {str(e)}")
                    break
            
        except Exception as e:
            logger.error(f"Error updating tracked trade: {str(e)}")

    async def get_wallet_balance(self):
        """Get the SOL balance of the wallet"""
        try:
            pubkey = self.keypair.pubkey()
            response = await self.async_client.get_balance(pubkey)
            sol_balance = response.value / 1e9
            return sol_balance
        except Exception as e:
            logger.error(f"Error getting balance: {str(e)}")
            return None

    async def buy_token(self, token_address: str, amount_in_sol: float):
        """
        Buy a token using SOL
        
        Args:
            token_address: The Solana address of the token to buy
            amount_in_sol: Amount of SOL to spend
        """
        try:
            # SOL mint address
            sol_mint = "So11111111111111111111111111111111111111112"
            
            logger.info(f"Initiating buy order for {amount_in_sol} SOL worth of token {token_address}")
            logger.info(f"Using wallet: {self.keypair.pubkey()}")
            
            # Convert SOL to lamports (1 SOL = 1e9 lamports)
            amount_in_lamports = int(amount_in_sol * 1e9)
            logger.info(f"Amount in lamports: {amount_in_lamports}")
            
            # Place the buy order using Jupiter
            logger.info("Calling Jupiter API...")
            result = await self.jupiter.place_order(
                self.keypair,
                sol_mint,  # Input token (SOL)
                token_address,  # Output token
                amount_in_lamports,  # Use lamports instead of SOL
                9  # SOL decimals
            )
            
            logger.info(f"Jupiter API result: {result}")
            
            if result and result.get('success') and result.get('txid'):
                # Construct Solscan URL
                solscan_url = f"https://solscan.io/tx/{result['txid']}"
                return solscan_url
            elif result and result.get('error'):
                raise Exception(result['error'])
            else:
                raise Exception("Failed to get transaction result")
                
        except Exception as e:
            error_msg = f"Error placing buy order: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            raise Exception(error_msg)

    async def get_token_decimals(self, token_address: str) -> int:
        """Get the number of decimals for a token"""
        try:
            response = await self.async_client.get_account_info(Pubkey.from_string(token_address))
            if response.value:
                # Most tokens use 6 or 9 decimals
                return 6  # Default to 6 for now
            return 6
        except Exception as e:
            logger.error(f"Error getting token decimals: {str(e)}")
            return 6

    async def get_token_account(self, token_address: str) -> str:
        """Get or create the associated token account for a token"""
        try:
            # Convert token address to Pubkey
            token_mint = Pubkey.from_string(token_address)
            logger.info(f"Getting token account for mint: {token_mint}")

            # Get all token accounts owned by the user
            opts = TokenAccountOpts(program_id=Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"))
            response = await self.async_client.get_token_accounts_by_owner(
                self.keypair.pubkey(),
                opts
            )
            
            # Look for the account that matches our mint
            if response.value:
                for account in response.value:
                    try:
                        # Parse the account data
                        data = account.account.data
                        # Token mint is stored in the first 32 bytes
                        mint_bytes = data[:32]
                        mint_address = str(Pubkey.from_bytes(mint_bytes))
                        
                        if mint_address == token_address:
                            logger.info(f"Found token account: {account.pubkey}")
                            return str(account.pubkey)
                    except Exception as e:
                        logger.error(f"Error parsing account data: {e}")
                        continue
            
            logger.info(f"No token account found for {token_address}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting token account: {str(e)}\n{traceback.format_exc()}")
            return None

    async def get_token_balance(self, token_address: str) -> int:
        """Get the token balance for a specific token"""
        try:
            # Get all token accounts owned by the user
            opts = TokenAccountOpts(program_id=Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"))
            response = await self.async_client.get_token_accounts_by_owner(
                self.keypair.pubkey(),
                opts
            )
            
            # Look for the account that matches our mint and get its balance
            if response.value:
                for account in response.value:
                    try:
                        # Parse the account data
                        data = account.account.data
                        # Token mint is stored in the first 32 bytes
                        mint_bytes = data[:32]
                        mint_address = str(Pubkey.from_bytes(mint_bytes))
                        
                        if mint_address == token_address:
                            # Token amount is stored at offset 64 for 8 bytes
                            amount_bytes = data[64:72]
                            amount = int.from_bytes(amount_bytes, 'little')
                            # Return raw amount, don't divide by decimals
                            logger.info(f"Found token balance: {amount} for mint {token_address}")
                            return amount
                    except Exception as e:
                        logger.error(f"Error parsing account data: {e}")
                        continue
            
            logger.info(f"No token account found for {token_address}")
            return 0
        except Exception as e:
            logger.error(f"Error getting token balance: {str(e)}\n{traceback.format_exc()}")
            return 0

    async def sell_token(self, token_address: str, amount: float):
        """
        Sell a token for SOL
        
        Args:
            token_address: The Solana address of the token to sell
            amount: Amount of tokens to sell
        """
        try:
            # Get token price before selling
            token_price = get_token_price(token_address, SOLANA_TRACKER_API_KEY)
            if token_price is None:
                logger.warning(f"Could not get price for token {token_address}")
                token_price = 0.0

            # SOL mint address
            sol_mint = "So11111111111111111111111111111111111111112"
            
            logger.info(f"Initiating sell order for {amount} tokens of {token_address}")
            logger.info(f"Using wallet: {self.keypair.pubkey()}")
            
            # Get token balance and decimals
            token_balance = await self.get_token_balance(token_address)
            if token_balance <= 0:
                return {
                    'success': False,
                    'error': 'No token balance available'
                }

            token_decimals = await self.get_token_decimals(token_address)
            
            # Since get_token_balance now returns raw amount, no need to multiply
            amount_in_smallest_unit = int(amount)

            # Place the sell order using Jupiter
            logger.info("Calling Jupiter API...")
            result = await self.jupiter.place_order(
                self.keypair,
                token_address,  # Input token
                sol_mint,  # Output token (SOL)
                amount_in_smallest_unit,
                token_decimals
            )
            
            if result.get('txid'):
                # Always show the transaction URL, even if there was an error
                solscan_url = f"https://solscan.io/tx/{result['txid']}"
                logger.info(f"Transaction URL: {solscan_url}")
                
                # Update tracked trade if successful
                if result.get('success'):
                    await self.update_tracked_trade(
                        token_address=token_address,
                        amount_in_sol=amount / (10 ** token_decimals),  # Convert to SOL
                        txid=result['txid'],
                        token_price=token_price,
                        token_amount=amount
                    )
                
                # Log the trade
                status = "closed" if result.get('success') else "failed"
                await self.log_trade(
                    token_address=token_address,
                    amount_in_sol=amount / (10 ** token_decimals),  # Convert to SOL
                    txid=result['txid'],
                    token_price=token_price,
                    token_amount=amount,
                    status=status,
                    result="success" if result.get('success') else "failed"
                )
                
                if result.get('success'):
                    logger.info(f"Transaction {result.get('status', 'succeeded')}")
                    return {
                        'success': True,
                        'txid': result['txid'],
                        'status': result.get('status', 'succeeded')
                    }
                else:
                    error_msg = result.get('error', 'Unknown error')
                    logger.error(f"Transaction failed: {error_msg}")
                    return {
                        'success': False,
                        'error': error_msg,
                        'txid': result['txid']
                    }
            elif result.get('error'):
                error_msg = result.get('error')
                logger.error(f"Error: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg
                }
            else:
                return {
                    'success': False,
                    'error': "Failed to get transaction result"
                }
                
        except Exception as e:
            error_msg = f"Error placing sell order: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }

async def main():
    # Example usage
    swapper = TokenSwapper()
    
    # Check wallet balance
    balance = await swapper.get_wallet_balance()
    logger.info(f"Current wallet balance: {balance} SOL")
    
    # Example: Buy BONK token
    # BONK token address on Solana
    bonk_address = "wGwKJFjqNpTkcG9W87ghidPD6zJ9gRnnHDtHSPNpump"
    
    # Amount of SOL to spend (e.g., 0.1 SOL)
    amount_sol = 0.001
    
    if balance and balance > amount_sol:
        result = await swapper.buy_token(bonk_address, amount_sol)
        if result:
            logger.info("Buy order placed successfully!")
            logger.info(f"Transaction result: {result}")
    else:
        logger.error("Insufficient balance for the trade")

if __name__ == "__main__":
    asyncio.run(main())
