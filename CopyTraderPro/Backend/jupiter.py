import os
import json
import logging
import aiohttp
import base64
from dotenv import load_dotenv
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import VersionedTransaction
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from solana.rpc.types import TxOpts
import asyncio
import traceback

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class JupiterError:
    ERROR_CODES = {
        6000: "Empty route",
        6001: "Slippage tolerance exceeded",
        6002: "Invalid calculation",
        6003: "Missing platform fee account",
        6004: "Invalid slippage",
        6005: "Not enough percent to 100",
        6006: "Token input index is invalid",
        6007: "Token output index is invalid",
        6008: "Not Enough Account keys",
        6009: "Non zero minimum out amount not supported",
        6010: "Invalid route plan",
        6011: "Invalid referral authority",
        6012: "Token account doesn't match the ledger",
        6013: "Invalid token ledger",
        6014: "Token program ID is invalid",
        6015: "Token program not provided",
        6016: "Swap not supported",
        6017: "Exact out amount doesn't match",
    }

    @staticmethod
    def get_error_message(error_data):
        if isinstance(error_data, dict):
            if "InstructionError" in error_data:
                instruction_error = error_data["InstructionError"]
                if isinstance(instruction_error, list) and len(instruction_error) > 1:
                    if (
                        isinstance(instruction_error[1], dict)
                        and "Custom" in instruction_error[1]
                    ):
                        error_code = instruction_error[1]["Custom"]
                        return JupiterError.ERROR_CODES.get(
                            error_code, f"Unknown error code: {error_code}"
                        )
        return "Unknown error format"


class Jupiter:
    """Jupiter API wrapper"""
    
    def __init__(self):
        """Initialize Jupiter client"""
        self.base_url = "https://quote-api.jup.ag/v6"
        self.api_key = os.getenv("JUPITER_API_KEY")
        if not self.api_key:
            logger.warning("JUPITER_API_KEY not found in environment variables")
            
    async def check_sol_balance(self, pubkey: Pubkey) -> float:
        """Check SOL balance for transaction fees"""
        try:
            client = AsyncClient(os.getenv("SOLANA_RPC_URL"))
            response = await client.get_balance(pubkey)
            return response.value / 1e9  # Convert lamports to SOL
        except Exception as e:
            logger.error(f"Error checking SOL balance: {str(e)}")
            return 0
        finally:
            await client.close()

    async def place_order(self, keypair, input_mint: str, output_mint: str, amount: int, input_decimals: int):
        """
        Place an order using Jupiter API
        
        Args:
            keypair: Solana keypair for signing transactions
            input_mint: Input token mint address
            output_mint: Output token mint address 
            amount: Amount in lamports
            input_decimals: Number of decimals for input token
        """
        client = None
        try:
            # Check if we have enough SOL for fees (at least 0.01 SOL)
            sol_balance = await self.check_sol_balance(keypair.pubkey())
            if sol_balance < 0.01:
                return {
                    'success': False,
                    'error': f'Insufficient SOL balance for fees. Current balance: {sol_balance} SOL'
                }

            # Get quote
            quote_url = f"{self.base_url}/quote"
            
            # Ensure amount is properly formatted
            if amount <= 0:
                return {"error": "Amount must be greater than 0"}
                
            quote_params = {
                "inputMint": input_mint,
                "outputMint": output_mint,
                "amount": str(amount),
                "slippageBps": "50",  
                "onlyDirectRoutes": "false",
                "asLegacyTransaction": "false",
                "platformFeeBps": "0",
                "useSharedAccounts": "true",
                "swapMode": "ExactIn"
            }
            
            logger.info(f"Getting quote from Jupiter API: {quote_url} with params: {quote_params}")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(quote_url, params=quote_params) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Error getting quote: {error_text}")
                        return {"error": f"Failed to get quote: {error_text}"}
                    
                    quote = await response.json()
                    logger.info(f"Got quote response: {json.dumps(quote, indent=2)}")
                    
                    if not quote:
                        return {"error": "No quote available"}
                    
                    # Get swap transaction
                    swap_url = f"{self.base_url}/swap"
                    swap_data = {
                        "quoteResponse": quote,
                        "userPublicKey": str(keypair.pubkey()),
                        "wrapUnwrapSOL": True,
                        "useSharedAccounts": True,
                        "feeAccount": None,
                        "computeUnitPriceMicroLamports": None,
                        "asLegacyTransaction": False
                    }
                    
                    logger.info(f"Requesting swap transaction from: {swap_url}")
                    logger.info(f"Swap request data: {json.dumps(swap_data, indent=2)}")
                    
                    headers = {
                        "Content-Type": "application/json"
                    }
                    
                    async with session.post(swap_url, json=swap_data, headers=headers) as swap_response:
                        if swap_response.status != 200:
                            error_text = await swap_response.text()
                            logger.error(f"Error getting swap transaction: {error_text}")
                            return {"error": f"Failed to get swap transaction: {error_text}"}
                        
                        swap_result = await swap_response.json()
                        logger.info(f"Got swap transaction response: {json.dumps(swap_result, indent=2)}")
                        
                        if not swap_result or not swap_result.get('swapTransaction'):
                            return {"error": "No swap transaction in response"}
                        
                        # Submit the transaction
                        client = AsyncClient(os.getenv("SOLANA_RPC_URL"))
                        
                        try:
                            # Decode and sign transaction
                            tx_bytes = base64.b64decode(swap_result['swapTransaction'])
                            tx = VersionedTransaction.from_bytes(tx_bytes)
                            signed_tx = VersionedTransaction(tx.message, [keypair])
                            
                            # Send transaction
                            opts = TxOpts(
                                skip_preflight=True,  
                                preflight_commitment=None,  
                                max_retries=10  
                            )
                            
                            logger.info("Sending transaction...")
                            try:
                                result = await client.send_transaction(signed_tx, opts=opts)
                            except Exception as e:
                                error_msg = str(e)
                                if "insufficient funds" in error_msg.lower():
                                    return {
                                        'success': False,
                                        'error': 'Insufficient funds for transaction'
                                    }
                                elif "blockhash not found" in error_msg.lower():
                                    return {
                                        'success': False,
                                        'error': 'Transaction expired - blockhash not found'
                                    }
                                else:
                                    return {
                                        'success': False,
                                        'error': f'Transaction failed: {error_msg}'
                                    }
                            
                            if not result.value:
                                return {
                                    'success': False,
                                    'error': 'No transaction signature returned'
                                }
                            
                            logger.info(f"Transaction sent with signature: {result.value}")
                            logger.info(f"View transaction: https://solscan.io/tx/{result.value}")
                            
                            # Wait for confirmation with increased retries and delay
                            logger.info("Waiting for transaction confirmation...")
                            confirmation_result = await self.wait_for_confirmation(result.value)
                            
                            if confirmation_result['success']:
                                return {
                                    'success': True,
                                    'txid': result.value,
                                    'status': confirmation_result['status']
                                }
                            else:
                                error_msg = confirmation_result.get('error', 'Transaction failed')
                                if "insufficient funds" in str(error_msg).lower():
                                    error_msg = "Insufficient funds for transaction"
                                elif "blockhash not found" in str(error_msg).lower():
                                    error_msg = "Transaction expired - blockhash not found"
                                
                                return {
                                    'success': False,
                                    'txid': result.value,
                                    'error': error_msg,
                                    'status': confirmation_result['status']
                                }
                            
                        except Exception as e:
                            error_msg = f"Error processing transaction: {str(e)}\n{traceback.format_exc()}"
                            logger.error(error_msg)
                            return {"error": error_msg}
                        finally:
                            await client.close()
                            
        except Exception as e:
            error_msg = f"Error placing order: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            return {"error": error_msg}

    async def wait_for_confirmation(self, signature: str, max_retries: int = 60) -> dict:
        """Wait for transaction confirmation
        
        Args:
            signature: Transaction signature
            max_retries: Maximum number of retries
            
        Returns:
            dict: Transaction result with status and any error
        """
        client = None
        try:
            client = AsyncClient(os.getenv("SOLANA_RPC_URL"))
            retry_count = 0
            
            while retry_count < max_retries:
                try:
                    # Check RPC health with get_latest_blockhash
                    try:
                        await client.get_latest_blockhash()
                    except Exception as e:
                        logger.error(f"Error checking RPC health: {str(e)}")
                        # Create a new client if RPC connection fails
                        if client:
                            await client.close()
                        client = AsyncClient(os.getenv("SOLANA_RPC_URL"))
                        await asyncio.sleep(1)
                        continue

                    # Check transaction status using get_signature_statuses
                    try:
                        resp = await client.get_signature_statuses([signature])
                        
                        if resp and resp.value and resp.value[0]:
                            status = resp.value[0]
                            if status.err:
                                logger.error(f"Transaction failed with error: {status.err}")
                                return {
                                    'success': False,
                                    'status': 'failed',
                                    'error': str(status.err),
                                    'signature': signature
                                }
                            elif status.confirmation_status == "finalized":
                                logger.info(f"Transaction {signature} finalized successfully")
                                return {
                                    'success': True,
                                    'status': 'finalized',
                                    'signature': signature
                                }
                            elif status.confirmation_status == "confirmed":
                                # If confirmed, return success
                                logger.info(f"Transaction {signature} confirmed successfully")
                                return {
                                    'success': True,
                                    'status': 'confirmed',
                                    'signature': signature
                                }
                            else:
                                logger.info(f"Transaction {signature} status: {status.confirmation_status}")
                        
                    except Exception as e:
                        logger.error(f"Error checking transaction status: {str(e)}")
                        if client:
                            await client.close()
                        client = AsyncClient(os.getenv("SOLANA_RPC_URL"))
                        await asyncio.sleep(1)
                        continue
                    
                    # If we get here, transaction is still pending
                    logger.info(f"Transaction {signature} still pending, attempt {retry_count + 1}/{max_retries}")
                    retry_count += 1
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Error in confirmation loop: {str(e)}")
                    retry_count += 1
                    if client:
                        await client.close()
                    client = AsyncClient(os.getenv("SOLANA_RPC_URL"))
                    await asyncio.sleep(1)
            
            return {
                'success': False,
                'status': 'timeout',
                'error': f"Transaction confirmation timed out after {max_retries} retries",
                'signature': signature
            }
            
        except Exception as e:
            error_msg = f"Error in wait_for_confirmation: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'status': 'error',
                'error': error_msg,
                'signature': signature
            }
        finally:
            if client:
                await client.close()

    async def get_token_balance(self, token_mint: str, owner_pubkey: Pubkey) -> int:
        """Get the token balance for a specific token"""
        try:
            # Get all token accounts owned by the user
            async_client = AsyncClient(os.getenv("SOLANA_RPC_URL"))
            response = await async_client.get_token_accounts_by_owner(
                owner_pubkey,
                {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},  # Token program ID
                encoding="jsonParsed"
            )
            
            # Look for the account that matches our mint and get its balance
            if response.value:
                for account in response.value:
                    try:
                        parsed_data = account.account.data['parsed']['info']
                        if parsed_data['mint'] == token_mint:
                            logging.info(f"Found token balance: {parsed_data['tokenAmount']['amount']} for mint {token_mint}")
                            return int(parsed_data['tokenAmount']['amount'])
                    except Exception as e:
                        logging.error(f"Error parsing account data: {e}")
                        continue
            
            logging.info(f"No token account found for {token_mint}")
            return 0
        except Exception as e:
            logging.error(f"Error getting token balance: {str(e)}\n{traceback.format_exc()}")
            return 0

    async def get_quote(self, input_token: str, output_token: str, amount: int, slippage_bps: int = 1000) -> dict:
        """Get quote from Jupiter API
        
        Args:
            input_token: Input token mint address
            output_token: Output token mint address
            amount: Amount in input token's smallest unit (e.g. lamports for SOL)
            slippage_bps: Slippage tolerance in basis points (1 bp = 0.01%)
            
        Returns:
            dict: Quote response from Jupiter API
        """
        try:
            # Get quote from Jupiter API
            quote_url = "https://quote-api.jup.ag/v6/quote"
            params = {
                "inputMint": input_token,
                "outputMint": output_token,
                "amount": str(amount),
                "slippageBps": str(slippage_bps),
                "onlyDirectRoutes": "false",
                "swapMode": "ExactIn"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(quote_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data
                    else:
                        error = await response.text()
                        raise Exception(f"Error getting quote: {error}")
                        
        except Exception as e:
            logger.error(f"Error in get_quote: {str(e)}")
            return None

    async def get_quote(self, input_token: str, output_token: str, amount: float, slippage_bps: int = 100):
        try:
            # Get quote first
            quote_url = f"https://quote-api.jup.ag/v6/quote?inputMint={input_token}&outputMint={output_token}&amount={amount}&swapMode=ExactIn&restrictIntermediateTokens=true&maxAutoSlippageBps={slippage_bps}"
            logger.info(f"Getting quote from URL: {quote_url}")

            headers = {"Accept": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                
            logger.info(f"Using headers: {headers}")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(quote_url, headers=headers) as response:
                    response_text = await response.text()
                    logger.info(f"Quote API raw response: {response_text}")
                    
                    if response.status != 200:
                        error_msg = f"Quote API error: {response.status} - {response_text}"
                        logger.error(error_msg)
                        return {'error': error_msg}
                        
                    quote_data = await response.json()
                    logger.info(f"Quote data: {json.dumps(quote_data, indent=2)}")
                    
                    # Check for token tradability error
                    if 'error' in quote_data:
                        error_msg = quote_data.get('error', 'Unknown error')
                        error_code = quote_data.get('errorCode', 'Unknown code')
                        logger.error(f"Quote error: {error_msg} (code: {error_code})")
                        return {'error': error_msg, 'errorCode': error_code}
                    
                    return quote_data
        except Exception as e:
            error_msg = f"Quote error: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            return {'error': error_msg}

    async def place_order_with_slippage(self, input_token: str, output_token: str, amount: float, slippage_bps: int = 100) -> dict:
        """Place a swap order using Jupiter"""
        try:
            # Get quote first
            quote = await self.get_quote(input_token, output_token, amount, slippage_bps)
            if not quote:
                raise ValueError("Failed to get quote from Jupiter")
                
            if 'error' in quote:
                error_msg = quote.get('error', 'Unknown error')
                logger.error(f"Quote error: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg
                }
                
            # Execute the swap
            signature = await self.swap(quote)
            if not signature:
                error_msg = "Failed to execute swap"
                logger.error(error_msg)
                return {
                    'success': False,
                    'error': error_msg
                }
                
            return {
                'success': True,
                'signature': signature
            }
            
        except Exception as e:
            error_msg = f"Error placing order: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
