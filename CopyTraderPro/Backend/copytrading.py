import asyncio
import json
from typing import Dict, Any, Optional
from datetime import datetime
import logging
import httpx
from wallet_tracking import track_wallet, parse_route
from trade_manager import trade_manager
from price_service import price_service
from swap import TokenSwapper
from flask import Blueprint, jsonify, request
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CopyTrader:
    def __init__(self, api_base_url: str = "http://localhost:8005"):
        self.api_base_url = api_base_url
        self.tracked_wallets = set()
        self.active_trades = {}  # token_address -> trade_id mapping
        self.fixed_amount = 0.001  # Fixed amount in SOL for copying trades
        
    async def handle_trade(self, trade_details: Dict[str, Any]) -> None:
        """Handle detected trades from tracked wallet"""
        try:
            trade_type = trade_details.get('type')
            token_address = trade_details.get('token_address')
            token_amount = trade_details.get('token_amount', 0)
            value = trade_details.get('value', 0)
            signature = trade_details.get('signature', 'unknown')
            
            # Skip if not a valid trade
            if not trade_type or not token_address:
                return
                
            # Skip intermediate tokens (like JUP)
            if token_address == "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN":
                return
                
            # Print trade details in a clear format
            logger.info("=" * 50)
            logger.info(" NEW TRADE DETECTED")
            logger.info(f" Type: {trade_type.upper()}")
            logger.info(f" Token: {token_address}")
            logger.info(f" Amount: {token_amount}")
            logger.info(f" Value: {value} SOL")
            logger.info(f" TX: https://solscan.io/tx/{signature}")
            logger.info("=" * 50)
            
            # When tracked wallet sells, we should buy (and vice versa)
            if trade_type == 'sell':
                logger.info(" MIRRORING: Original trade is SELL -> We will BUY")
                await self._handle_buy(token_address, trade_details)
            elif trade_type == 'buy':
                logger.info(" MIRRORING: Original trade is BUY -> We will SELL")
                await self._handle_sell(token_address, trade_details)
                
        except Exception as e:
            logger.error(f" Error handling trade: {str(e)}", exc_info=True)
            
    async def _handle_buy(self, token_address: str, trade_details: Dict[str, Any]) -> None:
        """Handle buy trade detection"""
        try:
            # Get current token price
            current_price = await price_service.get_token_price(token_address)
            logger.info("==================================================")
            logger.info(" EXECUTING BUY ORDER")
            logger.info(f" Input: {self.fixed_amount} SOL")
            logger.info(f" Token: {token_address}")
            logger.info("==================================================")
            
            # Execute buy order with retries
            max_retries = 3
            retry_delay = 1
            
            swapper = TokenSwapper()
            
            for attempt in range(max_retries):
                try:
                    if attempt > 0:
                        logger.info(f"Retry attempt {attempt + 1}/{max_retries}...")
                    
                    # Execute the swap
                    tx_url = await swapper.buy_token(token_address, self.fixed_amount)
                    
                    if tx_url:
                        logger.info("==================================================")
                        logger.info(" BUY ORDER COMPLETED")
                        logger.info(f" {tx_url}")
                        logger.info("==================================================")
                        break
                        
                except Exception as e:
                    if attempt < max_retries - 1:
                        if "slippage" in str(e).lower():
                            logger.warning(" Slippage error, retrying...")
                        else:
                            logger.warning(f" Error: {str(e)}")
                        await asyncio.sleep(retry_delay)
                    else:
                        logger.error(" Max retries reached")
                        raise
                    
        except Exception as e:
            logger.error(f" Error in buy handling: {str(e)}", exc_info=True)

    async def _handle_sell(self, token_address: str, trade_details: Dict[str, Any]) -> None:
        """Handle sell trade detection"""
        try:
            # Get current token price
            current_price = await price_service.get_token_price(token_address)
            
            # Execute sell order with retries
            max_retries = 3
            retry_delay = 1
            
            swapper = TokenSwapper()
            
            # Get token balance first
            balance = await swapper.get_token_balance(token_address)
            if balance is None or balance == 0:
                logger.warning(" No token balance to sell")
                return
                
            logger.info("==================================================")
            logger.info(" EXECUTING SELL ORDER")
            logger.info(f" Amount: {balance} tokens")
            logger.info(f" Token: {token_address}")
            logger.info("==================================================")
            
            for attempt in range(max_retries):
                try:
                    if attempt > 0:
                        logger.info(f"Retry attempt {attempt + 1}/{max_retries}...")
                    
                    # Execute the swap
                    tx_url = await swapper.sell_token(token_address, balance)
                    
                    if tx_url:
                        logger.info("==================================================")
                        logger.info(" SELL ORDER COMPLETED")
                        logger.info(f" {tx_url}")
                        logger.info("==================================================")
                        break
                        
                except Exception as e:
                    if attempt < max_retries - 1:
                        if "slippage" in str(e).lower():
                            logger.warning(" Slippage error, retrying...")
                        else:
                            logger.warning(f" Error: {str(e)}")
                        await asyncio.sleep(retry_delay)
                    else:
                        logger.error(" Max retries reached")
                        raise
                    
        except Exception as e:
            logger.error(f" Error in sell handling: {str(e)}", exc_info=True)
            
    async def start_tracking(self, wallet_address: str) -> None:
        """Start tracking a wallet for trades"""
        if wallet_address in self.tracked_wallets:
            logger.info(f"Already tracking wallet {wallet_address}")
            return
            
        self.tracked_wallets.add(wallet_address)
        
        try:
            # Register wallet tracking
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base_url}/track_wallet",
                    params={"wallet_address": wallet_address}
                )
                
                if response.status_code != 200:
                    logger.error(f"Failed to register wallet tracking: {response.text}")
                    return
                    
            # Start tracking
            await track_wallet(
                wallet_address=wallet_address,
                on_trade=self.handle_trade
            )
            
        except Exception as e:
            logger.error(f"Error starting wallet tracking: {str(e)}", exc_info=True)
            self.tracked_wallets.remove(wallet_address)

async def main():
    copytrader = CopyTrader()
    
    # Example wallet address to track
    wallet_address = "9snZcHVUM2XRC2wiZeaZub7TTmNiQz7jqewt7x9M5hgj"
    
    try:
        await copytrader.start_tracking(wallet_address)
    except KeyboardInterrupt:
        logger.info("Stopping copytrading...")
    except Exception as e:
        logger.error(f"Error in main: {str(e)}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(main())

copytrading_bp = Blueprint('copytrading', __name__)

@copytrading_bp.route('/api/copytrading/wallets', methods=['GET'])
def get_tracked_wallets():
    try:
        # Load tracked wallets from a file or database
        wallets_file = os.path.join(os.path.dirname(__file__), 'ui', 'src', 'data', 'tracked_wallets.json')
        if os.path.exists(wallets_file):
            with open(wallets_file, 'r') as f:
                wallets = json.load(f)
            return jsonify(wallets)
        return jsonify([])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@copytrading_bp.route('/api/copytrading/wallets', methods=['POST'])
def add_tracked_wallet():
    try:
        wallet_data = request.json
        wallets_file = os.path.join(os.path.dirname(__file__), 'ui', 'src', 'data', 'tracked_wallets.json')
        
        # Load existing wallets
        wallets = []
        if os.path.exists(wallets_file):
            with open(wallets_file, 'r') as f:
                wallets = json.load(f)
        
        # Add new wallet with timestamp
        wallet_data['added_at'] = datetime.now().isoformat()
        wallets.append(wallet_data)
        
        # Save back to file
        with open(wallets_file, 'w') as f:
            json.dump(wallets, f, indent=2)
        
        return jsonify({
            'success': True,
            'wallet': wallet_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@copytrading_bp.route('/api/copytrading/wallets/<address>', methods=['DELETE'])
def remove_tracked_wallet(address):
    try:
        wallets_file = os.path.join(os.path.dirname(__file__), 'ui', 'src', 'data', 'tracked_wallets.json')
        
        # Load existing wallets
        if os.path.exists(wallets_file):
            with open(wallets_file, 'r') as f:
                wallets = json.load(f)
            
            # Remove wallet with matching address
            wallets = [w for w in wallets if w.get('address') != address]
            
            # Save back to file
            with open(wallets_file, 'w') as f:
                json.dump(wallets, f, indent=2)
        
        return jsonify({
            'success': True,
            'address': address
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
