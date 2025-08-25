'use client'

import { useEffect, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

let toastQueue: Toast[] = []
let setToasts: ((toasts: Toast[]) => void) | null = null

export function showToast(message: string, type: ToastType = 'info') {
  const toast: Toast = {
    id: Date.now().toString(),
    message,
    type
  }
  
  toastQueue.push(toast)
  if (setToasts) {
    setToasts([...toastQueue])
  }
  
  setTimeout(() => {
    toastQueue = toastQueue.filter(t => t.id !== toast.id)
    if (setToasts) {
      setToasts([...toastQueue])
    }
  }, 4000)
}

export function ToastContainer() {
  const [toasts, setToastsState] = useState<Toast[]>([])
  
  useEffect(() => {
    setToasts = setToastsState
    return () => { setToasts = null }
  }, [])
  
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            max-w-sm p-4 rounded-xl shadow-lg border backdrop-blur-sm
            animate-in slide-in-from-right-full duration-300
            ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}
            ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : ''}
            ${toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' : ''}
          `}
        >
          <div className="flex items-start gap-3">
            <div className="text-lg">
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'info' && 'ℹ️'}
            </div>
            <div className="text-sm font-medium">{toast.message}</div>
          </div>
        </div>
      ))}
    </div>
  )
}