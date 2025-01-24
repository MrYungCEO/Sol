from datetime import datetime
import json
import os
from typing import Dict, Optional, Any
import logging
import time

class TrackingManager:
    """Manages wallet tracking operations"""
    
    def __init__(self):
        self._data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'data'))
        self._tracked_trades_file = os.path.join(self._data_dir, 'tracked_trades.json')
        
        # Create data directory if it doesn't exist
        if not os.path.exists(self._data_dir):
            os.makedirs(self._data_dir)
            
        # Create tracked trades file if it doesn't exist
        if not os.path.exists(self._tracked_trades_file):
            with open(self._tracked_trades_file, 'w') as f:
                json.dump({}, f, indent=2)

        self.tracked_trades = {}
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.DEBUG)
        self._load_tracked_trades()
        self.logger.debug(f"Initialized with {len(self.tracked_trades)} trades")

    def _load_tracked_trades(self):
        """Load tracked trades from file"""
        try:
            if os.path.exists(self._tracked_trades_file):
                with open(self._tracked_trades_file, 'r') as f:
                    try:
                        content = f.read().strip()
                        if content:
                            self.tracked_trades = json.loads(content)
                            self.logger.debug(f"Loaded {len(self.tracked_trades)} trades from file")
                        else:
                            self.tracked_trades = {}
                            self.logger.debug("File was empty, initialized empty trades dict")
                    except json.JSONDecodeError:
                        self.tracked_trades = {}
                        self.logger.debug("JSON decode error, initialized empty trades dict")
            else:
                self.tracked_trades = {}
                self.logger.debug("File doesn't exist, initialized empty trades dict")
        except Exception as e:
            self.logger.error(f"Error loading tracked trades: {str(e)}")
            self.tracked_trades = {}
            self._save_tracked_trades()

    def _save_tracked_trades(self):
        """Save tracked trades to file"""
        try:
            # Write to temporary files first
            temp_file = f"{self._tracked_trades_file}.tmp"
            
            # Ensure trades are in a format that can be serialized
            trades_to_save = {}
            for trade_id, trade in self.tracked_trades.items():
                # Convert any non-serializable types
                trade_copy = trade.copy()
                if isinstance(trade_copy.get('date_time'), datetime):
                    trade_copy['date_time'] = trade_copy['date_time'].isoformat()
                trades_to_save[trade_id] = trade_copy
            
            self.logger.debug(f"Writing {len(self.tracked_trades)} trades to temp files")
            
            # Write to both temp files
            with open(temp_file, 'w') as f:
                json.dump(trades_to_save, f, indent=2)
                f.flush()
                os.fsync(f.fileno())
                
            # Rename temp files to final files
            os.replace(temp_file, self._tracked_trades_file)
            
            self.logger.debug("Successfully saved trades")
        except Exception as e:
            self.logger.error(f"Error saving tracked trades: {str(e)}")
            import traceback
            self.logger.error(traceback.format_exc())

    def add_tracked_trade(
        self,
        token_address: str,
        buy_price: float,
        transaction_link: str,
        amount_in_sol: float,
        token_amount: float,
        trade_type: str,
        result: str,
        wallet_group: Optional[str] = None
    ) -> Dict:
        """Add a new tracked trade"""
        try:
            self.logger.debug(f"Adding new trade for token {token_address}")
            
            # Ensure we have the latest trades
            self._load_tracked_trades()
            
            trade_id = f"tracked_trade_{len(self.tracked_trades) + 1}"
            
            trade = {
                "id": trade_id,
                "date_time": datetime.utcnow().isoformat(),
                "token_address": token_address,
                "trade_type": trade_type,
                "transaction_link": transaction_link,
                "result": result,
                "amount_in_sol": amount_in_sol,  # Store SOL amount
                "wallet_group": wallet_group
            }
            
            self.tracked_trades[trade_id] = trade
            self.logger.debug(f"Added trade {trade_id}, now saving...")
            
            if transaction_link:
                self.logger.info(f"Trade {trade_id} transaction: {transaction_link}")
                
            self._save_tracked_trades()
            self.logger.debug(f"Successfully saved trade {trade_id}")
            
            # Verify the trade was saved
            self._load_tracked_trades()
            if trade_id in self.tracked_trades:
                self.logger.debug(f"Verified trade {trade_id} was saved correctly")
            else:
                self.logger.error(f"Trade {trade_id} was not saved correctly!")
            
            return trade
            
        except Exception as e:
            self.logger.error(f"Error adding tracked trade: {str(e)}")
            import traceback
            self.logger.error(traceback.format_exc())
            return None

    def get_tracked_trade(self, trade_id: str) -> Optional[Dict]:
        """Get a tracked trade by ID"""
        return self.tracked_trades.get(trade_id)

    def update_tracked_trade(self, trade_id: str, updates: Dict) -> Optional[Dict]:
        """Update a tracked trade"""
        if trade_id in self.tracked_trades:
            self.tracked_trades[trade_id].update(updates)
            self._save_tracked_trades()
            return self.tracked_trades[trade_id]
        return None

    def close_tracked_trade(self, trade_id: str, close_price: float, result: str = "success") -> Optional[Dict]:
        """Close a tracked trade"""
        if trade_id in self.tracked_trades:
            trade = self.tracked_trades[trade_id]
            trade["close_price"] = close_price
            trade["current_price"] = close_price
            trade["status"] = "closed"
            trade["result"] = result
            trade["type"] = "sell"
            
            # Calculate profit percentage
            if trade.get("buy_price", 0) > 0:
                profit_percentage = ((close_price - trade.get("buy_price", 0)) / trade.get("buy_price", 0)) * 100
                trade["profit_percentage"] = profit_percentage
            
            self._save_tracked_trades()
            return trade
        return None
