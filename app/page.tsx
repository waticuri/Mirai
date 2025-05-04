"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"

export default function LoginPage() {
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
    // Reproducir mensaje de bienvenida después de un breve retraso
    const timer = setTimeout(() => {
      speak("Bienvenido a mirAI. Para iniciar sesión, pulsa el botón central o di 'iniciar sesión'.")
    }, 1000)

    return () => clearTimeout(timer)
  }, [speak])

  const handleLogin = () => {
    speak("Iniciando reconocimiento facial")
    // Redirigir a la página de cámara para reconocimiento facial
    setTimeout(() => {
      router.push("/camera")
    }, 1500)
  }

  const handleRegister = () => {
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
      </div>
    </main>
  )
}
