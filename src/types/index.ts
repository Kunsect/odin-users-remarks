export interface UserRemark {
  userId: string
  username: string
  remark: string
}

export interface TradeData {
  totalBuy: number
  totalSell: number
  totalProfit: number
  avgBuy: number
  avgSell: number
}

export interface PageInfo {
  type: 'token' | 'user' | null
  id: string | null
}

export interface Activity {
  time: string
  token: {
    id: string
    ticker: string
    name: string
    image: string
    divisibility: number
    decimals: number
    rune_id: string
    trading: boolean
    deposits: boolean
    withdrawals: boolean
  }
  amount_token: number
  amount_btc: number
  action: 'BUY' | 'SELL'
}

export interface ActivityResponse {
  count: number
  data: Activity[]
  limit: number
  page: number
}

export interface TokenStats {
  totalBuy: number
  totalSell: number
  totalBuyBtc: number
  totalSellBtc: number
  avgBuyPriceSats: number
  avgSellPriceSats: number
  totalProfitLoss: number
  roi: number
}
