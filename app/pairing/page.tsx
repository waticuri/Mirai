"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Check } from "lucide-react"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { UserDatabase } from "@/lib/db"

export default function PairingPage() {
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const [pairingStage, setPairingStage] = useState<"searching" | "connecting" | "connected">("searching")
  const [showAnimation, setShowAnimation] = useState(true)
  const [pairingComplete, setPairingComplete] = useState(false)
  const audioWaveRef = useRef<HTMLDivElement>(null)
  const glassesRef = useRef<HTMLDivElement>(null)

  // Simulate the pairing process
  useEffect(() => {
    // Start the pairing process
    const startPairing = async () => {
      speak("Buscando dispositivo Mirai. Por favor, enciende tus gafas manteniendo presionado el botón de encendido.")

      // Simulate searching for device
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Simulate finding device
      setPairingStage("connecting")
      speak("Dispositivo Mirai encontrado. Conectando...")

      // Simulate connecting
      await new Promise((resolve) => setTimeout(resolve, 2500))

      // Simulate successful connection
      setPairingStage("connected")
      setPairingComplete(true)
      speak("Conexión establecida correctamente. Tus gafas Mirai están listas para usar.")

      // Mark user as having paired device
      const currentUser = UserDatabase.getCurrentUser()
      if (currentUser) {
        UserDatabase.updateUser(currentUser.id, { hasCompletedPairing: true })
      }

      // Redirect to dashboard after a delay
      setTimeout(() => {
        setShowAnimation(false)
        setTimeout(() => {
          router.push("/dashboard")
        }, 500)
      }, 2000)
    }

    startPairing()

    return () => {
      // Cleanup if needed
    }
  }, [speak, router])

  // Animate the audio wave
  useEffect(() => {
    if ((pairingStage === "searching" || pairingStage === "connecting") && audioWaveRef.current) {
      const bars = audioWaveRef.current.querySelectorAll(".audio-bar")

      const animateBars = () => {
        bars.forEach((bar) => {
          const height = Math.floor(Math.random() * 20) + 5
          ;(bar as HTMLElement).style.height = `${height}px`
        })
      }

      const interval = setInterval(animateBars, 100)
      return () => clearInterval(interval)
    }
  }, [pairingStage])
  return pairingStage === "searching" || pairingStage === "connecting" ? (
    <main
      className={`flex min-h-screen flex-col items-center justify-center transition-opacity duration-500 ${
        showAnimation ? "opacity-100" : "opacity-0"
      }`}
      style={{
        background: "linear-gradient(to bottom, #6a3de8, #3b82f6, #06b6d4)",
      }}
    >
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6">
          <Image
            src="/images/mirai-glasses.jpeg"
            alt="Mirai Glasses"
            width={60}
            height={60}
            className="object-contain"
          />
        </div>

        <h2 className="text-white text-xl font-medium mb-4">
          {pairingStage === "searching" ? "Buscando dispositivo Mirai" : "Conectando..."}
        </h2>

        {/* Audio wave animation */}
        <div ref={audioWaveRef} className="flex items-center h-10 gap-1 mb-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="audio-bar w-1 bg-white rounded-full transition-all duration-100"
              style={{ height: `${Math.floor(Math.random() * 20) + 5}px` }}
            />
          ))}
        </div>

        <p className="text-white text-center text-sm max-w-xs">
          Enciende el dispositivo manteniendo presionado el botón de on/off
        </p>
      </div>
    </main>
  ) : (
    // Mantener el resto del código para el estado "connected" sin cambios
    <main
      className={`flex min-h-screen flex-col items-center justify-center transition-opacity duration-500 ${
        showAnimation ? "opacity-100" : "opacity-0"
      }`}
      style={{
        background: "linear-gradient(to bottom, #6a3de8, #3b82f6, #06b6d4)",
      }}
    >
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6">
          <Check className="h-16 w-16 text-[#3b82f6]" />
        </div>

        <h2 className="text-white text-xl font-medium mb-4">Conectado</h2>

        {pairingComplete && (
          <div className="flex flex-col items-center animate-fadeIn">
            <div className="w-full max-w-xs bg-white/20 backdrop-blur-sm rounded-lg p-4 mt-6">
              <p className="text-white text-center text-sm">
                Tus gafas Mirai están listas para usar. Redirigiendo al panel principal...
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
