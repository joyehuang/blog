"use client"

import { useEffect, useRef } from "react"

export default function ProjectCount() {
  const projectCountRef = useRef<HTMLDivElement>(null)
  const experienceCountRef = useRef<HTMLDivElement>(null)
  const animatedRef = useRef(false)

  useEffect(() => {
    function animateCounter(element: HTMLElement, target: number, duration: number) {
      let start = 0
      const increment = target / (duration / 16)

      function updateCount() {
        start += increment
        if (start >= target) {
          element.textContent = target.toString()
          return
        }

        element.textContent = Math.floor(start).toString()
        requestAnimationFrame(updateCount)
      }

      updateCount()
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animatedRef.current) {
            if (projectCountRef.current) {
              animateCounter(projectCountRef.current, 2, 1500)
            }
            if (experienceCountRef.current) {
              animateCounter(experienceCountRef.current, 1, 1200)
            }
            animatedRef.current = true
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.5 },
    )

    if (projectCountRef.current) {
      observer.observe(projectCountRef.current)
    }

    return () => {
      if (projectCountRef.current) {
        observer.unobserve(projectCountRef.current)
      }
    }
  }, [])

  return (
    <div className="col-span-12 md:col-span-4 minimal-card rounded-3xl p-8 flex flex-col justify-center items-center animate-on-scroll">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="chinese-title font-chinese text-3xl text-gray-600 dark:text-gray-400 mb-2">项目经验</div>
        <div className="english-subtitle text-xs tracking-widest text-gray-500 dark:text-gray-400">
          PROJECT EXPERIENCE
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-8 w-full">
        {/* Major Projects */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
              <i className="fas fa-code text-blue-600 dark:text-blue-400 text-xl"></i>
            </div>
            <div className="text-left">
              <div className="number-highlight text-4xl" ref={projectCountRef}>
                0
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Major Projects</p>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">Full-stack applications with AI integration</p>
          </div>
        </div>

        {/* Years Experience */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
              <i className="fas fa-calendar-check text-green-600 dark:text-green-400 text-xl"></i>
            </div>
            <div className="text-left">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400" ref={experienceCountRef}>
                0
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Year Experience</p>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">Focused on modern web technologies</p>
          </div>
        </div>
      </div>

      {/* Technologies Used */}
      <div className="mt-8 w-full">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 text-center">Tech Stack</h4>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
            React
          </span>
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
            Next.js
          </span>
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-xs font-medium">
            TypeScript
          </span>
          <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full text-xs font-medium">
            Firebase
          </span>
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs font-medium">
            AI/ML
          </span>
        </div>
      </div>
    </div>
  )
}
