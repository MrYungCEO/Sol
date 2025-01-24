import { API_BASE_URL } from '../config/api';

export class PriceService {
  static async getTokenPrice(tokenAddress: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/price?address=${tokenAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch price');
      }
      const data = await response.json();
      return {
        price: data.data?.price || 0,
        volume24h: data.data?.volume24h,
        marketCap: data.data?.marketCap,
        priceChange24h: data.data?.priceChange24h
      };
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  }

  static async getTokenPrices(tokenAddresses: string[]) {
    try {
      const response = await fetch(`${API_BASE_URL}/price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token_addresses: tokenAddresses })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      return null;
    }
  }
}