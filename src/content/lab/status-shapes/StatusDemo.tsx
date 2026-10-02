import { useState } from 'react'

import { Experiment, Toggle } from '@/components/lab/Experiment'

import './status.css'

const statuses = ['工作中', '等你输入', '完成']
export default function StatusDemo() {
  const [gray, setGray] = useState(false)
  const [small, setSmall] = useState(false)
  const [still, setStill] = useState(false)
  const [run, setRun] = useState(0)
  return (
    <Experiment>
      <div className='lab-controls'>
        <Toggle checked={gray} onChange={setGray}>
          转灰度
        </Toggle>
        <Toggle checked={small} onChange={setSmall}>
          缩到 24px
        </Toggle>
        <Toggle checked={still} onChange={setStill}>
          减少动态效果
        </Toggle>
        <button onClick={() => setRun((n) => n + 1)}>重播状态变化</button>
      </div>
      <div className='status-grid' data-gray={gray} data-small={small} data-still={still}>
        {statuses.map((label, index) => (
          <section className='lab-panel' key={label}>
            <div className='status-seat'>
              <svg
                key={run}
                className='status-avatar'
                viewBox='0 0 48 48'
                role='img'
                aria-label={label}
              >
                <circle className='status-face' cx='24' cy='24' r='14' />
                <circle cx='20' cy='24' r='1.5' fill='currentColor' />
                <circle cx='28' cy='24' r='1.5' fill='currentColor' />
                {index === 0 && (
                  <path className='status-arc' d='M 5 24 A 19 19 0 0 1 43 24' pathLength='100' />
                )}
                {index === 1 && (
                  <g className='status-mark'>
                    <path className='status-badge' d='M26 3 H45 V20 H35 L29 25 V20 H26 Z' />
                    <text x='35.5' y='16' textAnchor='middle'>
                      ?
                    </text>
                  </g>
                )}
                {index === 2 && (
                  <g className='status-mark'>
                    <circle className='status-badge' cx='37' cy='36' r='10' />
                    <path className='status-check' d='m32 36 3 3 6-7' />
                  </g>
                )}
              </svg>
            </div>
            <h3>{label}</h3>
            <p>
              {
                ['沿上缘从左走向右的进度弧', '问号气泡：需要你来回应', '对勾徽章：这一步结束了'][
                  index
                ]
              }
            </p>
          </section>
        ))}
      </div>
      <p className='lab-footnote'>
        这里始终保留文字标签。灰度、24px 或静止时，弧线、气泡、对勾仍是三种轮廓；动画只播放一次。
      </p>
    </Experiment>
  )
}
