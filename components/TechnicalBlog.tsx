export default function TechnicalBlog() {
  return (
    <div className="col-span-12 md:col-span-6 minimal-card rounded-3xl p-8 animate-on-scroll">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Technical Blog & Project Showcase</h2>
            <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
              Jan 2025 - Present
            </span>
          </div>
          <a
            href="https://www.joyehuang.me/en/"
            target="_blank"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center gap-1 mb-4 link-hover"
            rel="noreferrer"
          >
            <i className="fas fa-link text-sm"></i>
            <span>www.joyehuang.me/en/</span>
          </a>
          <ul className="text-gray-600 dark:text-gray-400 space-y-2 list-disc pl-5">
            <li>
              Developed a customized technical blog using Hugo to document learnings in React, algorithms, and system
              design
            </li>
            <li>
              Customized layout with bilingual support (English/Chinese), syntax highlighting, and dark/light mode
            </li>
            <li>
              Optimized performance with AWS S3 + CloudFront CDN and integrated Google Analytics for traffic insights
            </li>
          </ul>
        </div>
        <div className="chinese-title font-chinese text-5xl text-gray-300 dark:text-gray-600 opacity-30 hidden md:block">
          博客
        </div>
      </div>
    </div>
  )
}
