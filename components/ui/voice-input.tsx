"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Mic, MicOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VoiceInputProps {
  onResult: (text: string) => void
  className?: string
}

interface SpeechRecognitionAlternative {
  transcript: string
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null
  return (
    (window as unknown as Record<string, new () => SpeechRecognitionInstance>).SpeechRecognition ||
    (window as unknown as Record<string, new () => SpeechRecognitionInstance>).webkitSpeechRecognition ||
    null
  )
}

export function VoiceInput({ onResult, className }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported())
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognition()
    if (!SpeechRecognitionClass) return

    const recognition = new SpeechRecognitionClass()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ""
      let interimTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      onResult(finalTranscript || interimTranscript)
    }

    recognition.onerror = () => {
      stopListening()
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [onResult, stopListening])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  if (!supported) return null

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={isListening ? stopListening : startListening}
      className={cn(
        "shrink-0",
        isListening && "text-red-500 animate-pulse",
        className
      )}
      title={isListening ? "Stop recording" : "Start voice input"}
    >
      {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
    </Button>
  )
}
