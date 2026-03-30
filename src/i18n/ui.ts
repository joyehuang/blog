import type { Locale } from './config'
import config from '@/site-config'

export const uiMessages = {
  en: {
    common: {
      back: 'Back',
      toggleSidebar: 'Toggle sidebar'
    },
    home: {
      actions: {
        moreAbout: 'More about me',
        morePosts: 'More posts'
      },
      bio: 'A second-year frontend developer studying in Melbourne, aiming to become a full-stack developer. Recently got into photography, and I enjoy piano and cello in my spare time!',
      connectMe: 'Connect Me!',
      education: {
        date: 'Feb 2024 - Jun 2027',
        degree: 'Bachelor of Science - Computing and Software Systems',
        school: 'The University of Melbourne'
      },
      experience: {
        bullets: ['Working on full-stack product development for AIGC features.'],
        company: '上海特赞 Tezign',
        date: 'Present',
        role: 'Full-stack Intern, AIGC R&D'
      },
      labels: {
        location: 'Melbourne, Australia',
        sourceCode: 'Source code'
      },
      metaTitle: 'Home',
      profileAlt: 'profile',
      role: 'Frontend Developer',
      sections: {
        about: 'About',
        education: 'Education',
        experience: 'Experience',
        posts: 'Posts',
        skills: 'Skills'
      },
      skills: {
        backend: ['Vercel', 'Waline', 'Firebase', 'Nodejs'],
        backendTitle: 'Backend',
        frontend: ['React', 'NextJs', 'Vite'],
        frontendTitle: 'Frontend',
        languages: ['TypeScript', 'JavaScript', 'Python', 'Java', 'MySQL'],
        languagesTitle: 'Languages',
        tools: ['Curor', 'Git', 'Docker', 'Postman', 'ESlint/Prettier', 'Jest'],
        toolsTitle: 'Tools'
      }
    },
    search: {
      disabled: 'Pagefind is disabled.',
      metaDescription: 'Search relative posts of the whole blog',
      metaTitle: 'Search',
      prompt: 'Enter a search term or phrase to search the blog.',
      title: 'Search'
    },
    site: {
      author: config.author,
      description: config.description,
      title: config.title
    },
    tagsIndex: {
      empty: 'Any tag yet.',
      metaDescription: "A list of all the topics I've written about in my posts",
      metaTitle: 'All Tags',
      title: 'Tags'
    }
  },
  zh: {
    common: {
      back: 'Back',
      toggleSidebar: 'Toggle sidebar'
    },
    home: {
      actions: {
        moreAbout: 'More about me',
        morePosts: 'More posts'
      },
      bio: '一名正在墨尔本上学的大二前端开发者，目标成为一名全栈开发者。最近刚入门摄影圈，平时喜欢弹琴与拉大提琴！',
      connectMe: 'Connect Me!',
      education: {
        date: '2月 2024 - 6月 2027',
        degree: '理学学士 - 计算与软件工程',
        school: '墨尔本大学'
      },
      experience: {
        bullets: ['负责AIGC相关功能的全栈开发工作'],
        company: '上海特赞 Tezign',
        date: 'Present',
        role: 'AIGC研发部门全栈实习生'
      },
      labels: {
        location: 'Melbourne, Australia',
        sourceCode: 'Source code'
      },
      metaTitle: 'Home',
      profileAlt: 'profile',
      role: 'Frontend Developer',
      sections: {
        about: 'About',
        education: 'Education',
        experience: 'Experience',
        posts: 'Posts',
        skills: 'Skills'
      },
      skills: {
        backend: ['Vercel', 'Waline', 'Firebase', 'Nodejs'],
        backendTitle: 'Backend',
        frontend: ['React', 'NextJs', 'Vite'],
        frontendTitle: 'Frontend',
        languages: ['TypeScript', 'JavaScript', 'Python', 'Java', 'MySQL'],
        languagesTitle: 'Languages',
        tools: ['Curor', 'Git', 'Docker', 'Postman', 'ESlint/Prettier', 'Jest'],
        toolsTitle: 'Tools'
      }
    },
    search: {
      disabled: 'Pagefind is disabled.',
      metaDescription: 'Search relative posts of the whole blog',
      metaTitle: 'Search',
      prompt: 'Enter a search term or phrase to search the blog.',
      title: 'Search'
    },
    site: {
      author: config.author,
      description: config.description,
      title: config.title
    },
    tagsIndex: {
      empty: 'Any tag yet.',
      metaDescription: "A list of all the topics I've written about in my posts",
      metaTitle: 'All Tags',
      title: 'Tags'
    }
  }
}

export type UiCopy = (typeof uiMessages)[Locale]

export function getUiCopy(locale: Locale): UiCopy {
  return uiMessages[locale]
}
