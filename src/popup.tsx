import { useStorage } from '@plasmohq/storage/hook'
import '~style.css'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import React from 'react'

const PopupContent = () => {
  const { language, setLanguage, t } = useLanguage()
  const [showHolderStats, setShowHolderStats] = useStorage<boolean>('showHolderStats', true)

  const openLogsPage = () => {
    chrome.tabs.create({
      url: './tabs/users.html'
    })
  }

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh')
  }

  const toggleHolderStats = () => {
    setShowHolderStats(!showHolderStats)
  }

  return (
    <div className="w-80 bg-dark-primary text-sm">
      <div className="w-full px-4 bg-dark-secondary shadow-lg overflow-hidden rounded-b-xl">
        <div className="flex items-center justify-between text-gray-400 pt-3 pb-1">
          <span className="text-lg">Odin Fun Plugin</span>
        </div>

        <div className="py-5">
          <div className="mb-3 flex justify-between items-center">
            <span className="text-light-primary">{t('showHolderStats') as string}</span>
            <button
              onClick={toggleHolderStats}
              className={`relative w-10 h-4.5 flex items-center rounded-full p-1 transition-colors
                ${showHolderStats ? 'bg-primary' : 'bg-gray-600'}`}
            >
              <div
                className={`w-3 h-3 bg-white rounded-full shadow-md transition-transform
                ${showHolderStats ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div className="flex justify-between items-center mb-3">
            <span className="text-light-primary">{t('switchLanguage') as string}</span>
            <button
              onClick={toggleLanguage}
              className="px-3 py-1 text-sm text-white rounded focus:outline-none transition-colors duration-200 bg-background-tertiary hover:bg-opacity-80 flex items-center"
            >
              <span className="mr-1">{language === 'zh' ? '🇨🇳' : '🇺🇸'}</span>
              {t('switchLanguageButton') as string}
            </button>
          </div>

          <button
            onClick={() => openLogsPage()}
            className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            {t('remarksList') as string}
          </button>
        </div>
      </div>

      <div className="px-4 py-2.5">
        <div className="flex justify-center cursor-pointer text-light-secondary space-x-2">
          <a
            href="https://x.com/astrabot_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline"
          >
            @AstraBot
          </a>
          <span>x</span>
          <a
            href="https://x.com/kunsect7"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline"
          >
            @kunsect
          </a>
        </div>
      </div>
    </div>
  )
}

const Popup = () => {
  return (
    <LanguageProvider>
      <PopupContent />
    </LanguageProvider>
  )
}

export default Popup
