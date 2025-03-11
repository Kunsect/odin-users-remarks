import { useStorage } from '@plasmohq/storage/hook'
import '~style.css'
import { useState, useRef } from 'react'
import Modal from 'react-modal'
import { LanguageProvider } from '../contexts/LanguageContext'
import { useLanguage } from '../contexts/LanguageContext'
import { Storage } from '@plasmohq/storage'

if (typeof document !== 'undefined') {
  Modal.setAppElement('#__plasmo')
}

interface UserRemark {
  userId: string
  username: string
  remark: string
}

type ModalType = 'alert' | 'confirm' | 'prompt'

const BUTTON_STYLES = {
  primary: 'bg-[#cc5314] hover:bg-[#b54812]',
  secondary: 'bg-background-tertiary hover:bg-opacity-80',
  danger: 'bg-red-600 hover:bg-red-700'
}

const COMMON_BUTTON_CLASS =
  'px-4 py-2 text-sm text-white rounded focus:outline-none transition-colors duration-200 disabled:opacity-50'
const TABLE_BUTTON_CLASS =
  'px-3 py-1.5 text-sm text-white rounded focus:outline-none transition-colors duration-200 disabled:opacity-50'

const customModalStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'var(--background-secondary)',
    border: 'none',
    borderRadius: '0.75rem',
    padding: 0,
    maxWidth: '450px',
    width: '90%',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000
  }
}

const UserRemarksList: React.FC = () => {
  const { t, language } = useLanguage()
  const [userRemarks, setUserRemarks] = useStorage<string>(
    {
      key: 'userRemarks',
      instance: new Storage({ area: 'local' })
    },
    '[]'
  )

  const [editingRemark, setEditingRemark] = useState<UserRemark | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [modalType, setModalType] = useState<ModalType>('alert')
  const [modalTitle, setModalTitle] = useState('')
  const [modalMessage, setModalMessage] = useState('')
  const [modalInputValue, setModalInputValue] = useState('')
  const [modalCallback, setModalCallback] = useState<(value?: string) => void>(() => {})

  let parsedRemarks: UserRemark[] = []
  try {
    parsedRemarks = JSON.parse(userRemarks)
  } catch (error) {
    console.error('Error parsing user remarks:', error)
  }

  const openModal = (
    type: ModalType,
    title: string,
    message: string,
    callback: (value?: string) => void,
    defaultValue: string = ''
  ) => {
    setModalType(type)
    setModalTitle(title)
    setModalMessage(message)
    setModalInputValue(defaultValue)
    setModalCallback(() => callback)
    setModalIsOpen(true)
  }

  const closeModal = () => {
    setModalIsOpen(false)
    setEditingRemark(null)
  }

  const confirmModal = () => {
    const callback = modalCallback

    // 先重置状态，防止回调中的操作影响到状态
    setModalIsOpen(false)
    setEditingRemark(null)

    callback(modalType === 'prompt' ? modalInputValue : undefined)
  }

  const setTempEditingState = () => {
    setEditingRemark({ userId: '', username: '', remark: '' })
  }

  const handleEdit = (remark: UserRemark) => {
    setEditingRemark(remark)
    openModal(
      'prompt',
      t('editRemarkTitle') as string,
      '',
      (newRemarkText) => {
        if (newRemarkText && newRemarkText.trim()) {
          const updatedRemarks = parsedRemarks.map((r) =>
            r.userId === remark.userId ? { ...r, remark: newRemarkText } : r
          )
          setUserRemarks(JSON.stringify(updatedRemarks))
        }
      },
      remark.remark
    )
  }

  const handleDelete = (userId: string) => {
    setTempEditingState()
    openModal('confirm', t('deleteRemarkTitle') as string, t('deleteRemarkMessage') as string, () => {
      const updatedRemarks = parsedRemarks.filter((r) => r.userId !== userId)
      setUserRemarks(JSON.stringify(updatedRemarks))
    })
  }

  const handleExport = () => {
    if (parsedRemarks.length === 0) {
      setTempEditingState()
      openModal('alert', t('exportFailTitle') as string, t('exportFailMessage') as string, () => {})
      return
    }

    const dataStr = JSON.stringify(parsedRemarks, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement('a')
    link.href = url
    link.download = `odin-user-remarks-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)

        if (!Array.isArray(importedData)) {
          throw new Error(t('invalidDataFormat') as string)
        }

        // 验证每个项目是否符合UserRemark接口
        for (const item of importedData) {
          if (!item.userId || !item.username || !item.remark) {
            throw new Error(t('incorrectDataFormat') as string)
          }
        }

        setTempEditingState()
        const importMessage = t('importMessage')
        openModal(
          'confirm',
          t('importTitle') as string,
          typeof importMessage === 'function' ? importMessage(importedData.length) : importMessage,
          () => {
            // 合并备注，相同userId的备注会被追加而不是覆盖
            const mergedRemarks = [...parsedRemarks]

            importedData.forEach((importedRemark: UserRemark) => {
              const existingIndex = mergedRemarks.findIndex((r) => r.userId === importedRemark.userId)
              if (existingIndex >= 0) {
                if (mergedRemarks[existingIndex].remark !== importedRemark.remark) {
                  mergedRemarks[existingIndex] = {
                    ...mergedRemarks[existingIndex],
                    remark: `${mergedRemarks[existingIndex].remark}、${importedRemark.remark}`
                  }
                }
              } else {
                mergedRemarks.push(importedRemark)
              }
            })

            setUserRemarks(JSON.stringify(mergedRemarks))
          }
        )
      } catch (error) {
        console.error('导入失败:', error)
        setTempEditingState()
        openModal(
          'alert',
          t('importFailTitle') as string,
          `${error instanceof Error ? error.message : (t('invalidJson') as string)}`,
          () => {}
        )
      }

      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    reader.readAsText(file)
  }

  const getModalButtonStyle = () => {
    switch (modalType) {
      case 'alert':
      case 'prompt':
        return BUTTON_STYLES.primary
      case 'confirm':
        return BUTTON_STYLES.danger
    }
  }

  const getModalButtonText = () => {
    switch (modalType) {
      case 'alert':
      case 'confirm':
        return t('confirmButton') as string
      case 'prompt':
        return t('saveButton') as string
    }
  }

  return (
    <div className="min-h-screen bg-background text-white p-6 font-sans">
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal} style={customModalStyles} contentLabel="Modal">
        <div className="text-white">
          <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-medium">{modalTitle}</h3>
            <button onClick={closeModal} className="text-gray-400 hover:text-white focus:outline-none">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {modalMessage && <p className="text-gray-300 text-base">{modalMessage}</p>}
            {modalType === 'prompt' && (
              <input
                type="text"
                className="w-full px-4 py-3 bg-background-tertiary border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={modalInputValue}
                onChange={(e) => setModalInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmModal()
                  if (e.key === 'Escape') closeModal()
                }}
                autoFocus
              />
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-800 flex justify-end space-x-3">
            {(modalType === 'confirm' || modalType === 'prompt') && (
              <button
                className={`${COMMON_BUTTON_CLASS} ${BUTTON_STYLES.secondary} text-gray-300`}
                onClick={closeModal}
              >
                {t('cancelButton') as string}
              </button>
            )}
            <button className={`${COMMON_BUTTON_CLASS} ${getModalButtonStyle()}`} onClick={confirmModal}>
              {getModalButtonText()}
            </button>
          </div>
        </div>
      </Modal>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-semibold">{t('pageTitle') as string}</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            className={`${COMMON_BUTTON_CLASS} ${BUTTON_STYLES.secondary}`}
            disabled={parsedRemarks.length === 0 || editingRemark !== null}
          >
            {t('exportButton') as string}
          </button>
          <button
            onClick={handleImport}
            className={`${COMMON_BUTTON_CLASS} ${BUTTON_STYLES.primary}`}
            disabled={editingRemark !== null}
          >
            {t('importButton') as string}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full rounded-lg overflow-hidden table-auto text-sm">
          <thead className="bg-background-header text-gray-400">
            <tr>
              <th className="p-4 text-center text-base">#</th>
              <th className="p-4 text-center text-base" style={{ maxWidth: '120px' }}>
                {t('idHeader') as string}
              </th>
              <th className="p-4 text-center text-base">{t('usernameHeader') as string}</th>
              <th className="px-6 py-4 text-center text-base">{t('remarkHeader') as string}</th>
              <th className="px-6 py-4 text-center text-base">{t('actionsHeader') as string}</th>
            </tr>
          </thead>
          <tbody>
            {parsedRemarks.length > 0 ? (
              parsedRemarks.map((remark, index) => (
                <tr key={index} className={`${index % 2 === 0 ? 'bg-background-card' : 'bg-background-header'}`}>
                  <td className="p-4 text-center">
                    <span>{index + 1}</span>
                  </td>
                  <td
                    className="p-4 text-center whitespace-nowrap"
                    style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    <a
                      href={`https://odin.fun/user/${remark.userId}`}
                      target="_blank"
                      className="text-blue-400 hover:underline"
                      title={remark.userId}
                    >
                      {remark.userId.length > 15 ? remark.userId.substring(0, 15) + '...' : remark.userId}
                    </a>
                  </td>
                  <td className="p-4 text-center whitespace-nowrap">{remark.username}</td>
                  <td className="px-6 py-4 text-center">{remark.remark}</td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleEdit(remark)}
                        disabled={editingRemark !== null}
                        className={`${TABLE_BUTTON_CLASS} ${BUTTON_STYLES.primary}`}
                      >
                        {t('editButton') as string}
                      </button>
                      <button
                        onClick={() => handleDelete(remark.userId)}
                        disabled={editingRemark !== null}
                        className={`${TABLE_BUTTON_CLASS} ${BUTTON_STYLES.danger}`}
                      >
                        {t('deleteButton') as string}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="bg-background-card">
                <td colSpan={6} className="p-4 text-center text-gray-400">
                  {t('noRemarks') as string}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const WrappedUserRemarksList: React.FC = () => {
  return (
    <LanguageProvider>
      <UserRemarksList />
    </LanguageProvider>
  )
}

export default WrappedUserRemarksList
