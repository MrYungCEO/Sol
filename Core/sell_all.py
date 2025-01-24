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

def get_token_balances(wallet_address: str) -> list:
    """Get all tokens with non-zero balances in the wallet"""
    tokens = []
    token_accounts = get_token_accounts(wallet_address)
    
    for account in token_accounts:
        try:
            if 'account' in account and 'data' in account['account']:
                data = account['account']['data']
                
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
                    continue
                
                # Skip SOL and tokens with zero balance
                if (balance > 0 and 
                    token_mint != "So11111111111111111111111111111111111111112"):
                    tokens.append({
                        'mint': token_mint,
                        'balance': balance
                    })
                    print(f"Found token {token_mint} with balance {balance}")
                    
        except Exception as e:
            print(f"Error parsing account: {e}")
            continue
    
    return tokens

def get_wallet_keypair() -> Keypair:
    """Create keypair from private key"""
    try:
        private_key_bytes = b58decode(WALLET_PRIVATE_KEY)
        return Keypair.from_bytes(private_key_bytes)
    except Exception as e:
        print(f"Error creating wallet keypair: {e}")
        return None

async def sell_token_for_sol(wallet_keypair: Keypair, token_mint: str, amount: int) -> dict:
    """Sell a specific token for SOL"""
    try:
        # Initialize TokenSwapper
        swapper = TokenSwapper()
        swapper.keypair = wallet_keypair
        
        print(f"\nSelling {amount} tokens of {token_mint}...")
        result = await swapper.sell_token(token_mint, amount)
        
        if result and result.get('success') and result.get('txid'):
            print(f"\nSell transaction successful!")
            print(f"View on Solscan: https://solscan.io/tx/{result['txid']}")
            return {
                'success': True,
                'txid': result['txid'],
                'amount_sold': amount
            }
        elif result and result.get('error'):
            print(f"\nError selling tokens: {result['error']}")
            return {
                'success': False,
                'error': result['error']
            }
        else:
            print("\nUnknown error during sell")
            return {
                'success': False,
                'error': 'Unknown error during swap'
            }
            
    except Exception as e:
        error_msg = f"Error in sell_token_for_sol: {str(e)}"
        print(error_msg)
        return {
            'success': False,
            'error': error_msg
        }

async def sell_all_for_sol(wallet_keypair: Keypair) -> list:
    """Sell all tokens in the wallet for SOL"""
    results = []
    
    try:
        # Get list of tokens with balance
        tokens = get_token_balances(str(wallet_keypair.pubkey()))
        
        if not tokens:
            print("No tokens with balance found in wallet")
            return results
            
        print(f"\nFound {len(tokens)} tokens to sell:")
        for token in tokens:
            print(f"Token: {token['mint']}, Balance: {token['balance']}")
        
        # Try to sell each token
        for token in tokens:
            print(f"\nAttempting to sell token: {token['mint']}")
            result = await sell_token_for_sol(
                wallet_keypair, 
                token['mint'], 
                token['balance']
            )
            
            results.append({
                'token_mint': token['mint'],
                'amount': token['balance'],
                'result': result
            })
            
            # Add a small delay between transactions
            await asyncio.sleep(1)
                
    except Exception as e:
        print(f"Error in sell_all_for_sol: {str(e)}")
        
    return results

def main():
    # Initialize wallet
    wallet_keypair = get_wallet_keypair()
    if not wallet_keypair:
        print("Failed to initialize wallet")
        return
    
    print("Starting to sell all tokens for SOL...")
    results = asyncio.run(sell_all_for_sol(wallet_keypair))
    
    # Print summary
    print("\nSell Summary:")
    successful_sells = 0
    failed_sells = 0
    
    for result in results:
        if result['result']['success']:
            successful_sells += 1
            print(f"\n✅ Successfully sold {result['amount']} of {result['token_mint']}")
            print(f"   Transaction: https://solscan.io/tx/{result['result']['txid']}")
        else:
            failed_sells += 1
            print(f"\n❌ Failed to sell {result['token_mint']}")
            print(f"   Error: {result['result']['error']}")
    
    print(f"\nTotal Results:")
    print(f"Successful sells: {successful_sells}")
    print(f"Failed sells: {failed_sells}")

if __name__ == "__main__":
    main()
