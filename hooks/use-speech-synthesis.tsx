"use client"

import { useCallback, useEffect, useState } from "react"

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSupported(true)

      // Get voices
      const getVoices = () => {
        const voiceOptions = window.speechSynthesis.getVoices()
        setVoices(voiceOptions)
      }

      getVoices()

      // Chrome loads voices asynchronously
      window.speechSynthesis.onvoiceschanged = getVoices

      return () => {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!supported) return

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)

      // Try to find a Spanish voice
      const spanishVoice = voices.find((voice) => voice.lang.includes("es"))
      if (spanishVoice) {
        utterance.voice = spanishVoice
      }

      utterance.rate = 1
      utterance.pitch = 1
      utterance.volume = 1

      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)

      window.speechSynthesis.speak(utterance)
    },
    [supported, voices],
  )

  const cancel = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  return {
    speak,
    cancel,
    speaking,
    supported,
    voices,
  }
}
