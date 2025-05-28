"use client"

import { useState } from "react"
import Navigation from "@/components/Header/Navigation"

interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string
  date: string
  category: string
  tags: string[]
  readTime: string
  featured: boolean
}

const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Building PrepWise: An AI-Powered Interview Simulator",
    excerpt:
      "How I built a full-stack application that uses AI to simulate realistic job interviews and provide real-time feedback to help candidates prepare.",
    content: "Full content here...",
    date: "2025-01-15",
    category: "Project Showcase",
    tags: ["React", "Next.js", "AI", "Firebase", "Gemini"],
    readTime: "8 min read",
    featured: true,
  },
  {
    id: "2",
    title: "My Journey Learning React and TypeScript",
    excerpt:
      "From vanilla JavaScript to modern React with TypeScript - lessons learned and best practices discovered along the way.",
    content: "Full content here...",
    date: "2025-01-10",
    category: "Learning",
    tags: ["React", "TypeScript", "JavaScript", "Learning"],
    readTime: "6 min read",
    featured: false,
  },
  {
    id: "3",
    title: "Winning the CISSA Hackathon: Building Fwend",
    excerpt:
      "The story behind our hackathon-winning mobile app that attracted $200K in potential funding and what I learned about rapid prototyping.",
    content: "Full content here...",
    date: "2024-12-20",
    category: "Experience",
    tags: ["Flutter", "Hackathon", "Mobile", "Teamwork"],
    readTime: "10 min read",
    featured: true,
  },
  {
    id: "4",
    title: "Setting Up a Modern Development Environment",
    excerpt:
      "My complete setup for web development including VS Code extensions, terminal configuration, and productivity tools.",
    content: "Full content here...",
    date: "2024-12-15",
    category: "Tools & Setup",
    tags: ["Development", "Tools", "Productivity", "Setup"],
    readTime: "5 min read",
    featured: false,
  },
  {
    id: "5",
    title: "Understanding Algorithms: A Beginner's Guide",
    excerpt: "Breaking down common algorithms and data structures with practical examples and real-world applications.",
    content: "Full content here...",
    date: "2024-12-01",
    category: "Computer Science",
    tags: ["Algorithms", "Data Structures", "Computer Science", "Learning"],
    readTime: "12 min read",
    featured: false,
  },
  {
    id: "6",
    title: "Building This Portfolio Website",
    excerpt:
      "The design decisions, technologies, and challenges behind creating this interactive resume and portfolio website.",
    content: "Full content here...",
    date: "2024-11-25",
    category: "Project Showcase",
    tags: ["Next.js", "Tailwind", "Portfolio", "Design"],
    readTime: "7 min read",
    featured: false,
  },
]

const categories = ["All", "Project Showcase", "Learning", "Experience", "Tools & Setup", "Computer Science"]

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchTerm, setSearchTerm] = useState("")

  const filteredPosts = blogPosts.filter((post) => {
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesCategory && matchesSearch
  })

  const featuredPosts = blogPosts.filter((post) => post.featured)

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            My Blog
            <span className="chinese-title font-chinese text-4xl md:text-5xl text-blue-600 dark:text-blue-400 block mt-2">
              我的博客
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Sharing my journey in software development, project experiences, and lessons learned along the way.
          </p>
        </div>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Featured Posts</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredPosts.map((post) => (
                <article
                  key={post.id}
                  className="minimal-card rounded-3xl p-8 hover:shadow-xl transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                      {post.category}
                    </span>
                    <i className="fas fa-star text-yellow-500"></i>
                  </div>

                  <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{post.excerpt}</p>

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                    <span>{post.readTime}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Search and Filter */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedCategory === category
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Blog Posts Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {selectedCategory === "All" ? "All Posts" : selectedCategory}
            </h2>
            <span className="text-gray-600 dark:text-gray-400">
              {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <i className="fas fa-search text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No posts found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search terms or category filter.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="minimal-card rounded-3xl p-6 hover:shadow-xl transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
                      {post.category}
                    </span>
                    {post.featured && <i className="fas fa-star text-yellow-500"></i>}
                  </div>

                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed line-clamp-3">{post.excerpt}</p>

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                    <span>{post.readTime}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {post.tags.length > 3 && (
                      <span className="px-2 py-1 text-gray-500 dark:text-gray-400 text-xs">
                        +{post.tags.length - 3}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Newsletter Signup */}
        <section className="mt-20 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">Stay Updated</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Get notified when I publish new posts about software development, project updates, and tech insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              Subscribe
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
