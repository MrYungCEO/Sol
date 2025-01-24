import httpx
import json
from decimal import Decimal

WALLET_ADDRESS = "HAEcViATgps9PbxruNhVN17o6Cic3V3kKzDuwrRaMEvj"
RPC_URL = "https://api.mainnet-beta.solana.com"

def calculate_percentage(token_address: str, percentage: float) -> Decimal:
    """
    Calculate the specified percentage of token balance in the connected Solana wallet
    
    Args:
        token_address (str): The mint address of the SPL token
        percentage (float): The percentage to calculate (0-100)
    
    Returns:
        Decimal: The calculated amount in token decimal precision
    """
    try:
        # Prepare the request
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTokenAccountsByOwner",
            "params": [
                WALLET_ADDRESS,
                {
                    "mint": token_address
                },
                {
                    "encoding": "jsonParsed"
                }
            ]
        }
        
        # Make the request
        response = httpx.post(RPC_URL, json=payload)
        data = response.json()
        
        if "result" not in data or not data["result"]["value"]:
            raise ValueError(f"No token account found for {token_address}")
        
        # Get the token account info
        token_account = data["result"]["value"][0]
        account_data = token_account["account"]["data"]["parsed"]["info"]
        
        # Get balance from account data
        balance = int(account_data["tokenAmount"]["amount"])
        decimals = account_data["tokenAmount"]["decimals"]
        
        # Convert percentage to decimal (e.g., 50% -> 0.5)
        percentage_decimal = Decimal(str(percentage)) / Decimal('100')
        
        # Calculate the amount
        amount = Decimal(str(balance)) * percentage_decimal
        
        # Return the amount in token's decimal precision
        return amount / Decimal(str(10 ** decimals))
        
    except Exception as e:
        raise Exception(f"Error getting token balance: {str(e)}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 3:
        print("Usage: python calc_size.py <token_mint_address> <percentage>")
        sys.exit(1)
        
    token_address = sys.argv[1]
    percentage = float(sys.argv[2])
    
    try:
        result = calculate_percentage(token_address, percentage)
        print(f"Calculated amount: {result}")
    except Exception as e:
        print(f"Error: {str(e)}")
