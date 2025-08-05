"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Send,
  GraduationCap,
  Settings,
  Paperclip,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SettingsDialog } from "@/components/settings-dialog"
import { PastEventsDialog } from "@/components/past-events-dialog"
import { SignInDialog } from "@/components/sign-in-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

function DocumentLoadingUI({ file, onRemove, isProcessing }: { file: File; onRemove?: () => void; isProcessing?: boolean }) {
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄'
    if (type.includes('text')) return '📝'
    if (type.includes('word')) return '📄'
    return '📎'
  }

  const getFileType = (type: string) => {
    if (type.includes('pdf')) return 'PDF'
    if (type.includes('text')) return 'TXT'
    if (type.includes('word')) return 'DOCX'
    return 'FILE'
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-border/30 max-w-[200px]">
      <div className="relative">
        <div className="text-sm">{getFileIcon(file.type)}</div>
        {isProcessing && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 border border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground text-xs truncate">{file.name}</div>
      </div>
      {onRemove && !isProcessing && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-4 w-4 p-0 hover:bg-destructive/10 hover:text-destructive ml-1"
        >
          ×
        </Button>
      )}
    </div>
  )
}

function ChatMessage({ message, isUser }: { message: string; isUser: boolean }) {
  return (
    <div className={cn("flex w-full mb-6 animate-fadeIn", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] md:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm transition-all duration-200",
          isUser
            ? "bg-blue-500 text-white rounded-br-md ml-4"
            : "bg-muted/80 text-foreground rounded-bl-md mr-4 border border-border/50",
        )}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {message}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-6">
      <div className="bg-muted/80 px-4 py-3 rounded-2xl rounded-bl-md border border-border/50">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { data: session, status: sessionStatus } = useSession()
  // Chat functionality temporarily disabled
  // const { messages, sendMessage, status: chatStatus } = useChat({
  //   transport: new DefaultChatTransport({
  //     api: "/api/chat",
  //   }),
  // })

  const [input, setInput] = useState("")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isPastEventsOpen, setIsPastEventsOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [hasGeminiApiKey, setHasGeminiApiKey] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if user has Gemini API key
  useEffect(() => {
    if (session?.user) {
      checkGeminiApiKeyStatus()
    }
  }, [session])

  const checkGeminiApiKeyStatus = async () => {
    try {
      const response = await fetch('/api/user/gemini-api-key')
      if (response.ok) {
        const data = await response.json()
        setHasGeminiApiKey(data.hasApiKey)
      }
    } catch (error) {
      console.error('Error checking Gemini API key status:', error)
    }
  }

  const handleApiKeyStatusChange = (hasApiKey: boolean) => {
    setHasGeminiApiKey(hasApiKey)
  }

  // Auto-scroll to bottom when new messages arrive
  // useEffect(() => {
  //   if (chatContainerRef.current) {
  //     chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
  //   }
  // }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() && selectedFiles.length === 0) {
      return
    }

    // If files are already uploaded, clear them
    if (selectedFiles.length > 0 && !isUploading) {
      setSelectedFiles([])
    }

    // Chat functionality temporarily disabled
    // if (input.trim() && chatStatus === "ready") {
    //   setIsAnimating(true)
    //   sendMessage({ text: input })
    //   setInput("")
    //   setSelectedFiles([])
    //   setTimeout(() => setIsAnimating(false), 300)

    //   // Reset textarea height
    //   if (textareaRef.current) {
    //     textareaRef.current.style.height = "auto"
    //   }
    // }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const file = files[0]
      
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        alert('❌ Unsupported file type. Please upload PDF, TXT, or DOCX files only.')
        return
      }
      
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        alert('❌ File size too large. Maximum size is 10MB.')
        return
      }
      
      // Add to selected files and upload immediately
      setSelectedFiles(prev => [...prev, ...files])
      handleFileUpload(file) // Process the first file
      
      // Reset file input so it can be used again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (file: File) => {
    
    if (!session?.user) {
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Upload failed:', errorText)
        throw new Error(`Upload failed: ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      
      // You can store the chunks in state or context for later use in RAG
      // For now, we're just logging them
      
    } catch (error) {
      console.error('❌ File upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((files) => files.filter((_, i) => i !== index))
  }

  // Show loading state while checking authentication
  if (sessionStatus === "loading") {
    return (
      <div className="flex h-screen h-[100dvh] w-full bg-background items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-8 rounded-full mb-4">
              <GraduationCap className="h-16 w-16 text-blue-500 animate-pulse" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full animate-bounce"></div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">🎓 UnivBot</h2>
            <p className="text-muted-foreground mb-4">Your Campus Assistant</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Preparing your personalized experience...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen h-[100dvh] w-full bg-background overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-t">
        {/* Top Navbar*/}
        <header className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-2 pl-4 pr-4 sm:pl-6 sm:pr-10">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">🎓 UnivBot</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Your Campus Assistant</p>
              </div>
            </div>
            {/* Right side buttons */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {session?.user ? (
                <>
                  <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                      <AvatarFallback className="text-xs">
                        {session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {session.user.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                    onClick={() => setIsPastEventsOpen(true)}
                  >
                    <span className="hidden sm:inline">Past Events</span>
                    <span className="sm:hidden">Events</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    <Settings className="h-5 w-5" />
                    <span className="sr-only">Settings</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                    onClick={() => setIsPastEventsOpen(true)}
                  >
                    <span className="hidden sm:inline">Past Events</span>
                    <span className="sm:hidden">Events</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    <Settings className="h-5 w-5" />
                    <span className="sr-only">Settings</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Chat Area - Scrollable */}
        <div className="flex-1 flex flex-col min-h-0">
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
          >
            <div className="max-w-4xl mx-auto w-full">
              {session?.user ? (
                // Show chat interface for authenticated users
                <div className="flex flex-col items-center justify-center min-h-full text-center py-16">
                  <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-8 rounded-full mb-6">
                    <GraduationCap className="h-16 w-16 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-3">Welcome {session.user.name}!</h2>
                  <p className="text-muted-foreground max-w-md leading-relaxed mb-6">
                    I'm here to help you with your campus queries. Chat functionality will be enabled soon.
                  </p>
                  {/* Helper text for file upload */}
                  <div className="text-xs text-muted-foreground">
                    📎 Supported formats: PDF, TXT, DOCX • Max size: 10MB
                  </div>
                </div>
              ) : (
                // Show welcome message for unauthenticated users
                <div className="flex flex-col items-center justify-center min-h-full text-center py-16">
                  <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-8 rounded-full mb-6">
                    <GraduationCap className="h-16 w-16 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-3">Welcome to UnivBot!</h2>
                  <p className="text-muted-foreground max-w-md leading-relaxed mb-6">
                    I'm here to help you with your campus queries. Please sign in to get started.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Input Area - Disabled */}
          <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-4xl mx-auto p-4 w-full">
              {/* Document Loading UI */}
              {selectedFiles.length > 0 && (
                <div className="mb-3">
                  {selectedFiles.map((file, index) => (
                    <DocumentLoadingUI 
                      key={index} 
                      file={file} 
                      onRemove={() => removeFile(index)} 
                      isProcessing={isUploading}
                    />
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      !session?.user 
                        ? "Sign in to start chatting..." 
                        : !hasGeminiApiKey 
                          ? "Configure Gemini API in settings to use UnivBot" 
                          : selectedFiles.length > 0
                            ? isUploading 
                              ? "Processing document..."
                              : "Type a question about your document or just press send to analyze..."
                            : "Type something..."
                    }
                    className="min-h-[52px] max-h-[120px] resize-none rounded-2xl border-2 focus:border-blue-500 transition-all duration-200 pr-12 py-3"
                    disabled={!session?.user || !hasGeminiApiKey || isUploading}
                    rows={1}
                  />
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple={false}
                  />
                  {/* Attachment Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 transition-colors duration-200 ${
                      session?.user && hasGeminiApiKey && selectedFiles.length === 0
                        ? 'hover:bg-blue-100 hover:text-blue-600' 
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={handleAttachmentClick}
                    disabled={!session?.user || !hasGeminiApiKey || isUploading || selectedFiles.length > 0}
                    title={
                      !session?.user 
                        ? "Sign in to upload files" 
                        : !hasGeminiApiKey 
                          ? "Configure Gemini API in settings to upload files" 
                          : selectedFiles.length > 0
                            ? "Remove current file first"
                            : "Upload PDF, TXT, or DOCX (max 10MB)"
                    }
                  >
                    <Paperclip className="h-4 w-4" />
                    <span className="sr-only">Attach file</span>
                  </Button>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={!session?.user || !hasGeminiApiKey || isUploading}
                  className={`h-[52px] w-[52px] rounded-2xl transition-all duration-200 ${
                    session?.user && hasGeminiApiKey && !isUploading
                      ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="h-5 w-5" />
                  <span className="sr-only">Send message</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
        onApiKeyStatusChange={handleApiKeyStatusChange}
      />
      
      {/* Past Events Dialog */}
      <PastEventsDialog open={isPastEventsOpen} onOpenChange={setIsPastEventsOpen} />

      {/* Sign In Dialog - Show as overlay when not authenticated */}
      {sessionStatus === "unauthenticated" && (
        <SignInDialog open={true} onOpenChange={() => {}} nonDismissible={true} />
      )}
    </div>
  )
}
