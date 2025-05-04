"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { Check, HelpCircle } from "lucide-react"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"

export default function ConnectDevicePage() {
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const [isSearching, setIsSearching] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [waveAnimation, setWaveAnimation] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const { startListening, stopListening, transcript, resetTranscript } = useSpeechRecognition()

  // Animate sound waves
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveAnimation((prev) => (prev + 1) % 3)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Initialize page and simulate device search
  useEffect(() => {
    setIsLoaded(true)

    // Play search message after a short delay
    const timer1 = setTimeout(() => {
      speak(
        "Buscando dispositivo Mirai. Por favor, enciende el dispositivo manteniendo presionado el botón de encendido.",
      )
    }, 1000)

    // Simulate finding the device after 5 seconds
    const timer2 = setTimeout(() => {
      setIsSearching(false)
      setIsConnected(true)
      speak("Dispositivo Mirai conectado correctamente.")

      // Redirect to dashboard after showing confirmation
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

  // Añadir después de los otros useEffect
  useEffect(() => {
    // Iniciar reconocimiento después de un breve retraso
    const timer = setTimeout(() => {
      startListening()
    }, 3000)

    // Manejar comandos
    if (transcript) {
      const command = transcript.toLowerCase()

      if (command.includes("volver") || command.includes("atrás") || command.includes("cancelar")) {
        speak("Cancelando conexión de dispositivo. Volviendo a la pantalla de inicio.")
        router.push("/")
      } else if (command.includes("ayuda") || command.includes("asistencia")) {
        speak(
          "Estás en la pantalla de conexión de dispositivo. Por favor, enciende tus gafas Mirai manteniendo presionado el botón de encendido. El sistema detectará automáticamente el dispositivo.",
        )
      } else if (command.includes("saltar") || command.includes("omitir") || command.includes("continuar")) {
        speak("Omitiendo conexión de dispositivo. Redirigiendo al panel principal.")
        router.push("/dashboard")
      }

      resetTranscript()
    }

    // Limpiar al desmontar
    return () => {
      clearTimeout(timer)
      stopListening()
    }
  }, [transcript, resetTranscript, speak, router, startListening, stopListening])

  // Render sound waves
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
        className={`flex flex-col items-center justify-center transition-opacity duration-1000 ease-in-out ${isLoaded ? "opacity-100" : "opacity-0"}`}
      >
        {isSearching ? (
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
          <>
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6">
              <Check className="h-16 w-16 text-[#3B82F6] stroke-[3]" />
            </div>
            <h2 className="text-white text-xl font-medium">Conectado</h2>
          </>
        )}
      </div>
      <button
        onClick={() => {
          speak(
            "Estás en la pantalla de conexión de dispositivo. Por favor, enciende tus gafas Mirai manteniendo presionado el botón de encendido. El sistema detectará automáticamente el dispositivo. Si deseas omitir este paso, di 'saltar'.",
          )
        }}
        className="fixed bottom-4 right-4 bg-white/20 p-2 rounded-full"
        aria-label="Ayuda con comandos de voz"
      >
        <HelpCircle className="h-6 w-6 text-white" />
      </button>
    </main>
  )
}
