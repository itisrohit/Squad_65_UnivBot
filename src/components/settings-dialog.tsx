"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { useSession, signOut } from "next-auth/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Palette, Moon, Sun, Monitor, Key, LogOut, User, Mail, Check, AlertCircle, Loader2, Trash2 } from "lucide-react"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApiKeyStatusChange?: (hasApiKey: boolean) => void
}

export function SettingsDialog({ open, onOpenChange, onApiKeyStatusChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()
  const [geminiApiKey, setGeminiApiKey] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
  const [hasApiKey, setHasApiKey] = useState(false)

  // Load API key status when dialog opens
  useEffect(() => {
    if (open && session?.user) {
      loadApiKeyStatus()
    }
  }, [open, session])

  const loadApiKeyStatus = async () => {
    try {
      const response = await fetch('/api/user/gemini-api-key')
      if (response.ok) {
        const data = await response.json()
        setHasApiKey(data.hasApiKey)
      }
    } catch (error) {
      console.error('Error loading API key status:', error)
    }
  }

  const validateGeminiApiKey = async (apiKey: string): Promise<boolean> => {
    try {
      // Use the official Google AI API endpoint with gemini-2.5-flash-lite for faster response
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Hi"
            }]
          }]
        })
      })
      
      return response.ok
    } catch (error) {
      return false
    }
  }

  const handleSaveApiKey = async () => {
    if (!geminiApiKey.trim()) {
      setSaveStatus("error")
      return
    }

    setIsSaving(true)
    setIsValidating(true)
    setSaveStatus("idle")

    try {
      // First validate the API key
      const isValid = await validateGeminiApiKey(geminiApiKey.trim())
      
      if (!isValid) {
        setSaveStatus("error")
        return
      }

      // If valid, save to database
      const response = await fetch('/api/user/gemini-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ geminiApiKey: geminiApiKey.trim() }),
      })

      if (response.ok) {
        setSaveStatus("success")
        setHasApiKey(true)
        setGeminiApiKey("") // Clear input after successful save
        setTimeout(() => setSaveStatus("idle"), 3000)
        // Notify parent component
        onApiKeyStatusChange?.(true)
      } else {
        setSaveStatus("error")
      }
    } catch (error) {
      console.error('Error saving API key:', error)
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
      setIsValidating(false)
    }
  }

  const handleDeleteApiKey = async () => {
    setIsDeleting(true)
    setSaveStatus("idle")

    try {
      const response = await fetch('/api/user/gemini-api-key', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setHasApiKey(false)
        setSaveStatus("success")
        setTimeout(() => setSaveStatus("idle"), 3000)
        // Notify parent component
        onApiKeyStatusChange?.(false)
      } else {
        setSaveStatus("error")
      }
    } catch (error) {
      console.error('Error deleting API key:', error)
      setSaveStatus("error")
    } finally {
      setIsDeleting(false)
    }
  }


  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-auto sm:max-w-2xl max-h-[80vh] overflow-y-auto mx-2 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Palette className="h-5 w-5 text-blue-500" />
            </div>
            Settings
          </DialogTitle>
          <DialogDescription className="break-words">Customize your UnivBot experience with these preferences.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Appearance Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="text-lg font-semibold">Appearance</h3>
            </div>

            <div className="space-y-4 pl-6">
              <div className="flex flex-col gap-4">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="theme">Theme</Label>
                  <p className="text-sm text-muted-foreground break-words">Choose your preferred color theme</p>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* API Configuration Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="text-lg font-semibold">API Configuration</h3>
            </div>

            <div className="space-y-4 pl-6">
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="gemini-api-key">Gemini API Key</Label>
                  <p className="text-sm text-muted-foreground break-words">
                    Enter your Gemini API key to enable AI features and document processing
                  </p>
                  {hasApiKey && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      API key is configured
                    </div>
                  )}
                </div>
                <Input
                  id="gemini-api-key"
                  type="password"
                  placeholder={hasApiKey ? "••••••••••••••••" : "Enter your Gemini API key"}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="w-full"
                />
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={handleSaveApiKey}
                    disabled={isSaving || !geminiApiKey.trim()}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    {isSaving ? (
                      <>
                        {isValidating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          "Saving..."
                        )}
                      </>
                    ) : (
                      "Save API Key"
                    )}
                  </Button>
                  {hasApiKey && (
                    <Button
                      variant="outline"
                      onClick={handleDeleteApiKey}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete API Key
                        </>
                      )}
                    </Button>
                  )}
                  {saveStatus === "success" && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      {hasApiKey ? "Saved successfully!" : "Deleted successfully!"}
                    </div>
                  )}
                  {saveStatus === "error" && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      Invalid API key
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* User Account Section - Moved to bottom */}
          {session?.user && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary flex-shrink-0" />
                  <h3 className="text-lg font-semibold">Account</h3>
                </div>

                <div className="space-y-4 pl-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                      <AvatarFallback>
                        {session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="font-medium truncate">{session.user.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{session.user.email}</span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSignOut}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
