import asyncio
import logging
import base58
from solana.rpc.api import Client
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solana.rpc.types import TokenAccountOpts
from Backend.jupiter import Jupiter
import traceback
import argparse
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
SOLANA_TRACKER_API_KEY = "8d88754c-64e7-4482-b293-28b4f3579f5c"

class TokenBuyer:
    def __init__(self):
        # Initialize Solana client and keypair
        private_key_bytes = base58.b58decode(PRIVATE_KEY)
        self.keypair = Keypair.from_bytes(private_key_bytes)
        self.client = Client(RPC_URL)
        self.async_client = AsyncClient(RPC_URL)
        self.jupiter = Jupiter()

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

    async def log_trade(self, token_address: str, amount_in_sol: float, txid: str, token_price: float, token_amount: float = None, status: str = "active", result: str = "success"):
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
                "buy_price": token_price,
                "close_price": None,
                "current_price": token_price,
                "profit": 0.0,
                "profit_percentage": 0.0,
                "status": status,
                "result": result,
                "transaction_link": f"https://solscan.io/tx/{txid}" if txid else "",
                "amount_in_sol": amount_in_sol,
                "token_amount": token_amount if token_amount is not None else 0.0,
                "wallet_group": None
            }
            
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

    async def buy_token(self, amount_in_sol: float, token_address: str):
        """
        Buy token using SOL
        
        Args:
            amount_in_sol: Amount of SOL to spend
            token_address: Token address to buy
        """
        try:
            # Get token price before purchase
            token_price = get_token_price(token_address, SOLANA_TRACKER_API_KEY)
            if token_price is None:
                logger.warning(f"Could not get price for token {token_address}")
                token_price = 0.0
            
            # Get initial token balance
            initial_balance = await self.get_token_balance(token_address)
            
            # SOL mint address
            sol_mint = "So11111111111111111111111111111111111111112"
            
            logger.info(f"Initiating buy order for {amount_in_sol} SOL worth of {token_address}")
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
            
            if result.get('txid'):
                # Always show the transaction URL, even if there was an error
                solscan_url = f"https://solscan.io/tx/{result['txid']}"
                logger.info(f"Transaction URL: {solscan_url}")
                
                # Get final token balance to calculate token amount
                final_balance = await self.get_token_balance(token_address)
                token_amount = final_balance - initial_balance
                
                # Log the trade with appropriate status
                status = "active" if result.get('success') else "failed"
                await self.log_trade(
                    token_address, 
                    amount_in_sol, 
                    result['txid'], 
                    token_price, 
                    token_amount,
                    status=status,
                    result=result.get('status', 'failed')
                )
                
                if result.get('success'):
                    logger.info(f"Transaction {result.get('status', 'succeeded')}")
                    return solscan_url
                else:
                    error_msg = result.get('error', 'Unknown error')
                    logger.error(f"Transaction failed: {error_msg}")
                    raise Exception(f"Transaction failed: {error_msg}")
            elif result.get('error'):
                error_msg = result.get('error')
                # Log failed trade
                await self.log_trade(
                    token_address, 
                    amount_in_sol, 
                    "", 
                    token_price, 
                    0,
                    status="failed",
                    result="error"
                )
                logger.error(f"Error: {error_msg}")
                raise Exception(error_msg)
            else:
                await self.log_trade(
                    token_address, 
                    amount_in_sol, 
                    "", 
                    token_price, 
                    0,
                    status="failed",
                    result="unknown"
                )
                raise Exception("Failed to get transaction result")
                
        except Exception as e:
            error_msg = f"Error placing buy order: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            # Log error trade
            try:
                await self.log_trade(
                    token_address, 
                    amount_in_sol, 
                    "", 
                    token_price if 'token_price' in locals() else 0.0, 
                    0,
                    status="failed",
                    result="error"
                )
            except:
                pass
            raise Exception(error_msg)

    async def get_token_balance(self, token_address: str) -> int:
        """Get the token balance for the wallet"""
        try:
            # Get all token accounts owned by the user
            opts = TokenAccountOpts(program_id=Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"))
            response = await self.async_client.get_token_accounts_by_owner(
                self.keypair.pubkey(),
                opts
            )
            
            # Look for the token account and get its balance
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
                            # Most tokens use 6 or 9 decimals, we'll get the exact value later if needed
                            token_amount = amount / 1e6
                            logger.info(f"Found {token_address} balance: {token_amount}")
                            return token_amount
                    except Exception as e:
                        logger.error(f"Error parsing account data: {e}")
                        continue
            
            logger.info(f"No {token_address} account found")
            return 0
        except Exception as e:
            logger.error(f"Error getting {token_address} balance: {str(e)}\n{traceback.format_exc()}")
            return 0

async def main():
    """Main function to test token buying"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Buy tokens using SOL')
    parser.add_argument('--token', type=str, required=True, help='Token address to buy')
    parser.add_argument('--amount', type=float, default=0.05, help='Amount of SOL to spend (default: 0.05)')
    args = parser.parse_args()
    
    buyer = TokenBuyer()
    
    # Get initial balances
    sol_balance = await buyer.get_wallet_balance()
    token_balance = await buyer.get_token_balance(args.token)
    
    logger.info(f"Initial SOL balance: {sol_balance}")
    logger.info(f"Initial token balance: {token_balance}")
    
    # Buy token with specified amount
    try:
        result = await buyer.buy_token(args.amount, args.token)
        logger.info(f"Buy transaction URL: {result}")
        
        # Get final balances
        final_sol = await buyer.get_wallet_balance()
        final_token = await buyer.get_token_balance(args.token)
        
        logger.info(f"Final SOL balance: {final_sol}")
        logger.info(f"Final token balance: {final_token}")

    except Exception as e:
        logger.error(f"Error during test: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
