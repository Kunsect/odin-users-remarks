import { useStorage } from '@plasmohq/storage/hook'
import '~style.css'

const Popup = () => {
  const [autoSubmitEnabled, setAutoSubmitEnabled] = useStorage('auto_submit_enabled', false)

  const openLogsPage = () => {
    chrome.tabs.create({
      url: './tabs/users.html'
    })
  }

  return (
    <div className="w-80 bg-dark-primary text-sm">
      <div className="w-full px-4 bg-dark-secondary shadow-lg overflow-hidden rounded-b-xl">
        <div className="flex items-center justify-between text-gray-400 pt-3 pb-1">
          <span className="text-lg">Odin Fun Plugin</span>
        </div>

        <div className="py-5">
          <button
            onClick={() => openLogsPage()}
            className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            备注列表
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

export default Popup
