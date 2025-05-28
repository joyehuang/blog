export default function CissaHackathon() {
  return (
    <div className="col-span-12 minimal-card rounded-3xl p-8 animate-on-scroll">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CISSA – Codebrew Hackathon</h2>
            <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
              Mar 2024
            </span>
          </div>
          <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2">Front-end Developer</h3>
          <p className="text-gray-800 dark:text-gray-200 font-medium mb-2">
            Tech Stack: Flutter, Dart, Firebase, Express.js, OpenAI API
          </p>
          <ul className="text-gray-600 dark:text-gray-400 space-y-2 list-disc pl-5">
            <li>
              Led frontend development for "Fwend," a mobile application prototype that attracted investor interest with
              potential funding of up to $200,000, implementing core UI components using Flutter
            </li>
            <li>
              Designed and built user interface elements including profile systems, matching interfaces, and basic
              location features, focusing on creating an intuitive user experience
            </li>
            <li>
              Collaborated with a cross-functional team to develop a proof-of-concept application that addresses student
              social connection needs, resulting in significant investor interest
            </li>
          </ul>
        </div>
        <div className="chinese-title font-chinese text-5xl text-gray-300 dark:text-gray-600 opacity-30 hidden md:block">
          黑客马拉松
        </div>
      </div>
    </div>
  )
}
