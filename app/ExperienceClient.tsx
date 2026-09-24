'use client'
import dynamic from 'next/dynamic'

// WebGL is client-only; the shell renders instantly and the preloader takes over.
const Experience = dynamic(() => import('@/experience/Experience'), { ssr: false })

export default function ExperienceClient() {
  return <Experience />
}
