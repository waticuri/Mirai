"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"

export default function RegisterPage() {
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
    // Reproducir mensaje de bienvenida después de un breve retraso
    const timer = setTimeout(() => {
      speak("Pantalla de registro. Por favor, completa tus datos o pide asistencia por voz.")
    }, 1000)

    return () => clearTimeout(timer)
  }, [speak])

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    speak("Registro completado. Redirigiendo a la pantalla de inicio de sesión.")
    setTimeout(() => {
      router.push("/")
    }, 2000)
  }

  const handleBack = () => {
    speak("Volviendo a la pantalla de inicio de sesión.")
    router.push("/")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center relative overflow-hidden">
      {/* Fondo con degradado */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#6a3de8] via-[#3b82f6] to-[#06b6d4] z-0" />

      {/* Contenido centrado con animación de fade-in */}
      <div
        className={`flex flex-col items-center justify-center z-10 transition-opacity duration-1000 ease-in-out w-full max-w-md px-4 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        <h1 className="text-3xl font-bold mb-8 text-white">Registrarse</h1>

        <form
          onSubmit={handleRegister}
          className="w-full space-y-6 bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20"
        >
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">
              Nombre completo
            </Label>
            <Input
              id="name"
              placeholder="Ingresa tu nombre"
              className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Correo electrónico
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              required
            />
          </div>

          <Button type="submit" className="w-full bg-white text-gray-700 hover:bg-gray-100">
            Completar registro
          </Button>
        </form>

        <button onClick={handleBack} className="text-white hover:underline text-sm mt-6">
          Volver a inicio de sesión
        </button>
      </div>
    </main>
  )
}
