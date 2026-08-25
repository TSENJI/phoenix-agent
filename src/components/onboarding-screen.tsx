'use client'

import { motion } from 'framer-motion'
import { Flame, Zap, ExternalLink, ArrowRight, Globe, Code2, Terminal, Shield } from 'lucide-react'
import { useAppStore } from '@/lib/store'

const PROVIDER_LINKS = [
  {
    name: 'Google Gemini',
    desc: 'Free, fast, strong reasoning',
    url: 'https://aistudio.google.com/app/apikey',
    color: 'from-blue-500 to-cyan-500',
    icon: Globe,
  },
  {
    name: 'Groq',
    desc: 'Ultra-fast Llama 3.3 70B',
    url: 'https://console.groq.com/keys',
    color: 'from-orange-500 to-red-500',
    icon: Zap,
  },
  {
    name: 'OpenRouter',
    desc: '100+ free models available',
    url: 'https://openrouter.ai/keys',
    color: 'from-purple-500 to-pink-500',
    icon: Code2,
  },
  {
    name: 'Nvidia NIM',
    desc: 'Llama 3.1 405B free tier',
    url: 'https://build.nvidia.com/meta/llama-3.1-405b-instruct',
    color: 'from-green-500 to-emerald-500',
    icon: Terminal,
  },
]

const FEATURES = [
  { icon: Globe, text: 'Browse any website' },
  { icon: Terminal, text: 'Execute shell commands' },
  { icon: Code2, text: 'E2B code sandbox' },
  { icon: Shield, text: 'Human takeover for CAPTCHA' },
]

export function OnboardingScreen() {
  const { setSettingsOpen, providers } = useAppStore()
  const hasAnyKey = providers.some((p) => p.hasKey)

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full"
      >
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
            <Flame className="h-10 w-10 text-white" />
          </div>
        </div>

        <h2 className="mb-2 text-3xl font-bold tracking-tight">Phoenix Agent</h2>
        <p className="mb-6 text-sm opacity-50">
          Free AI agent with browser automation, code sandbox, and multi-model fallback.
          Paste at least one API key to get started.
        </p>

        {/* Provider cards */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PROVIDER_LINKS.map((p, i) => (
            <motion.a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
              className="group relative flex items-start gap-3 rounded-xl border border-white/5 bg-white/3 p-4 text-left transition-all hover:border-white/10 hover:bg-white/5"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${p.color} opacity-80 group-hover:opacity-100 transition-opacity`}>
                <p.icon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{p.name}</span>
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                </div>
                <p className="text-[11px] opacity-40 mt-0.5">{p.desc}</p>
              </div>
              {providers.find((prov) => prov.name === p.name || (p.name === 'Google Gemini' && prov.name === 'Gemini'))?.hasKey && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-500" />
              )}
            </motion.a>
          ))}
        </div>

        {/* Setup button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => setSettingsOpen(true)}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-semibold text-black transition-all hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/20"
        >
          {hasAnyKey ? 'Manage API Keys' : 'Paste Your API Keys'}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </motion.button>

        {/* Features */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.text}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/3 px-3 py-1.5 text-[11px] opacity-50"
            >
              <f.icon className="h-3 w-3 text-amber-500/60" />
              {f.text}
            </motion.div>
          ))}
        </div>

        {/* Auto fallback note */}
        <p className="mt-4 text-[10px] opacity-25">
          Add multiple keys for automatic fallback when one hits rate limits.
        </p>
      </motion.div>
    </div>
  )
}
