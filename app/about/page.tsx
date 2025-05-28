"use client"

import { useEffect } from "react"
import Navigation from "@/components/Header/Navigation"
import Header from "@/components/Header"
import Education from "@/components/Education"
import Skills from "@/components/Skills"
import PrepWiseProject from "@/components/PrepWiseProject"
import ProjectCount from "@/components/ProjectCount"
import CissaHackathon from "@/components/CissaHackathon"
import TechnicalBlog from "@/components/TechnicalBlog"
import Timeline from "@/components/Timeline"

export default function AboutPage() {
  useEffect(() => {
    // Animation on scroll
    const animatedElements = document.querySelectorAll(".animate-on-scroll")

    function checkScroll() {
      animatedElements.forEach((element) => {
        const elementTop = element.getBoundingClientRect().top
        const windowHeight = window.innerHeight

        if (elementTop < windowHeight * 0.85) {
          element.classList.add("visible")

          // Animate chart bars if they exist in this element
          const chartBars = element.querySelectorAll(".chart-bar")
          chartBars.forEach((bar) => {
            setTimeout(() => {
              bar.style.height = bar.getAttribute("data-height")
            }, 300)
          })
        }
      })
    }

    // Initial check
    checkScroll()

    // Check on scroll
    window.addEventListener("scroll", checkScroll)

    // Optimized parallax effect
    let ticking = false
    function handleMouseMove(e) {
      if (!ticking) {
        requestAnimationFrame(() => {
          const moveX = (e.clientX - window.innerWidth / 2) / 100
          const moveY = (e.clientY - window.innerHeight / 2) / 100

          document.querySelectorAll(".gradient-bg, .gradient-bg-accent").forEach((element) => {
            element.style.transform = `translate(${moveX}px, ${moveY}px)`
            element.style.transition = "transform 0.5s ease-out"
          })
          ticking = false
        })
        ticking = true
      }
    }

    document.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("scroll", checkScroll)
      document.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans min-h-screen transition-colors duration-300">
      <Navigation />

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <Header />

        <div className="bento-grid">
          <Education />
          <Skills />
          <PrepWiseProject />
          <ProjectCount />
          <CissaHackathon />
          <TechnicalBlog />
          <Timeline />
        </div>
      </div>
    </div>
  )
}
