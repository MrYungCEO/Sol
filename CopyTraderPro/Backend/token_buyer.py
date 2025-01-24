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
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from Backend.price import get_token_price

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
RPC_URL = os.getenv('SOLANA_RPC_URL', 'https://api.mainnet-beta.solana.com')
PRIVATE_KEY = os.getenv('WALLET_PRIVATE_KEY')
USDC_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
TRACKED_TRADES_FILE = "C:/Users/yunge/Desktop/CopyTraderPro/Backend/data/tracked_trades.json"
SOLANA_TRACKER_API_KEY = "8d88754c-64e7-4482-b293-28b4f3579f5c"

class TokenBuyer:
    """Class for buying tokens using Jupiter API"""
    
    def __init__(self):
        """Initialize token buyer"""
        try:
            # Get private key from environment variable
            private_key = os.getenv("WALLET_PRIVATE_KEY")
            if not private_key:
                raise ValueError("WALLET_PRIVATE_KEY not found in environment variables")
                
            # Initialize keypair
            private_key_bytes = base58.b58decode(private_key)
            self.keypair = Keypair.from_bytes(private_key_bytes)
            
            # Initialize Jupiter client
            self.jupiter = Jupiter(self.keypair)
            
            logger.info(f"TokenBuyer initialized with wallet: {self.keypair.pubkey()}")
            
        except Exception as e:
            error_msg = f"Error initializing TokenBuyer: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            raise Exception(error_msg)

    async def log_tracked_trade(self, token_address: str, amount_in_sol: float, txid: str, token_amount: float = None, status: str = "active", result: str = "success"):
        """Log tracked trade details to JSON file"""
        try:
            # Create trades directory if it doesn't exist
            os.makedirs(os.path.dirname(TRACKED_TRADES_FILE), exist_ok=True)
            
            # Load existing trades
            tracked_trades = {}
            if os.path.exists(TRACKED_TRADES_FILE):
                try:
                    with open(TRACKED_TRADES_FILE, 'r') as f:
                        tracked_trades = json.load(f)
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON in tracked trades file, starting fresh")
                except Exception as e:
                    logger.error(f"Error reading tracked trades file: {str(e)}")
                    tracked_trades = {}
            
            # Get token price
            token_price = get_token_price(token_address, SOLANA_TRACKER_API_KEY)
            if token_price is None:
                logger.warning(f"Could not get price for token {token_address}")
                token_price = 0.0

            # Generate new trade ID
            trade_id = f"tracked_trade_{len(tracked_trades) + 1}"
            
            # Create new trade entry
            trade = {
                "id": trade_id,
                "date_time": datetime.utcnow().isoformat(),
                "token_address": token_address,
                "buy_price": token_price,
                "close_price": None,
                "current_price": token_price,
                "profit_percentage": 0.0,
                "status": status,
                "result": result,
                "transaction_link": f"https://solscan.io/tx/{txid}" if txid else "",
                "amount_in_sol": amount_in_sol,
                "token_amount": token_amount if token_amount is not None else 0.0,
                "wallet_group": None,
                "type": "buy",
                "sell_percentage": 0.0
            }
            
            # Add new trade to tracked trades
            tracked_trades[trade_id] = trade
            
            # Save updated trades
            try:
                with open(TRACKED_TRADES_FILE, 'w') as f:
                    json.dump(tracked_trades, f, indent=4)
                logger.info(f"Tracked trade logged successfully: {trade}")
            except Exception as e:
                logger.error(f"Error writing tracked trades file: {str(e)}")
                raise
            
            return trade_id
            
        except Exception as e:
            logger.error(f"Error saving tracked trade: {str(e)}")
            raise

    async def buy_token(self, token_address: str, amount_in_sol: float):
        """
        Buy token using SOL
        
        Args:
            token_address: Token address to buy
            amount_in_sol: Amount of SOL to spend
        """
        try:
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
                
                # Get token amount from transaction
                token_amount = result.get('output_amount', 0)
                
                # Log tracked trade
                status = "active" if result.get('success') else "failed"
                await self.log_tracked_trade(
                    token_address=token_address,
                    amount_in_sol=amount_in_sol,
                    txid=result['txid'],
                    token_amount=token_amount,
                    status=status,
                    result="success" if result.get('success') else "failed"
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
                logger.error(f"Error: {error_msg}")
                raise Exception(error_msg)
            else:
                raise Exception("Failed to get transaction result")
                
        except Exception as e:
            error_msg = f"Error placing buy order: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            raise Exception(error_msg)

    async def get_wallet_balance(self):
        """Get the SOL balance of the wallet"""
        try:
            pubkey = self.keypair.pubkey()
            async_client = AsyncClient(RPC_URL)
            response = await async_client.get_balance(pubkey)
            sol_balance = response.value / 1e9
            return sol_balance
        except Exception as e:
            logger.error(f"Error getting balance: {str(e)}")
            return None

    async def get_usdc_balance(self) -> int:
        """Get the USDC balance for the wallet"""
        try:
            # Get all token accounts owned by the user
            opts = TokenAccountOpts(program_id=Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"))
            async_client = AsyncClient(RPC_URL)
            response = await async_client.get_token_accounts_by_owner(
                self.keypair.pubkey(),
                opts
            )
            
            # Look for the USDC account and get its balance
            if response.value:
                for account in response.value:
                    try:
                        # Parse the account data
                        data = account.account.data
                        # Token mint is stored in the first 32 bytes
                        mint_bytes = data[:32]
                        mint_address = str(Pubkey.from_bytes(mint_bytes))
                        
                        if mint_address == USDC_ADDRESS:
                            # Token amount is stored at offset 64 for 8 bytes
                            amount_bytes = data[64:72]
                            amount = int.from_bytes(amount_bytes, 'little')
                            # USDC has 6 decimals
                            usdc_amount = amount / 1e6
                            logger.info(f"Found USDC balance: {usdc_amount}")
                            return usdc_amount
                    except Exception as e:
                        logger.error(f"Error parsing account data: {e}")
                        continue
            
            logger.info("No USDC account found")
            return 0
        except Exception as e:
            logger.error(f"Error getting USDC balance: {str(e)}\n{traceback.format_exc()}")
            return 0

async def main():
    """Main function to test USDC buying"""
    buyer = TokenBuyer()
    
    # Get initial balances
    sol_balance = await buyer.get_wallet_balance()
    usdc_balance = await buyer.get_usdc_balance()
    
    logger.info(f"Initial SOL balance: {sol_balance}")
    logger.info(f"Initial USDC balance: {usdc_balance}")
    
    # Test buying USDC with 0.05 SOL (smaller amount)
    try:
        result = await buyer.buy_token(USDC_ADDRESS, 0.05)
        logger.info(f"Buy transaction URL: {result}")
        
        # Get final balances
        final_sol = await buyer.get_wallet_balance()
        final_usdc = await buyer.get_usdc_balance()
        
        logger.info(f"Final SOL balance: {final_sol}")
        logger.info(f"Final USDC balance: {final_usdc}")
        
    except Exception as e:
        logger.error(f"Error during test: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
