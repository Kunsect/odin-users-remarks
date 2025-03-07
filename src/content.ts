import type { PlasmoCSConfig } from 'plasmo'
import { logMessage } from '~utils'
import { Storage } from '@plasmohq/storage'

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
  private remarks: UserRemark[] = []

  constructor() {
    this.setupStorageWatcher()
  }

  private setupStorageWatcher() {
    this.storage.watch({
      userRemarks: async ({ newValue }) => {
        try {
          if (typeof newValue === 'string') this.remarks = JSON.parse(newValue || '[]')
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
        this.remarks = JSON.parse(savedRemarks)
        console.log('Loaded user remarks:', this.remarks)
      }
    } catch (error) {
      console.error('Error loading user remarks:', error)
      this.remarks = []
    }
  }

  async save() {
    try {
      await this.storage.set('userRemarks', JSON.stringify(this.remarks))
      console.log('Saved user remarks:', this.remarks)
    } catch (error) {
      console.error('Error saving user remarks:', error)
    }
  }

  async addRemark(userId: string, username: string, remark: string) {
    const newRemark: UserRemark = { userId, username, remark }

    const existingIndex = this.remarks.findIndex((r) => r.userId === userId)
    if (existingIndex >= 0) {
      this.remarks[existingIndex] = newRemark
    } else {
      this.remarks.push(newRemark)
    }

    await this.save()
    return newRemark
  }

  getRemark(userId: string): UserRemark | undefined {
    return this.remarks.find((r) => r.userId === userId)
  }

  async removeRemark(userId: string) {
    const index = this.remarks.findIndex((r) => r.userId === userId)
    if (index >= 0) {
      this.remarks.splice(index, 1)
      await this.save()
      return true
    }
    return false
  }

  getAllRemarks() {
    return [...this.remarks]
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
  private currentContainer: Element | null = null
  private containerObserver: MutationObserver | null = null
  private remarkStorage: RemarkStorage

  constructor(remarkStorage: RemarkStorage) {
    this.remarkStorage = remarkStorage
  }

  start() {
    this.observeBodyForContainer()
  }

  private extractUsersAndModifyDOM(container: Element) {
    console.log('Processing users in token page')
    const users = Array.from(container.querySelectorAll('ul li a'))
      .map((a) => ({
        id: a.getAttribute('title'),
        name: a.textContent?.trim() || '',
        element: a as HTMLElement
      }))
      .filter((user) => user.id)

    users.forEach(({ id, name, element }) => {
      const span = element.closest('span')
      if (!span || span.getAttribute('data-modified')) return

      const userRemark = this.remarkStorage.getRemark(id)

      if (userRemark && userRemark.remark) {
        element.innerHTML = ''
        const newText = document.createTextNode(userRemark.remark)
        element.style.color = '#FFD700'
        element.style.fontWeight = 'bold'
        element.appendChild(newText)
      }

      // 标记已修改，防止循环
      span.setAttribute('data-modified', 'true')
    })

    return users
  }

  private observeContainer(container: Element) {
    if (this.containerObserver) this.containerObserver.disconnect()

    console.log('Observing new container:', container)
    this.extractUsersAndModifyDOM(container)

    this.containerObserver = new MutationObserver(() => {
      console.log('Container content changed, updating user list...')
      this.extractUsersAndModifyDOM(container)
    })

    this.containerObserver.observe(container, {
      childList: true,
      subtree: true
    })
  }

  private observeBodyForContainer() {
    const bodyObserver = new MutationObserver(() => {
      const blocks = document.querySelectorAll(SELECTORS.tokenContainer)

      if (blocks.length === 2) {
        const newContainer = blocks[1]

        if (newContainer !== this.currentContainer) {
          console.log('Container updated, switching observer...')
          this.currentContainer = newContainer
          if (this.currentContainer) this.observeContainer(this.currentContainer)
        }
      }
    })

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  stop() {
    if (this.containerObserver) {
      this.containerObserver.disconnect()
      this.containerObserver = null
    }
  }
}

// User 页面处理模块
class UserPageHandler {
  private remarkStorage: RemarkStorage
  private bodyObserver: MutationObserver | null = null
  private currentUserId: string | null = null

  constructor(remarkStorage: RemarkStorage) {
    this.remarkStorage = remarkStorage
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

  private addButtonToUserPage() {
    if (!this.currentUserId) return

    const userStatsContainer = document.querySelector(SELECTORS.userStats)
    if (!userStatsContainer) return

    const usernameSpan = userStatsContainer.querySelector('span.line-clamp-1')
    if (!usernameSpan) return

    // 检查是否已经添加过按钮
    if (usernameSpan.parentElement?.querySelector('[data-custom-button="true"]')) return

    const username = usernameSpan.textContent?.trim() || '未知用户'

    // 获取当前用户的备注
    const existingRemark = this.remarkStorage.getRemark(this.currentUserId)

    // 移除已有的备注显示（如果有）
    const existingRemarkDisplay = usernameSpan.parentElement?.querySelector('.user-remark-display')
    if (existingRemarkDisplay) existingRemarkDisplay.remove()

    // 创建按钮文本
    let buttonText = existingRemark ? '修改备注' : '添加备注'

    // 如果有备注，直接在按钮上显示
    if (existingRemark) buttonText = `${existingRemark.remark}`

    const button = this.createButton(buttonText, () => {
      logMessage({ action: 'add_remark', userId: this.currentUserId })

      const remark = prompt('请输入备注:', existingRemark?.remark || '')
      if (remark.trim()) {
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
