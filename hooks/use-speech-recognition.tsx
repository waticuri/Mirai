"use client"

import { useCallback, useEffect, useState, useRef } from "react"

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState("")
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isStartingRef = useRef(false) // Track when we're in the process of starting

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
          console.log("Speech recognition started")
          setListening(true)
          setError(null)
          isStartingRef.current = false
        }

        recognitionInstance.onend = () => {
          console.log("Speech recognition ended")
          setListening(false)

          // Only auto-restart if we didn't manually stop it
          if (isStartingRef.current) {
            isStartingRef.current = false
          }
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
            // Clear any "no-speech" error when we get results
            setError(null)
          }
        }

        recognitionInstance.onerror = (event: any) => {
          console.error("Speech recognition error", event.error)
          setError(event.error)

          // Handle specific errors
          if (event.error === "no-speech") {
            // If no speech is detected, restart recognition after a delay
            if (restartTimeoutRef.current) {
              clearTimeout(restartTimeoutRef.current)
            }

            restartTimeoutRef.current = setTimeout(() => {
              if (listening) {
                try {
                  safeStop()
                  setTimeout(() => {
                    safeStart()
                  }, 500)
                } catch (e) {
                  console.error("Error restarting after no-speech:", e)
                }
              }
            }, 2000)
          }
        }

        recognitionRef.current = recognitionInstance
      }
    }

    return () => {
      // Clean up timeout on unmount
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }

      // Make sure to stop recognition on unmount
      safeStop()
    }
  }, [])

  // Safe methods to start and stop that check state first
  const safeStart = useCallback(() => {
    if (!recognitionRef.current) return false

    try {
      if (!listening && !isStartingRef.current) {
        isStartingRef.current = true
        recognitionRef.current.start()
        return true
      }
    } catch (error) {
      console.error("Error in safeStart:", error)
      isStartingRef.current = false
    }
    return false
  }, [listening])

  const safeStop = useCallback(() => {
    if (!recognitionRef.current) return false

    try {
      if (listening || isStartingRef.current) {
        recognitionRef.current.stop()
        isStartingRef.current = false
        return true
      }
    } catch (error) {
      console.error("Error in safeStop:", error)
    }
    return false
  }, [listening])

  const startListening = useCallback(() => {
    safeStart()
  }, [safeStart])

  const stopListening = useCallback(() => {
    safeStop()
  }, [safeStop])

  const resetTranscript = useCallback(() => {
    setTranscript("")
  }, [])

  return {
    transcript,
    listening,
    supported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  }
}
