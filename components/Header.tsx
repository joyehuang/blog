export default function Header() {
  return (
    <header className="mb-16 animate-on-scroll">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end">
        <div>
          <h1 className="text-5xl md:text-7xl font-bold mb-2 text-gray-900 dark:text-gray-100">De-Shiou Huang</h1>
          <div className="flex flex-col md:flex-row gap-2 md:gap-6 text-gray-600 dark:text-gray-400 mt-4">
            <div className="flex items-center">
              <i className="fas fa-map-marker-alt mr-2 text-blue-500 dark:text-blue-400"></i>
              <span>Melbourne</span>
            </div>
            <div className="flex items-center">
              <i className="fas fa-phone mr-2 text-blue-500 dark:text-blue-400"></i>
              <span>0449022095</span>
            </div>
            <div className="flex items-center">
              <i className="fas fa-envelope mr-2 text-blue-500 dark:text-blue-400"></i>
              <a
                href="mailto:huangdeshiou@gmail.com"
                className="link-hover text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                huangdeshiou@gmail.com
              </a>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <a
              href="https://www.joyehuang.me/en/"
              target="_blank"
              className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              rel="noreferrer"
            >
              <i className="fas fa-globe text-xl"></i>
            </a>
            <a
              href="https://github.com/joyehuang"
              target="_blank"
              className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              rel="noreferrer"
            >
              <i className="fab fa-github text-xl"></i>
            </a>
            <a
              href="https://www.linkedin.com/in/deshiouhuang/"
              target="_blank"
              className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              rel="noreferrer"
            >
              <i className="fab fa-linkedin text-xl"></i>
            </a>
          </div>
        </div>
        <div className="mt-8 md:mt-0">
          <div className="chinese-title font-chinese text-4xl md:text-6xl text-gray-700 dark:text-gray-300">黄德修</div>
          <div className="english-subtitle text-xs tracking-widest text-gray-500 dark:text-gray-400 mt-1">
            SOFTWARE ENGINEER
          </div>
        </div>
      </div>
    </header>
  )
}
