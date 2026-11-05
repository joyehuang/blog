/**
 * Copy for the seven figures in the always-on agents post.
 * `zh` is the original Chinese. `en` is the English mirror.
 * Counts, numbers, and which example stops where stay aligned across locales.
 */

export type FigLocale = 'zh' | 'en'

// English captions need a space after the title's period. Chinese fullwidth 。 does not.
function captionRest(en: boolean, text: string) {
  return en ? ` ${text}` : text
}

export function layerItemHtml(name: string, desc: string, colon: string) {
  const esc = (s: string) =>
    s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))
  return `<strong>${esc(name)}</strong>${colon}${esc(desc)}`
}

export function archCopy(locale: FigLocale) {
  const en = locale === 'en'
  return {
    captionStrong: en
      ? 'Figure 1 · Three-part architecture of an always-on agent.'
      : '图 1 · 常驻 Agent 的三段式架构。',
    captionRest: captionRest(
      en,
      en
        ? 'Click a trigger on the left to see how a message from that source is handled.'
        : '左边的触发器可以点，看不同来源的消息会被怎么处理。'
    ),
    col1Label: en ? 'Triggers' : '触发器',
    col1Kicker: en ? '① Triggers' : '① 触发器',
    chooseLabel: en ? 'Choose a trigger' : '选择一个触发器',
    col2Label: en ? 'Server' : '服务器',
    col2Kicker: en ? '② Server (thick)' : '② 服务器（厚）',
    queueTitle: en ? 'Queue / router' : '队列 / 路由器',
    queueSub: en
      ? 'Dedupe · set priority · merge bursts · whether to bother the user'
      : '去重 · 定优先级 · 合并连发 · 要不要打扰用户',
    loopTitle: 'Agent loop',
    loopSub: en
      ? 'The model calls tools in a loop. Each task is a durable workflow (Temporal) and resumes from the last checkpoint after a crash.'
      : '模型在循环里调用工具；每个任务是一个持久化工作流（Temporal），崩溃后从断点继续',
    dbTitle: en ? 'Database' : '数据库',
    dbSub: en
      ? 'Conversation log · memory · scheduled jobs · state, written on every turn'
      : '对话日志 · 记忆 · 定时任务 · 状态，每一轮都写进来',
    col3Label: en ? "The agent's computer" : 'Agent 的电脑',
    col3Kicker: en ? "③ The agent's computer" : '③ Agent 的电脑',
    vmTitle: en ? 'Firecracker virtual machine' : 'Firecracker 虚拟机',
    vmItems: en
      ? [
          'Files: memory, skills, logs, long output',
          'Commands run in an isolated, locked-down environment',
          'Chrome, with several virtual desktops (one screen per bot)',
          'You can watch it live and take over when you need to'
        ]
      : [
          '文件：记忆、技能、日志、长输出',
          '在隔离、锁定的环境里跑命令',
          'Chrome，多个虚拟桌面（每个 bot 一块屏）',
          '可以实时查看，必要时亲手接管'
        ],
    cycleLabel: en ? 'On-demand lifecycle' : '按需使用的生命周期',
    cycle: en ? ['Start', 'Use', 'Snapshot', 'Sleep'] : ['启动', '使用', '快照', '休眠'],
    vmNote: en
      ? 'Leaving it on all the time is too expensive, so it wakes from a snapshot when needed. The agent loop does not live here, so the VM can be rebuilt and patched at any time.'
      : '一直开着太贵，需要时才从快照唤醒。Agent loop 不在这里，所以虚拟机可以随时重建、打补丁。',
    triggers: en
      ? [
          {
            key: 'me',
            name: 'You message it directly',
            hint: 'Phone / desktop app',
            tag: 'Highest priority',
            text: 'The running agent loop stops and handles what you just said first. Messages from every other source wait.'
          },
          {
            key: 'slack',
            name: 'An @ in Slack or a group chat',
            hint: 'It can live in the room',
            tag: 'Queue, then merge',
            text: 'Messages that arrive close together are merged into one turn, then handled turn by turn.'
          },
          {
            key: 'mail',
            name: 'An email arrives',
            hint: 'It might be phishing',
            tag: 'Untrusted input',
            text: 'The email is treated only as data, not as your instructions to the model, so a prompt injection cannot get through.'
          },
          {
            key: 'call',
            name: 'A call or a meeting',
            hint: 'Send it to attend',
            tag: 'Background task',
            text: 'It joins for you, takes notes, and comes back afterward with the points that matter.'
          },
          {
            key: 'routine',
            name: 'A scheduled job',
            hint: 'Like cron',
            tag: 'Background task',
            text: 'It may run for hours or even days. It interrupts you only when something important happens. For most jobs, one update a day is enough.'
          }
        ]
      : [
          {
            key: 'me',
            name: '你直接发消息',
            hint: '手机 / 桌面 App',
            tag: '优先级最高',
            text: '正在跑的 Agent loop 会停下来，先处理你这句话，其他来源的消息排到后面。'
          },
          {
            key: 'slack',
            name: 'Slack / 群聊里 @',
            hint: '它可以「住」在群里',
            tag: '排队，合并',
            text: '短时间内连发的几条消息合并成一轮再处理，然后一轮一轮地执行。'
          },
          {
            key: 'mail',
            name: '收到一封邮件',
            hint: '也可能是钓鱼邮件',
            tag: '不可信输入',
            text: '邮件内容只当作资料，不当作用户的指令交给模型，防止提示注入。'
          },
          {
            key: 'call',
            name: '电话 / 会议',
            hint: '派它去参会',
            tag: '后台任务',
            text: '替你参会、记笔记，结束之后再回来汇报要点。'
          },
          {
            key: 'routine',
            name: '定时任务',
            hint: '类似 cron',
            tag: '后台任务',
            text: '可能一跑就是几小时甚至几天；有重要进展才打扰你，多数任务一天汇报一次就够。'
          }
        ]
  }
}

export function thinCopy(locale: FigLocale) {
  const en = locale === 'en'
  return {
    captionStrong: en ? 'Figure 2 · Thin client, thick server.' : '图 2 · 薄客户端，厚服务器。',
    captionRest: captionRest(
      en,
      en
        ? 'The only tool between the two ends is SendToUser. Every heavy tool lives on the server.'
        : '两端之间只有 SendToUser 这一个工具，重工具全部在服务器上。'
    ),
    clientKicker: en ? 'Thin client' : '薄客户端',
    clientTitle: en ? 'Phone · desktop · email · Slack' : '手机 · 桌面 · 邮件 · Slack',
    clientSub: en
      ? 'Once a message arrives, render the interaction that fits:'
      : '收到消息后，按内容渲染成合适的交互：',
    clientItems: en
      ? [
          'A login form',
          'Payment',
          'Confirm a draft before anything irreversible',
          'A reaction is enough when no reply is needed'
        ]
      : ['登录表单', '付款', '不可逆操作先确认草稿', '不需要回话时，回一个表情'],
    pill: 'SendToUser',
    only: en ? 'The only cross-end tool' : '唯一的跨端工具',
    serverKicker: en ? 'Thick server' : '厚服务器',
    serverTitle: en ? 'Every heavy tool lives here' : '所有「重」工具都在这里',
    serverItems: en
      ? [
          'Shell commands, read and write files',
          'Call a cloud agent',
          'Record the screen, make a demo',
          'Connectors, MCP, plugins'
        ]
      : ['shell 命令，读写文件', '调用云端 Agent', '录屏、做演示', '连接器、MCP、插件']
  }
}

export function ladderCopy(locale: FigLocale) {
  const en = locale === 'en'
  const rungs = [
    {
      name: '已知上下文',
      en: 'Known context',
      desc: en ? 'What the conversation already knows' : '对话历史里已经知道的东西'
    },
    {
      name: '连接器 / API',
      en: 'Connector · MCP · API',
      desc: en ? 'For example, pull bank data through Plaid' : '例如通过 Plaid 拉取银行信息'
    },
    {
      name: '网页搜索',
      en: 'Web search',
      desc: en ? 'Public, live information' : '公开、实时的信息'
    },
    {
      name: '浏览器',
      en: 'Browser',
      desc: en
        ? 'Open a browser on the computer, search, and operate it'
        : '在电脑上打开浏览器搜索、操作'
    },
    {
      name: '整个桌面',
      en: 'Full desktop',
      desc: en
        ? 'Run scripts, commands, and builds on the Linux machine'
        : '在 Linux 电脑上跑脚本、跑命令、构建东西'
    },
    {
      name: '询问用户',
      en: 'Ask the user',
      desc: en
        ? 'Only then does it bother you: input, approval, a 2FA code'
        : '以上都不行，才来打扰你：输入、审批、2FA 验证码'
    }
  ]
  const tasks = en
    ? [
        { label: 'What day did we just agree on?', stop: 1 },
        { label: 'How much did eating out cost this month?', stop: 2 },
        { label: "What was the Cubs' score last night?", stop: 3 },
        { label: 'Change a booking on a site with no API', stop: 4 },
        { label: 'Record a demo of the new feature', stop: 5 },
        { label: 'Login needs a 2FA code', stop: 6 }
      ]
    : [
        { label: '我们刚才约的是周几？', stop: 1 },
        { label: '这个月在外面吃饭花了多少？', stop: 2 },
        { label: '昨晚小熊队的比分？', stop: 3 },
        { label: '在一个没有 API 的网站上改预约', stop: 4 },
        { label: '给新功能录一段演示视频', stop: 5 },
        { label: '登录要输 2FA 验证码', stop: 6 }
      ]
  return {
    captionStrong: en ? 'Figure 3 · The escalation ladder.' : '图 3 · 升级阶梯。',
    captionRest: captionRest(
      en,
      en
        ? 'Click an example and watch the agent climb from level 1 until it can stop.'
        : '点一个例子，看 Agent 会从第 1 级往上爬到哪一级。'
    ),
    chooseLabel: en ? 'Choose a task' : '选择一个任务',
    skip: en ? 'Not enough' : '不够',
    hit: en ? 'Solved here' : '在这里解决',
    axisLeft: en ? 'Cheap · reliable · fast' : '便宜 · 可靠 · 快',
    axisRight: en ? 'Costly · bothers you' : '昂贵 · 打扰人',
    liveTpl: en ? 'Stops at level {n}: {name}' : '停在第 {n} 级：{name}',
    rungs,
    tasks
  }
}

export function ladderLive(template: string, stop: number, name: string) {
  return template.replace('{n}', String(stop)).replace('{name}', name)
}

export function codingCopy(locale: FigLocale) {
  const en = locale === 'en'
  return {
    captionStrong: en
      ? 'Figure 4 · AI coding UIs: they got more complicated, then came back to one dialog.'
      : '图 4 · AI 写代码工具的界面：先变复杂，再回到一个对话框。',
    captionRest: captionRest(
      en,
      en
        ? 'Model capability keeps rising. The interface gets simpler at the last step.'
        : '模型能力一直在涨，界面却在最后一步变简单了。'
    ),
    popup: en ? 'Edit…' : '改成…',
    prompt: en ? 'What to do?' : '要做什么？',
    complexity: en ? 'UI complexity' : '界面复杂度',
    model: en ? 'Model capability' : '模型能力',
    note: en
      ? 'A sketch. Complexity and capability are relative, not measured values.'
      : '示意图。复杂度和能力是相对的比较，不是测量值。',
    stages: en
      ? [
          { name: 'Tab completion', desc: 'Press Tab. It completes this line.', ui: 1, model: 1 },
          {
            name: 'Select lines, a small dialog',
            desc: 'It can only edit the lines you selected.',
            ui: 2,
            model: 2
          },
          {
            name: 'A sidebar, and modes',
            desc: 'First pick Ask, Plan, or Agent.',
            ui: 4,
            model: 3
          },
          { name: 'One dialog', desc: 'Open it and say what you want done.', ui: 1, model: 4 }
        ]
      : [
          { name: 'Tab 补全', desc: '按一下 Tab，补全这一行', ui: 1, model: 1 },
          { name: '选中几行，弹出小对话框', desc: '只能改选中的这几行', ui: 2, model: 2 },
          { name: '侧边栏 + 各种模式', desc: '先选 Ask、Plan 还是 Agent', ui: 4, model: 3 },
          { name: '一个对话框', desc: '点进去直接说要做什么', ui: 1, model: 4 }
        ]
  }
}

export type LifeLabel = {
  x: number
  y: number
  text: string
  className: string
  anchor?: 'end'
  weight?: '600'
}

export function lifeCopy(locale: FigLocale) {
  const en = locale === 'en'
  const groups: { at: string; dot?: { cx: number; cy: number }; labels: LifeLabel[] }[] = en
    ? [
        {
          at: '0.5s',
          labels: [
            { x: 58, y: 54, text: '① When the model is weak', className: 'aoa-life-sm' },
            {
              x: 58,
              y: 72,
              text: 'compensation makes it usable',
              className: 'aoa-life-muted aoa-life-sm'
            }
          ]
        },
        {
          at: '1.05s',
          dot: { cx: 307, cy: 200 },
          labels: [
            {
              // Sits in the open wedge right of the crossover (307, 200): below the
              // rising model curve, above the zero line, clear of both strokes.
              x: 324,
              y: 176,
              text: '② Crossover: delete it',
              className: 'aoa-life-accent aoa-life-sm',
              weight: '600'
            }
          ]
        },
        {
          at: '1.45s',
          labels: [
            {
              x: 300,
              y: 248,
              text: '③ Becomes a burden',
              className: 'aoa-life-danger aoa-life-sm',
              anchor: 'end'
            },
            {
              x: 300,
              y: 266,
              text: 'limits the model, conflicts,',
              className: 'aoa-life-muted aoa-life-sm',
              anchor: 'end'
            },
            {
              x: 300,
              y: 284,
              text: 'eats context, needs upkeep',
              className: 'aoa-life-muted aoa-life-sm',
              anchor: 'end'
            }
          ]
        },
        {
          at: '1.7s',
          labels: [
            { x: 452, y: 40, text: 'Model', className: 'aoa-life-md', weight: '600' },
            { x: 452, y: 58, text: 'capability', className: 'aoa-life-md', weight: '600' },
            {
              x: 452,
              y: 246,
              text: 'Compensation',
              className: 'aoa-life-md aoa-life-danger',
              weight: '600'
            },
            { x: 452, y: 266, text: 'net value', className: 'aoa-life-sm aoa-life-muted' }
          ]
        }
      ]
    : [
        {
          at: '0.5s',
          labels: [
            { x: 96, y: 76, text: '① 模型弱的时候', className: 'aoa-life-sm' },
            { x: 96, y: 99, text: '补偿层让产品能用', className: 'aoa-life-muted aoa-life-sm' }
          ]
        },
        {
          at: '1.05s',
          dot: { cx: 307, cy: 200 },
          labels: [
            {
              x: 318,
              y: 190,
              text: '② 交叉点：该删了',
              className: 'aoa-life-accent aoa-life-sm',
              weight: '600'
            }
          ]
        },
        {
          at: '1.45s',
          labels: [
            {
              x: 300,
              y: 256,
              text: '③ 变成负担',
              className: 'aoa-life-danger aoa-life-sm',
              anchor: 'end'
            },
            {
              x: 300,
              y: 280,
              text: '限制模型、冲突、占上下文、要维护',
              className: 'aoa-life-muted aoa-life-sm',
              anchor: 'end'
            }
          ]
        },
        {
          at: '1.7s',
          labels: [
            { x: 450, y: 50, text: '模型能力', className: 'aoa-life-md', weight: '600' },
            {
              x: 450,
              y: 254,
              text: '补偿层',
              className: 'aoa-life-md aoa-life-danger',
              weight: '600'
            },
            { x: 450, y: 278, text: '的净价值', className: 'aoa-life-sm aoa-life-muted' }
          ]
        }
      ]
  return {
    captionStrong: en
      ? 'Figure 5 · The compensation layer rises, then falls.'
      : '图 5 · 补偿层的价值先升后降。',
    captionRest: captionRest(
      en,
      en
        ? 'The horizontal axis is time, and also one model generation after another. Past the crossover, the compensation layer’s net value goes negative.'
        : '横轴是时间，也是一代代的模型；补偿层的净价值在交叉点之后变成负数。'
    ),
    aria: en
      ? 'A sketch: model capability is a curve that keeps rising. The compensation layer’s net value rises first, while a weak model needs it to make the product usable, then falls, crosses zero, and becomes negative.'
      : '示意图：模型能力是一条持续上升的曲线；补偿层的净价值先上升，在模型较弱时让产品能用，之后下降，越过零线变成负数。',
    note: en
      ? 'A conceptual sketch, not measured data. The idea comes from Sutton’s The Bitter Lesson, Hyung Won Chung’s curve of “more structure, then less,” and Aaron Levie’s line about building scaffolding, the model catching up, and tearing the scaffolding down.'
      : '概念示意图，不是实测数据。思路来自 Sutton 的 The Bitter Lesson、Hyung Won Chung 关于「结构多和结构少」的曲线，以及 Aaron Levie 说的「建脚手架、模型追上来、拆掉脚手架」。',
    axis: en ? 'Time / model generation →' : '时间 / 模型代际 →',
    groups
  }
}

export function d0Copy(locale: FigLocale) {
  const en = locale === 'en'
  const beforeName = en ? 'Old architecture (17 tools)' : '旧架构（17 个工具）'
  const afterName = en ? 'bash + SQL (2 tools)' : 'bash + SQL（2 个工具）'
  const colon = en ? ': ' : '：'
  const rows: {
    name: string
    unit: string
    before: number
    after: number
    fmt: (v: number) => string
  }[] = en
    ? [
        { name: 'Avg. time', unit: 'sec', before: 274.8, after: 77.4, fmt: (v) => v.toFixed(1) },
        { name: 'Avg. tokens', unit: 'k', before: 102, after: 61, fmt: (v) => `~${v}` },
        { name: 'Avg. steps', unit: 'steps', before: 12, after: 7, fmt: (v) => `~${v}` }
      ]
    : [
        { name: '平均耗时', unit: '秒', before: 274.8, after: 77.4, fmt: (v) => v.toFixed(1) },
        { name: '平均 token', unit: 'k', before: 102, after: 61, fmt: (v) => `约 ${v}` },
        { name: '平均步数', unit: '步', before: 12, after: 7, fmt: (v) => `约 ${v}` }
      ]
  return {
    captionStrong: en
      ? 'Figure 6 · Vercel d0: 17 tools cut down to 2.'
      : '图 6 · Vercel d0：17 个工具删到 2 个。',
    captionRest: captionRest(
      en,
      en
        ? 'The success rate went from 80% to 100%, and the three measures below all dropped sharply.'
        : '成功率从 80% 升到 100%，下面三项都明显下降。'
    ),
    beforeName,
    afterName,
    note: en
      ? 'Data from the Vercel blog. The sample is only 5 representative queries. Treat it as a strong signal, not a statistical result.'
      : '数据来自 Vercel 博客。样本只有 5 条代表性查询，应当看作很强的信号，而不是统计结论。',
    metrics: rows.map((m) => ({
      name: m.name,
      beforeText: `${m.fmt(m.before)} ${m.unit}`,
      afterText: `${m.fmt(m.after)} ${m.unit}`,
      afterLen: `${((m.after / m.before) * 100).toFixed(1)}%`,
      beforeAria: `${beforeName}${colon}${m.fmt(m.before)} ${m.unit}`,
      afterAria: `${afterName}${colon}${m.fmt(m.after)} ${m.unit}`
    }))
  }
}

export function layersCopy(locale: FigLocale) {
  const en = locale === 'en'
  const seg = en
    ? { comp: 'Compensation', iface: 'Interface', base: 'Load-bearing' }
    : { comp: '补偿层', iface: '接口层', base: '承载层' }
  const gens = en
    ? [
        { label: "Today's model", comp: 58, iface: 10, base: 32 },
        { label: 'Next generation', comp: 32, iface: 10, base: 58 },
        { label: 'The one after', comp: 12, iface: 10, base: 78 }
      ]
    : [
        { label: '今天的模型', comp: 58, iface: 10, base: 32 },
        { label: '下一代', comp: 32, iface: 10, base: 58 },
        { label: '再下一代', comp: 12, iface: 10, base: 78 }
      ]
  return {
    captionStrong: en
      ? 'Figure 7 · Each new model generation thins the compensation layer and thickens the load-bearing layer.'
      : '图 7 · 每换一代模型，补偿层变薄，承载层变厚。',
    captionRest: captionRest(
      en,
      en
        ? 'The thin interface layer in the middle barely changes. The model itself is an outside variable. It is not part of the product.'
        : '中间那层很薄的接口层基本不变；模型本身是外面的变量，不在产品里。'
    ),
    seg,
    axis: en ? 'Model generation →' : '模型代际 →',
    compTitle: en ? 'Compensation layer: safe to delete' : '补偿层：可以删',
    compSub: en
      ? 'Work you do only because the model is not good enough yet'
      : '因为模型还不够好，才替它做的事',
    baseTitle: en ? 'Load-bearing layer: keep thickening' : '承载层：要加厚',
    baseSub: en
      ? 'What you still need no matter how strong the model is'
      : '不管模型多强都需要的东西',
    compensation: en
      ? [
          'Piles of few-shot examples',
          'Long rules that contradict each other',
          'Keyword intent routing',
          'Hand-written retrieval and RAG chunking',
          'One-off tools built for a single task',
          'Wizards, mode switches, a model picker'
        ]
      : [
          '堆砌的 few-shot 示例',
          '冗长、互相打架的规则',
          '关键词意图路由',
          '手写检索、RAG 分块',
          '为单一任务做的专用小工具',
          '向导、模式切换、模型选择器'
        ],
    foundation: en
      ? [
          { name: 'Data and memory', desc: 'profiles, logs, knowledge a person can read' },
          { name: 'Evals and traces', desc: 'every bug becomes an eval' },
          {
            name: 'Integrations and permissions',
            desc: 'accounts, payments, approval for irreversible actions'
          },
          { name: 'Distribution and relationships', desc: 'users, community, channels' },
          { name: 'Runtime', desc: 'persistence, sandboxes, cache, a cost cap' }
        ]
      : [
          { name: '数据与记忆', desc: '用户画像、日志、可读的知识' },
          { name: '评测与 trace', desc: '每个 bug 变成一条 eval' },
          { name: '集成与权限', desc: '账号、支付、不可逆操作的审批' },
          { name: '分发与用户关系', desc: '用户、社群、渠道' },
          { name: '运行时', desc: '持久化、沙箱、缓存、成本上限' }
        ],
    note: en
      ? 'A sketch. The proportions are not measurements. The interface layer means one conversational entry, a few basic tools, and skills loaded only when needed. Which item gets deleted first depends on the product. The way you tell is an eval.'
      : '示意图，比例不是测量值。接口层指一个对话入口、少量基础工具和按需加载的 skills。哪一项先被删掉因产品而异，判断依据是评测。',
    gens: gens.map((g) => ({
      ...g,
      aria: en
        ? `${g.label}: compensation about ${g.comp}%, interface about ${g.iface}%, load-bearing about ${g.base}%`
        : `${g.label}：补偿层约 ${g.comp}%，接口层约 ${g.iface}%，承载层约 ${g.base}%`
    }))
  }
}
