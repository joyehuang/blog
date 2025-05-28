export default function PrepWiseProject() {
  return (
    <div className="col-span-12 md:col-span-8 minimal-card rounded-3xl p-8 animate-on-scroll">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">PrepWise</h2>
            <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
              Apr 2025 - Present
            </span>
          </div>
          <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
            AI-Powered Voice Interview Simulator
          </h3>
          <a
            href="https://interview-prep-git-main-joyehuangs-projects.vercel.app/sign-in"
            target="_blank"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center gap-1 mb-4 link-hover"
            rel="noreferrer"
          >
            <i className="fas fa-link text-sm"></i>
            <span>interview-prep-git-main-joyehuangs-projects.vercel.app/sign-in</span>
          </a>
          <p className="text-gray-800 dark:text-gray-200 font-medium mb-2">
            Solo Developer | Next.js · React · Firebase · Gemini AI · Vapi Voice SDK
          </p>
          <ul className="text-gray-600 dark:text-gray-400 space-y-2 list-disc pl-5">
            <li>
              Built a full-stack web app that simulates voice-based mock interviews and gives real-time AI feedback
            </li>
            <li>Integrated Google Gemini AI to dynamically generate interview questions based on user input</li>
            <li>
              Enabled realistic voice interaction using Vapi AI SDK and streamlined frontend logic with React hooks
            </li>
            <li>Designed modular architecture across Client, Integration, and Backend layers (see [GitHub]/README)</li>
            <li>
              Stored user sessions and feedback via Firebase (Auth + Firestore), enabling personalized review history
            </li>
          </ul>
        </div>
        <div className="chinese-title font-chinese text-5xl text-gray-300 dark:text-gray-600 opacity-30 hidden md:block">
          项目
        </div>
      </div>
    </div>
  )
}
