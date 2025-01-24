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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
RPC_URL = "https://mainnet.helius-rpc.com/?api-key=10fc4931-f192-4403-ab41-808bf0b80a67"
PRIVATE_KEY = "4R6ksvPGmUhDb261ikzKD6yoU2bKeMdTSpXceMzK6WNAFVFNJbfzirwBAJb6mhL45JdPp4dCEXNpFwqg6EKKm3Ew"

class TokenSwapper:
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
                token_address,  # Input token (token we're selling)
                sol_mint,       # Output token (SOL)
                amount_in_smallest_unit,  # Amount in token's smallest unit
                token_decimals  # Token decimals
            )
            
            logger.info(f"Jupiter API result: {result}")
            return result
            
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
