import requests
import json
from datetime import datetime
from colorama import Fore, Style
from typing import Dict, Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DISCORD_WEBHOOK_URL = os.getenv('DISCORD_WEBHOOK_URL')

def format_number(num: float) -> str:
    """Format number with appropriate decimal places"""
    if num >= 1000000:
        return f"{num/1000000:.2f}M"
    elif num >= 1000:
        return f"{num/1000:.2f}K"
    else:
        return f"{num:.4f}"

def get_emoji_for_type(trade_type: str) -> str:
    """Get appropriate emoji for trade type"""
    return "🟢" if trade_type == "buy" else "🔴"

def get_emoji_for_profit(profit: float) -> str:
    """Get appropriate emoji based on profit percentage"""
    if profit > 5:
        return "🚀"
    elif profit > 0:
        return "📈"
    elif profit < -5:
        return "💥"
    elif profit < 0:
        return "📉"
    else:
        return "➖"

def get_birdeye_chart_url(token_address: str) -> str:
    """Get Birdeye chart URL for token"""
    return f"https://birdeye.so/token/{token_address}?chain=solana"

def get_birdeye_chart_image(token_address: str) -> str:
    """Get Birdeye chart image URL for token"""
    # Using public chart API for better Discord embedding
    return f"https://public-api.birdeye.so/public/chart_image?address={token_address}"

def create_discord_embed(trade: Dict) -> Dict:
    """Create a Discord embed for a trade"""
    token_address = trade.get('tokenAddress', '')
    token_short = f"{token_address[:4]}...{token_address[-4:]}"
    trade_type = trade.get('type', 'unknown')
    value = trade.get('value', 0)

    embed = {
        "title": f"{get_emoji_for_type(trade_type)} New {trade_type.upper()} Trade Detected",
        "description": f"Token: `{token_short}`\nValue: {format_number(value)}",
        "color": 65280 if trade_type == "buy" else 16711680,  # Green for buy, Red for sell
        "fields": [
            {
                "name": "Token Address",
                "value": f"[{token_address}]({get_birdeye_chart_url(token_address)})",
                "inline": False
            }
        ],
        "timestamp": datetime.utcnow().isoformat(),
        "footer": {
            "text": "BackupSnipe Trade Tracker"
        }
    }

    return embed

def send_trade_notification(trade: Dict, webhook_url: Optional[str] = None) -> bool:
    """Send trade notification to Discord webhook"""
    try:
        url = webhook_url or DISCORD_WEBHOOK_URL
        if not url:
            print(f"{Fore.RED}Error: No Discord webhook URL provided{Style.RESET_ALL}")
            return False
            
        embed = create_discord_embed(trade)
        
        # Add components for clickable buttons (will appear below embed)
        components = {
            "type": 1,
            "components": [
                {
                    "type": 2,
                    "style": 5,  # Link button
                    "label": "📊 Birdeye Chart",
                    "url": get_birdeye_chart_url(trade.get('tokenAddress', ''))
                },
                {
                    "type": 2,
                    "style": 5,
                    "label": "🔍 Solscan",
                    "url": f"https://solscan.io/token/{trade.get('tokenAddress', '')}"
                }
            ]
        }
        
        payload = {
            "embeds": [embed],
            "components": [components]
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 204:
            print(f"{Fore.GREEN}Successfully sent Discord notification{Style.RESET_ALL}")
            return True
        else:
            print(f"{Fore.RED}Failed to send Discord notification: {response.status_code}{Style.RESET_ALL}")
            return False
            
    except Exception as e:
        print(f"{Fore.RED}Error sending Discord notification: {str(e)}{Style.RESET_ALL}")
        return False

def load_processed_trades() -> set:
    """Load previously processed trade IDs from file"""
    try:
        if os.path.exists('processed_trades.json'):
            with open('processed_trades.json', 'r') as f:
                return set(json.load(f))
    except Exception as e:
        print(f"{Fore.YELLOW}Warning: Could not load processed trades: {str(e)}{Style.RESET_ALL}")
    return set()

def save_processed_trades(trade_ids: set):
    """Save processed trade IDs to file"""
    try:
        with open('processed_trades.json', 'w') as f:
            json.dump(list(trade_ids), f)
    except Exception as e:
        print(f"{Fore.YELLOW}Warning: Could not save processed trades: {str(e)}{Style.RESET_ALL}")

def watch_trades_file(webhook_url: Optional[str] = None):
    """Watch tracked_trades.json for changes and send notifications"""
    print(f"{Fore.CYAN}Starting trade notification service...{Style.RESET_ALL}")
    print(f"{Fore.CYAN}Watching file: C:\\Users\\yunge\\Desktop\\backupsnipe\\Core\\ui\\src\\data\\tracked_trades.json{Style.RESET_ALL}")
    
    processed_trades = load_processed_trades()
    print(f"{Fore.CYAN}Loaded {len(processed_trades)} previously processed trades{Style.RESET_ALL}")
    
    while True:
        try:
            if os.path.exists(r'C:\Users\yunge\Desktop\backupsnipe\Core\ui\src\data\tracked_trades.json'):
                with open(r'C:\Users\yunge\Desktop\backupsnipe\Core\ui\src\data\tracked_trades.json', 'r') as f:
                    trades = json.load(f)
                
                # Get all trade IDs
                current_trade_ids = set(trades.keys())
                
                # Find new trades (ones we haven't processed before)
                new_trade_ids = current_trade_ids - processed_trades
                
                # Send notifications for new trades
                for trade_id in new_trade_ids:
                    try:
                        trade_data = trades[trade_id]
                        if webhook_url:
                            send_trade_notification(trade_data, webhook_url)
                            processed_trades.add(trade_id)
                            save_processed_trades(processed_trades)
                    except Exception as e:
                        print(f"{Fore.RED}Error processing trade {trade_id}: {str(e)}{Style.RESET_ALL}")
                    
        except json.JSONDecodeError as e:
            print(f"{Fore.RED}Error reading trades file (invalid JSON): {str(e)}{Style.RESET_ALL}")
        except Exception as e:
            print(f"{Fore.RED}Error watching trades file: {str(e)}{Style.RESET_ALL}")
            
        import time
        time.sleep(1)  # Check every second

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--webhook', type=str, help='Discord webhook URL')
    args = parser.parse_args()
    
    watch_trades_file(args.webhook)
