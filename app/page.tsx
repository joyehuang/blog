"use client"

import Navigation from "@/components/Header/Navigation"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 py-20 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-full mx-auto mb-8 flex items-center justify-center">
              <span className="text-white font-bold text-4xl">DH</span>
            </div>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            De-Shiou Huang
            <span className="chinese-title font-chinese text-4xl md:text-5xl text-blue-600 dark:text-blue-400 block mt-4">
              黄德修
            </span>
          </h1>

          <p className="text-2xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
            Software Engineering Student & Full-Stack Developer
          </p>

          <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-4xl mx-auto leading-relaxed">
            Passionate about building innovative web applications with modern technologies. Currently studying at the
            University of Melbourne and working on AI-powered projects.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/about"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center"
            >
              <i className="fas fa-user mr-2"></i>
              View My Resume
            </Link>
            <Link
              href="/blog"
              className="border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium py-4 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center"
            >
              <i className="fas fa-blog mr-2"></i>
              Read My Blog
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="text-center minimal-card rounded-3xl p-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mx-auto mb-4 flex items-center justify-center">
              <i className="fas fa-code text-blue-600 dark:text-blue-400 text-2xl"></i>
            </div>
            <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">2+</h3>
            <p className="text-gray-600 dark:text-gray-400">Major Projects</p>
          </div>

          <div className="text-center minimal-card rounded-3xl p-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mx-auto mb-4 flex items-center justify-center">
              <i className="fas fa-trophy text-green-600 dark:text-green-400 text-2xl"></i>
            </div>
            <h3 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">1st</h3>
            <p className="text-gray-600 dark:text-gray-400">Hackathon Winner</p>
          </div>

          <div className="text-center minimal-card rounded-3xl p-8">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full mx-auto mb-4 flex items-center justify-center">
              <i className="fas fa-graduation-cap text-purple-600 dark:text-purple-400 text-2xl"></i>
            </div>
            <h3 className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">2026</h3>
            <p className="text-gray-600 dark:text-gray-400">Expected Graduation</p>
          </div>
        </div>

        {/* Featured Projects */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">Featured Projects</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="minimal-card rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">PrepWise</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                AI-powered voice interview simulator that provides real-time feedback to help candidates prepare for job
                interviews.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                  Next.js
                </span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
                  React
                </span>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                  AI
                </span>
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full text-sm">
                  Firebase
                </span>
              </div>
              <Link href="/about" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center">
                Learn More <i className="fas fa-arrow-right ml-2"></i>
              </Link>
            </div>

            <div className="minimal-card rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Fwend</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Hackathon-winning mobile app for student social connections that attracted $200K in potential funding.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                  Flutter
                </span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
                  Dart
                </span>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                  Firebase
                </span>
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full text-sm">
                  OpenAI
                </span>
              </div>
              <Link href="/about" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center">
                Learn More <i className="fas fa-arrow-right ml-2"></i>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-12">
          <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">Let's Work Together</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            I'm always open to discussing new opportunities and interesting projects.
          </p>
          <Link
            href="/contact"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-8 rounded-lg transition-colors duration-200 inline-flex items-center"
          >
            <i className="fas fa-envelope mr-2"></i>
            Get In Touch
          </Link>
        </section>
      </div>
    </div>
  )
}
