import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from typing_extensions import TypedDict
from price_service import price_service
import uuid
from typing import Any
from flask import Blueprint, jsonify, request

class Trade(TypedDict):
    id: str
    date_time: str
    token_address: str
    buy_price: float
    close_price: Optional[float]
    current_price: Optional[float]
    profit: Optional[float]
    profit_percentage: Optional[float]
    status: str  # 'active' or 'closed'
    result: Optional[str]  # 'success' or 'fail'
    transaction_link: str
    amount_in_sol: float
    token_amount: float
    wallet_group: Optional[str]
    partial_sales: Optional[List[Dict[str, Any]]]  # List of partial sale records

class TradeManager:
    _instance = None
    _initialized = False
    _trades_file = r"C:\Users\yunge\Desktop\backupsnipe\Core\ui\src\data\trades.json"
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TradeManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self.trades = {}
            self._load_trades()
            self._initialized = True
    
    def _load_trades(self):
        """Load trades from file"""
        try:
            if os.path.exists(self._trades_file):
                with open(self._trades_file, 'r') as f:
                    try:
                        content = f.read().strip()
                        if content:  # Only load if file is not empty
                            self.trades = json.loads(content)
                        else:
                            self.trades = {}
                    except json.JSONDecodeError:
                        self.trades = {}
            else:
                # Create directory if it doesn't exist
                os.makedirs(os.path.dirname(self._trades_file), exist_ok=True)
                self.trades = {}
                self._save_trades()
        except Exception as e:
            print(f"Error loading trades: {str(e)}")
            self.trades = {}
            self._save_trades()

    def _save_trades(self):
        """Save trades to file"""
        try:
            with open(self._trades_file, 'w') as f:
                json.dump(self.trades, f, indent=2)
        except Exception as e:
            print(f"Error saving trades: {str(e)}")

    def add_trade(self, token_address: str, buy_price: float, transaction_link: str, amount_in_sol: float, token_amount: float, result: str = "success") -> Dict:
        """Add a new trade"""
        # Load latest trades from file
        self._load_trades()
        
        trade_id = f"trade_{len(self.trades) + 1}"
        
        trade = {
            "id": trade_id,
            "date_time": datetime.utcnow().isoformat(),
            "token_address": token_address,
            "buy_price": buy_price,
            "close_price": None,
            "current_price": buy_price,
            "profit": 0.0,
            "profit_percentage": 0.0,
            "status": "active",
            "result": result,  # This will be either "success" or "fail"
            "transaction_link": transaction_link,
            "amount_in_sol": amount_in_sol,
            "token_amount": token_amount,
            "wallet_group": None
        }
        
        self.trades[trade_id] = trade
        self._save_trades()
        return trade

    async def update_trade_prices(self):
        """Update current prices for all active trades"""
        for trade_id, trade in self.trades.items():
            if trade["status"] == "active":
                try:
                    price_data = await price_service.get_token_price(trade["token_address"])
                    current_price = price_data["price"]
                    
                    trade["current_price"] = current_price
                    
                    # Calculate profit
                    buy_price = trade["buy_price"]
                    profit = (current_price - buy_price) * trade["token_amount"]
                    profit_percentage = ((current_price - buy_price) / buy_price) * 100
                    
                    trade["profit"] = profit
                    trade["profit_percentage"] = profit_percentage
                    
                except Exception as e:
                    print(f"Error updating price for trade {trade_id}: {str(e)}")
        
        self._save_trades()

    def close_trade(self, trade_id: str, close_price: float) -> Optional[Dict]:
        """Close a trade with final price"""
        if trade_id not in self.trades:
            return None
            
        trade = self.trades[trade_id]
        if trade["status"] != "active":
            return None
            
        trade["status"] = "closed"
        trade["close_price"] = close_price
        
        # Calculate final profit
        buy_price = trade["buy_price"]
        profit = (close_price - buy_price) * trade["token_amount"]
        profit_percentage = ((close_price - buy_price) / buy_price) * 100
        
        trade["profit"] = profit
        trade["profit_percentage"] = profit_percentage
        trade["result"] = "success" if profit > 0 else "fail"
        
        self._save_trades()
        return trade

    def get_trade(self, trade_id: str) -> Optional[Dict]:
        """Get a specific trade"""
        return self.trades.get(trade_id)

    def get_all_trades(self) -> List[Dict]:
        """Get all trades"""
        return list(self.trades.values())

    def get_active_trades(self) -> List[Dict]:
        """Get active trades"""
        return [trade for trade in self.trades.values() if trade["status"] == "active"]

    def get_trades_in_timeframe(self, start_time: Optional[datetime] = None, end_time: Optional[datetime] = None) -> List[Dict]:
        """Get trades within a specific timeframe"""
        trades = list(self.trades.values())
        
        if start_time:
            trades = [t for t in trades if datetime.fromisoformat(t["date_time"]) >= start_time]
        if end_time:
            trades = [t for t in trades if datetime.fromisoformat(t["date_time"]) <= end_time]
            
        return trades

    def get_trade_statistics(self, start_time: Optional[datetime] = None, end_time: Optional[datetime] = None) -> Dict:
        """Get trading statistics within a timeframe"""
        trades = self.get_trades_in_timeframe(start_time, end_time)
        
        total_trades = len(trades)
        if total_trades == 0:
            return {
                "total_trades": 0,
                "successful_trades": 0,
                "failed_trades": 0,
                "active_trades": 0,
                "closed_trades": 0,
                "win_rate": 0,
                "total_profit": 0,
                "average_profit": 0,
                "best_trade": None,
                "worst_trade": None,
                "start_time": start_time.isoformat() if start_time else None,
                "end_time": end_time.isoformat() if end_time else None
            }
        
        successful_trades = len([t for t in trades if t["result"] == "success"])
        failed_trades = len([t for t in trades if t["result"] == "fail"])
        active_trades = len([t for t in trades if t["status"] == "active"])
        closed_trades = len([t for t in trades if t["status"] == "closed"])
        
        # Calculate profits
        profits = [t["profit"] for t in trades if t["profit"] is not None]
        total_profit = sum(profits) if profits else 0
        average_profit = total_profit / len(profits) if profits else 0
        
        # Find best and worst trades
        profit_trades = [t for t in trades if t["profit"] is not None]
        best_trade = max(profit_trades, key=lambda x: x["profit"]) if profit_trades else None
        worst_trade = min(profit_trades, key=lambda x: x["profit"]) if profit_trades else None
        
        return {
            "total_trades": total_trades,
            "successful_trades": successful_trades,
            "failed_trades": failed_trades,
            "active_trades": active_trades,
            "closed_trades": closed_trades,
            "win_rate": (successful_trades / total_trades) * 100 if total_trades > 0 else 0,
            "total_profit": total_profit,
            "average_profit": average_profit,
            "best_trade": best_trade,
            "worst_trade": worst_trade,
            "start_time": start_time.isoformat() if start_time else None,
            "end_time": end_time.isoformat() if end_time else None
        }

    def log_partial_sale(self, trade_id: str, percentage: float, amount: float, price: float, transaction_link: str) -> Optional[Dict]:
        """Log a partial sale for a trade"""
        if trade_id not in self.trades:
            print(f"Trade {trade_id} not found")
            return None
            
        trade = self.trades[trade_id]
        
        # Initialize partial_sales list if it doesn't exist
        if 'partial_sales' not in trade:
            trade['partial_sales'] = []
            
        # Create partial sale record
        partial_sale = {
            "date_time": datetime.utcnow().isoformat(),
            "percentage": percentage,
            "amount": amount,
            "price": price,
            "transaction_link": transaction_link,
            "profit": (price - trade["buy_price"]) * amount,
            "profit_percentage": ((price - trade["buy_price"]) / trade["buy_price"]) * 100
        }
        
        # Update trade token amount
        trade["token_amount"] -= amount
        
        # Add partial sale record
        trade['partial_sales'].append(partial_sale)
        
        # Save changes
        self._save_trades()
        
        return trade

# Global instance - ensure it's created after class definition
trade_manager = TradeManager()

trade_bp = Blueprint('trade', __name__)

@trade_bp.route('/api/trades', methods=['GET'])
def get_trades():
    try:
        trades_file = os.path.join(os.path.dirname(__file__), 'ui', 'src', 'data', 'tracked_trades.json')
        with open(trades_file, 'r') as f:
            trades = json.load(f)
        return jsonify(list(trades.values()))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@trade_bp.route('/api/trades/<trade_id>', methods=['GET'])
def get_trade(trade_id):
    try:
        trades_file = os.path.join(os.path.dirname(__file__), 'ui', 'src', 'data', 'tracked_trades.json')
        with open(trades_file, 'r') as f:
            trades = json.load(f)
        trade = trades.get(trade_id)
        if trade:
            return jsonify(trade)
        return jsonify({'error': 'Trade not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@trade_bp.route('/api/trades', methods=['POST'])
def add_trade():
    try:
        trade_data = request.json
        trades_file = os.path.join(os.path.dirname(__file__), 'ui', 'src', 'data', 'tracked_trades.json')
        
        # Load existing trades
        with open(trades_file, 'r') as f:
            trades = json.load(f)
        
        # Generate new trade ID
        trade_id = f"tracked_trade_{len(trades) + 1}"
        
        # Add timestamp if not present
        if 'date_time' not in trade_data:
            trade_data['date_time'] = datetime.now().isoformat()
        
        # Add the new trade
        trades[trade_id] = trade_data
        
        # Save back to file
        with open(trades_file, 'w') as f:
            json.dump(trades, f, indent=2)
        
        return jsonify({
            'success': True,
            'trade_id': trade_id,
            'trade': trade_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
