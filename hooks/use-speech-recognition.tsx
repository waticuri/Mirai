"use client"

import { useCallback, useEffect, useState } from "react"

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState("")
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check for browser support
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        setSupported(true)
        const recognitionInstance = new SpeechRecognition()

        recognitionInstance.continuous = true
        recognitionInstance.interimResults = true
        recognitionInstance.lang = "es-ES" // Spanish language

        recognitionInstance.onstart = () => {
          setListening(true)
        }

        recognitionInstance.onend = () => {
          setListening(false)
        }

        recognitionInstance.onresult = (event: any) => {
          let finalTranscript = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              finalTranscript += result[0].transcript
            }
          }

          if (finalTranscript) {
            setTranscript(finalTranscript)
          }
        }

        recognitionInstance.onerror = (event: any) => {
          console.error("Speech recognition error", event.error)
          setListening(false)
        }

        setRecognition(recognitionInstance)
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (recognition && !listening) {
      try {
        recognition.start()
      } catch (error) {
        console.error("Error starting speech recognition:", error)
      }
    }
  }, [recognition, listening])

  const stopListening = useCallback(() => {
    if (recognition && listening) {
      recognition.stop()
    }
  }, [recognition, listening])

  const resetTranscript = useCallback(() => {
    setTranscript("")
  }, [])

  return {
    transcript,
    listening,
    supported,
    startListening,
    stopListening,
    resetTranscript,
  }
}
