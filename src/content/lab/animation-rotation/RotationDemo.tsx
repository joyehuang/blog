import { useState, type CSSProperties } from 'react'

import { Experiment } from '@/components/lab/Experiment'

import './rotation.css'

export default function RotationDemo() {
  const [run, setRun] = useState(0)
  const [selected, setSelected] = useState('尚未选择卡片')
  return (
    <Experiment>
      <div className='lab-controls'>
        <button onClick={() => setRun((n) => n + 1)}>重播入场</button>
        <span role='status'>{selected}</span>
      </div>
      <div className='lab-compare'>
        {[false, true].map((fixed) => (
          <section className='lab-panel' key={String(fixed)}>
            <span className='lab-eyebrow'>
              {fixed ? '修正 / rotate + backwards' : '反例 / none + forwards'}
            </span>
            <h3>{fixed ? '保留角度，交还 hover' : '入场结束后被摆正'}</h3>
            <div
              className={`rotation-cards ${fixed ? 'rotation-fixed' : 'rotation-broken'}`}
              key={run}
            >
              {[-9, 7, -5].map((rotation, i) => (
                <button
                  className='rotation-card'
                  key={i}
                  style={{ '--rot': `${rotation}deg` } as CSSProperties}
                  onClick={() => setSelected(`已选：${fixed ? '右侧' : '左侧'}卡片 ${i + 1}`)}
                >
                  <span aria-hidden='true'>0{i + 1}</span>
                  <span>{rotation}°</span>
                </button>
              ))}
            </div>
            <p>
              {fixed
                ? '悬停或键盘聚焦：卡片抬起，倾斜仍在。'
                : '动画仍占着 transform：悬停与聚焦也抬不起来。'}
            </p>
          </section>
        ))}
      </div>
      <p className='lab-footnote'>
        系统开启减少动态效果时，两侧都跳过入场，因此不会重现被关键帧摆正的问题；原有倾斜仍然保留。
      </p>
    </Experiment>
  )
}
