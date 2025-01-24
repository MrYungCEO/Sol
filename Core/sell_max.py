from solders.keypair import Keypair
from solana.rpc.api import Client
from solders.pubkey import Pubkey
from spl.token.constants import TOKEN_PROGRAM_ID
import json
import requests
from base58 import b58decode, b58encode
from constants import *
try:
    from config import WALLET_PRIVATE_KEY, WALLET_PUBLIC_KEY
except ImportError:
    print("Please create config.py with your wallet credentials!")
    exit(1)
import base64
from solders.transaction import Transaction
import asyncio
from swap import TokenSwapper

def get_token_accounts(wallet_address: str, rpc_url: str = SOLANA_MAINNET_RPC) -> list:
    """Get all token accounts for a wallet using direct RPC call"""
    try:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTokenAccountsByOwner",
            "params": [
                wallet_address,
                {
                    "programId": TOKEN_PROGRAM_ID
                },
                {
                    "encoding": "jsonParsed"
                }
            ]
        }
        
        response = requests.post(rpc_url, json=payload)
        result = response.json()
        
        if 'error' in result:
            print(f"RPC Error: {result['error']}")
            return []
            
        if 'result' in result and 'value' in result['result']:
            accounts = result['result']['value']
            print(f"Found {len(accounts)} token accounts")
            return accounts
            
        return []
    except Exception as e:
        print(f"{ERROR_TOKEN_ACCOUNTS}: {e}")
        return []

def get_pump_token_balance(wallet_address: str) -> tuple:
    """Find PUMP token balance in the wallet"""
    token_accounts = get_token_accounts(wallet_address)
    
    print(f"Processing {len(token_accounts)} accounts...")
    print(f"Looking for PUMP token: {PUMP_TOKEN_MINT}")
    
    for account in token_accounts:
        try:
            if 'account' in account and 'data' in account['account']:
                data = account['account']['data']
                token_mint = None
                balance = 0
                
                if isinstance(data, list):
                    # Handle raw data format
                    data_bytes = bytes(data)
                    token_mint = str(Pubkey.from_bytes(data_bytes[0:32]))
                    balance = int.from_bytes(data_bytes[64:72], 'little')
                elif isinstance(data, dict) and 'parsed' in data:
                    # Handle parsed format
                    token_mint = data['parsed']['info']['mint']
                    balance = int(data['parsed']['info']['tokenAmount']['amount'])
                else:
                    print(f"Unknown data format: {data}")
                    continue
                
                if token_mint == PUMP_TOKEN_MINT:
                    print(f"Found PUMP token with balance: {balance}")
                    return token_mint, balance
                    
        except Exception as e:
            print(f"Error parsing account: {e}")
            continue
    
    print("PUMP token not found in wallet")
    return None, 0

def get_wallet_keypair() -> Keypair:
    """Create keypair from private key"""
    try:
        private_key_bytes = b58decode(WALLET_PRIVATE_KEY)
        return Keypair.from_bytes(private_key_bytes)
    except Exception as e:
        print(f"Error creating wallet keypair: {e}")
        return None

async def sell_max_token_balance(wallet_keypair: Keypair, token_mint: str, wallet_address: str = None) -> dict:
    """
    Sell the maximum balance of a specific token.
    
    Args:
        wallet_keypair (Keypair): The Solana wallet keypair
        token_mint (str): The token mint address to sell
        wallet_address (str, optional): The wallet address. If None, uses the public key from wallet_keypair
        
    Returns:
        dict: Transaction result with keys:
            - success (bool): Whether the transaction was successful
            - txid (str): Transaction ID if successful
            - error (str): Error message if unsuccessful
    """
    try:
        if not wallet_address:
            wallet_address = str(wallet_keypair.pubkey())
            
        # Find token balance
        token_accounts = get_token_accounts(wallet_address)
        balance = 0
        
        # Look for the token account with the specified mint
        for account in token_accounts:
            try:
                if 'account' in account and 'data' in account['account']:
                    data = account['account']['data']
                    account_token_mint = None
                    
                    if isinstance(data, list):
                        # Handle raw data format
                        data_bytes = bytes(data)
                        account_token_mint = str(Pubkey.from_bytes(data_bytes[0:32]))
                        account_balance = int.from_bytes(data_bytes[64:72], 'little')
                    elif isinstance(data, dict) and 'parsed' in data:
                        # Handle parsed format
                        account_token_mint = data['parsed']['info']['mint']
                        account_balance = int(data['parsed']['info']['tokenAmount']['amount'])
                    else:
                        continue
                    
                    if account_token_mint == token_mint:
                        balance = account_balance
                        break
                        
            except Exception as e:
                print(f"Error parsing account: {e}")
                continue
        
        if balance <= 0:
            return {
                'success': False,
                'error': 'No token balance found'
            }
            
        # Initialize TokenSwapper
        swapper = TokenSwapper()
        swapper.keypair = wallet_keypair
        
        # Execute the swap
        result = await swapper.sell_token(token_mint, balance)
        
        if result and result.get('success') and result.get('txid'):
            return {
                'success': True,
                'txid': result['txid'],
                'amount_sold': balance
            }
        elif result and result.get('error'):
            return {
                'success': False,
                'error': result['error']
            }
        else:
            return {
                'success': False,
                'error': 'Unknown error during swap'
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

async def sell_max_tokens(wallet_keypair: Keypair, token_mint: str, amount: int) -> dict:
    """Sell tokens using the TokenSwapper"""
    try:
        # Initialize TokenSwapper
        swapper = TokenSwapper()
        swapper.keypair = wallet_keypair  # Use the same keypair
        
        print(f"\nSelling {amount} tokens using TokenSwapper...")
        result = await swapper.sell_token(token_mint, amount)
        
        if result and result.get('success') and result.get('txid'):
            print(f"\nSell transaction successful!")
            print(f"View on Solscan: https://solscan.io/tx/{result['txid']}")
            return result
        elif result and result.get('error'):
            print(f"\nError selling tokens: {result['error']}")
            return None
        else:
            print("\nUnknown error during sell")
            return None
            
    except Exception as e:
        print(f"Error in sell_max_tokens: {str(e)}")
        return None

def main():
    # Initialize wallet
    wallet_keypair = get_wallet_keypair()
    if not wallet_keypair:
        print("Failed to initialize wallet")
        return
    
    print("Finding PUMP token balance...")
    token_mint, balance = get_pump_token_balance(WALLET_PUBLIC_KEY)
    
    if token_mint and balance > 0:
        print(f"Found PUMP token:")
        print(f"Token mint: {token_mint}")
        print(f"Balance: {balance}")
        
        # Use asyncio to run the sell function
        sell_result = asyncio.run(sell_max_token_balance(wallet_keypair, token_mint))
        
        if sell_result and sell_result.get('success'):
            print("\nSuccessfully sold tokens!")
            print(f"View on Solscan: https://solscan.io/tx/{sell_result['txid']}")
        else:
            error = sell_result.get('error', 'Unknown error')
            print(f"\nFailed to sell tokens: {error}")
    else:
        print("No PUMP tokens found in the wallet or balance is 0")

if __name__ == "__main__":
    main()
