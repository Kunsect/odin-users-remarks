import { Storage } from '@plasmohq/storage'
import { STORAGE_KEYS } from '~/constants'
import type { UserRemark } from '~/types'

export class StorageService {
  private storage = new Storage({ area: 'local' })
  private remarksMap: Map<string, UserRemark> = new Map()

  constructor() {
    this.setupStorageWatcher()
  }

  private setupStorageWatcher() {
    this.storage.watch({
      [STORAGE_KEYS.USER_REMARKS]: async ({ newValue }) => {
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
      const savedRemarks = await this.storage.get(STORAGE_KEYS.USER_REMARKS)
      if (savedRemarks) {
        const remarksArray: UserRemark[] = JSON.parse(savedRemarks)
        this.remarksMap.clear()
        remarksArray.forEach((remark) => {
          this.remarksMap.set(remark.userId, remark)
        })
      }
    } catch (error) {
      console.error('Error loading user remarks:', error)
      this.remarksMap.clear()
    }
  }

  async save() {
    try {
      const remarksArray = Array.from(this.remarksMap.values())
      await this.storage.set(STORAGE_KEYS.USER_REMARKS, JSON.stringify(remarksArray))
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
