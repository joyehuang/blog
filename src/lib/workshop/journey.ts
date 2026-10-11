export type JourneyStep = { id: string; label: string; reason: string }
export type JourneyPlan = {
  title: string
  summary: string
  steps: JourneyStep[]
  followUps: string[]
  mode: 'curated' | 'ai'
  question: string
}

export const curatedJourneys: Record<string, JourneyPlan> = {
  products: {
    title: '从 Agent，到能用的产品。',
    summary: '先看实际参与的产品，再回到产品形态与工程取舍。',
    question: '你如何把 Agent 做成真实产品？',
    mode: 'curated',
    steps: [
      {
        id: 'playyy',
        label: '从一个真实产品开始',
        reason:
          'Playyy 把品牌上下文、图像生成和持续迭代放进创作工作区。这是 Joye 在 Adastra Labs 参与的产品与工程工作。'
      },
      {
        id: 'atypica',
        label: '换一个问题，看看工程选择',
        reason:
          '从创作转向研究，atypica 使用多 Agent 和 Persona 访谈。不同的用户问题，需要不同的上下文与协作方式。'
      },
      {
        id: 'memory',
        label: '继续往实现里走',
        reason:
          '长期运行的 Agent 如何记住信息？这篇 Hermes 研究笔记记录了记忆分层、会话搜索与工程约束。它是技术研究，和前面的工作经历分别呈现。'
      },
      {
        id: 'product-form',
        label: '回到自己的判断',
        reason:
          '产品为什么需要 Agent？Joye 在这次分享中从意图、交互和垂类上下文出发，讨论产品应该长成什么样。'
      }
    ],
    followUps: ['想看开源和学习过程', '想一起做点东西']
  },
  thinking: {
    title: '把理解，变成自己的东西。',
    summary: '源码、实验、写作与审美，是互相影响的几条线。',
    question: '你是怎么学习、思考和形成判断的？',
    mode: 'curated',
    steps: [
      {
        id: 'harness',
        label: '读代码，也让别人能读懂',
        reason:
          'Learn Open Harness 把 Agent Loop、工具、记忆和协作整理成可探索的教程。学习会留下别人能继续使用的东西。'
      },
      {
        id: 'minimind',
        label: '往模型里面再走一步',
        reason: 'MiniMind Notes 从 Transformer 模块出发，把原理解释、代码注解与实验放在一起。'
      },
      {
        id: 'context',
        label: '经验如何成为判断',
        reason:
          '在文章里，Joye 把面试、工程实践和个人经验联系起来。这里是其中一种观点，可以直接回到原文看完整语境。'
      },
      {
        id: 'lab',
        label: '审美也通过实践形成',
        reason:
          '信息层级实验探索同一组内容的不同呈现方式。对产品交互的兴趣，也出现在代码和文章之外。'
      }
    ],
    followUps: ['回到真实产品看看', '想认识工作之外的你']
  },
  together: {
    title: '从一个人，到一群人。',
    summary: '认识一个人，也可以从他与别人如何交流开始。',
    question: '可以怎样和你交流，或者一起做东西？',
    mode: 'curated',
    steps: [
      {
        id: 'community',
        label: '带一个想法来',
        reason: 'Summer of Agents 把交流继续变成组队和制作。具体赛道与活动状态可以在活动页面查看。'
      },
      {
        id: 'talks',
        label: '从一场公开讨论开始',
        reason: '技术和产品的思考被整理成分享、讲稿与回放，让讨论能继续发生。'
      },
      {
        id: 'interview',
        label: '也愿意把自己放进反馈里',
        reason: '模拟面试与公开复盘让经验经过别人的追问，也留下可以回看与修正的思考。'
      },
      {
        id: 'about',
        label: '最后，回到这个人',
        reason: 'Agent 工程师、学生，还有工作之外的兴趣。关于页保留了更完整的个人介绍和联系入口。'
      }
    ],
    followUps: ['想看实际参与的产品', '想了解你的学习过程']
  }
}

export function validatePlan(
  value: unknown,
  allowedIds: Set<string>
): Omit<JourneyPlan, 'mode' | 'question'> {
  if (!value || typeof value !== 'object') throw new Error('Invalid journey')
  const plan = value as Record<string, unknown>
  const text = (value: unknown, max: number) => {
    if (typeof value !== 'string' || !value.trim() || value.length > max)
      throw new Error('Invalid journey text')
    return value.trim()
  }
  if (!Array.isArray(plan.steps) || plan.steps.length < 2 || plan.steps.length > 5)
    throw new Error('Invalid step count')
  const seen = new Set<string>()
  const steps = plan.steps.map((value) => {
    if (!value || typeof value !== 'object') throw new Error('Invalid step')
    const step = value as Record<string, unknown>
    const id = text(step.id, 250)
    if (!allowedIds.has(id) || seen.has(id)) throw new Error('Unknown or repeated source')
    seen.add(id)
    return { id, label: text(step.label, 60), reason: text(step.reason, 400) }
  })
  if (!Array.isArray(plan.followUps) || plan.followUps.length > 3)
    throw new Error('Invalid follow ups')
  return {
    title: text(plan.title, 80),
    summary: text(plan.summary, 240),
    steps,
    followUps: plan.followUps.map((value) => text(value, 100))
  }
}
