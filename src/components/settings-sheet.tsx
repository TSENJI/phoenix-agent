'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore, type ProviderStatus } from '@/lib/store'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Eye, EyeOff, Save, TestTube2, Circle, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

const PROVIDER_DEFS = [
  { id: 'gemini', name: 'Gemini', defaultModel: 'gemini-2.5-flash', helpUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'openrouter', name: 'OpenRouter', defaultModel: 'google/gemini-2.0-flash-exp:free', helpUrl: 'https://openrouter.ai/keys' },
  { id: 'groq', name: 'Groq', defaultModel: 'llama-3.3-70b-versatile', helpUrl: 'https://console.groq.com/keys' },
  { id: 'nvidia', name: 'Nvidia', defaultModel: 'meta/llama-3.1-405b-instruct', helpUrl: 'https://build.nvidia.com/meta/llama-3.1-405b-instruct' },
] as const

function ProviderCard({
  provider,
  apiKey,
  enabled,
  customModel,
  onApiKeyChange,
  onEnabledChange,
  onModelChange,
  hasKey,
}: {
  provider: typeof PROVIDER_DEFS[number]
  apiKey: string
  enabled: boolean
  customModel: string
  onApiKeyChange: (key: string) => void
  onEnabledChange: (enabled: boolean) => void
  onModelChange: (model: string) => void
  hasKey: boolean
}) {
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/chat')
      const providers = await res.json()
      const status = (providers as ProviderStatus[]).find((p) => p.id === provider.id)
      if (status?.hasKey) {
        toast.success(`${provider.name} connection OK`)
      } else {
        toast.error(`${provider.name} has no API key`)
      }
    } catch {
      toast.error('Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/3 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Circle className={`h-2.5 w-2.5 fill-current ${hasKey ? 'text-green-500' : 'text-red-500/60'}`} />
          <span className="text-sm font-medium">{provider.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-[11px] opacity-60 hover:opacity-100"
            onClick={() => window.open(provider.helpUrl, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
            Get Key
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-[11px] opacity-60 hover:opacity-100"
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube2 className="h-3 w-3" />}
            Test
          </Button>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] opacity-50 uppercase tracking-wider">API Key</Label>
        <div className="relative">
          <Input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={`Enter ${provider.name} API key...`}
            className="pr-9 font-mono text-xs"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
          >
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] opacity-50 uppercase tracking-wider">Custom Model</Label>
        <Input
          value={customModel}
          onChange={(e) => onModelChange(e.target.value)}
          placeholder={provider.defaultModel}
          className="font-mono text-xs"
        />
      </div>
    </div>
  )
}

export function SettingsSheet() {
  const { settingsOpen, setSettingsOpen, settings, setSettings, providers } = useAppStore()
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settingsOpen) {
      setLocalSettings({ ...settings })
    }
  }, [settingsOpen, settings])

  const updateLocalSetting = useCallback((key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const entries = Object.entries(localSettings).map(([key, value]) => ({ key, value }))
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries),
      })
      if (res.ok) {
        setSettings(localSettings)
        toast.success('Settings saved')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md border-white/5 bg-background overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="text-lg">⚙️</span> Settings
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Provider statuses overview */}
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 rounded-full border border-white/5 px-3 py-1.5 text-xs"
              >
                <Circle className={`h-2 w-2 fill-current ${p.hasKey ? 'text-green-500' : 'text-red-500/60'}`} />
                <span className="opacity-60">{p.name}</span>
                {p.hasKey && p.enabled && (
                  <span className="text-green-500/80">Active</span>
                )}
              </div>
            ))}
          </div>

          <Separator className="opacity-10" />

          {/* Provider cards */}
          <div className="space-y-3">
            {PROVIDER_DEFS.map((provider) => {
              const pStatus = providers.find((p) => p.id === provider.id)
              return (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  apiKey={localSettings[`${provider.id}_key`] || ''}
                  enabled={localSettings[`${provider.id}_enabled`] !== 'false'}
                  customModel={localSettings[`${provider.id}_model`] || ''}
                  onApiKeyChange={(v) => updateLocalSetting(`${provider.id}_key`, v)}
                  onEnabledChange={(v) => updateLocalSetting(`${provider.id}_enabled`, v ? 'true' : 'false')}
                  onModelChange={(v) => updateLocalSetting(`${provider.id}_model`, v)}
                  hasKey={!!pStatus?.hasKey}
                />
              )
            })}
          </div>

          <Separator className="opacity-10" />

          {/* E2B Sandbox */}
          <div className="rounded-xl border border-white/5 bg-white/3 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Circle className={`h-2.5 w-2.5 fill-current ${localSettings['e2b_key'] ? 'text-green-500' : 'text-red-500/60'}`} />
              <span className="text-sm font-medium">E2B Sandbox</span>
              <span className="text-[10px] opacity-40">(Code execution sandbox)</span>
              <a href="https://e2b.dev/docs/getting-started/api-key" target="_blank" rel="noopener noreferrer" className="ml-auto text-[11px] opacity-50 hover:opacity-100 flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Get Key
              </a>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] opacity-50 uppercase tracking-wider">E2B API Key</Label>
              <Input
                type={localSettings['e2b_key'] ? 'text' : 'password'}
                value={localSettings['e2b_key'] || ''}
                onChange={(e) => updateLocalSetting('e2b_key', e.target.value)}
                placeholder="Enter E2B API key (optional)..."
                className="font-mono text-xs"
              />
            </div>
          </div>

          {/* Browser Worker */}
          <div className="rounded-xl border border-white/5 bg-white/3 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Circle className={`h-2.5 w-2.5 fill-current text-green-500`} />
              <span className="text-sm font-medium">Browser Worker</span>
              <span className="text-[10px] opacity-40">(Remote or local)</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] opacity-50 uppercase tracking-wider">Worker URL</Label>
              <Input
                value={localSettings['browser_worker_url'] || ''}
                onChange={(e) => updateLocalSetting('browser_worker_url', e.target.value)}
                placeholder="http://localhost:3001 (leave empty for local agent-browser)"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <Separator className="opacity-10" />

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2 rounded-xl bg-amber-500 text-black hover:bg-amber-400"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
