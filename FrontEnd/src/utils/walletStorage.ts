import type { SavedWallet } from '../types/trades';

const STORAGE_KEY = 'saved_wallets';

export const getSavedWallets = (): SavedWallet[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading saved wallets:', error);
    return [];
  }
};

export const saveWallet = (wallet: SavedWallet): SavedWallet[] => {
  try {
    const wallets = getSavedWallets();
    const exists = wallets.find(w => w.address === wallet.address);
    
    if (exists) {
      // Update existing wallet
      const updated = wallets.map(w => 
        w.address === wallet.address ? { ...w, ...wallet } : w
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } else {
      // Add new wallet
      const updated = [...wallets, wallet];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    }
  } catch (error) {
    console.error('Error saving wallet:', error);
    return [];
  }
};

export const deleteWallet = (address: string): SavedWallet[] => {
  try {
    const wallets = getSavedWallets();
    const updated = wallets.filter(w => w.address !== address);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error deleting wallet:', error);
    return [];
  }
};