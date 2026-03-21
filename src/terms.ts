import type { Locale } from '@/i18n'

export const TERM_DOC_IDS = [
  'privacy-policy',
  'terms-and-conditions',
  'copyright',
  'disclaimer'
] as const

export type TermDocId = (typeof TERM_DOC_IDS)[number]

type TermDoc = {
  title: string
  description: string
  language: string
  summary: string
  sections: Array<{
    title: string
    paragraphs: string[]
  }>
}

const TERM_DOCS: Record<Locale, Record<TermDocId, TermDoc>> = {
  zh: {
    'privacy-policy': {
      title: '隐私政策',
      description: '生效日期：2024-11-26',
      language: '简体中文',
      summary: '本站只会收集运行评论、基础分析和站点运营所必需的信息。',
      sections: [
        {
          title: '收集的信息',
          paragraphs: [
            '当你浏览本站时，站点分析服务可能会记录匿名访问数据，例如页面访问量、来源页面和基础设备信息。',
            '当你提交评论时，评论系统可能会保存昵称、邮箱、评论内容，以及用于反垃圾和安全控制的必要元数据。'
          ]
        },
        {
          title: '信息用途',
          paragraphs: [
            '这些信息仅用于维持评论功能、回复通知、基础站点统计以及改善内容体验。',
            '本站不会将你的个人信息出售给第三方，也不会将其用于与站点内容无关的营销用途。'
          ]
        },
        {
          title: '数据处理',
          paragraphs: [
            '评论和分析相关数据可能由第三方服务提供商托管，因此会受到这些服务本身的数据处理规则约束。',
            '如果你希望删除评论或相关信息，可以通过站点提供的联系方式提出请求。'
          ]
        }
      ]
    },
    'terms-and-conditions': {
      title: '条款与条件',
      description: '最后更新：2024-11-26',
      language: '简体中文',
      summary: '本站内容主要用于个人学习记录、项目展示与技术分享。',
      sections: [
        {
          title: '内容使用',
          paragraphs: [
            '除非另有说明，本站原创内容的著作权归作者本人所有。',
            '你可以在保留署名和原始链接的前提下引用少量内容，但不应整篇转载或伪装成自己的作品。'
          ]
        },
        {
          title: '使用限制',
          paragraphs: [
            '你不得利用本站内容进行违法活动、误导性传播或损害作者与他人权益的行为。',
            '站点内容会持续更新，作者保留随时修改、补充或删除内容的权利。'
          ]
        },
        {
          title: '外部服务',
          paragraphs: [
            '本站可能链接到第三方网站、开源项目或外部服务，这些目标站点不受本站控制。',
            '访问外部链接时，请自行判断其内容、隐私政策与可用性风险。'
          ]
        }
      ]
    },
    copyright: {
      title: '版权声明',
      description: '生效日期：2024-11-26',
      language: '简体中文',
      summary: '本站原创博客、笔记和项目说明默认受版权保护。',
      sections: [
        {
          title: '原创内容',
          paragraphs: [
            '除特别声明外，本站发布的原创文章、笔记、代码说明和项目介绍均归 Joye 所有。',
            '如果内容中引用了第三方资料、商标、截图或代码片段，其对应权利仍归原作者或原机构所有。'
          ]
        },
        {
          title: '允许的使用方式',
          paragraphs: [
            '允许在合理引用范围内使用本站内容，但需要明确标注来源并附上原文链接。',
            '如需转载全文、商用改编或批量分发，请先取得明确许可。'
          ]
        },
        {
          title: '侵权处理',
          paragraphs: [
            '如果你认为本站内容侵犯了你的权益，请通过联系方式说明具体内容和依据。',
            '在收到合理说明后，作者会尽快核实并处理。'
          ]
        }
      ]
    },
    disclaimer: {
      title: '免责声明',
      description: '最后更新：2024-11-26',
      language: '简体中文',
      summary: '本站内容按“现状”提供，主要用于学习参考，不构成任何形式的保证。',
      sections: [
        {
          title: '内容性质',
          paragraphs: [
            '本站的大部分内容属于个人经验、技术学习笔记、项目复盘与观点整理，可能存在过时、不完整或主观判断。',
            '涉及 AI、工程实践、面试经验或工具配置的内容仅供参考，不构成专业、法律或商业建议。'
          ]
        },
        {
          title: '风险承担',
          paragraphs: [
            '你基于本站内容做出的代码改动、部署操作、职业决策或其他行为，需要自行评估风险并承担后果。',
            '作者不对因使用本站信息而产生的直接或间接损失负责。'
          ]
        },
        {
          title: '外部引用',
          paragraphs: [
            '本站可能引用第三方资料或跳转到外部服务，这些内容的准确性与稳定性不由作者保证。',
            '如果发现明显错误或失效信息，欢迎反馈。'
          ]
        }
      ]
    }
  },
  en: {
    'privacy-policy': {
      title: 'Privacy Policy',
      description: 'Effective date: 2024-11-26',
      language: 'English',
      summary: 'This site only collects the information needed to run comments, basic analytics, and day-to-day site operations.',
      sections: [
        {
          title: 'What May Be Collected',
          paragraphs: [
            'When you browse the site, analytics services may collect anonymous visit data such as page views, referral sources, and basic device information.',
            'When you leave a comment, the comment system may store your nickname, email address, comment content, and the minimum metadata required for anti-spam and security controls.'
          ]
        },
        {
          title: 'How It Is Used',
          paragraphs: [
            'This data is used only to keep comments working, send reply notifications, understand basic site traffic, and improve the reading experience.',
            'The site does not sell personal data and does not use it for unrelated marketing purposes.'
          ]
        },
        {
          title: 'Storage and Requests',
          paragraphs: [
            'Comment and analytics data may be handled by third-party providers, so their own data-processing rules may also apply.',
            'If you want a comment or related information removed, you can contact the site owner and request deletion.'
          ]
        }
      ]
    },
    'terms-and-conditions': {
      title: 'Terms and Conditions',
      description: 'Last updated: 2024-11-26',
      language: 'English',
      summary: 'This site is primarily a personal space for learning notes, project write-ups, and technical writing.',
      sections: [
        {
          title: 'Content Usage',
          paragraphs: [
            'Unless otherwise noted, original content on this site is owned by the author.',
            'Short quotations are allowed with attribution and a source link, but full reposting or presenting the work as your own is not permitted.'
          ]
        },
        {
          title: 'Restrictions',
          paragraphs: [
            'You may not use the site or its contents for unlawful activity, misleading redistribution, or behavior that harms the author or others.',
            'Content may be updated, revised, or removed at any time as the site evolves.'
          ]
        },
        {
          title: 'External Services',
          paragraphs: [
            'This site may link to third-party websites, open-source projects, or external services that are outside the author’s control.',
            'Please evaluate the content, privacy policy, and reliability of those external resources on your own.'
          ]
        }
      ]
    },
    copyright: {
      title: 'Copyright',
      description: 'Effective date: 2024-11-26',
      language: 'English',
      summary: 'Original blog posts, notes, and project write-ups on this site are protected by default.',
      sections: [
        {
          title: 'Original Work',
          paragraphs: [
            'Unless explicitly stated otherwise, original articles, notes, code explanations, and project descriptions published here belong to Joye.',
            'If a post includes third-party references, trademarks, screenshots, or excerpts, those rights remain with their respective owners.'
          ]
        },
        {
          title: 'Permitted Use',
          paragraphs: [
            'Reasonable quotation is allowed when proper attribution and a link back to the original page are provided.',
            'Full reproduction, commercial reuse, or large-scale redistribution requires prior permission.'
          ]
        },
        {
          title: 'Claims',
          paragraphs: [
            'If you believe any content on this site infringes your rights, please contact the site owner with the relevant details and basis for the claim.',
            'Reasonable reports will be reviewed and handled as quickly as possible.'
          ]
        }
      ]
    },
    disclaimer: {
      title: 'Disclaimer',
      description: 'Last updated: 2024-11-26',
      language: 'English',
      summary: 'Content on this site is provided on an “as is” basis for learning and reference purposes only.',
      sections: [
        {
          title: 'Nature of the Content',
          paragraphs: [
            'Most content here consists of personal experience, technical notes, project retrospectives, and working opinions. It may be incomplete, subjective, or outdated.',
            'Anything related to AI, engineering practice, interviews, or tooling should be treated as reference material rather than professional, legal, or business advice.'
          ]
        },
        {
          title: 'Use at Your Own Risk',
          paragraphs: [
            'If you make code changes, deployment decisions, career decisions, or any other actions based on this site, you are responsible for evaluating the risks yourself.',
            'The author is not responsible for direct or indirect loss caused by using information published here.'
          ]
        },
        {
          title: 'External References',
          paragraphs: [
            'This site may reference third-party material or link to outside services, and the author does not guarantee their accuracy or continued availability.',
            'If you notice clearly outdated or broken information, feedback is welcome.'
          ]
        }
      ]
    }
  }
}

export function isTermDocId(value: string | undefined): value is TermDocId {
  return !!value && TERM_DOC_IDS.includes(value as TermDocId)
}

export function getTermDoc(locale: Locale, doc: TermDocId) {
  return TERM_DOCS[locale][doc]
}
