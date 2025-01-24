import asyncio
from sell_max import sell_max_token_balance
from base58 import b58decode
from solders.keypair import Keypair
from config import WALLET_PRIVATE_KEY

async def test_sell():
    # Initialize wallet
    private_key_bytes = b58decode(WALLET_PRIVATE_KEY)
    wallet_keypair = Keypair.from_bytes(private_key_bytes)
    
    # Test token mint (PUMP token)
    token_mint = "8nKP8Vc72pRZB6bhCy8D1UYf6ZjwYT859i6awyinpump"
    
    # Execute sell
    result = await sell_max_token_balance(wallet_keypair, token_mint)
    print(f"Result: {result}")

if __name__ == "__main__":
    asyncio.run(test_sell())
