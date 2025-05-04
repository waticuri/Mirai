"use client"

import { useCallback, useEffect, useState, useRef } from "react"

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)
  const speakQueueRef = useRef<{ text: string; onEnd?: () => void }[]>([])
  const isSpeakingRef = useRef(false)
  const voicesLoadedRef = useRef(false)

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSupported(true)

      // Get voices
      const getVoices = () => {
        const voiceOptions = window.speechSynthesis.getVoices()
        if (voiceOptions.length > 0) {
          setVoices(voiceOptions)
          voicesLoadedRef.current = true
          console.log("Voces cargadas:", voiceOptions.length)
        }
      }

      getVoices()

      // Chrome loads voices asynchronously
      window.speechSynthesis.onvoiceschanged = getVoices

      // Verificar periódicamente si las voces están cargadas
      const checkVoicesInterval = setInterval(() => {
        if (!voicesLoadedRef.current) {
          const voiceOptions = window.speechSynthesis.getVoices()
          if (voiceOptions.length > 0) {
            setVoices(voiceOptions)
            voicesLoadedRef.current = true
            console.log("Voces cargadas (verificación periódica):", voiceOptions.length)
            clearInterval(checkVoicesInterval)
          }
        } else {
          clearInterval(checkVoicesInterval)
        }
      }, 500)

      return () => {
        window.speechSynthesis.onvoiceschanged = null
        window.speechSynthesis.cancel()
        clearInterval(checkVoicesInterval)
      }
    }
  }, [])

  // Process the speak queue
  const processQueue = useCallback(() => {
    if (speakQueueRef.current.length === 0 || isSpeakingRef.current) return

    const nextItem = speakQueueRef.current.shift()
    if (!nextItem) return

    isSpeakingRef.current = true
    setSpeaking(true)

    const utterance = new SpeechSynthesisUtterance(nextItem.text)

    // Try to find a Spanish voice
    const spanishVoice = voices.find((voice) => voice.lang.includes("es"))
    if (spanishVoice) {
      utterance.voice = spanishVoice
    }

    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1

    // Manejar errores y reintentos
    let hasEnded = false
    let speakTimeout: NodeJS.Timeout | null = null

    utterance.onstart = () => {
      setSpeaking(true)
      console.log("Síntesis de voz iniciada")
      // Clear any existing timeout
      if (speakTimeout) {
        clearTimeout(speakTimeout)
        speakTimeout = null
      }
    }

    utterance.onend = () => {
      hasEnded = true
      setSpeaking(false)
      isSpeakingRef.current = false
      console.log("Síntesis de voz finalizada")

      // Process next item in queue
      setTimeout(() => {
        processQueue()
      }, 250)

      if (nextItem.onEnd) {
        console.log("Ejecutando callback onEnd")
        nextItem.onEnd()
      }

      // Clear any existing timeout
      if (speakTimeout) {
        clearTimeout(speakTimeout)
        speakTimeout = null
      }
    }

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event)
      setSpeaking(false)
      isSpeakingRef.current = false

      // Process next item in queue after error
      setTimeout(() => {
        processQueue()
      }, 250)

      // Clear any existing timeout
      if (speakTimeout) {
        clearTimeout(speakTimeout)
        speakTimeout = null
      }

      if (nextItem.onEnd) {
        console.log("Ejecutando callback onEnd después de error")
        nextItem.onEnd()
      }
    }

    // Ensure speech synthesis is not busy
    if (window.speechSynthesis.speaking) {
      console.log("Speech synthesis is busy, canceling previous speech")
      window.speechSynthesis.cancel()
      // Small delay to ensure cancel completes
      setTimeout(() => {
        window.speechSynthesis.speak(utterance)
      }, 100)
    } else {
      window.speechSynthesis.speak(utterance)
    }

    // Set a timeout to check if speech has started
    // Chrome sometimes fails to start speaking without error
    speakTimeout = setTimeout(() => {
      if (!hasEnded && !window.speechSynthesis.speaking) {
        console.log("Speech synthesis failed to start, retrying...")
        window.speechSynthesis.cancel()
        isSpeakingRef.current = false
        setSpeaking(false)
        // Try again
        processQueue()
      }
    }, 1000)
  }, [voices])

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!supported) {
        console.log("Síntesis de voz no soportada")
        if (onEnd) onEnd()
        return
      }

      console.log("Agregando texto a la cola:", text.substring(0, 20) + "...")

      // Add to queue
      speakQueueRef.current.push({ text, onEnd })

      // Process queue
      processQueue()
    },
    [supported, processQueue],
  )

  const cancel = useCallback(() => {
    if (!supported) return

    console.log("Cancelando síntesis de voz")
    // Clear queue
    speakQueueRef.current = []

    window.speechSynthesis.cancel()
    setSpeaking(false)
    isSpeakingRef.current = false
  }, [supported])

  return {
    speak,
    cancel,
    speaking,
    supported,
    voices,
  }
}
