import { 
  DollarSign, 
  Percent, 
  Users, 
  TrendingUp,
  Home,
  Copy,
  History,
  Settings,
  Rocket
} from 'lucide-react';
import type { Trader, Stat, NavItem } from '../types';
import tradesData from './trades.json';

// Calculate stats from trades data
const trades = Object.values(tradesData);
const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
const successfulTrades = trades.filter(trade => trade.result === 'success').length;
const winRate = (successfulTrades / trades.length) * 100;
const activeTrades = trades.filter(trade => trade.status === 'active').length;
const roi = (totalProfit / trades.reduce((sum, trade) => sum + trade.amount_in_sol, 0)) * 100;

export const stats: Stat[] = [
  {
    title: "Total Profit",
    value: `${totalProfit.toFixed(4)} SOL`,
    change: `${((totalProfit / trades.length) * 100).toFixed(2)}%`,
    icon: DollarSign,
    positive: totalProfit > 0
  },
  {
    title: "Win Rate",
    value: `${winRate.toFixed(1)}%`,
    change: `${((successfulTrades / trades.length) * 100).toFixed(1)}%`,
    icon: Percent,
    positive: winRate > 50
  },
  {
    title: "Active Trades",
    value: activeTrades.toString(),
    change: `${((activeTrades / trades.length) * 100).toFixed(1)}%`,
    icon: Users,
    positive: activeTrades > 0
  },
  {
    title: "ROI",
    value: `${roi.toFixed(2)}%`,
    change: `${((roi / trades.length) * 100).toFixed(2)}%`,
    icon: TrendingUp,
    positive: roi > 0
  }
];

export const navItems: NavItem[] = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: Copy, label: "Copy Trading", path: "/copy-trading" },
  { icon: History, label: "History", path: "/history" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export const traders: Trader[] = [
  {
    name: "Top Trader 1",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    roi: 156.4,
    followers: 1234,
    winRate: 87.5,
    trending: true
  }
];