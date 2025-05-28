export default function Education() {
  return (
    <div className="col-span-12 md:col-span-4 minimal-card rounded-3xl p-8 animate-on-scroll">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Education</h2>
          <div className="chinese-title font-chinese text-2xl text-gray-300 dark:text-gray-600 opacity-50 mb-4">
            教育背景
          </div>
        </div>
      </div>

      {/* University Info */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <i className="fas fa-university text-blue-600 dark:text-blue-400 text-xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400">University of Melbourne</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Melbourne, Australia</p>
          </div>
        </div>

        <div className="ml-15 space-y-2">
          <p className="text-gray-800 dark:text-gray-200 font-medium">Bachelor of Computing and Software Engineering</p>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <i className="fas fa-calendar-alt"></i>
            <span>Feb 2024 - Oct 2026</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <i className="fas fa-graduation-cap"></i>
            <span>Undergraduate • Expected Graduation 2026</span>
          </div>
        </div>
      </div>

      {/* Academic Performance */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Academic Performance</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300">Current GPA</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">High Distinction</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300">Academic Standing</span>
            <span className="font-semibold text-green-600 dark:text-green-400">Dean's List</span>
          </div>
        </div>
      </div>

      {/* Key Coursework */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Key Coursework</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm">
            <div className="font-medium text-gray-900 dark:text-gray-100">Data Structures</div>
            <div className="text-gray-600 dark:text-gray-400">Python, C</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm">
            <div className="font-medium text-gray-900 dark:text-gray-100">Algorithms</div>
            <div className="text-gray-600 dark:text-gray-400">Java, C++</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm">
            <div className="font-medium text-gray-900 dark:text-gray-100">Database Systems</div>
            <div className="text-gray-600 dark:text-gray-400">MySQL, SQL</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm">
            <div className="font-medium text-gray-900 dark:text-gray-100">Web Development</div>
            <div className="text-gray-600 dark:text-gray-400">HTML, CSS, JS</div>
          </div>
        </div>
      </div>

      {/* Activities & Achievements */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Activities & Achievements</h4>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <i className="fas fa-trophy text-yellow-500 mt-1 text-sm"></i>
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-gray-100">CISSA Hackathon Winner</div>
              <div className="text-gray-600 dark:text-gray-400">1st Place - Mobile App Development</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-users text-blue-500 mt-1 text-sm"></i>
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-gray-100">Computing Society Member</div>
              <div className="text-gray-600 dark:text-gray-400">Active participant in tech events</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-code text-green-500 mt-1 text-sm"></i>
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-gray-100">Open Source Contributor</div>
              <div className="text-gray-600 dark:text-gray-400">GitHub projects & community involvement</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
