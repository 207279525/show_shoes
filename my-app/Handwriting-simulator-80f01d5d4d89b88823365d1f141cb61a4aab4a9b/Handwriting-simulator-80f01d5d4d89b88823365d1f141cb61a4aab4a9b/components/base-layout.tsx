import { useEffect, useState } from 'react'

interface BaseLayoutProps {
  children: React.ReactNode
}

export function BaseLayout({ children }: BaseLayoutProps) {
  const [mounted, setMounted] = useState(false)
  const [isLandscape, setIsLandscape] = useState(true)

  useEffect(() => {
    setMounted(true)
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight)
    }
    
    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)
    
    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <h1 className="text-xl md:text-2xl font-bold text-center">增强版手写字体模拟器</h1>
        {!isLandscape && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-sm text-yellow-700">
              请旋转设备至横屏模式以获得最佳体验
            </p>
          </div>
        )}
        {mounted ? children : (
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="text-gray-500">正在加载...</div>
          </div>
        )}
      </div>
    </div>
  )
} 