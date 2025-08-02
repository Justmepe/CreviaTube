// Trading Platform API Integration Services
import { z } from "zod";

// MetaTrader 4/5 API Integration via MetaApi
export class MetaTraderAPI {
  private apiToken: string;
  private accountId: string;
  
  constructor(apiToken: string, accountId: string) {
    this.apiToken = apiToken;
    this.accountId = accountId;
  }
  
  async getAccountInformation() {
    const response = await fetch(
      `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${this.accountId}/account-information`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`MetaTrader API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getPositions() {
    const response = await fetch(
      `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${this.accountId}/positions`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`MetaTrader Positions API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getTradeHistory(startTime?: string, endTime?: string) {
    const params = new URLSearchParams();
    if (startTime) params.append('startTime', startTime);
    if (endTime) params.append('endTime', endTime);
    
    const response = await fetch(
      `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${this.accountId}/history-deals?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`MetaTrader History API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Interactive Brokers TWS API Integration
export class InteractiveBrokersAPI {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(apiKey: string, baseUrl = 'https://api.ibkr.com/v1/api') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }
  
  async getAccountSummary(accountId: string) {
    const response = await fetch(
      `${this.baseUrl}/portfolio/${accountId}/summary`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Interactive Brokers API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getAccountLedger(accountId: string) {
    const response = await fetch(
      `${this.baseUrl}/portfolio/${accountId}/ledger`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Interactive Brokers Ledger API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getTrades(accountId: string) {
    const response = await fetch(
      `${this.baseUrl}/iserver/account/trades`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Interactive Brokers Trades API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// OANDA API Integration
export class OANDAAPI {
  private apiToken: string;
  private accountId: string;
  private baseUrl: string;
  
  constructor(apiToken: string, accountId: string, environment: 'live' | 'practice' = 'practice') {
    this.apiToken = apiToken;
    this.accountId = accountId;
    this.baseUrl = environment === 'live' 
      ? 'https://api-fxtrade.oanda.com/v3' 
      : 'https://api-fxpractice.oanda.com/v3';
  }
  
  async getAccountDetails() {
    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`OANDA API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getAccountSummary() {
    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/summary`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`OANDA Summary API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getPositions() {
    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/positions`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`OANDA Positions API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getTransactionHistory(fromTime?: string, toTime?: string) {
    const params = new URLSearchParams();
    if (fromTime) params.append('from', fromTime);
    if (toTime) params.append('to', toTime);
    
    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/transactions?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`OANDA Transactions API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Alpaca Trading API Integration
export class AlpacaAPI {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;
  
  constructor(apiKey: string, secretKey: string, environment: 'live' | 'paper' = 'paper') {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.baseUrl = environment === 'live' 
      ? 'https://api.alpaca.markets/v2' 
      : 'https://paper-api.alpaca.markets/v2';
  }
  
  async getAccount() {
    const response = await fetch(
      `${this.baseUrl}/account`,
      {
        headers: {
          'APCA-API-KEY-ID': this.apiKey,
          'APCA-API-SECRET-KEY': this.secretKey,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getPositions() {
    const response = await fetch(
      `${this.baseUrl}/positions`,
      {
        headers: {
          'APCA-API-KEY-ID': this.apiKey,
          'APCA-API-SECRET-KEY': this.secretKey,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Alpaca Positions API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getOrders(status?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    
    const response = await fetch(
      `${this.baseUrl}/orders?${params}`,
      {
        headers: {
          'APCA-API-KEY-ID': this.apiKey,
          'APCA-API-SECRET-KEY': this.secretKey,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Alpaca Orders API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Trading Metrics Aggregator
export class TradingMetricsAggregator {
  async aggregateMetrics(tradingAccounts: any) {
    const metrics: Record<string, any> = {};
    
    try {
      if (tradingAccounts?.brokers) {
        for (const broker of tradingAccounts.brokers) {
          switch (broker.platform) {
            case 'mt4':
            case 'mt5':
              if (broker.apiKey) {
                const mtAPI = new MetaTraderAPI(broker.apiKey, broker.accountId);
                const accountInfo = await mtAPI.getAccountInformation();
                const positions = await mtAPI.getPositions();
                const history = await mtAPI.getTradeHistory();
                
                metrics[broker.name] = {
                  accountBalance: accountInfo.balance,
                  equity: accountInfo.equity,
                  margin: accountInfo.margin,
                  freeMargin: accountInfo.freeMargin,
                  totalTrades: history.length,
                  openPositions: positions.length,
                  profitLoss: this.calculateProfitLoss(history),
                  winRate: this.calculateWinRate(history),
                };
              }
              break;
              
            case 'proprietary':
              // Handle broker-specific proprietary APIs
              if (broker.name === 'OANDA' && broker.apiKey) {
                const oandaAPI = new OANDAAPI(broker.apiKey, broker.accountId);
                const account = await oandaAPI.getAccountDetails();
                const positions = await oandaAPI.getPositions();
                
                metrics[broker.name] = {
                  accountBalance: parseFloat(account.account.balance),
                  unrealizedPL: parseFloat(account.account.unrealizedPL),
                  marginUsed: parseFloat(account.account.marginUsed),
                  positionValue: parseFloat(account.account.positionValue),
                  openPositions: positions.positions.length,
                };
              }
              
              if (broker.name === 'Alpaca' && broker.apiKey) {
                const alpacaAPI = new AlpacaAPI(broker.apiKey, broker.accountId);
                const account = await alpacaAPI.getAccount();
                const positions = await alpacaAPI.getPositions();
                
                metrics[broker.name] = {
                  accountBalance: parseFloat(account.cash),
                  portfolioValue: parseFloat(account.portfolio_value),
                  buyingPower: parseFloat(account.buying_power),
                  daytradeCount: account.daytrade_count,
                  openPositions: positions.length,
                };
              }
              break;
          }
        }
      }
    } catch (error) {
      console.error('Trading metrics aggregation error:', error);
      throw error;
    }
    
    return metrics;
  }
  
  private calculateProfitLoss(trades: any[]): number {
    return trades.reduce((total, trade) => {
      return total + (trade.profit || 0);
    }, 0);
  }
  
  private calculateWinRate(trades: any[]): number {
    if (trades.length === 0) return 0;
    const winningTrades = trades.filter(trade => (trade.profit || 0) > 0).length;
    return (winningTrades / trades.length) * 100;
  }
}

// Trading Metrics Schema
export const tradingMetricsSchema = z.object({
  brokerId: z.string(),
  metrics: z.object({
    totalDeposits: z.number().optional(),
    totalWithdrawals: z.number().optional(),
    totalTrades: z.number().optional(),
    profitLoss: z.number().optional(),
    winRate: z.number().optional(),
    activeClients: z.number().optional(),
    referredUsers: z.number().optional(),
    accountBalance: z.number().optional(),
    tradingVolume: z.number().optional(),
  }),
});

export type TradingMetrics = z.infer<typeof tradingMetricsSchema>;