import { useEffect, useRef, useState } from 'react'

import { Experiment, Toggle } from '@/components/lab/Experiment'

import { guardedEntry } from './entry'

type Entry = '首次进入' | '重放按钮' | '延迟启动'
function Stage({ fixed, reduce }: { fixed: boolean; reduce: boolean }) {
  const page = useRef<HTMLDivElement>(null)
  const animation = useRef<Animation | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const generation = useRef(0)
  const preference = useRef(reduce)
  preference.current = reduce
  const [loads, setLoads] = useState(0)
  const [log, setLog] = useState('页面已就绪')
  function stop() {
    animation.current?.cancel()
    animation.current = null
  }
  useEffect(() => {
    if (reduce && fixed) {
      generation.current++
      clearTimeout(timer.current)
      stop()
      setLog('已拒绝 / 结束：页面恢复，等待任务已取消')
    }
  }, [reduce, fixed])
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => {
      if (media.matches) {
        generation.current++
        clearTimeout(timer.current)
        stop()
        setLog('系统要求静止：两侧均已停止')
      }
    }
    media.addEventListener('change', onChange)
    return () => {
      generation.current++
      clearTimeout(timer.current)
      stop()
      media.removeEventListener('change', onChange)
    }
  }, [])
  async function enter(entry: Entry) {
    clearTimeout(timer.current)
    const token = ++generation.current
    stop()
    const systemStill = () => matchMedia('(prefers-reduced-motion: reduce)').matches
    if (systemStill() || (!fixed && entry === '首次进入' && preference.current)) {
      setLog('头部检查：拒绝入场，页面可读')
      return
    }
    const run = async () => {
      const blocked = () =>
        token !== generation.current || systemStill() || (fixed && preference.current)
      try {
        const started = await guardedEntry(
          blocked,
          () => {
            setLoads((n) => n + 1)
            return import('./motion')
          },
          (module) => {
            if (!page.current) return
            animation.current = module.animatePage(page.current)
            setLog(`${entry}：正在播放`)
            animation.current.onfinish = () => {
              animation.current = null
              setLog('播放结束：页面恢复')
            }
          }
        )
        if (!started && token === generation.current) setLog('入口拒绝：未启动动画，页面可读')
      } catch {
        if (token === generation.current) setLog('加载失败：页面仍可读')
      }
    }
    if (fixed && preference.current) {
      setLog('入口拒绝：未加载代码，页面可读')
      return
    }
    if (entry === '延迟启动') {
      setLog('等待 1.2 秒；现在可以打开开关')
      timer.current = setTimeout(() => void run(), 1200)
    } else await run()
  }
  return (
    <section className='lab-panel'>
      <span className='lab-eyebrow'>
        {fixed ? '修正 / 所有入口统一拦截' : '反例 / 只有首次进入检查'}
      </span>
      <h3>{fixed ? '每次启动前重新问' : '检查只做了一次'}</h3>
      <div className='lab-controls' style={{ marginBottom: 0 }}>
        {(['首次进入', '重放按钮', '延迟启动'] as Entry[]).map((entry) => (
          <button key={entry} onClick={() => void enter(entry)}>
            {entry}
          </button>
        ))}
      </div>
      <div ref={page} style={{ padding: 16, borderRadius: 8, background: 'hsl(var(--card))' }}>
        <strong>这是一页可读的内容</strong>
        <p>动画结束或被拒绝后，这段文字始终在原位。</p>
      </div>
      <p role='status'>{log}</p>
      <p>动画模块加载请求：{loads} 次</p>
    </section>
  )
}
export default function MotionDemo() {
  const [reduce, setReduce] = useState(false)
  return (
    <Experiment>
      <div className='lab-controls'>
        <Toggle checked={reduce} onChange={setReduce}>
          模拟减少动态效果
        </Toggle>
      </div>
      <div className='lab-compare'>
        <Stage fixed={false} reduce={reduce} />
        <Stage fixed reduce={reduce} />
      </div>
      <p className='lab-footnote'>
        先打开开关再点重放，或在延迟 /
        播放期间打开开关。左侧故意漏检模拟偏好；真实系统偏好始终对两侧生效。计数是调用 import
        的次数，不是网络下载次数。
      </p>
    </Experiment>
  )
}
