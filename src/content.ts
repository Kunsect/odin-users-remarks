import type { PlasmoCSConfig } from 'plasmo'
import { logMessage } from '~utils'
import type { PageInfo, Activity, ActivityResponse, TokenStats } from '~/types'
import { SELECTORS, API, STYLES, COLORS } from '~/constants'
import { StorageService } from '~/services/storage'

export const config: PlasmoCSConfig = {
  matches: ['https://odin.fun/*']
}

// 页面路由管理模块
class PageRouter {
  private currentInfo: PageInfo = { type: null, id: null }
  private pageChangeHandlers: ((info: PageInfo) => void)[] = []
  private _lastUrl = window.location.href

  constructor() {
    this.extractPageInfo()
  }

  getCurrentPage(): PageInfo {
    return { ...this.currentInfo }
  }

  extractPageInfo(): PageInfo {
    const url = window.location.pathname

    if (url.startsWith('/token/')) {
      this.currentInfo = { type: 'token', id: url.replace('/token/', '') }
    } else if (url.startsWith('/user/')) {
      this.currentInfo = { type: 'user', id: url.replace('/user/', '') }
    } else {
      this.currentInfo = { type: null, id: null }
    }

    console.log(`Current page: ${this.currentInfo.type}, ID: ${this.currentInfo.id}`)
    return { ...this.currentInfo }
  }

  setupUrlChangeListener() {
    // 监听 History API 的 pushState 方法
    const originalPushState = history.pushState
    history.pushState = (...args) => {
      const result = originalPushState.apply(history, args)
      this.handleUrlChange()
      return result
    }

    // 监听浏览器的前进后退
    window.addEventListener('popstate', () => {
      console.log('popstate event, URL changed to', window.location.href)
      this.handleUrlChange()
    })

    // 监听整个文档的变化，因为 SPA 通常会修改 DOM
    const urlObserver = new MutationObserver(() => {
      const currentUrl = window.location.href
      if (currentUrl !== this._lastUrl) {
        // 检查是否只是参数变化
        const currentPath = new URL(currentUrl).pathname
        const lastPath = new URL(this._lastUrl).pathname
        if (currentPath === lastPath) return

        this._lastUrl = currentUrl
        this.handleUrlChange()
      }
    })

    urlObserver.observe(document, {
      subtree: true,
      childList: true
    })
  }

  private handleUrlChange() {
    const newInfo = this.extractPageInfo()
    this.notifyPageChangeHandlers(newInfo)
  }

  onPageChange(handler: (info: PageInfo) => void) {
    this.pageChangeHandlers.push(handler)
    handler(this.currentInfo)
    return () => {
      this.pageChangeHandlers = this.pageChangeHandlers.filter((h) => h !== handler)
    }
  }

  private notifyPageChangeHandlers(info: PageInfo) {
    this.pageChangeHandlers.forEach((handler) => handler(info))
  }
}

// Token页面处理模块
class TokenPageHandler {
  private observer: MutationObserver | null = null
  private priceObserver: MutationObserver | null = null
  private remarkStorage: StorageService
  private userStatsMap: Map<string, TokenStats> = new Map()
  private currentTokenPrice: number | null = null
  private satToUsd: number | null = null

  constructor(remarkStorage: StorageService) {
    this.remarkStorage = remarkStorage
    this.initSatToUsd()
  }

  private async initSatToUsd() {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      const data = await response.json()
      if (data.bitcoin?.usd) this.satToUsd = data.bitcoin.usd / API.BTC_DIVISOR
    } catch (error) {
      console.error('Error fetching sat to USD price:', error)
    }
  }

  private getCurrentTokenPrice(): number | null {
    const priceContainers = document.querySelectorAll(SELECTORS.priceContainer)

    for (const container of priceContainers) {
      const titleElement = container.querySelector(SELECTORS.priceTitle)
      if (titleElement?.textContent?.trim() === 'Price') {
        const priceElement = container.querySelector(SELECTORS.priceElement)
        if (priceElement) {
          const priceText = priceElement.textContent?.trim()
          if (priceText) {
            const price = parseFloat(priceText)
            return Number(price.toFixed(2))
          }
        }
      }
    }

    return null
  }

  private async fetchAllUserActivities(userId: string): Promise<Activity[]> {
    try {
      const url = `${API.BASE_URL}/user/${userId}/activity?page=1&limit=5000&sort=time:desc`
      const response = await fetch(url)
      const { data } = (await response.json()) as ActivityResponse
      return data
    } catch (error) {
      console.error(`Error fetching activities for user ${userId}:`, error)
      return []
    }
  }

  private calculateProfitLossAndRoi(
    stats: TokenStats,
    currentHolding: number
  ): { totalProfitLoss: number; roi: number } {
    const buyValueOfSoldTokens = (stats.avgBuyPriceSats / API.BTC_DIVISOR) * stats.totalSell
    const realizedProfitLoss = stats.totalSellBtc - buyValueOfSoldTokens

    const currentValueOfHolding = (this.currentTokenPrice / API.BTC_DIVISOR) * currentHolding
    const buyValueOfHolding = (stats.avgBuyPriceSats / API.BTC_DIVISOR) * currentHolding
    const unrealizedProfitLoss = currentValueOfHolding - buyValueOfHolding

    const totalProfitLoss = realizedProfitLoss + unrealizedProfitLoss

    const totalInvestment = stats.totalBuyBtc
    const roi = totalInvestment > 0 ? Number(((totalProfitLoss / totalInvestment) * 100).toFixed(2)) : 0

    return { totalProfitLoss, roi }
  }

  private async calculateTokenStats(activities: Activity[], tokenId: string): Promise<TokenStats | null> {
    const tokenActivities = activities.filter((activity) => activity.token.id === tokenId)
    if (!tokenActivities.length) return null

    const stats: TokenStats = {
      totalBuy: 0,
      totalSell: 0,
      totalBuyBtc: 0,
      totalSellBtc: 0,
      avgBuyPriceSats: 0,
      avgSellPriceSats: 0,
      totalProfitLoss: 0,
      roi: 0
    }

    tokenActivities.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    // 计算买入卖出总量
    tokenActivities.forEach((activity) => {
      const realAmountToken = Math.floor(activity.amount_token / API.API_MULTIPLIER)
      const realAmountBtc = activity.amount_btc / API.API_MULTIPLIER

      if (activity.action === 'BUY') {
        stats.totalBuy += realAmountToken
        stats.totalBuyBtc += realAmountBtc
      } else if (activity.action === 'SELL') {
        stats.totalSell += realAmountToken
        stats.totalSellBtc += realAmountBtc
      }
    })

    if (stats.totalBuy > 0) {
      const rawAvgBuyPrice = (stats.totalBuyBtc / stats.totalBuy) * API.BTC_DIVISOR
      stats.avgBuyPriceSats = Number(rawAvgBuyPrice.toFixed(2))
    }
    if (stats.totalSell > 0) {
      const rawAvgSellPrice = (stats.totalSellBtc / stats.totalSell) * API.BTC_DIVISOR
      stats.avgSellPriceSats = Number(rawAvgSellPrice.toFixed(2))
    }

    const currentHolding = stats.totalBuy - stats.totalSell
    const { totalProfitLoss, roi } = this.calculateProfitLossAndRoi(stats, currentHolding)
    stats.totalProfitLoss = totalProfitLoss
    stats.roi = roi

    return stats
  }

  start() {
    this.currentTokenPrice = null
    this.userStatsMap.clear()
    this.processAllUserLinks()
    this.setupObserver()
    this.setupPriceObserver()
  }

  private setupObserver() {
    if (this.observer) this.observer.disconnect()

    this.observer = new MutationObserver(() => {
      this.processAllUserLinks() // 当页面发生变化时，处理所有链接
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href']
    })
  }

  private setupPriceObserver() {
    if (this.priceObserver) {
      this.priceObserver.disconnect()
    }

    this.priceObserver = new MutationObserver(() => {
      const newPrice = this.getCurrentTokenPrice()

      if (newPrice && newPrice !== this.currentTokenPrice) {
        console.log(`listen new price: ${newPrice}`)
        this.currentTokenPrice = newPrice

        for (const [userId, stats] of this.userStatsMap.entries()) {
          const currentHolding = stats.totalBuy - stats.totalSell
          const { totalProfitLoss, roi } = this.calculateProfitLossAndRoi(stats, currentHolding)
          stats.totalProfitLoss = totalProfitLoss
          stats.roi = roi
        }

        this.updateAllTradeInfo()
      }
    })

    // 创建一个观察器来等待价格元素出现
    const containerObserver = new MutationObserver((mutations, observer) => {
      const priceContainers = document.querySelectorAll(
        '.rounded-lg.border.border-odin-border.p-\\[10px\\].text-center'
      )
      for (const container of priceContainers) {
        const titleElement = container.querySelector('span.text-xxs.uppercase')
        if (titleElement?.textContent?.trim() === 'Price') {
          const priceElement = container.querySelector(
            'span.inline-flex.items-center.gap-1.text-white strong span span[title]'
          )
          if (priceElement) {
            this.priceObserver.observe(priceElement, {
              characterData: true,
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['title']
            })
            observer.disconnect()
            break
          }
        }
      }
    })

    containerObserver.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  private processAllUserLinks() {
    const allLinks = document.querySelectorAll('a[href^="/user/"]')

    allLinks.forEach((link) => {
      if (link instanceof HTMLAnchorElement) {
        const href = link.getAttribute('href')
        if (!href) return

        const userId = href.replace('/user/', '')
        const processedUserId = link.getAttribute('data-processed-user-id')

        // 只有当链接未处理过或者用户 ID 发生变化时才处理
        if (processedUserId !== userId) this.processLink(link)
      }
    })
  }

  /**
   * 处理单个链接
   * 应用备注并设置样式
   */
  private async processLink(link: HTMLAnchorElement) {
    const href = link.getAttribute('href')
    if (!href || !href.startsWith('/user/')) return

    const userId = href.replace('/user/', '')

    if (link.getAttribute('data-processed-user-id') === userId) return

    link.setAttribute('data-processed-user-id', userId)

    link.style.color = ''
    link.style.fontWeight = ''

    const userRemark = this.remarkStorage.getRemark(userId)

    if (userRemark && userRemark.remark && link.textContent.trim()) {
      link.textContent = userRemark.remark
      link.style.color = '#FFD700'
      link.style.fontWeight = 'bold'
    }

    // 添加交易信息
    const liElement = link.closest('li')
    if (liElement && this.isHolderListItem(liElement as HTMLElement)) {
      if (!liElement.getAttribute('data-processed')) {
        const wrapper = document.createElement('div')
        wrapper.className = 'flex flex-col w-full'

        const topContent = document.createElement('div')
        topContent.className = 'flex w-full justify-between gap-2'

        while (liElement.firstChild) {
          topContent.appendChild(liElement.firstChild)
        }

        wrapper.appendChild(topContent)

        // 先添加骨架屏
        const tradeInfo = this.createTradeInfoElement(userId)
        tradeInfo.classList.add('trade-info')
        wrapper.appendChild(tradeInfo)

        liElement.appendChild(wrapper)
        liElement.setAttribute('data-processed', 'true')

        liElement.className = liElement.className.replace('py-1', 'py-2')

        // 加载数据并更新显示
        this.loadTradeData(userId).then(() => {
          const updatedTradeInfo = this.createTradeInfoElement(userId)
          updatedTradeInfo.classList.add('trade-info')
          tradeInfo.replaceWith(updatedTradeInfo)
        })
      }
    }
  }

  private formatUsdAmount(amount: number): string {
    const absAmount = Math.abs(amount)
    const prefix = amount < 0 ? '-' : ''

    if (absAmount >= 10000) return `${prefix}$${(absAmount / 1000).toFixed(1)}k`

    return `${prefix}$${absAmount.toFixed(1)}`
  }

  private createTradeInfoElement(userId: string): HTMLElement {
    const stats = this.userStatsMap.get(userId)
    const tradeInfo = document.createElement('div')
    tradeInfo.className = STYLES.tradeInfo
    tradeInfo.style.color = COLORS.text.secondary

    if (stats) {
      const profitColor = stats.totalProfitLoss >= 0 ? COLORS.profit.positive : COLORS.profit.negative
      const profitBgColor = stats.totalProfitLoss >= 0 ? COLORS.profit.positiveBg : COLORS.profit.negativeBg

      const profitUsd = this.satToUsd ? stats.totalProfitLoss * this.satToUsd : null

      const totalBuyUsd = this.satToUsd
        ? (stats.avgBuyPriceSats / API.BTC_DIVISOR) * stats.totalBuy * this.satToUsd
        : null
      const totalSellUsd = this.satToUsd
        ? (stats.avgSellPriceSats / API.BTC_DIVISOR) * stats.totalSell * this.satToUsd
        : null

      const sellUsdDisplay = stats.totalSell > 0 ? this.formatUsdAmount(totalSellUsd) : '-'
      const sellSatsDisplay = stats.totalSell > 0 ? stats.avgSellPriceSats.toFixed(2) : '-'

      tradeInfo.innerHTML = `
        <div class="flex flex-col">
          <div class="flex items-center justify-between gap-2" style="color: ${COLORS.text.primary}">
            <span style="color: ${COLORS.text.secondary}">Total Buy / Sell:</span>
            <span style="font-weight: 500">${totalBuyUsd ? `${this.formatUsdAmount(totalBuyUsd)} / ${sellUsdDisplay}` : 'N/A'}</span>
          </div>
          <div class="flex items-center justify-between gap-2" style="color: ${COLORS.text.primary}">
            <span style="color: ${COLORS.text.secondary}">Avg Buy / Sell:</span>
            <span style="font-weight: 500; letter-spacing: 0.025em">${stats.avgBuyPriceSats.toFixed(2)} <span style="color: ${COLORS.text.muted}; font-size: 0.75rem">sat</span> / ${sellSatsDisplay} <span style="color: ${COLORS.text.muted}; font-size: 0.75rem">sat</span></span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span style="color: ${COLORS.text.secondary}">Profit / Loss:</span>
            <div class="flex items-center gap-1">
              <span style="color: ${profitColor}; font-weight: 500">${profitUsd ? this.formatUsdAmount(profitUsd) : 'N/A'}</span>
              <span style="color: ${profitColor}; background-color: ${profitBgColor}; font-size: 0.75rem; padding: 1px 6px; border-radius: 4px; font-weight: 500">${stats.roi.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      `
    } else {
      // 添加骨架屏效果
      const styleSheet = document.createElement('style')
      styleSheet.textContent = STYLES.skeleton
      document.head.appendChild(styleSheet)

      tradeInfo.innerHTML = `
        <div class="flex flex-col">
          <div class="flex items-center justify-between gap-2">
            <span style="color: ${COLORS.text.secondary}">Total Buy / Sell:</span>
            <div class="skeleton" style="width: 100px; height: 16px"></div>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span style="color: ${COLORS.text.secondary}">Avg Buy / Sell:</span>
            <div class="skeleton" style="width: 120px; height: 16px"></div>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span style="color: ${COLORS.text.secondary}">Profit / Loss:</span>
            <div class="flex items-center gap-1">
              <div class="skeleton" style="width: 80px; height: 16px"></div>
              <div class="skeleton" style="width: 60px; height: 16px"></div>
            </div>
          </div>
        </div>
      `
    }

    return tradeInfo
  }

  private async loadTradeData(userId: string) {
    try {
      const tokenId = window.location.pathname.split('/token/')[1]?.split('?')[0]
      if (!tokenId) return

      if (!this.currentTokenPrice) this.currentTokenPrice = this.getCurrentTokenPrice()

      // 检查缓存中是否有该用户的统计数据，如果没有则获取新数据
      if (this.userStatsMap.has(userId)) return

      const allActivities = await this.fetchAllUserActivities(userId)
      const tokenStats = await this.calculateTokenStats(allActivities, tokenId)
      if (!tokenStats) return

      this.userStatsMap.set(userId, tokenStats)
    } catch (error) {
      console.error('Error loading trade data:', error)
    }
  }

  private isHolderListItem(li: HTMLElement): boolean {
    const hasUserLink = li.querySelector('a[href^="/user/"]') !== null

    const container = li.closest(SELECTORS.holdersContainer)
    const h1Title = container?.querySelector('h1')?.textContent?.trim()
    const isHolders = h1Title === 'Holders'

    return hasUserLink && isHolders
  }

  private updateAllTradeInfo() {
    // 更新所有用户的交易信息显示
    const allTradeInfoElements = document.querySelectorAll(SELECTORS.tradeInfo)
    for (const element of allTradeInfoElements) {
      const liElement = element.closest('li')
      if (!liElement || !this.isHolderListItem(liElement as HTMLElement)) continue

      const userId = liElement.querySelector('a[href^="/user/"]')?.getAttribute('href')?.replace('/user/', '')
      if (userId) {
        const stats = this.userStatsMap.get(userId)
        if (stats) {
          const currentHolding = stats.totalBuy - stats.totalSell
          const { totalProfitLoss, roi } = this.calculateProfitLossAndRoi(stats, currentHolding)
          stats.totalProfitLoss = totalProfitLoss
          stats.roi = roi

          // 更新交易信息显示
          const updatedElement = this.createTradeInfoElement(userId)
          element.replaceWith(updatedElement)
        }
      }
    }
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    if (this.priceObserver) {
      this.priceObserver.disconnect()
      this.priceObserver = null
    }
  }
}

// User 页面处理模块
class UserPageHandler {
  private remarkStorage: StorageService
  private bodyObserver: MutationObserver | null = null
  private currentUserId: string | null = null

  constructor(remarkStorage: StorageService) {
    this.remarkStorage = remarkStorage
  }

  start(userId: string | null) {
    this.currentUserId = userId
    this.observeUserPage()
  }

  private createButton(text: string, onClick: () => void) {
    const button = document.createElement('button')
    button.className = STYLES.button
    button.textContent = text
    button.addEventListener('click', onClick)
    return button
  }

  private async addButtonToUserPage() {
    if (!this.currentUserId) return

    const userStatsContainer = document.querySelector(SELECTORS.userStats)
    if (!userStatsContainer) return

    const usernameSpan = userStatsContainer.querySelector('span.line-clamp-1') as HTMLElement
    if (!usernameSpan) return

    // 检查是否已经添加过按钮
    if (usernameSpan.parentElement?.querySelector('[data-custom-button="true"]')) return

    const username = usernameSpan.textContent?.trim()

    if (!usernameSpan.hasAttribute('data-astrabot-modified')) {
      usernameSpan.style.cursor = 'pointer'
      usernameSpan.style.textDecoration = 'underline'
      usernameSpan.style.textDecorationThickness = '2px'
      usernameSpan.style.textUnderlineOffset = '4px'
      usernameSpan.title = 'View Profit/Loss Data'
      usernameSpan.setAttribute('data-astrabot-modified', 'true')

      usernameSpan.addEventListener('click', (e) => {
        e.stopPropagation()
        window.open(`https://astrabot.club/odin-user?user-id=${this.currentUserId}`, '_blank')
      })
    }

    const existingRemark = this.remarkStorage.getRemark(this.currentUserId)

    const existingRemarkDisplay = document.querySelector('.user-remark-display')
    if (existingRemarkDisplay) existingRemarkDisplay.remove()

    let buttonText = existingRemark ? 'Edit Remark' : 'Add Remark'

    if (existingRemark) buttonText = `${existingRemark.remark}`

    const button = this.createButton(buttonText, () => {
      logMessage({ action: 'add_remark', userId: this.currentUserId })

      const remark = prompt('Enter remark', existingRemark?.remark || '')
      if (remark && remark.trim()) {
        this.remarkStorage.addRemark(this.currentUserId || '', username, remark).then(() => {
          button.textContent = `${remark}`
          button.style.backgroundColor = '#2c3349'
          button.style.color = '#ffffff'
        })
      }
    })

    button.setAttribute('data-custom-button', 'true')
    button.style.marginLeft = '8px'

    if (existingRemark) {
      button.style.backgroundColor = '#2c3349'
      button.style.color = '#ffffff'
    }

    usernameSpan.parentElement?.insertBefore(button, usernameSpan.nextSibling)
  }

  private observeUserPage() {
    if (this.bodyObserver) {
      this.bodyObserver.disconnect()
    }

    this.bodyObserver = new MutationObserver(() => {
      this.addButtonToUserPage()
    })

    this.bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    })

    this.addButtonToUserPage()
  }

  stop() {
    if (this.bodyObserver) {
      this.bodyObserver.disconnect()
      this.bodyObserver = null
    }
  }
}

class App {
  private remarkStorage = new StorageService()
  private pageRouter = new PageRouter()
  private tokenPageHandler: TokenPageHandler
  private userPageHandler: UserPageHandler
  private currentHandler: TokenPageHandler | UserPageHandler | null = null

  constructor() {
    this.tokenPageHandler = new TokenPageHandler(this.remarkStorage)
    this.userPageHandler = new UserPageHandler(this.remarkStorage)
  }

  async init() {
    if (document.readyState !== 'complete') {
      await new Promise((resolve) => window.addEventListener('load', resolve, { once: true }))
    }

    console.log('Document loaded, starting application...')

    await this.remarkStorage.load()

    this.pageRouter.setupUrlChangeListener()
    this.pageRouter.onPageChange((pageInfo) => this.handlePageChange(pageInfo))
  }

  private handlePageChange(pageInfo: PageInfo) {
    console.log('handle page change')

    if (this.currentHandler) {
      this.currentHandler.stop()
      this.currentHandler = null
    }

    if (pageInfo.type === 'token') {
      this.tokenPageHandler.start()
      this.currentHandler = this.tokenPageHandler
    } else if (pageInfo.type === 'user') {
      this.userPageHandler.start(pageInfo.id)
      this.currentHandler = this.userPageHandler
    }
  }
}

const app = new App()
app.init()
