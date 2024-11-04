'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Save, RotateCcw, Upload, Image as ImageIcon, FileDown } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface HandwritingParams {
  charSpacing: number
  sizeVariation: number
  lineSpacing: number
  horizontalOffset: number
  verticalOffset: number
  rotationOffset: number
  color: string
  symbolSpacingAdjustment: number
  removeMarkdown: boolean
  fontSize: number
  verticalSpacing: number
  indentFirstLine: boolean
  preventSymbolAtAllLineStarts: boolean
  indentEmptyLine: boolean
}

const DEFAULT_PARAMS: HandwritingParams = {
  charSpacing: 1,
  sizeVariation: 0,
  lineSpacing: 0,
  horizontalOffset: 0,
  verticalOffset: 0,
  rotationOffset: 0,
  color: '#000000',
  symbolSpacingAdjustment: -0.5,
  removeMarkdown: false,
  fontSize: 22,
  verticalSpacing: 1.4,
  indentFirstLine: true,
  preventSymbolAtAllLineStarts: true,
  indentEmptyLine: false
}

const PAPER_STYLES = [
  { name: "空白纸", value: "blank", bgColor: "bg-white" },
  { name: "背景1", value: "bg1", bgImage: "bg-[url('/images/test1.jpeg')]" },
  { name: "背景2", value: "bg2", bgImage: "bg-[url('/images/test2.jpeg')]" },
  { name: "景3", value: "bg3", bgImage: "bg-[url('/images/test3.jpeg')]" },
]

const FONTS = [
  { name: "阿淘淘五龙乃老苏", value: "aataotaowulongnailaosu" },
  { name: "阿猪你我明没相春天", value: "aazhuniwomingmeixiangchuntian" },
  { name: "安夏迅幻波芳简", value: "anxiaxunhuanbofangjian" },
  { name: "工繁手写转机体", value: "gongfanshouxiezhuanjiti" },
  { name: "工繁悦心体细", value: "gongfanyuexintixi" },
  { name: "萌礼行楷", value: "menglixinghe" },
  { name: "下墨恋并琴琳", value: "xiamorelianbingqilin" },
  { name: "向桥小星云感体", value: "xiangqiaoxiaoxingyunlingganti" },
  { name: "行辰雨大海", value: "xingchenyudahai" },
  { name: "中庆善成帮帮体", value: "zhongqingshanchengbangbangti" },
  { name: "左右美眉妍娟圆", value: "zuorimeimengyanjiuyuan" },
]

const SYMBOLS = new Set([
  '，', '。', '！', '？', '：', '；',
  "'", "'", '"', '"',
  '「', '」', '『', '』',
  '（', '）', '【', '】',
  '', '》', '〈', '〉',
  '…', '—', '·'
])

const A4_DIMENSIONS = {
  width: 595 * 2, // A4 宽度 (144 dpi)
  height: 842 * 2, // A4 高度 (144 dpi)
  padding: 40 * 2 // 页边距也相应增加
}

const A4_PAGE_HEIGHT = 1000 // 预览中每页的固定高度（像素）
const PAGE_MARGIN_TOP = 20    // 减小顶部边距，大约半行汉字的高度
const PAGE_MARGIN_BOTTOM = 20 // 减小底部边距，大约半行汉字的高度

const removeMarkdownFormat = (text: string) => {
  return text
    // 标题
    .replace(/^#{1,6}\s+/gm, '')
    // 粗体和斜体
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_{3}(.*?)_{3}/g, '$1')
    .replace(/_{2}(.*?)_{2}/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // 代码块
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\[([^\]]+)\]/g, '$1')
    // 图片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    // 引用
    .replace(/^>\s+/gm, '')
    // 列表
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // 水平线
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // 表格
    .replace(/\|.*\|/g, '')
    .replace(/^[-:| ]+$/gm, '')
    // 删除线
    .replace(/~~(.*?)~~/g, '$1')
    // 上标和下标
    .replace(/\^([^^]+)\^/g, '$1')
    .replace(/~([^~]+)~/g, '$1')
    // 多余的空行
    .replace(/\n{3,}/g, '\n\n')
    // 修复可能的空格问题
    .replace(/[ \t]+$/gm, '')
    .trim()
}

// 先定义一个类型来确保 FONT_URLS 的键与 FONTS 中的 value 匹配
type FontFamily = typeof FONTS[number]['value']
type FontUrls = Record<FontFamily, string>

// 修改 FONT_URLS 的类型声明
const FONT_URLS: FontUrls = {
  aataotaowulongnailaosu: '/fonts/aataotaowulongnailaosu.ttf',
  aazhuniwomingmeixiangchuntian: '/fonts/aazhuniwomingmeixiangchuntian.ttf',
  anxiaxunhuanbofangjian: '/fonts/anxiaxunhuanbofangjian.ttf',
  gongfanshouxiezhuanjiti: '/fonts/gongfanshouxiezhuanjiti.ttf',
  gongfanyuexintixi: '/fonts/gongfanyuexintixi.ttf',
  menglixinghe: '/fonts/menglixinghe.ttf',
  xiamorelianbingqilin: '/fonts/xiamorelianbingqilin.ttf',
  xiangqiaoxiaoxingyunlingganti: '/fonts/xiangqiaoxiaoxingyunlingganti.ttf',
  xingchenyudahai: '/fonts/xingchenyudahai.ttf',
  zhongqingshanchengbangbangti: '/fonts/zhongqingshanchengbangbangti.ttf',
  zuorimeimengyanjiuyuan: '/fonts/zuorimeimengyanjiuyuan.ttf',
} as const

const ENGLISH_WORD_REGEX = /[a-zA-Z]+/
const isEnglishWord = (text: string) => ENGLISH_WORD_REGEX.test(text)

// 在 FONTS 后面添加预览文本量
const PREVIEW_TEXT = {
  poem: "春风得意马蹄疾，日看尽长安花。",
  numbers: "1234567890",
  symbols: "，。！？；：「」『』",
  mixed: "你好Hello世界World！2024年",
  paragraph: "这是一段示例文字，包含了英文混排、数字123和符号。",
  english: "The quick brown fox jumps over the lazy dog."
} as const

// 修改默认文本，使其更有代表性和实用性
const DEFAULT_TEXT = `手写字体模拟器 v1.0

这是一个模拟手写效果的在线工具，可以帮助你快速生成手写风格的文本。

主要功能：
1. 支持多种手写字体
2. 可调节字间距、大小扰动等参数
3. 支持空行和首行缩进
4. 支持中英文混排
5. 支持多种纸张背景
6. 可导出PDF和图片

注意事项：
  图片生成部分时候需要点击两次按钮
• 建议先在预览界面调整好参数再导出
• 导出PDF时请耐心等待，处理大量文本可能需要一些时间
• 某些字体可能需要较长加载时间
• 建议定期保存你调整好的参数设置

关于作业提交：
如果你需要将生成的内容用于作业，请注意：
1. 适当调整参数，使其看起来更自然
2. 建议使用不同字体来避免雷同
3. 可以通过调整颜色来模拟不同笔迹

问题反馈：
如果你发现任何问题或有建议，欢迎联系：
邮箱：xuyangz315@gmail.com

祝使用愉快！
`

// 创建一个基础布局组件
const BaseLayout = ({ children }: { children: React.ReactNode }) => {
  // 使用 useEffect 来处理客户端渲
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">增强版手写字体模拟器</h1>
      {mounted ? children : (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-gray-500">正在加载...</div>
        </div>
      )}
    </div>
  )
}

// 添加移动设备检测
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );
};

export function EnhancedHandwritingSimulator() {
  // 添加 mounted 状态
  const [mounted, setMounted] = useState(false)

  // 添加 useEffect 来设置 mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // 首先定义 FontPreviewCard 组件
  const FontPreviewCard = ({ font }: { font: typeof FONTS[number] }) => {
    const isLoaded = loadedFonts.has(font.value)
    const isFailed = failedFonts.has(font.value)
    
    return (
      <div className="border rounded-lg p-4 space-y-2 bg-white shadow-sm">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">{font.name}</h3>
          <div className="text-xs">
            {isFailed && <span className="text-red-500">(加载失败)</span>}
            {!isLoaded && !isFailed && <span className="text-gray-400">(加载中...)</span>}
          </div>
        </div>
        <div 
          className={`p-4 rounded min-h-[200px] transition-colors ${
            isLoaded ? 'bg-white' : 'bg-gray-50'
          } border`}
          style={{
            fontFamily: isLoaded ? `'${font.value}', sans-serif` : 'sans-serif',
            fontSize: '18px',
            lineHeight: '1.6',
          }}
        >
          {isFailed ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              <span className="text-red-500">字体加载失败</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setFailedFonts(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(font.value)
                    return newSet
                  })
                  setLoadedFonts(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(font.value)
                    return newSet
                  })
                }}
              >
                重试加载
              </Button>
            </div>
          ) : !isLoaded ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400">正在加载字体...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xl leading-relaxed">{PREVIEW_TEXT.poem}</div>
              <div className="text-lg leading-relaxed">{PREVIEW_TEXT.paragraph}</div>
              <div className="text-base leading-relaxed">
                <span className="mr-4">{PREVIEW_TEXT.numbers}</span>
                <span>{PREVIEW_TEXT.symbols}</span>
              </div>
              <div className="text-base leading-relaxed">{PREVIEW_TEXT.english}</div>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 hover:bg-gray-50"
          onClick={() => setSelectedFont(font.value)}
          disabled={!isLoaded || isFailed}
        >
          使用字体
        </Button>
      </div>
    )
  }

  // 然后是状态定义
  const [text, setText] = useState(DEFAULT_TEXT)
  const [params, setParams] = useState<HandwritingParams>(DEFAULT_PARAMS)
  const [selectedFont, setSelectedFont] = useState("menglixinghe")
  const [paperStyle, setPaperStyle] = useState(PAPER_STYLES[0].value)
  const [showFullImage, setShowFullImage] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdfFileName, setPdfFileName] = useState("手写文本")
  const [dialogOpen, setDialogOpen] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  // 添加字体加载状态
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set())

  // 添加一个新的状态来跟踪字体加载失败的情况
  const [failedFonts, setFailedFonts] = useState<Set<string>>(new Set())

  // 添加初始化加载状态
  useEffect(() => {
    // 预加载所有字体
    const loadAllFonts = async () => {
      for (const font of FONTS) {
        try {
          // 如果字体已加载，跳过
          if (loadedFonts.has(font.value)) continue;

          // 添加超时处理
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Font loading timeout')), 10000)
          );
          
          // 检查字体文是否存在
          const response = await Promise.race([
            fetch(FONT_URLS[font.value]),
            timeoutPromise
          ]) as Response;
          
          if (!response.ok) throw new Error(`Font file not found: ${FONT_URLS[font.value]}`);

          // 创建并添加 @font-face
          const style = document.createElement('style')
          style.textContent = `
            @font-face {
              font-family: '${font.value}';
              src: url('${FONT_URLS[font.value]}') format('truetype');
              font-display: swap;
            }
          `
          document.head.appendChild(style)

          // 加载字体
          const fontFace = new FontFace(font.value, `url(${FONT_URLS[font.value]})`)
          await fontFace.load()
          document.fonts.add(fontFace)
          
          // 更新加载状态
          setLoadedFonts(prev => {
            const newSet = new Set(prev)
            newSet.add(font.value)
            return newSet
          })
        } catch (err) {
          console.error(`加载字体失败 ${font.name}:`, err)
          setFailedFonts(prev => {
            const newSet = new Set(prev)
            newSet.add(font.value)
            return newSet
          })
        }
      }
    }

    loadAllFonts()
  }, [loadedFonts]) // 只在组件挂载行一次

  // 修改字体选择的处理
  useEffect(() => {
    // 如果选择的字体加载失败，自动切换到第一个可字体
    if (failedFonts.has(selectedFont)) {
      const firstAvailableFont = FONTS.find(f => 
        loadedFonts.has(f.value) && !failedFonts.has(f.value)
      )
      if (firstAvailableFont) {
        setSelectedFont(firstAvailableFont.value)
      }
    }
  }, [selectedFont, failedFonts, loadedFonts])

  const renderedText = useMemo(() => {
    if (!mounted) return [] // 现在可以安全使用 mounted
    
    const processedText = params.removeMarkdown ? removeMarkdownFormat(text) : text
    return processedText.split('\n').map((line, _lineIndex) => {
      let processedLine = line
      const words: string[] = []
      let currentWord = ''
      
      // 处理空行
      if (line.trim() === '') {
        if (params.indentEmptyLine) {
          // 如果需要缩进空行，添加缩进空格
          processedLine = '　　'
        } else {
          // 如果不需要缩进空行，保持为空字符串
          processedLine = ''
        }
      } else if (params.indentFirstLine) {
        // 非空行且需要首行缩进时添加缩进
        processedLine = '　　' + processedLine
      }

      // 分割英文词和他字符
      for (let i = 0; i < processedLine.length; i++) {
        const char = processedLine[i]
        if (isEnglishWord(char)) {
          currentWord += char
        } else {
          if (currentWord) {
            words.push(currentWord)
            currentWord = ''
          }
          words.push(char)
        }
      }
      if (currentWord) {
        words.push(currentWord)
      }

      const chars = words.map((word, wordIndex) => {
        const isSymbol = SYMBOLS.has(word)
        const isWord = isEnglishWord(word)
        
        // 跳过行首符号
        if (params.preventSymbolAtAllLineStarts && isSymbol && wordIndex === 0) {
          return null
        }

        // 为英文单词创建整体 span
        if (isWord) {
          const size = 1 + (Math.random() - 0.5) * params.sizeVariation
          const rotation = (Math.random() - 0.5) * params.rotationOffset * 360
          const yOffset = (Math.random() - 0.5) * params.verticalOffset * 20
          const xOffset = (Math.random() - 0.5) * params.horizontalOffset * 20
          
          return (
            <span
              key={`${_lineIndex}-${wordIndex}`}
              style={{
                display: 'inline-block',
                transform: `
                  translate(${xOffset}px, ${yOffset}px) 
                  rotate(${rotation}deg) 
                  scale(${size})
                `,
                marginLeft: `${params.charSpacing}px`,
                marginRight: `${params.charSpacing}px`,
                color: params.color,
                transition: 'transform 0.3s ease'
              }}
            >
              {word}
            </span>
          )
        }

        // 其他字符的处理保持不变
        const size = 1 + (Math.random() - 0.5) * params.sizeVariation
        const rotation = (Math.random() - 0.5) * params.rotationOffset * 360
        const yOffset = (Math.random() - 0.5) * params.verticalOffset * 20
        const xOffset = (Math.random() - 0.5) * params.horizontalOffset * 20
        
        let leftMargin = params.charSpacing
        let rightMargin = params.charSpacing

        if (isSymbol) {
          leftMargin = params.charSpacing * (1 + params.symbolSpacingAdjustment) * 2
          rightMargin = params.charSpacing * 0.1
        }
        
        return (
          <span
            key={`${_lineIndex}-${wordIndex}`}
            style={{
              display: 'inline-block',
              transform: `
                translate(${xOffset}px, ${yOffset}px) 
                rotate(${rotation}deg) 
                scale(${size})
              `,
              marginLeft: `${leftMargin}px`,
              marginRight: `${rightMargin}px`,
              color: params.color,
              transition: 'transform 0.3s ease'
            }}
          >
            {word}
          </span>
        )
      }).filter(Boolean)

      // 确保空行也有适当的高度
      return (
        <div 
          key={`line-${_lineIndex}`} 
          style={{ 
            marginBottom: `${params.lineSpacing * 10}px`,
            display: 'block',
            minHeight: line.trim() === '' ? `${params.fontSize * params.verticalSpacing}px` : 'auto'
          }}
        >
          {chars}
        </div>
      )
    })
  }, [text, params, mounted]) // mounted 作为依项

  const previewText = useMemo(() => {
    return renderedText.slice(0, 5000)
  }, [renderedText])

  const handleParamChange = (key: keyof HandwritingParams, value: number | string | boolean) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  // 修改参数相关的函数
  const resetParams = () => {
    if (window.confirm('确定要恢复默认参数吗？当前参数将会丢失。')) {
      setParams(DEFAULT_PARAMS)
    }
  }

  const saveParams = () => {
    try {
      localStorage.setItem('handwritingParams', JSON.stringify(params))
      alert('参数保存成功！')
    } catch (error) {
      console.error('保存参数失败:', error)
      alert('保存参数失败，请重试')
    }
  }

  const loadParams = () => {
    try {
      const saved = localStorage.getItem('handwritingParams')
      if (!saved) {
        alert('没有找到已保存的参数')
        return
      }
      const loadedParams = JSON.parse(saved)
      setParams(loadedParams)
      alert('参数加载成功！')
    } catch (error) {
      console.error('加载参数失败:', error)
      alert('加载参数败，请重试')
    }
  }

  // 添加对话框控制状态
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);

  // 修改生成图片函数
  const generateFullImage = async () => {
    try {
      setIsGenerating(true);
      const previewDiv = document.querySelector('.preview-content') as HTMLElement
      if (!previewDiv) {
        throw new Error('预览区域不存在')
      }

      // 创建临时容器
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.width = `${A4_DIMENSIONS.width}px`
      
      // 设置背景样式
      const selectedPaperStyle = PAPER_STYLES.find(s => s.value === paperStyle)
      if (selectedPaperStyle?.bgImage) {
        container.style.backgroundImage = selectedPaperStyle.bgImage
          .replace('bg-[url(\'', 'url(\'')
          .replace('\')]', '\')')
        container.style.backgroundSize = 'cover'
      } else if (selectedPaperStyle?.bgColor) {
        container.style.backgroundColor = selectedPaperStyle.bgColor === 'bg-white' ? 'white' : selectedPaperStyle.bgColor
      } else {
        container.style.backgroundColor = 'white'
      }
      
      // 复制预览内容
      const clone = previewDiv.cloneNode(true) as HTMLElement
      clone.style.maxHeight = 'none'
      clone.style.height = 'auto'
      clone.style.overflow = 'visible'
      clone.style.fontSize = `${params.fontSize}px`
      clone.style.fontFamily = selectedFont
      clone.style.transform = 'none'
      clone.style.letterSpacing = '0.01em'
      clone.style.lineHeight = String(params.verticalSpacing)
      clone.style.wordBreak = 'break-all'
      clone.style.whiteSpace = 'pre-wrap'
      container.appendChild(clone)
      document.body.appendChild(container)

      await document.fonts.ready
      await new Promise(resolve => setTimeout(resolve, 500))

      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: selectedPaperStyle?.bgColor === 'bg-white' ? '#ffffff' : null,
        width: A4_DIMENSIONS.width,
        height: container.scrollHeight,
      })

      document.body.removeChild(container)
      
      // 更新画布引用并显示下载按钮
      if (canvasRef.current) {
        canvasRef.current.width = canvas.width
        canvasRef.current.height = canvas.height
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.drawImage(canvas, 0, 0)
        }
      }

      // 设置进度为100%
      setGeneratingProgress(100)
      
      // 等待一小段时间后再关闭对话框，让用户看到100%的进度
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 显示图片和下载按钮
      setShowFullImage(true)
      setImageDialogOpen(false)

    } catch (error) {
      console.error('生成图片失败:', error)
      alert('生成图片失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  // 修改生成图片对话框和显示部分
  <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
    <DialogTrigger asChild>
      <Button className="gap-2">
        <ImageIcon className="w-4 h-4" />
        生成完整图片
      </Button>
    </DialogTrigger>
    <DialogContent className="pdf-export-dialog">
      <DialogHeader className="pdf-export-header">
        <DialogTitle>生成完整图片</DialogTitle>
      </DialogHeader>
      <div className="pdf-export-content">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image-filename">文件名称</Label>
            <Input
              id="image-filename"
              value={pdfFileName}
              onChange={(e) => setPdfFileName(e.target.value)}
              placeholder="输入文件名"
              className="pdf-export-input"
            />
          </div>
          {isGenerating ? (
            <div className="space-y-4">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${generatingProgress}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-500">
                正在生成图片 {generatingProgress}%
              </p>
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-500 mb-4">
                <p>注意事项：</p>
                <ul className="list-disc pl-4 space-y-1">
                  <p>• 生成过程需要 5-15 秒，请耐心等待</p>
                  <p>• 文本越长，处理时间越久</p>
                  <p>• 生成完成后可直接下载图片</p>
                  <p>• 部分图片需要生成两次才能成功</p>
                </ul>
              </div>
              <Button 
                onClick={generateFullImage}
                className="w-full"
                disabled={isGenerating}
              >
                开始生成
              </Button>
            </>
          )}
        </div>
      </div>
    </DialogContent>
  </Dialog>

  {/* 修改图片显示区域 */}
  {showFullImage && (
    <div className="border rounded-lg p-4 overflow-hidden canvas-container space-y-4 bg-white">
      <div className="text-center text-sm text-gray-500 mb-4">
        生成完成！您可以右键保存图片，或点击下方按钮下载
      </div>
      <canvas ref={canvasRef} className="w-full h-auto border rounded-lg" />
      <Button 
        onClick={() => {
          const link = document.createElement('a');
          link.download = `${pdfFileName || '手写文本'}.png`;
          if (canvasRef.current) {
            link.href = canvasRef.current.toDataURL('image/png');
          }
          link.click();
        }}
        className="w-full"
      >
        下载图片
      </Button>
    </div>
  )}

  // 将未使用的函数标记为以 _ 开头
  const _calculateLines = (ctx: CanvasRenderingContext2D, processedText: string) => {
    const lines: string[] = []
    const fontSize = params.fontSize
    ctx.font = `${fontSize}px ${selectedFont}`
    
    const textLines = processedText.split('\n')
    const maxWidth = A4_DIMENSIONS.width - A4_DIMENSIONS.padding * 2
    
    let previousLine = ''
    let currentPageHeight = PAGE_MARGIN_TOP
    const lineHeight = fontSize * params.verticalSpacing
    
    textLines.forEach((_textLine) => {
      let currentLine = ''
      let x = 0
      const words: string[] = []
      let currentWord = ''
      
      // 处理首缩进
      if (params.indentFirstLine && (_textLine.trim() !== '' || params.indentEmptyLine)) {
        x += fontSize * 2
        currentLine = '　　'
      }
      
      // 分词处理
      for (let i = 0; i < _textLine.length; i++) {
        const char = _textLine[i]
        if (isEnglishWord(char)) {
          currentWord += char
        } else {
          if (currentWord) {
            words.push(currentWord)
            currentWord = ''
          }
          words.push(char)
        }
      }
      if (currentWord) {
        words.push(currentWord)
      }

      // 处理每个单词或字符
      for (let i = 0; i < words.length; i++) {
        const word = words[i]
        const isSymbol = SYMBOLS.has(word)
        
        const wordWidth = ctx.measureText(word).width
        const spacing = isSymbol 
          ? wordWidth + params.charSpacing * (1 + params.symbolSpacingAdjustment) * 2
          : wordWidth + params.charSpacing * 2

        // 检查是否需要换行
        if (x + spacing > maxWidth) {
          // 检查前行否会超出页底部
          const spaceNeeded = lineHeight
          const spaceAvailable = A4_PAGE_HEIGHT - PAGE_MARGIN_BOTTOM - currentPageHeight

          if (spaceAvailable < spaceNeeded) {
            // 记录这一页底部剩余的空间
            currentPageHeight = PAGE_MARGIN_TOP
            if (currentLine.trim()) {
              lines.push(currentLine)
              previousLine = currentLine
            }
            currentLine = ''
            x = 0
            
            // 如果是首行缩进，新行也需要缩进
            if (params.indentFirstLine) {
              x += fontSize * 2
              currentLine = '　　'
            }
          } else {
            // 正常换行
            if (currentLine.trim()) {
              lines.push(currentLine)
              previousLine = currentLine
              currentPageHeight += lineHeight
            }
            currentLine = ''
            x = 0
            
            if (params.indentFirstLine) {
              x += fontSize * 2
              currentLine = '　　'
            }
          }
        }

        // 理符号
        if (isSymbol) {
          // 如果是行首符号
          if (currentLine === '' || currentLine === '　　') {
            // 如果有上一行，将符号添加到上一行末尾
            if (previousLine && lines.length > 0 && 
                currentPageHeight + lineHeight <= A4_PAGE_HEIGHT - PAGE_MARGIN_BOTTOM) {
              lines[lines.length - 1] = previousLine + word
              continue
            }
          }
        }

        currentLine += word
        x += spacing
        previousLine = currentLine
      }
    })
    
    return lines
  }

  const _drawTextPage = (ctx: CanvasRenderingContext2D, page: number, lines: string[], linesPerPage: number) => {
    const fontSize = params.fontSize
    ctx.font = `${fontSize}px ${selectedFont}`
    ctx.fillStyle = params.color
    
    const startLine = page * linesPerPage
    const endLine = Math.min((page + 1) * linesPerPage, lines.length)
    const lineHeight = fontSize * params.verticalSpacing
    
    for (let i = startLine; i < endLine; i++) {
      const line = lines[i]
      let x = A4_DIMENSIONS.padding
      const y = (i - startLine) * lineHeight + A4_DIMENSIONS.padding + page * A4_DIMENSIONS.height
      
      // 处理首行缩进
      if (params.indentFirstLine && (line.trim() !== '' || params.indentEmptyLine)) {
        x += fontSize * 2
      }

      // 分词处理，确保文单词和符号的正处理
      const words = []
      let currentWord = ''
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (isEnglishWord(char)) {
          currentWord += char
        } else {
          if (currentWord) {
            words.push(currentWord)
            currentWord = ''
          }
          words.push(char)
        }
      }
      if (currentWord) {
        words.push(currentWord)
      }

      // 处理每个单词或字符
      let isLineStart = true
      for (const word of words) {
        const isSymbol = SYMBOLS.has(word)
        
        // 跳过行首符号
        if (params.preventSymbolAtAllLineStarts && isSymbol && isLineStart) {
          continue
        }

        if (isEnglishWord(word)) {
          // 处英文单词
          const size = 1 + (Math.random() - 0.5) * params.sizeVariation
          const rotation = (Math.random() - 0.5) * params.rotationOffset * Math.PI
          const yOffset = (Math.random() - 0.5) * params.verticalOffset * 20
          const xOffset = (Math.random() - 0.5) * params.horizontalOffset * 20
          
          ctx.save()
          ctx.translate(x + xOffset, y + yOffset)
          ctx.rotate(rotation)
          ctx.scale(size, size)
          ctx.fillText(word, 0, 0)
          ctx.restore()
          
          const wordWidth = ctx.measureText(word).width
          x += wordWidth + params.charSpacing * 2
        } else {
          // 处理其字符
          const size = 1 + (Math.random() - 0.5) * params.sizeVariation
          const rotation = (Math.random() - 0.5) * params.rotationOffset * Math.PI
          const yOffset = (Math.random() - 0.5) * params.verticalOffset * 20
          const xOffset = (Math.random() - 0.5) * params.horizontalOffset * 20
          
          ctx.save()
          ctx.translate(x + xOffset, y + yOffset)
          ctx.rotate(rotation)
          ctx.scale(size, size)
          ctx.fillText(word, 0, 0)
          ctx.restore()
          
          const charWidth = ctx.measureText(word).width
          if (isSymbol) {
            x += charWidth + params.charSpacing * (1 + params.symbolSpacingAdjustment) * 2
          } else {
            x += charWidth + params.charSpacing * 2
          }
        }
        
        isLineStart = false
      }
    }
  }

  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    try {
      setIsExporting(true);
      const previewDiv = document.querySelector('.preview-content') as HTMLElement
      if (!previewDiv) {
        throw new Error('预览区域不存')
      }

      const A4_WIDTH_PT = 595.28
      const A4_HEIGHT_PT = 841.89
      const MARGIN_PT = 5
      const TOP_MARGIN_PT = 15
      const BOTTOM_MARGIN_PT = 15

      // 创建临时容器
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.width = `${A4_WIDTH_PT - MARGIN_PT * 2}px`
      
      // 设置背景样式
      const selectedPaperStyle = PAPER_STYLES.find(s => s.value === paperStyle)
      if (selectedPaperStyle?.bgImage) {
        container.style.backgroundImage = selectedPaperStyle.bgImage
          .replace('bg-[url(\'', 'url(\'')
          .replace('\')]', '\')')
        container.style.backgroundSize = 'cover'
      } else if (selectedPaperStyle?.bgColor) {
        container.style.backgroundColor = selectedPaperStyle.bgColor === 'bg-white' ? 'white' : selectedPaperStyle.bgColor
      } else {
        container.style.backgroundColor = 'white'
      }
      
      // 复制预览内容
      const clone = previewDiv.cloneNode(true) as HTMLElement
      // 移除分页线元素
      const pageDivider = clone.querySelector('.page-divider')
      if (pageDivider) {
        pageDivider.remove()
      }
      clone.style.maxHeight = 'none'
      clone.style.height = 'auto'
      clone.style.overflow = 'visible'
      clone.style.fontSize = `${params.fontSize * 0.8}px`
      clone.style.fontFamily = selectedFont
      clone.style.transform = 'none'
      clone.style.letterSpacing = '0.01em'
      clone.style.lineHeight = String(params.verticalSpacing * 0.9)
      clone.style.wordBreak = 'break-all'
      clone.style.whiteSpace = 'pre-wrap'
      // 移除背图片相关样式
      clone.style.backgroundImage = 'none'
      container.appendChild(clone)
      document.body.appendChild(container)

      await document.fonts.ready
      await new Promise(resolve => setTimeout(resolve, 500))

      // 计算总页数
      const totalHeight = container.scrollHeight
      const pageContentHeight = A4_HEIGHT_PT - TOP_MARGIN_PT - BOTTOM_MARGIN_PT
      const totalPages = Math.ceil(totalHeight / pageContentHeight)

      // 创建 PDF
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      })

      // 为每页创建 canvas
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage()
        }

        const pageContainer = document.createElement('div')
        pageContainer.style.position = 'absolute'
        pageContainer.style.left = '-9999px'
        pageContainer.style.width = `${A4_WIDTH_PT - MARGIN_PT * 2}px`
        pageContainer.style.height = `${pageContentHeight}px`
        pageContainer.style.overflow = 'hidden'
        pageContainer.style.paddingTop = `${TOP_MARGIN_PT}px`
        pageContainer.style.paddingBottom = `${BOTTOM_MARGIN_PT}px`
        
        // 复制背景样式
        if (selectedPaperStyle?.bgImage) {
          pageContainer.style.backgroundImage = selectedPaperStyle.bgImage
            .replace('bg-[url(\'', 'url(\'')
            .replace('\')]', '\')')
          pageContainer.style.backgroundSize = 'cover'
        } else if (selectedPaperStyle?.bgColor) {
          pageContainer.style.backgroundColor = selectedPaperStyle.bgColor === 'bg-white' ? 'white' : selectedPaperStyle.bgColor
        }

        const pageContent = clone.cloneNode(true) as HTMLElement
        pageContent.style.marginTop = `-${page * (pageContentHeight - TOP_MARGIN_PT)}px`
        pageContainer.appendChild(pageContent)
        document.body.appendChild(pageContainer)

        const { default: html2canvas } = await import('html2canvas')
        const canvas = await html2canvas(pageContainer, {
          scale: 2,
          useCORS: true,
          backgroundColor: selectedPaperStyle?.bgColor === 'bg-white' ? '#ffffff' : null,
          width: A4_WIDTH_PT - MARGIN_PT * 2,
          height: A4_HEIGHT_PT,
          onclone: (clonedDoc) => {
            const clonedContent = clonedDoc.querySelector('.preview-content') as HTMLElement
            if (clonedContent) {
              // 除分页线
              const pageDivider = clonedContent.querySelector('.page-divider')
              if (pageDivider) {
                pageDivider.remove()
              }
              clonedContent.style.transform = 'none'
              clonedContent.style.marginTop = `-${page * (pageContentHeight - TOP_MARGIN_PT)}px`
              clonedContent.style.paddingTop = `${TOP_MARGIN_PT}px`
              clonedContent.style.paddingBottom = `${BOTTOM_MARGIN_PT}px`
              // 移除背景相关样式
              clonedContent.style.backgroundImage = 'none'
            }
          }
        })

        pdf.addImage(
          canvas.toDataURL('image/jpeg', 1.0),
          'JPEG',
          MARGIN_PT,
          MARGIN_PT,
          A4_WIDTH_PT - MARGIN_PT * 2,
          A4_HEIGHT_PT - MARGIN_PT * 2
        )

        document.body.removeChild(pageContainer)
      }

      document.body.removeChild(container)
      pdf.save(`${pdfFileName}.pdf`)
      setDialogOpen(false)
      setShowFullImage(false)

    } catch (error) {
      console.error('PDF导出失败:', error)
      alert('PDF导出失败，请检查文本内容或稍后重试')
    } finally {
      setIsExporting(false);
    }
  }

  // 修改览内容的渲染逻辑
  const previewContent = useMemo(() => {
    if (failedFonts.has(selectedFont)) {
      return (
        <div className="text-center py-4 space-y-2">
          <div className="text-red-500">字体加载失败</div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // 重置失败状态并重试加载
              setFailedFonts(prev => {
                const newSet = new Set(prev)
                newSet.add(selectedFont)
                return newSet
              })
              setLoadedFonts(prev => {
                const newSet = new Set(prev)
                newSet.add(selectedFont)
                return newSet
              })
            }}
          >
            重试加载
          </Button>
        </div>
      )
    }
    
    if (!loadedFonts.has(selectedFont)) {
      return <div className="text-center py-4">正在加载字体...</div>
    }

    return (
      <>
        {/* 添加 page-divider 类名 */}
        <div
          className="absolute left-0 right-0 pointer-events-none page-divider"
          style={{
            top: '0',
            bottom: '0',
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              transparent 0px,
              transparent ${PAGE_MARGIN_TOP}px,
              transparent ${PAGE_MARGIN_TOP}px,
              transparent ${A4_PAGE_HEIGHT - PAGE_MARGIN_BOTTOM}px,
              #e5e5e5 ${A4_PAGE_HEIGHT - PAGE_MARGIN_BOTTOM}px,
              #e5e5e5 ${A4_PAGE_HEIGHT}px,
              transparent ${A4_PAGE_HEIGHT}px,
              transparent ${A4_PAGE_HEIGHT + PAGE_MARGIN_TOP}px
            )`,
            zIndex: 10,
          }}
        />
        {previewText}
        {text.length > 5000 && <span className="text-gray-400">...</span>}
      </>
    )
  }, [previewText, text, loadedFonts, selectedFont, failedFonts])

  // 修改预览区域的渲染
  return (
    <BaseLayout>
      {/* 移动设备提示 */}
      {isMobile() && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                建议使用横屏模式以获得更好的体验
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 将文本输入框移到最上方 */}
      <div className="space-y-2 mb-6">
        <Textarea
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 5000))}
          placeholder="输入要模拟的文本..."
          className="min-h-[150px] resize-y"
          style={{
            fontSize: isMobile() ? '16px' : undefined,
          }}
        />
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">已输入 {text.length} / 5000 字</p>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remove-markdown"
              checked={params.removeMarkdown}
              onChange={(e) => handleParamChange('removeMarkdown', e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="remove-markdown" className="text-sm cursor-pointer">
              去除 Markdown 格式
            </Label>
          </div>
        </div>
      </div>

      {/* 修改网格布局适应移动设备 */}
      <div className={`grid ${isMobile() ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
        <div className="space-y-2 param-group">
          <Label>字体左右间距 ({params.charSpacing})</Label>
          <div className="slider-root">
            <Slider
              min={-10}
              max={5}
              step={0.5}
              value={[params.charSpacing]}
              onValueChange={([value]) => handleParamChange('charSpacing', value)}
              className="slider-track"
            >
              <div 
                className="slider-range" 
                style={{ 
                  width: `${getSliderProgress(params.charSpacing, -10, 5)}%` 
                }}
              />
              <div className="slider-thumb" />
            </Slider>
          </div>
          <p className="param-description">调整字符之间的基础间距</p>
          <div className="param-tooltip">推荐值: 1.0 ~ 2.0</div>
        </div>

        <div className="space-y-2 param-group">
          <Label>字体大小扰动 ({params.sizeVariation})</Label>
          <div className="slider-root">
            <Slider
              min={0}
              max={5}
              step={0.1}
              value={[params.sizeVariation]}
              onValueChange={([value]) => handleParamChange('sizeVariation', value)}
              className="slider-track"
            >
              <div 
                className="slider-range" 
                style={{ 
                  width: `${getSliderProgress(params.sizeVariation, 0, 5)}%` 
                }}
              />
              <div className="slider-thumb" />
            </Slider>
          </div>
          <p className="param-description">随机调整每个字符的大小变化</p>
          <div className="param-tooltip">推荐值: 0.2 ~ 0.4</div>
        </div>

        <div className="space-y-2 param-group">
          <Label>字间距扰动 ({params.lineSpacing})</Label>
          <div className="slider-root">
            <Slider
              min={0}
              max={10}
              step={0.1}
              value={[params.lineSpacing]}
              onValueChange={([value]) => handleParamChange('lineSpacing', value)}
              className="slider-track"
            >
              <div 
                className="slider-range" 
                style={{ 
                  width: `${getSliderProgress(params.lineSpacing, 0, 10)}%` 
                }}
              />
              <div className="slider-thumb" />
            </Slider>
          </div>
          <p className="param-description">随机调整字符间距的变化</p>
          <div className="param-tooltip">推荐值: 0.3 ~ 0.5</div>
        </div>

        <div className="space-y-2 param-group">
          <Label>笔画横向偏移扰动 ({params.horizontalOffset})</Label>
          <div className="slider-root">
            <Slider
              min={0}
              max={5}
              step={0.1}
              value={[params.horizontalOffset]}
              onValueChange={([value]) => handleParamChange('horizontalOffset', value)}
              className="slider-track"
            >
              <div 
                className="slider-range" 
                style={{ 
                  width: `${getSliderProgress(params.horizontalOffset, 0, 5)}%` 
                }}
              />
              <div className="slider-thumb" />
            </Slider>
          </div>
          <p className="param-description">随机调整字符的水平位置</p>
          <div className="param-tooltip">推荐值: 0.2 ~ 0.3</div>
        </div>

        <div className="space-y-2 param-group">
          <Label>笔画纵向偏移扰动 ({params.verticalOffset})</Label>
          <div className="slider-root">
            <Slider
              min={0}
              max={5}
              step={0.1}
              value={[params.verticalOffset]}
              onValueChange={([value]) => handleParamChange('verticalOffset', value)}
              className="slider-track"
            >
              <div 
                className="slider-range" 
                style={{ 
                  width: `${getSliderProgress(params.verticalOffset, 0, 5)}%` 
                }}
              />
              <div className="slider-thumb" />
            </Slider>
          </div>
          <p className="param-description">随机调整字符的垂直位置</p>
          <div className="param-tooltip">推荐值: 0.2 ~ 0.3</div>
        </div>

        <div className="space-y-2 param-group">
          <Label>笔画旋转偏移扰动 ({params.rotationOffset})</Label>
          <div className="slider-root">
            <Slider
              min={0}
              max={0.5}
              step={0.01}
              value={[params.rotationOffset]}
              onValueChange={([value]) => handleParamChange('rotationOffset', value)}
              className="slider-track"
            >
              <div 
                className="slider-range" 
                style={{ 
                  width: `${getSliderProgress(params.rotationOffset, 0, 0.5)}%` 
                }}
              />
              <div className="slider-thumb" />
            </Slider>
          </div>
          <p className="param-description">随机调整字符的旋转角度</p>
          <div className="param-tooltip">推荐值: 0.1 ~ 0.2</div>
        </div>

        <div className="space-y-2 param-group">
          <Label>符号间距调整 ({params.symbolSpacingAdjustment})</Label>
          <div className="slider-root">
            <Slider
              min={-1}
              max={1}
              step={0.1}
              value={[params.symbolSpacingAdjustment]}
              onValueChange={([value]) => handleParamChange('symbolSpacingAdjustment', value)}
              className="slider-track"
            >
              <div 
                className="slider-range" 
                style={{ 
                  width: `${getSliderProgress(params.symbolSpacingAdjustment, -1, 1)}%` 
                }}
              />
              <div className="slider-thumb" />
            </Slider>
          </div>
          <p className="param-description">调整标点符号的间距</p>
          <div className="param-tooltip">推荐值: -0.5 ~ 0</div>
        </div>

        <div className="space-y-2 param-group">
          <Label>字体大小 ({params.fontSize}px)</Label>
          <div className="slider-root">
            <Slider
              min={14}
              max={36}
              step={1}
              value={[params.fontSize]}
              onValueChange={([value]) => handleParamChange('fontSize', value)}
              className="slider-track"
            >
              <div 
                className="slider-range" 
                style={{ 
                  width: `${getSliderProgress(params.fontSize, 14, 36)}%` 
                }}
              />
              <div className="slider-thumb" />
            </Slider>
          </div>
          <p className="param-description">调整字体的基础大小</p>
          <div className="param-tooltip">推荐值: 22px ~ 24px</div>
        </div>

        <div className="space-y-2 param-group">
          <Label>上下间距 ({params.verticalSpacing}倍)</Label>
          <div className="slider-root">
            <Slider
              min={1}
              max={2}
              step={0.1}
              value={[params.verticalSpacing]}
              onValueChange={([value]) => handleParamChange('verticalSpacing', value)}
              className="slider-track"
            >
              <div 
                className="slider-range" 
                style={{ 
                  width: `${getSliderProgress(params.verticalSpacing, 1, 2)}%` 
                }}
              />
              <div className="slider-thumb" />
            </Slider>
          </div>
          <p className="param-description">调整行间距</p>
          <div className="param-tooltip">推荐值: 1.4 ~ 1.6</div>
        </div>
      </div>

      {/* 优化移动设备的触摸体验 */}
      <div className="space-y-2">
        <Textarea
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 5000))}
          placeholder="输入要模拟的文本..."
          className="min-h-[150px] resize-y"
          style={{
            fontSize: isMobile() ? '16px' : undefined,
          }}
        />
      </div>

      {/* 优化按钮布局 */}
      <div className={`flex ${isMobile() ? 'flex-col' : ''} gap-2 justify-center`}>
        <Button 
          onClick={resetParams} 
          variant="outline" 
          className="button-outline gap-2"
          title="将所有参数恢复为默认值"
        >
          <RotateCcw className="w-4 h-4" />
          恢复默认参数
        </Button>
        <Button 
          onClick={saveParams} 
          variant="outline" 
          className="button-outline gap-2"
          title="保存当前参数设置到本地"
        >
          <Save className="w-4 h-4" />
          保存当前参数
        </Button>
        <Button 
          onClick={loadParams} 
          variant="outline" 
          className="button-outline gap-2"
          title="从本地加载上次保存的参数"
        >
          <Upload className="w-4 h-4" />
          加载已存参数
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="button-outline gap-2"
              title="选择字体颜色"
            >
              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: params.color }} />
              选择字体颜色
            </Button>
          </PopoverTrigger>
          <PopoverContent className="color-picker-content">
            <div className="p-2">
              <HexColorPicker color={params.color} onChange={(color) => handleParamChange('color', color)} />
              <Input 
                type="text" 
                value={params.color}
                onChange={(e) => handleParamChange('color', e.target.value)}
                className="color-picker-input"
                placeholder="#000000"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="select-wrapper">
        <Label className="select-label">选择纸张样式</Label>
        <Select value={paperStyle} onValueChange={setPaperStyle}>
          <SelectTrigger className="select-trigger">
            <SelectValue placeholder="选择纸张样式" />
          </SelectTrigger>
          <SelectContent className="select-content">
            {PAPER_STYLES.map((style) => (
              <SelectItem 
                key={style.value} 
                value={style.value}
                className="hover:bg-gray-50 transition-colors"
              >
                {style.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="select-wrapper">
        <div className="flex justify-between items-end mb-2">
          <Label className="select-label">选择字体</Label>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="preview-fonts-button">
                预览所有字体
              </Button>
            </DialogTrigger>
            <DialogContent className="font-preview-dialog">
              <DialogHeader className="font-preview-header">
                <DialogTitle className="font-preview-title">字体预览</DialogTitle>
              </DialogHeader>
              <div className="font-preview-content">
                {FONTS.map((font) => (
                  <FontPreviewCard key={font.value} font={font} />
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Select value={selectedFont} onValueChange={setSelectedFont}>
          <SelectTrigger className="select-trigger">
            <SelectValue placeholder="选择字体" />
          </SelectTrigger>
          <SelectContent className="select-content">
            {FONTS.map((font) => (
              <SelectItem 
                key={font.value} 
                value={font.value}
                className="select-item"
              >
                {font.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div 
        className={`border rounded-lg p-4 min-h-[400px] overflow-auto relative ${
          PAPER_STYLES.find(s => s.value === paperStyle)?.bgImage || 
          PAPER_STYLES.find(s => s.value === paperStyle)?.bgColor || ''
        }`}
        style={{
          maxHeight: isMobile() ? '50vh' : '800px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div 
          ref={previewRef}
          className="preview-content relative"
          style={{
            fontFamily: loadedFonts.has(selectedFont) ? `'${selectedFont}', sans-serif` : 'sans-serif',
            fontSize: `${params.fontSize}px`,
            maxWidth: '100%',
            margin: '0 auto',
            padding: '20px',
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
            lineHeight: params.verticalSpacing,
            letterSpacing: '0.02em',
          }}
        >
          {previewContent}
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <ImageIcon className="w-4 h-4" />
              生成完整图片
            </Button>
          </DialogTrigger>
          <DialogContent className="pdf-export-dialog">
            <DialogHeader className="pdf-export-header">
              <DialogTitle>生成完整图片</DialogTitle>
            </DialogHeader>
            <div className="pdf-export-content">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image-filename">文件名称</Label>
                  <Input
                    id="image-filename"
                    value={pdfFileName}
                    onChange={(e) => setPdfFileName(e.target.value)}
                    placeholder="输入文件名"
                    className="pdf-export-input"
                  />
                </div>
                {isGenerating ? (
                  <div className="space-y-4">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300 rounded-full"
                        style={{ width: `${generatingProgress}%` }}
                      />
                    </div>
                    <p className="text-center text-sm text-gray-500">
                      正在生成图片 {generatingProgress}%
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-gray-500 mb-4">
                      <p>注意事项：</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <p>• 生成过程需要 5-15 秒，请耐心等待</p>
                        <p>• 文本越长，处理时间越久</p>
                        <p>• 生成完成后可直接下载图片</p>
                        <p>• 部分图片需要生成两次才能成功</p>
                      </ul>
                    </div>
                    <Button 
                      onClick={generateFullImage}
                      className="w-full"
                      disabled={isGenerating}
                    >
                      开始生成
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="button-outline gap-2">
              <FileDown className="w-4 h-4" />
              导出PDF
            </Button>
          </DialogTrigger>
          <DialogContent className="pdf-export-dialog">
            <DialogHeader className="pdf-export-header">
              <DialogTitle>导出PDF</DialogTitle>
            </DialogHeader>
            <div className="pdf-export-content">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pdf-filename">文件名称</Label>
                  <Input
                    id="pdf-filename"
                    value={pdfFileName}
                    onChange={(e) => setPdfFileName(e.target.value)}
                    placeholder="输入文件名"
                    className="pdf-export-input"
                  />
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  <p>注意：导出过程可能需要 10-30 秒，请耐心等待。</p>
                  <p>文本越长，处理时间越久。</p>
                </div>
                <Button 
                  onClick={exportToPDF} 
                  className="w-full"
                  disabled={isExporting}
                >
                  {isExporting ? '正在导出...' : '确认导出'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {showFullImage && (
        <div className="border rounded-lg p-4 overflow-hidden canvas-container">
          <canvas ref={canvasRef} className="w-full h-auto" />
        </div>
      )}
    </BaseLayout>
  )
}

// 添加 getSliderProgress 函数
const getSliderProgress = (value: number, min: number, max: number) => {
  return ((value - min) / (max - min)) * 100;
};