"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
// Importar el nuevo icono
import { Settings, Users, LogOut, ChevronRight, Mic, MicOff } from "lucide-react"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { UserDatabase, type User } from "@/lib/db"

export default function Dashboard() {
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const { startListening, stopListening, transcript, resetTranscript, listening, error } = useSpeechRecognition()
  const [isLoaded, setIsLoaded] = useState(false)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [userName, setUserName] = useState("Usuario")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [microphoneActive, setMicrophoneActive] = useState(true)

  // Verificar si hay un usuario actual
  useEffect(() => {
    const user = UserDatabase.getCurrentUser()
    if (!user) {
      speak("No hay sesión activa. Redirigiendo a la pantalla de inicio de sesión.")
      setTimeout(() => {
        router.push("/")
      }, 1500)
      return
    }

    setUserName(user.name.split(" ")[0]) // Usar solo el primer nombre
    setCurrentUser(user) // Guardar el usuario completo
  }, [router, speak])

  // Manejar comandos de voz
  useEffect(() => {
    if (!transcript) return

    const command = transcript.toLowerCase()

    if (command.includes("tutorial") || command.includes("funcionalidades")) {
      router.push("/tutorial")
      speak("Abriendo tutorial de funcionalidades")
    } else if (command.includes("parental") || command.includes("cercanía")) {
      router.push("/parental")
      speak("Configurando cercanía parental")
    } else if (command.includes("cerrar sesión") || command.includes("salir")) {
      handleLogout()
    } else if (command.includes("sincronizar")) {
      speak("Sincronizando dispositivo")
      // Aquí iría la lógica para sincronizar
    } else if (command.includes("micrófono apagado") || command.includes("desactivar micrófono")) {
      handleToggleMicrophone(false)
    } else if (command.includes("micrófono encendido") || command.includes("activar micrófono")) {
      handleToggleMicrophone(true)
    }

    resetTranscript()
  }, [transcript, router, speak, resetTranscript])

  // Inicializar dashboard
  useEffect(() => {
    setIsLoaded(true)

    const timer = setTimeout(() => {
      speak(
        `Bienvenido al panel de control, ${userName}. Tus gafas Mirai están conectadas y con 98% de batería.`,
        () => {
          // Iniciar reconocimiento de voz solo después de que termine de hablar
          if (microphoneActive) {
            startListening()
          }
        },
      )
    }, 1000)

    return () => {
      if (timer) clearTimeout(timer)
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
      stopListening()
    }
  }, [speak, startListening, stopListening, userName, microphoneActive])

  // Monitor speech recognition errors
  useEffect(() => {
    if (error) {
      console.log("Speech recognition error detected:", error)

      // If we're supposed to be listening but got an error, try to restart
      if (microphoneActive && !listening) {
        console.log("Attempting to restart speech recognition after error")
        const restartTimer = setTimeout(() => {
          startListening()
        }, 2000)

        return () => clearTimeout(restartTimer)
      }
    }
  }, [error, listening, startListening, microphoneActive])

  // Manejar cierre de sesión
  const handleLogout = () => {
    speak("Cerrando sesión")
    UserDatabase.logout()
    setTimeout(() => {
      router.push("/")
    }, 1500)
  }

  // Toggle microphone on/off
  const handleToggleMicrophone = (active: boolean) => {
    setMicrophoneActive(active)
    if (active) {
      speak("Micrófono activado")
      startListening()
    } else {
      speak("Micrófono desactivado")
      stopListening()
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-white">
      {/* Header con gradiente */}
      <header className="bg-gradient-to-r from-[#6a3de8] to-[#06b6d4] p-4 flex justify-between items-center">
        <div className="w-8"></div> {/* Spacer para centrar el logo */}
        <Image src="/images/mirai-logo.png" alt="MirAI Logo" width={40} height={40} className="object-contain" />
        <div className="flex items-center">
          <span className="text-white mr-2">{userName}</span>
          <div
            className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden border-2 border-white cursor-pointer"
            onClick={() => {
              speak("Abriendo edición de perfil")
              router.push("/profile/edit")
            }}
            role="button"
            aria-label="Editar perfil"
          >
            {currentUser?.photoUrl ? (
              <Image
                src={currentUser.photoUrl || "/placeholder.svg"}
                alt={`Foto de ${userName}`}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-green-500"></div>
            )}
          </div>
        </div>
      </header>

      {/* Microphone status indicator */}
      <div className="fixed top-16 right-4 z-10">
        <button
          onClick={() => handleToggleMicrophone(!microphoneActive)}
          className={`p-2 rounded-full ${microphoneActive ? "bg-green-100" : "bg-gray-100"}`}
          aria-label={microphoneActive ? "Desactivar micrófono" : "Activar micrófono"}
        >
          {microphoneActive ? (
            <Mic className={`h-5 w-5 ${listening ? "text-green-500 animate-pulse" : "text-gray-500"}`} />
          ) : (
            <MicOff className="h-5 w-5 text-gray-500" />
          )}
        </button>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        {/* Tarjeta de dispositivo */}
        <div className="bg-gray-100 rounded-xl p-4 flex items-center mb-8 shadow-sm">
          <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden mr-4 flex items-center justify-center">
            <Image
              src="/images/mirai-glasses.jpeg"
              alt="Mirai Vision Glasses"
              width={80}
              height={80}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-xl">Mirai vision</h2>
            <p className="text-sm text-gray-600">Conectado | 98% Batería</p>
            <button
              className="mt-2 bg-gradient-to-r from-[#6a3de8] to-[#06b6d4] text-white px-4 py-1 rounded-full text-sm"
              onClick={() => speak("Sincronizando dispositivo")}
            >
              Sincronizar
            </button>
          </div>
        </div>

        {/* Botones de menú */}
        <div className="space-y-4">
          <button
            onClick={() => {
              router.push("/tutorial")
              speak("Abriendo tutorial de funcionalidades")
            }}
            className="w-full bg-gradient-to-r from-[#6a3de8] to-[#06b6d4] text-white p-4 rounded-full flex items-center justify-between"
          >
            <div className="flex items-center">
              <Settings className="mr-3 h-5 w-5" />
              <span>Tutorial de funcionalidades</span>
            </div>
            <ChevronRight className="h-5 w-5" />
          </button>

          <button
            onClick={() => {
              router.push("/parental")
              speak("Configurando cercanía parental")
            }}
            className="w-full bg-gradient-to-r from-[#6a3de8] to-[#06b6d4] text-white p-4 rounded-full flex items-center justify-between"
          >
            <div className="flex items-center">
              <Users className="mr-3 h-5 w-5" />
              <span>Cercanía parental</span>
            </div>
            <ChevronRight className="h-5 w-5" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full bg-gradient-to-r from-[#6a3de8] to-[#06b6d4] text-white p-4 rounded-full flex items-center justify-between"
          >
            <div className="flex items-center">
              <LogOut className="mr-3 h-5 w-5" />
              <span>Cerrar sesión</span>
            </div>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </main>
  )
}
