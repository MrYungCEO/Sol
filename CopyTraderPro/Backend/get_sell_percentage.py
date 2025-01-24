from solders.keypair import Keypair
from solana.rpc.api import Client
from solders.pubkey import Pubkey
from spl.token.constants import TOKEN_PROGRAM_ID
import requests
import json
import os
from base58 import b58decode
from constants import *
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
TRACKED_TRADES_FILE = "C:/Users/yunge/Desktop/CopyTraderPro/Backend/data/tracked_trades.json"

def get_token_balance(wallet_address: str, token_mint: str, rpc_url: str = SOLANA_MAINNET_RPC) -> int:
    """Get token balance for a specific token in a wallet"""
    try:
        # Get all token accounts
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
            logger.error(f"RPC Error: {result['error']}")
            return 0
            
        if 'result' in result and 'value' in result['result']:
            accounts = result['result']['value']
            
            # Find account for specific token
            for account in accounts:
                if 'account' in account and 'data' in account['account']:
                    data = account['account']['data']
                    
                    if isinstance(data, dict) and 'parsed' in data:
                        info = data['parsed']['info']
                        if info['mint'] == token_mint:
                            return int(info['tokenAmount']['amount'])
                            
        return 0
    except Exception as e:
        logger.error(f"Error getting token balance: {e}")
        return 0

def get_transaction_details(tx_signature: str, rpc_url: str = SOLANA_MAINNET_RPC) -> dict:
    """Get detailed transaction information"""
    try:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTransaction",
            "params": [
                tx_signature,
                {
                    "encoding": "jsonParsed",
                    "maxSupportedTransactionVersion": 0
                }
            ]
        }
        
        response = requests.post(rpc_url, json=payload)
        result = response.json()
        
        if 'error' in result:
            logger.error(f"RPC Error: {result['error']}")
            return None
            
        if 'result' in result:
            return result['result']
            
        return None
    except Exception as e:
        logger.error(f"Error getting transaction details: {e}")
        return None

def analyze_token_transfer(tx_signature: str, wallet_address: str, token_mint: str) -> float:
    """
    Analyze what percentage of a token holding was transferred/sold in a transaction
    
    Args:
        tx_signature: Transaction signature to analyze
        wallet_address: Wallet address to check balance for
        token_mint: Token mint address to analyze
        
    Returns:
        float: Percentage of tokens transferred (0-100), or -1 if error
    """
    try:
        # Get current token balance
        current_balance = get_token_balance(wallet_address, token_mint)
        
        # Get transaction details
        tx_details = get_transaction_details(tx_signature)
        if not tx_details:
            return -1
            
        # Find token transfer in transaction
        pre_balance = current_balance  # Balance before transaction
        transfer_amount = 0
        
        if 'meta' in tx_details and 'preTokenBalances' in tx_details['meta']:
            # Find pre-balance for our token
            for balance in tx_details['meta']['preTokenBalances']:
                if 'mint' in balance and balance['mint'] == token_mint:
                    if 'owner' in balance and balance['owner'] == wallet_address:
                        pre_balance = int(balance['uiTokenAmount']['amount'])
                        break
        
        if 'meta' in tx_details and 'postTokenBalances' in tx_details['meta']:
            # Calculate transfer amount from balance change
            for balance in tx_details['meta']['postTokenBalances']:
                if 'mint' in balance and balance['mint'] == token_mint:
                    if 'owner' in balance and balance['owner'] == wallet_address:
                        post_balance = int(balance['uiTokenAmount']['amount'])
                        transfer_amount = pre_balance - post_balance
                        break
        
        # Calculate percentage
        if pre_balance > 0:
            percentage = (transfer_amount / pre_balance) * 100
            return percentage
            
        return 0
    except Exception as e:
        logger.error(f"Error analyzing transfer: {e}")
        return -1

def update_tracked_trade_sell_percentage(tx_signature: str, wallet_address: str, token_mint: str) -> None:
    """Update sell percentage in tracked trades file"""
    try:
        # Get sell percentage
        percentage = analyze_token_transfer(tx_signature, wallet_address, token_mint)
        if percentage < 0:
            logger.error("Failed to get sell percentage")
            return
            
        # Load tracked trades
        if not os.path.exists(TRACKED_TRADES_FILE):
            logger.error("No tracked trades file found")
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
            
        # Find and update matching trade
        updated = False
        for trade_id, trade in tracked_trades.items():
            if (trade.get('token_address') == token_mint and 
                trade.get('status') == 'active'):
                # Update the trade
                trade['sell_percentage'] = percentage
                updated = True
                logger.info(f"Updated sell percentage for trade {trade_id} to {percentage:.2f}%")
                break
                
        if updated:
            # Save changes
            try:
                with open(TRACKED_TRADES_FILE, 'w') as f:
                    json.dump(tracked_trades, f, indent=4)
                logger.info("Successfully updated tracked trades file")
            except Exception as e:
                logger.error(f"Error writing tracked trades file: {str(e)}")
        else:
            logger.warning(f"No matching active trade found for token {token_mint}")
            
    except Exception as e:
        logger.error(f"Error updating sell percentage: {e}")

def is_stablecoin(token_mint: str) -> bool:
    """Check if a token is a stablecoin"""
    stablecoins = [
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # USDC
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",  # USDT
        "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",  # BONK
    ]
    return token_mint in stablecoins

def main():
    # Example usage
    tx_signature = "4mx9tjcnKiPgn84qVRzHz9AB6H1xErPy1HyvT6CRzx2NWXeexDDyBbZKZHve4sgmvuxH37smwB8gstsAfpxJrb7F"
    wallet = "HAEcViATgps9PbxruNhVN17o6Cic3V3kKzDuwrRaMEvj"
    token = "8v8aBHR7EXFZDwaqaRjAStEcmCj6VZi5iGq1YDtyTok6"
    
    # First analyze the transfer
    percentage = analyze_token_transfer(tx_signature, wallet, token)
    if percentage >= 0:
        logger.info(f"Transferred {percentage:.2f}% of token balance")
        
        # Then update tracked trades
        update_tracked_trade_sell_percentage(tx_signature, wallet, token)
    else:
        logger.error("Error analyzing transaction")

if __name__ == "__main__":
    main()
