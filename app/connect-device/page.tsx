"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { Check } from "lucide-react"

export default function ConnectDevicePage() {
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const [isSearching, setIsSearching] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [waveAnimation, setWaveAnimation] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  // Animar las ondas de sonido
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveAnimation((prev) => (prev + 1) % 3)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Inicializar página y simular búsqueda de dispositivo
  useEffect(() => {
    setIsLoaded(true)

    // Reproducir mensaje de búsqueda después de un breve retraso
    const timer1 = setTimeout(() => {
      speak(
        "Buscando dispositivo Mirai. Por favor, enciende el dispositivo manteniendo presionado el botón de encendido.",
      )
    }, 1000)

    // Simular que se encontró el dispositivo después de 5 segundos
    const timer2 = setTimeout(() => {
      setIsSearching(false)
      setIsConnected(true)
      speak("Dispositivo Mirai conectado correctamente.")

      // Redirigir al dashboard después de mostrar la confirmación
      const timer3 = setTimeout(() => {
        router.push("/dashboard")
      }, 2000)

      return () => clearTimeout(timer3)
    }, 5000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [speak, router])

  // Renderizar ondas de sonido
  const renderSoundWaves = () => {
    const waves = [
      "M10,50 Q15,40 20,50 Q25,60 30,50 Q35,40 40,50 Q45,60 50,50 Q55,40 60,50 Q65,60 70,50 Q75,40 80,50 Q85,60 90,50",
      "M10,50 Q15,30 20,50 Q25,70 30,50 Q35,30 40,50 Q45,70 50,50 Q55,30 60,50 Q65,70 70,50 Q75,30 80,50 Q85,70 90,50",
      "M10,50 Q15,45 20,50 Q25,55 30,50 Q35,45 40,50 Q45,55 50,50 Q55,45 60,50 Q65,55 70,50 Q75,45 80,50 Q85,55 90,50",
    ]

    return (
      <svg className="w-48 h-12" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={waves[waveAnimation]} stroke="white" strokeWidth="2" fill="none" />
      </svg>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#6a3de8] via-[#3b82f6] to-[#06b6d4] p-4">
      <div
        className={`flex flex-col items-center justify-center transition-opacity duration-1000 ease-in-out ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        {isSearching ? (
          // Pantalla de búsqueda
          <>
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6">
              <div className="w-20 h-12 relative">
                <Image src="/images/mirai-glasses-icon.png" alt="Mirai Glasses" fill className="object-contain" />
              </div>
            </div>
            <h2 className="text-white text-xl font-medium mb-4">Buscando dispositivo Mirai</h2>
            {renderSoundWaves()}
            <p className="text-white text-sm mt-6 text-center max-w-xs">
              Enciende el dispositivo manteniendo presionado el botón de on/off
            </p>
          </>
        ) : (
          // Pantalla de conexión exitosa
          <>
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6">
              <Check className="h-16 w-16 text-[#3B82F6] stroke-[3]" />
            </div>
            <h2 className="text-white text-xl font-medium">Conectado</h2>
          </>
        )}
      </div>
    </main>
  )
}
