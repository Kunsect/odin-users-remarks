import type { PlasmoCSConfig } from 'plasmo'
import { logMessage } from '~utils'
import { Storage } from '@plasmohq/storage'
import type { Language } from '~contexts/LanguageContext'
import { translations } from '~contexts/LanguageContext'

export const config: PlasmoCSConfig = {
  matches: ['https://odin.fun/*']
}

const SELECTORS = {
  tokenContainer: '.hidden.space-y-5.rounded-lg.bg-black.p-4.lg\\:block',
  userStats: '.relative.flex.w-full.items-center.justify-start.gap-2.md\\:static.md\\:gap-8'
}

interface UserRemark {
  userId: string
  username: string
  remark: string
}

interface PageInfo {
  type: 'token' | 'user' | null
  id: string | null
}

// 存储管理模块
class RemarkStorage {
  private storage = new Storage()
  private remarksMap: Map<string, UserRemark> = new Map()

  constructor() {
    this.setupStorageWatcher()
  }

  private setupStorageWatcher() {
    this.storage.watch({
      userRemarks: async ({ newValue }) => {
        try {
          if (typeof newValue === 'string') {
            const remarksArray: UserRemark[] = JSON.parse(newValue || '[]')
            this.remarksMap.clear()
            remarksArray.forEach((remark) => {
              this.remarksMap.set(remark.userId, remark)
            })
          }
        } catch (error) {
          console.error('Error parsing updated user remarks:', error)
        }
      }
    })
  }

  async load() {
    try {
      const savedRemarks = await this.storage.get('userRemarks')
      if (savedRemarks) {
        const remarksArray: UserRemark[] = JSON.parse(savedRemarks)
        this.remarksMap.clear()
        remarksArray.forEach((remark) => {
          this.remarksMap.set(remark.userId, remark)
        })
        console.log('Loaded user remarks:', remarksArray)
      }
    } catch (error) {
      console.error('Error loading user remarks:', error)
      this.remarksMap.clear()
    }
  }

  async save() {
    try {
      const remarksArray = Array.from(this.remarksMap.values())
      await this.storage.set('userRemarks', JSON.stringify(remarksArray))
      console.log('Saved user remarks:', remarksArray)
    } catch (error) {
      console.error('Error saving user remarks:', error)
    }
  }

  async addRemark(userId: string, username: string, remark: string) {
    const newRemark: UserRemark = { userId, username, remark }
    this.remarksMap.set(userId, newRemark)
    await this.save()
    return newRemark
  }

  getRemark(userId: string): UserRemark | undefined {
    return this.remarksMap.get(userId)
  }

  async removeRemark(userId: string) {
    const hasRemark = this.remarksMap.has(userId)
    if (hasRemark) {
      this.remarksMap.delete(userId)
      await this.save()
      return true
    }
    return false
  }

  getAllRemarks() {
    return Array.from(this.remarksMap.values())
  }
}

// 页面路由管理模块
class PageRouter {
  private currentInfo: PageInfo = { type: null, id: null }
  private pageChangeHandlers: ((info: PageInfo) => void)[] = []

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
      if (window.location.href !== this._lastUrl) {
        this._lastUrl = window.location.href
        this.handleUrlChange()
      }
    })

    urlObserver.observe(document, { subtree: true, childList: true })
  }

  private _lastUrl = window.location.href

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
  private remarkStorage: RemarkStorage

  constructor(remarkStorage: RemarkStorage) {
    this.remarkStorage = remarkStorage
  }

  start() {
    this.processAllUserLinks()
    this.setupObserver()
  }

  private setupObserver() {
    if (this.observer) this.observer.disconnect()

    this.observer = new MutationObserver(() => {
      this.processAllUserLinks() // 当页面发生变化时，重新处理所有链接
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href']
    })
  }

  /**
   * 处理单个链接
   * 应用备注并设置样式
   */
  private processLink(link: HTMLAnchorElement) {
    const href = link.getAttribute('href')
    if (!href || !href.startsWith('/user/')) return

    const userId = href.replace('/user/', '')

    if (link.getAttribute('data-processed-user-id') === userId) return // 检查链接是否已经处理过，且用户ID没有变化

    link.setAttribute('data-processed-user-id', userId) // 标记链接已处理，并记录用户ID

    link.style.color = ''
    link.style.fontWeight = ''

    const userRemark = this.remarkStorage.getRemark(userId)

    // 如果有备注，应用备注和样式
    if (userRemark && userRemark.remark) {
      link.textContent = userRemark.remark

      link.style.color = '#FFD700'
      link.style.fontWeight = 'bold'
    }
  }

  /**
   * 处理页面上所有的用户链接
   * 查找所有以 /user/ 开头的链接，并应用对应的备注
   */
  private processAllUserLinks() {
    const allLinks = document.querySelectorAll('a[href^="/user/"]')

    allLinks.forEach((link) => {
      if (link instanceof HTMLAnchorElement) {
        const href = link.getAttribute('href')
        if (!href) return

        const userId = href.replace('/user/', '')
        const processedUserId = link.getAttribute('data-processed-user-id')

        // 只有当链接未处理过或者用户ID发生变化时才处理
        if (processedUserId !== userId) this.processLink(link)
      }
    })
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }
}

// User 页面处理模块
class UserPageHandler {
  private remarkStorage: RemarkStorage
  private bodyObserver: MutationObserver | null = null
  private currentUserId: string | null = null
  private storage = new Storage()
  private language: Language = 'zh'

  constructor(remarkStorage: RemarkStorage) {
    this.remarkStorage = remarkStorage
    this.initLanguage()
  }

  private async initLanguage() {
    const storedLanguage = await this.storage.get<Language>('language')
    if (storedLanguage) {
      this.language = storedLanguage
    }
  }

  private getText(key: keyof typeof translations.zh): string {
    const translation = translations[this.language][key]
    return typeof translation === 'function' ? key : (translation as string)
  }

  start(userId: string | null) {
    this.currentUserId = userId
    this.observeUserPage()
  }

  private createButton(text: string, onClick: () => void) {
    const button = document.createElement('button')
    button.className =
      'inline-flex items-center text-sm justify-center gap-2 whitespace-nowrap rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-secondary-foreground shadow-sm px-3 py-2 bg-odin-blue font-bold hover:bg-odin-blue/80 h-8'
    button.textContent = text
    button.addEventListener('click', onClick)
    return button
  }

  private async addButtonToUserPage() {
    if (!this.currentUserId) return

    await this.initLanguage()

    const userStatsContainer = document.querySelector(SELECTORS.userStats)
    if (!userStatsContainer) return

    const usernameSpan = userStatsContainer.querySelector('span.line-clamp-1')
    if (!usernameSpan) return

    // 检查是否已经添加过按钮
    if (usernameSpan.parentElement?.querySelector('[data-custom-button="true"]')) return

    const username = usernameSpan.textContent?.trim()

    const existingRemark = this.remarkStorage.getRemark(this.currentUserId)

    const existingRemarkDisplay = usernameSpan.parentElement?.querySelector('.user-remark-display')
    if (existingRemarkDisplay) existingRemarkDisplay.remove()

    let buttonText = existingRemark ? this.getText('editRemarkButton') : this.getText('addRemarkButton')

    if (existingRemark) buttonText = `${existingRemark.remark}`

    const button = this.createButton(buttonText, () => {
      logMessage({ action: 'add_remark', userId: this.currentUserId })

      const remark = prompt(this.getText('remarkInputPrompt'), existingRemark?.remark || '')
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
  private remarkStorage = new RemarkStorage()
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
