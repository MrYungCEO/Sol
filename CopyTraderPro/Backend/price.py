## Price Checking
import requests

def get_token_price(token_address, api_key):
    """
    Fetch the price of a Solana token using the Solana Tracker Public Data API.

    Args:
        token_address (str): The public address of the token.
        api_key (str): Your Solana Tracker API key.

    Returns:
        float: The price of the token in USD.
        None: If the API request fails or the token is not found.
    """
    # Define the base URL of the Solana Tracker Public Data API
    base_url = "https://data.solanatracker.io"

    # Set the request headers with your API key
    headers = {
        "accept": "application/json",
        "x-api-key": api_key
    }

    try:
        # Construct the request URL
        url = f"{base_url}/price?token={token_address}"

        # Make the API request
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise an error for HTTP error codes

        # Parse the JSON response
        data = response.json()

        # Extract the token price in USD
        if "price" in data:
            return data["price"]
        else:
            print("Price information not available in the API response.")
            return None

    except requests.exceptions.RequestException as e:
        print(f"An error occurred while fetching the token price: {e}")
        return None

if __name__ == "__main__":
    # Replace with the token address you want to check
    token_address = "9DHe3pycTuymFk4H4bbPoAJ4hQrr2kaLDF6J6aAKpump"  # SOL token address

    # Replace with your Solana Tracker API key
    api_key = "8d88754c-64e7-4482-b293-28b4f3579f5c"

    print(f"Fetching price for token: {token_address}...")
    price = get_token_price(token_address, api_key)

    if price is not None:
        print(f"The current price of the token is ${price:.2f} USD.")
    else:
        print("Failed to fetch the token price.")