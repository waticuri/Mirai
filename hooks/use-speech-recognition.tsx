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
  const noSpeechTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const consecutiveErrorsRef = useRef(0)

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

          // Reset consecutive errors when successfully started
          consecutiveErrorsRef.current = 0

          // Clear any existing no-speech timeout
          if (noSpeechTimeoutRef.current) {
            clearTimeout(noSpeechTimeoutRef.current)
          }

          // Set a longer timeout for no-speech detection (10 seconds)
          noSpeechTimeoutRef.current = setTimeout(() => {
            console.log("No speech detected for a long period, restarting recognition")
            safeRestart()
          }, 10000)
        }

        recognitionInstance.onend = () => {
          console.log("Speech recognition ended")
          setListening(false)

          // Clear the no-speech timeout
          if (noSpeechTimeoutRef.current) {
            clearTimeout(noSpeechTimeoutRef.current)
            noSpeechTimeoutRef.current = null
          }

          // Only auto-restart if we didn't manually stop it
          if (isStartingRef.current) {
            isStartingRef.current = false
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

            // Reset consecutive errors when we get results
            consecutiveErrorsRef.current = 0

            // Reset the no-speech timeout since we got speech
            if (noSpeechTimeoutRef.current) {
              clearTimeout(noSpeechTimeoutRef.current)
            }

            noSpeechTimeoutRef.current = setTimeout(() => {
              console.log("Resetting recognition after period of inactivity")
              safeRestart()
            }, 10000)
          }
        }

        recognitionInstance.onerror = (event: any) => {
          console.log("Speech recognition error:", event.error)
          setError(event.error)

          // Increment consecutive errors counter
          consecutiveErrorsRef.current += 1

          // Handle specific errors
          if (event.error === "no-speech") {
            console.log("No speech detected, consecutive errors:", consecutiveErrorsRef.current)

            // If no speech is detected, restart recognition after a delay
            // Use exponential backoff for consecutive errors
            const backoffDelay = Math.min(2000 * Math.pow(1.5, consecutiveErrorsRef.current - 1), 10000)

            if (restartTimeoutRef.current) {
              clearTimeout(restartTimeoutRef.current)
            }

            restartTimeoutRef.current = setTimeout(() => {
              if (listening) {
                console.log(`Attempting to restart after no-speech (delay: ${backoffDelay}ms)`)
                safeRestart()
              }
            }, backoffDelay)
          } else if (event.error === "aborted" || event.error === "network") {
            // For network or aborted errors, try to restart after a short delay
            setTimeout(() => {
              if (listening) {
                console.log("Attempting to restart after network/abort error")
                safeRestart()
              }
            }, 1000)
          }
        }

        recognitionRef.current = recognitionInstance
      }
    }

    return () => {
      // Clean up timeouts on unmount
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }

      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current)
      }

      // Make sure to stop recognition on unmount
      safeStop()
    }
  }, [])

  // Safe method to restart recognition
  const safeRestart = useCallback(() => {
    if (!recognitionRef.current) return false

    try {
      // First stop the recognition
      safeStop()

      // Then start it again after a short delay
      setTimeout(() => {
        safeStart()
      }, 300)

      return true
    } catch (error) {
      console.error("Error in safeRestart:", error)
      return false
    }
  }, [])

  // Safe methods to start and stop that check state first
  const safeStart = useCallback(() => {
    if (!recognitionRef.current) return false

    try {
      // Verificar si ya está escuchando o en proceso de inicio
      if (listening || isStartingRef.current) {
        console.log("Speech recognition is already active or starting, ignoring start request")
        return false
      }

      isStartingRef.current = true
      console.log("Starting speech recognition")

      // Asegurarse de que cualquier instancia anterior esté detenida
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Ignorar errores al intentar detener (podría no estar activo)
      }

      // Pequeña pausa para asegurar que cualquier instancia anterior se haya detenido
      setTimeout(() => {
        try {
          recognitionRef.current?.start()
        } catch (error) {
          console.error("Error in delayed speech recognition start:", error)
          isStartingRef.current = false

          // Si hay un error específico de "already started", intentar detener y reiniciar
          if (error instanceof DOMException && error.message.includes("already started")) {
            console.log("Recognition was already started, attempting to restart")
            try {
              recognitionRef.current?.stop()
              // Intentar iniciar después de un breve retraso
              setTimeout(() => {
                try {
                  recognitionRef.current?.start()
                } catch (e) {
                  console.error("Failed to restart recognition after stop:", e)
                }
              }, 300)
            } catch (stopError) {
              console.error("Error stopping already started recognition:", stopError)
            }
          }
        }
      }, 50)

      return true
    } catch (error) {
      console.error("Error in safeStart:", error)
      isStartingRef.current = false

      // Si obtenemos un error al iniciar, intentar de nuevo después de un retraso
      setTimeout(() => {
        if (!listening) {
          console.log("Retrying speech recognition start after error")
          safeStart()
        }
      }, 1000)
    }
    return false
  }, [listening])

  const safeStop = useCallback(() => {
    if (!recognitionRef.current) return false

    try {
      console.log("Stopping speech recognition")
      recognitionRef.current.stop()
      isStartingRef.current = false
      return true
    } catch (error) {
      console.error("Error in safeStop:", error)
      // Asegurarse de que el estado se actualice correctamente incluso si hay un error
      isStartingRef.current = false
      setTimeout(() => setListening(false), 100)
    }
    return false
  }, [])

  const startListening = useCallback(() => {
    console.log("startListening called, current state:", { listening, isStarting: isStartingRef.current })

    // Si ya está escuchando, no hacer nada
    if (listening) {
      console.log("Already listening, ignoring startListening call")
      return
    }

    safeStart()
  }, [safeStart, listening])

  const stopListening = useCallback(() => {
    console.log("stopListening called")
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
    lastCommand,
    startListening,
    stopListening,
    resetTranscript,
  }
}
