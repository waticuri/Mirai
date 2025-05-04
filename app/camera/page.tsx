"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { UserDatabase } from "@/lib/db"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { HelpCircle, Mic, MicOff } from "lucide-react"

export default function VoiceRecognitionPage() {
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [voicePassphrase, setVoicePassphrase] = useState("")
  const [recognitionStep, setRecognitionStep] = useState(0)
  const [waveAnimation, setWaveAnimation] = useState(0)
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const { startListening, stopListening, transcript, resetTranscript, listening } = useSpeechRecognition()

  // Animar las ondas de sonido
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveAnimation((prev) => (prev + 1) % 3)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Inicializar reconocimiento de voz
  useEffect(() => {
    speak("Bienvenido")

    // Mostrar pantalla de bienvenida por 2 segundos
    setTimeout(() => {
      setShowWelcome(false)
      setIsRecognizing(true)
      speak("Por favor, di tu frase de acceso para iniciar sesión mediante reconocimiento de voz.")
      startListening()
    }, 2000)

    return () => {
      stopListening()
    }
  }, [speak, router, startListening, stopListening])

  // Manejar el reconocimiento de voz
  useEffect(() => {
    if (!transcript || !isRecognizing) return

    console.log("Frase recibida:", transcript)
    setVoicePassphrase(transcript)

    // Simular proceso de reconocimiento de voz
    setRecognitionStep(1) // Comenzar análisis

    setTimeout(() => {
      setRecognitionStep(2) // Análisis en proceso

      setTimeout(() => {
        // Simular el reconocimiento de voz
        const recognizedUser = UserDatabase.simulateVoiceRecognition(transcript)

        if (recognizedUser) {
          setRecognitionStep(3) // Reconocimiento exitoso
          speak(`Reconocimiento de voz completado. Bienvenido, ${recognizedUser.name}.`)

          // Check if this is the first login
          const isFirstLogin = !recognizedUser.hasConnectedDevice

          // Update user to mark device as connected for future logins
          if (isFirstLogin && recognizedUser.id) {
            UserDatabase.updateUser(recognizedUser.id, { hasConnectedDevice: true })
          }

          // Redirect to device connection page for first login, otherwise to dashboard
          setTimeout(() => {
            if (isFirstLogin) {
              router.push("/connect-device")
            } else {
              router.push("/dashboard")
            }
          }, 1500)
        } else {
          // Si no hay usuarios registrados o no se reconoce la voz
          setRecognitionStep(4) // Reconocimiento fallido
          speak("No se pudo reconocer tu voz. Por favor, regístrate primero o intenta de nuevo.")
          setTimeout(() => {
            router.push("/register")
          }, 1500)
        }
      }, 2000)
    }, 1000)

    resetTranscript()
  }, [transcript, speak, resetTranscript, router, isRecognizing])

  // Añadir manejo de comandos adicionales
  useEffect(() => {
    if (!transcript || recognitionStep > 0) return

    const command = transcript.toLowerCase()

    if (command.includes("volver") || command.includes("atrás") || command.includes("cancelar")) {
      speak("Cancelando reconocimiento de voz. Volviendo a la pantalla de inicio.")
      router.push("/")
    } else if (command.includes("ayuda") || command.includes("asistencia")) {
      speak(
        "Estás en la pantalla de reconocimiento de voz. Por favor, di tu frase de acceso para que el sistema pueda identificarte. Si deseas cancelar, di 'cancelar'.",
      )
    } else if (command.includes("registrar") || command.includes("crear cuenta")) {
      speak("Redirigiendo a la pantalla de registro.")
      router.push("/register")
    }

    resetTranscript()
  }, [transcript, resetTranscript, speak, router, recognitionStep])

  // Renderizar ondas de sonido
  const renderSoundWaves = () => {
    const waves = [
      "M10,50 Q15,40 20,50 Q25,60 30,50 Q35,40 40,50 Q45,60 50,50 Q55,40 60,50 Q65,60 70,50 Q75,40 80,50 Q85,60 90,50",
      "M10,50 Q15,30 20,50 Q25,70 30,50 Q35,30 40,50 Q45,70 50,50 Q55,30 60,50 Q65,70 70,50 Q75,30 80,50 Q85,70 90,50",
      "M10,50 Q15,45 20,50 Q25,55 30,50 Q35,45 40,50 Q45,55 50,50 Q55,45 60,50 Q65,55 70,50 Q75,45 80,50 Q85,55 90,50",
    ]

    return (
      <svg className="w-32 h-12" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={waves[waveAnimation]} stroke="white" strokeWidth="2" fill="none" />
      </svg>
    )
  }

  // Renderizar el estado del reconocimiento
  const renderRecognitionStatus = () => {
    switch (recognitionStep) {
      case 0:
        return "Di tu frase de acceso"
      case 1:
        return "Analizando voz..."
      case 2:
        return "Verificando identidad..."
      case 3:
        return "¡Reconocimiento exitoso!"
      case 4:
        return "No se pudo reconocer tu voz"
      default:
        return "Di tu frase de acceso"
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#6a3de8] via-[#3b82f6] to-[#06b6d4] p-4">
      {showWelcome ? (
        // Pantalla de bienvenida
        <div className="flex flex-col items-center justify-center h-full">
          {renderSoundWaves()}
          <p className="text-white text-xl mt-4">Bienvenido</p>
        </div>
      ) : (
        // Pantalla de reconocimiento de voz
        <div className="flex flex-col items-center justify-center w-full max-w-xs">
          <div className="relative w-64 h-64 rounded-full overflow-hidden bg-white/10 mb-8 flex flex-col items-center justify-center">
            {listening ? (
              <div className="animate-pulse">
                <Mic className="h-16 w-16 text-white mb-4" />
              </div>
            ) : (
              <MicOff className="h-16 w-16 text-white/50 mb-4" />
            )}

            {renderSoundWaves()}

            {voicePassphrase && (
              <div className="mt-4 text-white text-center px-4">
                <p className="text-sm opacity-80">"{voicePassphrase}"</p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center">
            <p className="text-white text-center text-xl font-medium mb-2">{renderRecognitionStatus()}</p>
            <p className="text-white/80 text-center text-sm">{recognitionStep === 0 && "Tu voz es tu contraseña"}</p>
          </div>
        </div>
      )}
      <button
        onClick={() => {
          speak(
            "Estás en la pantalla de reconocimiento de voz. Por favor, di tu frase de acceso para que el sistema pueda identificarte. Si deseas cancelar, di 'cancelar'.",
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
