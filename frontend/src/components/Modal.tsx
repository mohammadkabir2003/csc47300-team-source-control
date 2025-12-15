import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
}

export default function Modal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Cancel'
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'warning':
        return '⚠'
      default:
        return 'ℹ'
    }
  }

  const getColor = () => {
    switch (type) {
      case 'success':
        return '#16a34a'
      case 'error':
        return '#dc2626'
      case 'warning':
        return '#f59e0b'
      default:
        return '#2563eb'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px',
          width: '100%',
          padding: '2rem',
          animation: 'slideIn 0.3s ease-out',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: getColor(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: 'white',
              fontSize: '2rem',
              fontWeight: 'bold',
            }}
          >
            {getIcon()}
          </div>
          {title && (
            <h2 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.5rem' }}>
              {title}
            </h2>
          )}
          <p style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>
            {message}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          {onConfirm ? (
            <>
              <button
                onClick={onClose}
                className="btn btn-secondary"
                style={{ minWidth: '100px' }}
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  try {
                    onClose()
                  } finally {
                    onConfirm()
                  }
                }}
                className="btn btn-primary"
                style={{ minWidth: '100px' }}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{ minWidth: '120px' }}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
