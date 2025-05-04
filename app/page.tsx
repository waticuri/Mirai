"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { HelpCircle, Mic, MicOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const [isLoaded, setIsLoaded] = useState(false)
  const { startListening, stopListening, transcript, resetTranscript, listening } = useSpeechRecognition()
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    setIsLoaded(true)

    // Reproducir mensaje de bienvenida después de un breve retraso
    const timer = setTimeout(() => {
      speak("Bienvenido a mirAI. Para iniciar sesión, pulsa el botón central o di 'iniciar sesión'.", () => {
        // Solo iniciar el reconocimiento de voz una vez después de la bienvenida
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true
          console.log("Initializing speech recognition on login page")
          // Pequeño retraso para asegurar que el sintetizador de voz ha terminado
          setTimeout(() => {
            startListening()
          }, 500)
        }
      })
    }, 1000)

    return () => {
      clearTimeout(timer)
      console.log("Cleaning up login page")
      stopListening()
    }
  }, [speak, startListening, stopListening])

  // Añadir un nuevo useEffect para manejar los comandos
  useEffect(() => {
    if (!transcript) return

    const command = transcript.toLowerCase()
    console.log("Command received:", command)

    if (command.includes("iniciar") || command.includes("sesión") || command.includes("entrar")) {
      handleLogin()
    } else if (command.includes("registrar") || command.includes("crear cuenta") || command.includes("nuevo usuario")) {
      handleRegister()
    } else if (command.includes("ayuda") || command.includes("asistencia")) {
      speak("Para iniciar sesión, di 'iniciar sesión'. Para registrarte, di 'registrarme'.")
    }

    resetTranscript()
  }, [transcript, resetTranscript, speak])

  const handleLogin = () => {
    stopListening() // Detener el reconocimiento antes de navegar
    speak("Iniciando reconocimiento facial. Por favor, mira a la cámara.")
    // Redirigir a la página de cámara para reconocimiento facial
    setTimeout(() => {
      router.push("/camera")
    }, 1500)
  }

  const handleRegister = () => {
    stopListening() // Detener el reconocimiento antes de navegar
    speak("Abriendo pantalla de registro")
    // Redirección a la página de registro
    router.push("/register")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center relative overflow-hidden">
      {/* Fondo con degradado */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#6a3de8] via-[#3b82f6] to-[#06b6d4] z-0" />

      {/* Contenido centrado con animación de fade-in */}
      <div
        className={`flex flex-col items-center justify-center z-10 transition-opacity duration-1000 ease-in-out ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Logo */}
        <div className="mb-12 flex flex-col items-center">
          <div className="relative w-48 h-48">
            <Image src="/images/mirai-logo.png" alt="MirAI Logo" fill className="object-contain" priority />
          </div>
          <p className="text-white text-xl mt-2 font-bold font-montserrat">MirAI</p>
        </div>

        <Button
          onClick={handleLogin}
          className="bg-white text-gray-700 hover:bg-gray-100 rounded-full px-10 py-6 text-lg font-medium mb-4 w-64"
        >
          Iniciar sesión
        </Button>

        {/* Enlace para registrarse */}
        <button onClick={handleRegister} className="text-white hover:underline text-sm mt-2">
          Registrarse
        </button>

        {/* Indicador de estado del micrófono */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {listening ? (
            <div className="animate-pulse flex items-center">
              <Mic className="h-5 w-5 text-white" />
              <span className="text-white text-xs ml-1">Escuchando</span>
            </div>
          ) : (
            <div className="flex items-center opacity-50">
              <MicOff className="h-5 w-5 text-white" />
              <span className="text-white text-xs ml-1">Inactivo</span>
            </div>
          )}
        </div>

        {/* Botón de ayuda */}
        <button
          onClick={() => {
            speak("Para iniciar sesión, di 'iniciar sesión'. Para registrarte, di 'registrarme'.")
          }}
          className="absolute bottom-4 right-4 bg-white/20 p-2 rounded-full"
          aria-label="Ayuda con comandos de voz"
        >
          <HelpCircle className="h-6 w-6 text-white" />
        </button>
      </div>
    </main>
  )
}
