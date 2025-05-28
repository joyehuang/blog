export default function Timeline() {
  return (
    <div className="col-span-12 md:col-span-6 minimal-card rounded-3xl p-8 animate-on-scroll">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-gray-100">
        <span>Timeline</span>
        <span className="chinese-title font-chinese text-2xl text-gray-600 dark:text-gray-400">时间线</span>
      </h2>
      <div className="relative pl-8 before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-8 before:w-0.5 before:bg-gray-300 dark:before:bg-gray-600">
        <div className="relative mb-8">
          <div className="absolute left-[-33px] w-6 h-6 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Apr 2025 - Present</div>
          <div className="text-gray-600 dark:text-gray-400">PrepWise Project</div>
        </div>
        <div className="relative mb-8">
          <div className="absolute left-[-33px] w-6 h-6 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Jan 2025 - Present</div>
          <div className="text-gray-600 dark:text-gray-400">Technical Blog</div>
        </div>
        <div className="relative mb-8">
          <div className="absolute left-[-33px] w-6 h-6 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Feb 2024 - Oct 2026</div>
          <div className="text-gray-600 dark:text-gray-400">University of Melbourne</div>
        </div>
        <div className="relative">
          <div className="absolute left-[-33px] w-6 h-6 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Mar 2024</div>
          <div className="text-gray-600 dark:text-gray-400">CISSA Hackathon</div>
        </div>
      </div>
    </div>
  )
}
