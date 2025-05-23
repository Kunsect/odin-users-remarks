import React, { createContext, useState, useContext } from 'react'
import type { ReactNode } from 'react'
import { useStorage } from '@plasmohq/storage/hook'

export type Language = 'zh' | 'en'

export const translations = {
  zh: {
    // Page title
    pageTitle: 'Odin 用户备注列表',

    // Buttons
    exportButton: '导出备注',
    importButton: '导入备注',
    editButton: '修改',
    deleteButton: '删除',
    cancelButton: '取消',
    confirmButton: '确定',
    saveButton: '保存',
    addRemarkButton: '添加备注',
    editRemarkButton: '修改备注',

    // Table headers
    idHeader: 'ID',
    usernameHeader: '用户名',
    remarkHeader: '备注',
    actionsHeader: '操作',

    // Modal titles and messages
    editRemarkTitle: '修改备注',
    deleteRemarkTitle: '删除备注',
    deleteRemarkMessage: '确定要删除这条备注吗？',
    exportFailTitle: '导出失败',
    exportFailMessage: '没有备注可导出',
    importTitle: '导入备注',
    importMessage: (count: number) => `确定要导入 ${count} 条备注吗？`,
    importFailTitle: '导入失败',
    remarkInputPrompt: '请输入备注',

    // Other messages
    noRemarks: '暂无用户备注',
    invalidDataFormat: '导入的数据不是有效的数组格式',
    incorrectDataFormat: '导入的数据格式不正确',
    invalidJson: '无效的JSON格式',

    // Popup translations
    switchLanguage: '切换语言',
    switchLanguageButton: 'English',
    translateToChinese: '翻译成中文',
    remarksList: '备注列表',
    viewProfitLossData: '查看盈亏数据',
    showHolderStats: '持仓统计',

    // Token page translations
    totalBuySell: '总买入 / 卖出',
    totalBuySellColon: '总买入 / 卖出：',
    avgBuySell: '平均买入 / 卖出',
    avgBuySellColon: '平均买入 / 卖出：',
    profit: '盈亏',
    profitColon: '盈亏：',
    newWallet: '新钱包',
    paperHands: '纸手',
    diamondHands: '钻石手',
    entrepreneur: '创业者',
    whale: '鲸鱼',
    createdTokens: (count: number) => `创建了 ${count} 个代币`
  },
  en: {
    // Page title
    pageTitle: "Odin Users' Remarks List",

    // Buttons
    exportButton: 'Export Remarks',
    importButton: 'Import Remarks',
    editButton: 'Edit',
    deleteButton: 'Delete',
    cancelButton: 'Cancel',
    confirmButton: 'Confirm',
    saveButton: 'Save',
    addRemarkButton: 'Add Remark',
    editRemarkButton: 'Edit Remark',

    // Table headers
    idHeader: 'ID',
    usernameHeader: 'Username',
    remarkHeader: 'Remark',
    actionsHeader: 'Actions',

    // Modal titles and messages
    editRemarkTitle: 'Edit Remark',
    deleteRemarkTitle: 'Delete Remark',
    deleteRemarkMessage: 'Are you sure you want to delete this remark?',
    exportFailTitle: 'Export Failed',
    exportFailMessage: 'No remarks to export',
    importTitle: 'Import Remarks',
    importMessage: (count: number) => `Are you sure you want to import ${count} remarks?`,
    importFailTitle: 'Import Failed',
    remarkInputPrompt: 'Enter remark',

    // Other messages
    noRemarks: 'No user remarks',
    invalidDataFormat: 'Imported data is not a valid array format',
    incorrectDataFormat: 'Imported data format is incorrect',
    invalidJson: 'Invalid JSON format',

    // Popup translations
    switchLanguage: 'Switch Language',
    switchLanguageButton: '中文',
    translateToChinese: 'Translate to Chinese',
    remarksList: 'Remarks List',
    viewProfitLossData: 'View Profit/Loss Data',
    showHolderStats: 'Holder Stats',

    // Token page translations
    totalBuySell: 'Total Buy / Sell',
    totalBuySellColon: 'Total Buy / Sell:',
    avgBuySell: 'Average Buy / Sell',
    avgBuySellColon: 'Average Buy / Sell:',
    profit: 'Profit/Loss',
    profitColon: 'Profit/Loss:',
    newWallet: 'New Wallet',
    paperHands: 'Paper Hands',
    diamondHands: 'Diamond Hands',
    entrepreneur: 'Entrepreneur',
    whale: 'Whale',
    createdTokens: (count: number) => `Created ${count} tokens`
  }
}

type TranslationKey = keyof typeof translations.en | keyof typeof translations.zh

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string | ((count: number) => string)
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'zh',
  setLanguage: () => {},
  t: () => ''
})

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [storedLanguage, setStoredLanguage] = useStorage<Language>('language', 'zh')

  const setLanguage = (lang: Language) => {
    setStoredLanguage(lang)
  }

  const t = (key: TranslationKey) => {
    return translations[storedLanguage][key]
  }

  return (
    <LanguageContext.Provider value={{ language: storedLanguage, setLanguage, t }}>{children}</LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
