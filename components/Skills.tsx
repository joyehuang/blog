"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"

interface Skill {
  id: string
  name: string
  icon: string
  description: string
  category: string
}

interface DragState {
  isDragging: boolean
  startAngle: number
  currentAngle: number
  lastAngle: number
  velocity: number
  lastTime: number
  startPosition: { x: number; y: number }
}

const skills: Skill[] = [
  {
    id: "javascript",
    name: "JavaScript",
    icon: "fab fa-js-square",
    description: "Modern ES6+ JavaScript for dynamic web applications",
    category: "Programming",
  },
  {
    id: "react",
    name: "React",
    icon: "fab fa-react",
    description: "Component-based UI library for building user interfaces",
    category: "Frontend",
  },
  {
    id: "typescript",
    name: "TypeScript",
    icon: "fas fa-code",
    description: "Typed superset of JavaScript for better development experience",
    category: "Programming",
  },
  {
    id: "python",
    name: "Python",
    icon: "fab fa-python",
    description: "Versatile programming language for algorithms and data processing",
    category: "Programming",
  },
  {
    id: "flutter",
    name: "Flutter",
    icon: "fas fa-mobile-alt",
    description: "Cross-platform mobile app development framework",
    category: "Mobile",
  },
  {
    id: "firebase",
    name: "Firebase",
    icon: "fas fa-fire",
    description: "Backend-as-a-Service platform for web and mobile apps",
    category: "Backend",
  },
  {
    id: "git",
    name: "Git",
    icon: "fab fa-git-alt",
    description: "Version control system for tracking code changes",
    category: "Tools",
  },
  {
    id: "aws",
    name: "AWS",
    icon: "fab fa-aws",
    description: "Cloud computing services for scalable applications",
    category: "Cloud",
  },
]

export default function Skills() {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(skills[0])
  const [rotation, setRotation] = useState(0)
  const [isAutoRotating, setIsAutoRotating] = useState(false)
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startAngle: 0,
    currentAngle: 0,
    lastAngle: 0,
    velocity: 0,
    lastTime: 0,
    startPosition: { x: 0, y: 0 },
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const velocityHistory = useRef<number[]>([])
  const lastUpdateTime = useRef<number>(0)

  // Memoized skill positions for better performance
  const skillPositions = useMemo(() => {
    const radius = 180
    return skills.map((_, index) => {
      const angle = (index / skills.length) * 2 * Math.PI - Math.PI / 2
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        angle,
      }
    })
  }, [])

  const getAngleFromCenter = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return 0

    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const deltaX = clientX - centerX
    const deltaY = clientY - centerY

    return Math.atan2(deltaY, deltaX)
  }, [])

  // Optimized animation function with better easing
  const animateToRotation = useCallback(
    (targetRotation: number) => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }

      setIsAutoRotating(true)
      const startRotation = rotation
      const startTime = performance.now()
      const duration = 600 // Reduced duration for snappier feel

      // Calculate the shortest rotation path
      let rotationDiff = targetRotation - startRotation
      while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI
      while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI

      const finalTargetRotation = startRotation + rotationDiff

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Improved easing function (ease-out-back)
        const easeOutBack = 1 + 2.7 * Math.pow(progress - 1, 3) + 1.7 * Math.pow(progress - 1, 2)
        const easedProgress = progress < 1 ? easeOutBack : 1

        const currentRotation = startRotation + rotationDiff * easedProgress
        setRotation(currentRotation)

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          setRotation(finalTargetRotation)
          setIsAutoRotating(false)
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    },
    [rotation],
  )

  // Optimized drag handlers with better performance
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isAutoRotating) return

      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)

      const startAngle = getAngleFromCenter(e.clientX, e.clientY)
      const currentTime = performance.now()

      setDragState({
        isDragging: true,
        startAngle: startAngle - rotation,
        currentAngle: rotation,
        lastAngle: startAngle,
        velocity: 0,
        lastTime: currentTime,
        startPosition: { x: e.clientX, y: e.clientY },
      })

      velocityHistory.current = []
      lastUpdateTime.current = currentTime

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    },
    [getAngleFromCenter, rotation, isAutoRotating],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragState.isDragging || isAutoRotating) return

      const currentTime = performance.now()
      const deltaTime = currentTime - lastUpdateTime.current

      // Throttle updates for better performance
      if (deltaTime < 16) return // ~60fps

      const currentAngle = getAngleFromCenter(e.clientX, e.clientY)
      const newRotation = currentAngle - dragState.startAngle

      // Calculate velocity with better smoothing
      const deltaAngle = currentAngle - dragState.lastAngle
      const instantVelocity = deltaAngle / (deltaTime / 1000)

      // Keep velocity history for better momentum calculation
      velocityHistory.current.push(instantVelocity)
      if (velocityHistory.current.length > 5) {
        velocityHistory.current.shift()
      }

      // Calculate average velocity for smoother momentum
      const avgVelocity = velocityHistory.current.reduce((sum, v) => sum + v, 0) / velocityHistory.current.length

      setDragState((prev) => ({
        ...prev,
        lastAngle: currentAngle,
        velocity: avgVelocity,
        lastTime: currentTime,
      }))

      setRotation(newRotation)
      lastUpdateTime.current = currentTime
    },
    [dragState.isDragging, dragState.startAngle, dragState.lastAngle, getAngleFromCenter, isAutoRotating],
  )

  const handlePointerUp = useCallback(() => {
    if (!dragState.isDragging || isAutoRotating) return

    setDragState((prev) => ({
      ...prev,
      isDragging: false,
    }))

    // Improved momentum with better physics
    const avgVelocity =
      velocityHistory.current.length > 0
        ? velocityHistory.current.reduce((sum, v) => sum + v, 0) / velocityHistory.current.length
        : 0

    if (Math.abs(avgVelocity) > 0.5) {
      let currentVelocity = avgVelocity
      const friction = 0.92 // Adjusted friction for better feel
      const minVelocity = 0.02

      const momentumAnimate = () => {
        if (Math.abs(currentVelocity) < minVelocity) {
          return
        }

        setRotation((prev) => prev + currentVelocity * 0.016)
        currentVelocity *= friction

        animationRef.current = requestAnimationFrame(momentumAnimate)
      }

      momentumAnimate()
    }
  }, [dragState.isDragging, isAutoRotating])

  // Optimized click handler with drag detection
  const handleCardClick = useCallback(
    (skill: Skill, index: number, e: React.MouseEvent) => {
      if (dragState.isDragging || isAutoRotating) return

      // Prevent click if user was dragging
      const dragDistance = Math.sqrt(
        Math.pow(e.clientX - dragState.startPosition.x, 2) + Math.pow(e.clientY - dragState.startPosition.y, 2),
      )

      if (dragDistance > 10) return // Ignore clicks after significant drag

      setSelectedSkill(skill)
      const skillAngle = (index / skills.length) * 2 * Math.PI - Math.PI / 2
      const targetRotation = -skillAngle
      animateToRotation(targetRotation)
    },
    [dragState.isDragging, dragState.startPosition, isAutoRotating, animateToRotation],
  )

  const resetRotation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    setRotation(0)
    setIsAutoRotating(false)
    setDragState((prev) => ({ ...prev, velocity: 0 }))
  }, [])

  // Event listeners with proper cleanup
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => handlePointerMove(e)
    const handleGlobalPointerUp = () => handlePointerUp()

    if (dragState.isDragging) {
      document.addEventListener("pointermove", handleGlobalPointerMove)
      document.addEventListener("pointerup", handleGlobalPointerUp)
      document.addEventListener("pointercancel", handleGlobalPointerUp)
    }

    return () => {
      document.removeEventListener("pointermove", handleGlobalPointerMove)
      document.removeEventListener("pointerup", handleGlobalPointerUp)
      document.removeEventListener("pointercancel", handleGlobalPointerUp)
    }
  }, [dragState.isDragging, handlePointerMove, handlePointerUp])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Generate className for skill cards
  const getSkillCardClassName = (skillId: string) => {
    const baseClasses =
      "absolute w-28 h-28 rounded-2xl shadow-lg cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-xl flex flex-col items-center justify-center group select-none will-change-transform bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-600"

    const selectedClasses = selectedSkill?.id === skillId ? "ring-4 ring-blue-400 dark:ring-blue-500 scale-110" : ""

    const disabledClasses = isAutoRotating ? "pointer-events-none" : ""

    return `${baseClasses} ${selectedClasses} ${disabledClasses}`.trim()
  }

  return (
    <div className="col-span-12 md:col-span-8 rounded-3xl p-8 animate-on-scroll relative overflow-hidden">
      {/* Background gradient effect - different for light/dark mode */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 opacity-95 rounded-3xl border border-blue-200 dark:border-gray-700"></div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Expertise</h2>
            <div className="chinese-title font-chinese text-3xl text-blue-600 dark:text-gray-300 opacity-80 mt-1">
              我的专长
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-gray-500 dark:text-white/60 text-sm flex items-center gap-2">
              <i className="fas fa-hand-pointer"></i>
              <span className="italic">drag to rotate</span>
            </div>
            <div className="text-gray-500 dark:text-white/60 text-sm flex items-center gap-2">
              <i className="fas fa-mouse-pointer"></i>
              <span className="italic">click to center</span>
            </div>
            <button
              onClick={resetRotation}
              className="text-gray-500 dark:text-white/60 hover:text-blue-600 dark:hover:text-white text-sm flex items-center gap-2 transition-colors"
            >
              <i className="fas fa-redo"></i>
              <span>reset</span>
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className={`relative w-full h-[500px] flex items-center justify-center touch-none select-none ${
            dragState.isDragging ? "cursor-grabbing" : isAutoRotating ? "cursor-wait" : "cursor-grab"
          }`}
          onPointerDown={handlePointerDown}
        >
          {/* Rotating circular arrangement of skill cards */}
          <div
            className="relative w-full h-full will-change-transform"
            style={{
              transform: `rotate(${rotation}rad)`,
              transformOrigin: "center",
            }}
          >
            {skills.map((skill, index) => {
              const position = skillPositions[index]

              return (
                <div
                  key={skill.id}
                  className={getSkillCardClassName(skill.id)}
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) rotate(${-rotation}rad)`,
                    transformOrigin: "center",
                    left: "50%",
                    top: "50%",
                    marginLeft: "-56px",
                    marginTop: "-56px",
                  }}
                  onClick={(e) => handleCardClick(skill, index, e)}
                >
                  <i
                    className={`${skill.icon} text-3xl text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors pointer-events-none mb-1`}
                  ></i>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight pointer-events-none px-1">
                    {skill.name}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Center content area - different styling for light/dark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-xs bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-xl border border-blue-100 dark:border-gray-700 shadow-lg">
              {selectedSkill && (
                <div className="animate-fade-in">
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mx-auto mb-2"></div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{selectedSkill.name}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">{selectedSkill.category}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {selectedSkill.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Skills categories at bottom - different styling for light/dark */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="text-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-3 rounded-lg border border-blue-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Programming</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">JavaScript, TypeScript, Python</p>
          </div>
          <div className="text-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-3 rounded-lg border border-blue-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Frontend</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">React, Next.js, Flutter</p>
          </div>
          <div className="text-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-3 rounded-lg border border-blue-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Backend</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Firebase, API Integration</p>
          </div>
          <div className="text-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-3 rounded-lg border border-blue-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Tools</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Git, AWS, Prisma</p>
          </div>
        </div>
      </div>
    </div>
  )
}
