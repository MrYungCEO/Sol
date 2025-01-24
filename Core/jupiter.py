import requests
import json
import base58
import base64
import requests
import os
import json
from datetime import datetime
import asyncio
import logging
import aiohttp
import traceback

from solana.rpc.async_api import AsyncClient
from solana.rpc.types import TxOpts
from solana.rpc.commitment import Processed, Confirmed
from solana.rpc.types import TokenAccountOpts
from solana.rpc.core import RPCException

from solders import message
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction, Transaction
from solders.instruction import Instruction, AccountMeta
from constants import RPC_URL


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
    def __init__(self):
        self.base_url = "https://quote-api.jup.ag/v6"
        self.rpc_url = RPC_URL

    async def swap(
        self, public_key: str, input_mint: str, output_mint: str, amount: int
    ):
        try:
            logging.info(f"Getting quote for swap: input={input_mint}, output={output_mint}, amount={amount}")
            # Get quote first
            quote_url = f"https://quote-api.jup.ag/v6/quote?inputMint={input_mint}&outputMint={output_mint}&amount={amount}&swapMode=ExactIn&restrictIntermediateTokens=true&maxAutoSlippageBps=300"

            headers = {"Accept": "application/json"}
            quote_response = requests.get(quote_url, headers=headers)
            quote_data = quote_response.json()
            
            # Check for token tradability error
            if 'error' in quote_data:
                error_msg = quote_data.get('error', 'Unknown error')
                error_code = quote_data.get('errorCode', 'Unknown code')
                logging.error(f"Quote error: {error_msg} (code: {error_code})")
                return {'error': error_msg, 'errorCode': error_code}
            
            # Prepare swap request
            swap_url = "https://quote-api.jup.ag/v6/swap"
            swap_payload = {
                "quoteResponse": quote_data,
                "userPublicKey": public_key,
                "wrapAndUnwrapSol": True,
                "useSharedAccounts": False,  # Disable shared accounts to support all AMMs
                "asLegacyTransaction": False,
                "dynamicComputeUnitLimit": True,
                "dynamicSlippage": {
                    "maxBps": 300,
                },
                "prioritizationFeeLamports": {
                    "priorityLevelWithMaxLamports": {
                        "maxLamports": 100000,
                        "priorityLevel": "veryHigh",
                    }
                },
            }
            
            logging.info("Sending swap request")
            swap_response = requests.post(swap_url, json=swap_payload, headers=headers)
            swap_data = swap_response.json()
            
            if 'error' in swap_data:
                error_msg = swap_data.get('error', 'Unknown error')
                logging.error(f"Swap error: {error_msg}")
                return {'error': error_msg}
                
            return swap_data
        except Exception as e:
            error_msg = f"Swap error: {str(e)}\n{traceback.format_exc()}"
            logging.error(error_msg)
            return {'error': error_msg}

    async def place_order(
        self,
        keypair: Keypair,
        input_mint: str,
        output_mint: str,
        amount: int,
        decimals: int,
    ):
        """Place an order using Jupiter API"""
        try:
            # Execute the swap - amount is already in smallest units, no need to multiply
            transaction_data = await self.swap(
                public_key=str(keypair.pubkey()),
                input_mint=input_mint,
                output_mint=output_mint,
                amount=amount,  # Use raw amount, it's already in smallest units
            )

            # Check for token tradability error
            if 'error' in transaction_data:
                return {
                    'success': False,
                    'error': f"Swap Error: {transaction_data['error']}"
                }

            # Decode and deserialize transaction
            tx_bytes = base64.b64decode(transaction_data["swapTransaction"])
            tx = VersionedTransaction.from_bytes(tx_bytes)
            
            # Create signed transaction with keypair
            signed_tx = VersionedTransaction(tx.message, [keypair])
            
            # Send transaction
            async_client = AsyncClient(self.rpc_url)
            opts = TxOpts(skip_preflight=False, preflight_commitment=Processed)
            result = await async_client.send_raw_transaction(
                bytes(signed_tx),
                opts=opts
            )
            
            transaction_id = json.loads(result.to_json())["result"]
            logging.info(f"Transaction Processing... {transaction_id}")

            # Modified confirmation check using direct RPC request
            for _ in range(30):  # Check for 30 seconds
                try:
                    response = requests.post(
                        self.rpc_url,
                        json={
                            "jsonrpc": "2.0",
                            "id": 1,
                            "method": "getSignatureStatuses",
                            "params": [[transaction_id], {"searchTransactionHistory": True}],
                        },
                    )
                    result = response.json()
                    if "error" in result:
                        logging.error(f"RPC error: {result['error']}")
                        continue

                    status = result["result"]["value"][0]
                    if status is not None:
                        if status.get("err") is not None:
                            error_data = status["err"]
                            error_msg = JupiterError.get_error_message(error_data)
                            return {
                                'success': False,
                                'error': f"Transaction failed: {error_msg}",
                                'txid': transaction_id
                            }
                        if status.get("confirmationStatus") in ["confirmed", "finalized"]:
                            return {
                                'success': True,
                                'txid': transaction_id,
                                'status': status.get("confirmationStatus")
                            }

                except Exception as e:
                    logging.error(f"Error checking transaction status: {str(e)}")
                await asyncio.sleep(1)

            # Even if we timeout, return the transaction ID so it can be checked later
            return {
                'success': False,
                'error': "Transaction status check timed out",
                'txid': transaction_id
            }
                            
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error placing order: {str(e)}\n{traceback.format_exc()}")
            return {"error": str(e)}

    async def get_token_balance(self, token_mint: str, owner_pubkey: Pubkey) -> int:
        """Get the token balance for a specific token"""
        try:
            # Get all token accounts owned by the user
            async_client = AsyncClient(self.rpc_url)
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

    async def get_quote(self, input_token: str, output_token: str, amount: float, slippage_bps: int = 100):
        try:
            # Get quote first
            quote_url = f"https://quote-api.jup.ag/v6/quote?inputMint={input_token}&outputMint={output_token}&amount={amount}&swapMode=ExactIn&restrictIntermediateTokens=true&maxAutoSlippageBps={slippage_bps}"

            headers = {"Accept": "application/json"}
            quote_response = requests.get(quote_url, headers=headers)
            quote_data = quote_response.json()
            
            # Check for token tradability error
            if 'error' in quote_data:
                error_msg = quote_data.get('error', 'Unknown error')
                error_code = quote_data.get('errorCode', 'Unknown code')
                logging.error(f"Quote error: {error_msg} (code: {error_code})")
                return {'error': error_msg, 'errorCode': error_code}
            
            return quote_data
        except Exception as e:
            error_msg = f"Quote error: {str(e)}\n{traceback.format_exc()}"
            logging.error(error_msg)
            return {'error': error_msg}

    async def place_order_with_slippage(self, input_token: str, output_token: str, amount: float, slippage_bps: int = 100) -> dict:
        """Place a swap order using Jupiter"""
        try:
            # Get quote first
            quote = await self.get_quote(input_token, output_token, amount, slippage_bps)
            if not quote or 'data' not in quote:
                raise ValueError("Failed to get quote from Jupiter")

            # Extract transaction data
            tx_data = quote['data']
            
            # Decode transaction
            tx = Transaction.deserialize(base64.b64decode(tx_data))
            
            # Sign and send transaction
            async_client = AsyncClient(self.rpc_url)
            blockhash = await async_client.get_recent_blockhash()
            tx.recent_blockhash = blockhash['result']['value']['blockhash']
            tx.sign([Keypair()])
            
            tx_bytes = tx.serialize()
            
            # Send with retries and increased priority fee
            for attempt in range(3):
                try:
                    result = await async_client.send_raw_transaction(
                        tx_bytes,
                        opts=TxOpts(
                            skip_preflight=False,
                            preflight_commitment=Confirmed,
                            max_retries=5
                        )
                    )
                    
                    # Wait for confirmation
                    status = await async_client.get_transaction(
                        result['result'],
                        commitment=Confirmed
                    )
                    
                    if status and status['result']:
                        return {
                            'success': True,
                            'signature': result['result'],
                            'status': status['result']
                        }
                        
                except RPCException as e:
                    error_msg = str(e)
                    if "0x1771" in error_msg:  # Slippage tolerance exceeded
                        logger.error(f"Slippage error on attempt {attempt + 1}, retrying with higher tolerance")
                        slippage_bps += 50  # Increase slippage tolerance
                        quote = await self.get_quote(input_token, output_token, amount, slippage_bps)
                        if quote and 'data' in quote:
                            tx = Transaction.deserialize(base64.b64decode(quote['data']))
                            tx.recent_blockhash = blockhash['result']['value']['blockhash']
                            tx.sign([Keypair()])
                            tx_bytes = tx.serialize()
                            continue
                            
                    logger.error(f"Error placing order: {e}")
                    if attempt < 2:
                        await asyncio.sleep(1)  # Wait before retry
                    continue
                    
            raise Exception(f"Failed to execute swap after {attempt + 1} attempts. Last error: {error_msg}")
            
        except Exception as e:
            logger.error(f"Error placing order: {e}")
            return {
                'success': False,
                'error': str(e)
            }
