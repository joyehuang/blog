export type PortfolioLocale = 'zh' | 'en'
type PortfolioRepoId =
  | 'joyehuang/Learn-Open-Harness'
  | 'joyehuang/minimind-notes'
  | 'Javis603/token-monitor'

type SharedRepo = {
  name: string
  fullName: PortfolioRepoId
  href: string
  fallbackStars: number
  image?: string
}

type LocalizedRepoCopy = {
  eyebrow: string
  description: string
  imageAlt?: string
}

const repositories: SharedRepo[] = [
  {
    name: 'Learn-Open-Harness',
    fullName: 'joyehuang/Learn-Open-Harness',
    href: 'https://github.com/joyehuang/Learn-Open-Harness',
    fallbackStars: 297
  },
  {
    name: 'minimind-notes',
    fullName: 'joyehuang/minimind-notes',
    href: 'https://github.com/joyehuang/minimind-notes',
    fallbackStars: 93
  },
  {
    name: 'Token Monitor',
    fullName: 'Javis603/token-monitor',
    href: 'https://github.com/Javis603/token-monitor',
    fallbackStars: 628,
    image: '/images/open-source/token-monitor-dashboard.png'
  }
]

const localizedCopy: Record<PortfolioLocale, Record<PortfolioRepoId, LocalizedRepoCopy>> = {
  zh: {
    'joyehuang/Learn-Open-Harness': {
      eyebrow: '独立项目 · Agent Harness',
      description: '从零构建 Agent Harness：循环、工具、记忆与多智能体协作。'
    },
    'joyehuang/minimind-notes': {
      eyebrow: '独立项目 · LLM from scratch',
      description: '从 Transformer 到 SFT，用实验把小语言模型重新造一遍。'
    },
    'Javis603/token-monitor': {
      eyebrow: '上游贡献 · 3 merged / 1 open',
      description: '参与活动热力图、跨设备状态同步、限额窗口与大数 Token 展示的产品和工程改进。',
      imageAlt: 'Token Monitor 使用量 Dashboard，展示 Token 活跃度、模型和工具分布'
    }
  },
  en: {
    'joyehuang/Learn-Open-Harness': {
      eyebrow: 'Original project · Agent Harness',
      description:
        'Build an agent harness from first principles: loops, tools, memory, and multi-agent work.'
    },
    'joyehuang/minimind-notes': {
      eyebrow: 'Original project · LLM from scratch',
      description:
        'Rebuild a small language model from Transformer through SFT, one experiment at a time.'
    },
    'Javis603/token-monitor': {
      eyebrow: 'Upstream contributor · 3 merged / 1 open',
      description:
        'Contributed activity heatmaps, fresh provider sync, accurate reset windows, and compact token totals.',
      imageAlt: 'Token Monitor usage dashboard with activity, model, and tool breakdowns'
    }
  }
}

export async function getPortfolioRepos(locale: PortfolioLocale) {
  return Promise.all(
    repositories.map(async (repo) => {
      const copy = localizedCopy[locale][repo.fullName]
      let stars = repo.fallbackStars

      try {
        const response = await fetch(`https://api.github.com/repos/${repo.fullName}`, {
          headers: { Accept: 'application/vnd.github+json' }
        })
        if (response.ok) {
          const data = (await response.json()) as { stargazers_count?: number }
          stars = data.stargazers_count ?? stars
        }
      } catch {
        // Build and preview should remain deterministic when GitHub is unavailable.
      }

      return { ...repo, ...copy, stars }
    })
  )
}
