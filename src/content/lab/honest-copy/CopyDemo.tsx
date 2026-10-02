import { useState } from 'react'

import { Experiment, Feedback, Toggle } from '@/components/lab/Experiment'

import { copyWithFallback, legacyCopy } from './copy'

const labels = { idle: '复制文字', pending: '正在确认…', copied: '✓ 已复制', failed: '× 复制失败' }
const text = '复制按钮别撒谎 · joyehuang.me/lab'
export default function CopyDemo() {
  const [denied, setDenied] = useState(false)
  const [fallbackFails, setFallbackFails] = useState(true)
  const [states, setStates] = useState(['idle', 'idle'])
  const [logs, setLogs] = useState(['等待操作', '等待操作'])
  function update(index: number, state: string, log?: string) {
    setStates((old) => old.map((s, i) => (i === index ? state : s)))
    if (log) setLogs((old) => old.map((s, i) => (i === index ? log : s)))
  }
  async function copy(index: number) {
    // Snapshot the controls for this attempt. The simulation never changes browser permissions.
    const write = async () => {
      if (denied) throw new Error('模拟权限被拒')
      await navigator.clipboard.writeText(text)
    }
    if (index === 0) {
      update(0, 'copied', '界面先打勾，尚未确认写入')
      void write().then(
        () => setLogs((old) => ['实际：Clipboard API 写入成功', old[1]]),
        () => setLogs((old) => ['实际：写入被拒绝，但按钮仍说已复制', old[1]])
      )
      return
    }
    update(1, 'pending', '等待写入结果')
    const result = await copyWithFallback(write, () =>
      denied && fallbackFails ? false : legacyCopy(text)
    )
    update(
      1,
      result === 'failed' ? 'failed' : 'copied',
      {
        clipboard: '实际：Clipboard API 写入成功',
        fallback: '实际：API 失败，execCommand 兜底成功',
        failed: '实际：API 与兜底均失败，请手动复制'
      }[result]
    )
  }
  return (
    <Experiment>
      <div className='lab-controls'>
        <Toggle checked={denied} onChange={setDenied}>
          模拟权限被拒
        </Toggle>
        <Toggle checked={fallbackFails} onChange={setFallbackFails}>
          模拟时兜底也失败
        </Toggle>
      </div>
      <p style={{ marginBottom: 24 }}>待复制：{text}</p>
      <div className='lab-compare'>
        {['乐观打勾', '确认后再打勾'].map((title, i) => (
          <section className='lab-panel' key={title}>
            <span className='lab-eyebrow'>{i === 0 ? '反例 / 提前承诺' : '修正 / 等待结果'}</span>
            <h3>{title}</h3>
            <button
              onClick={() => void copy(i)}
              disabled={states[i] === 'pending'}
              aria-label={title + '：' + labels[states[i] as keyof typeof labels]}
            >
              <Feedback value={states[i]!} labels={labels} />
            </button>
            <p role='status'>{logs[i]}</p>
          </section>
        ))}
      </div>
      <p className='lab-footnote'>
        打开两个模拟开关，再分别点击。取消「兜底也失败」可尝试真实的旧接口；成功与否仍由浏览器决定。正常模式会写入上面这段文字。
      </p>
    </Experiment>
  )
}
