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
  const [lastCommand, setLastCommand] = useState<string>("")
  const autoRestartRef = useRef(true) // Control whether auto-restart is enabled
  const abortedRef = useRef(false) // Track if recognition was aborted

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
        recognitionInstance.maxAlternatives = 3 // Aumentar alternativas para mejor precisión

        recognitionInstance.onstart = () => {
          console.log("Speech recognition started")
          setListening(true)
          setError(null)
          isStartingRef.current = false
          abortedRef.current = false // Reset aborted flag when starting
        }

        recognitionInstance.onend = () => {
          console.log("Speech recognition ended")
          setListening(false)

          // Auto-restart if enabled, not manually stopped, and not aborted
          if (autoRestartRef.current && !isStartingRef.current && !abortedRef.current) {
            console.log("Auto-restarting speech recognition")
            // Use a longer delay to prevent rapid cycling
            setTimeout(() => {
              if (!isStartingRef.current && autoRestartRef.current && !abortedRef.current) {
                safeStart()
              }
            }, 1000) // Shorter delay for faster restart
          }
        }

        recognitionInstance.onresult = (event: any) => {
          let finalTranscript = ""
          let interimTranscript = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              finalTranscript += result[0].transcript
            } else {
              interimTranscript += result[0].transcript
            }
          }

          if (finalTranscript) {
            setTranscript(finalTranscript)
            setLastCommand(finalTranscript)
            // Clear any "no-speech" error when we get results
            setError(null)
          }
        }

        recognitionInstance.onerror = (event: any) => {
          console.error("Speech recognition error", event.error)
          setError(event.error)

          // Handle aborted error specifically
          if (event.error === "aborted") {
            console.log("Recognition was aborted, will not auto-restart immediately")
            abortedRef.current = true

            // After an abort, wait longer before trying to restart
            if (restartTimeoutRef.current) {
              clearTimeout(restartTimeoutRef.current)
            }

            // Only attempt restart after a significant delay
            if (autoRestartRef.current) {
              restartTimeoutRef.current = setTimeout(() => {
                console.log("Attempting to restart after previous abort")
                abortedRef.current = false
                if (autoRestartRef.current) {
                  safeStart()
                }
              }, 2000) // Shorter delay after an abort
            }
            return
          }

          // Handle other recoverable errors
          if (event.error === "no-speech" || event.error === "audio-capture" || event.error === "network") {
            // If no speech is detected or other recoverable errors, restart recognition after a delay
            if (restartTimeoutRef.current) {
              clearTimeout(restartTimeoutRef.current)
            }

            // Use a longer delay for error recovery
            restartTimeoutRef.current = setTimeout(() => {
              if (autoRestartRef.current && !abortedRef.current) {
                try {
                  safeStop()
                  setTimeout(() => {
                    if (autoRestartRef.current && !abortedRef.current) {
                      safeStart()
                    }
                  }, 1000) // Shorter delay after errors
                } catch (e) {
                  console.error("Error restarting after error:", e)
                }
              }
            }, 1500) // Shorter delay before attempting restart
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

      // Disable auto-restart before stopping
      autoRestartRef.current = false
      // Make sure to stop recognition on unmount
      safeStop()
    }
  }, [])

  // Safe methods to start and stop that check state first
  const safeStart = useCallback(() => {
    if (!recognitionRef.current) return false

    try {
      // Only start if not already listening and not in the process of starting
      if (!listening && !isStartingRef.current) {
        console.log("Starting speech recognition")
        isStartingRef.current = true
        recognitionRef.current.start()
        return true
      }
    } catch (error) {
      console.error("Error in safeStart:", error)
      isStartingRef.current = false
      // If we get an error starting, set a timeout to try again
      setTimeout(() => {
        if (autoRestartRef.current && !abortedRef.current) {
          console.log("Retrying start after error")
          safeStart()
        }
      }, 1500)
    }
    return false
  }, [listening])

  const safeStop = useCallback(() => {
    if (!recognitionRef.current) return false

    try {
      // Only stop if currently listening or in the process of starting
      if (listening || isStartingRef.current) {
        console.log("Stopping speech recognition")
        // Disable auto-restart before stopping
        autoRestartRef.current = false
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
    // Enable auto-restart when manually starting
    autoRestartRef.current = true
    abortedRef.current = false // Reset aborted flag
    console.log("Llamada a startListening")
    return safeStart()
  }, [safeStart])

  const stopListening = useCallback(() => {
    // Disable auto-restart when manually stopping
    autoRestartRef.current = false
    console.log("Llamada a stopListening")
    return safeStop()
  }, [safeStop])

  const resetTranscript = useCallback(() => {
    setTranscript("")
  }, [])

  return {
    transcript,
    listening,
    supported,
    error,
    lastCommand,
    startListening,
    stopListening,
    resetTranscript,
  }
}
