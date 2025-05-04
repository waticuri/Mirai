"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, Eye, Mic, Bell, MapPin, Battery, Wifi, HelpCircle } from "lucide-react"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"

export default function TutorialPage() {
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const { startListening, stopListening, transcript, resetTranscript, listening } = useSpeechRecognition()
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeFeature, setActiveFeature] = useState<number | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Lista de funcionalidades con ejemplos de comandos
  const features = [
    {
      id: 1,
      title: "Reconocimiento visual",
      description: "Las gafas pueden identificar objetos, personas y texto en tu entorno.",
      command: "Mirai, identifica esto",
      icon: Eye,
    },
    {
      id: 2,
      title: "Comandos de voz",
      description: "Controla las gafas con tu voz diciendo 'Mirai' seguido de un comando.",
      command: "Mirai, ¿qué puedo decir?",
      icon: Mic,
    },
    {
      id: 3,
      title: "Notificaciones",
      description: "Recibe alertas discretas directamente en tu campo de visión.",
      command: "Mirai, muestra mis notificaciones",
      icon: Bell,
    },
    {
      id: 4,
      title: "Navegación",
      description: "Indicaciones de ruta superpuestas en tu visión del mundo real.",
      command: "Mirai, llévame a casa",
      icon: MapPin,
    },
    {
      id: 5,
      title: "Gestión de batería",
      description: "Modo de ahorro de energía y alertas de batería baja.",
      command: "Mirai, activa modo ahorro de batería",
      icon: Battery,
    },
    {
      id: 6,
      title: "Conectividad",
      description: "Conexión automática a redes WiFi conocidas y tu smartphone.",
      command: "Mirai, conecta a mi teléfono",
      icon: Wifi,
    },
  ]

  // Manejar comandos de voz
  useEffect(() => {
    if (!transcript) return

    const command = transcript.toLowerCase()

    if (command.includes("volver") || command.includes("atrás") || command.includes("dashboard")) {
      handleBack()
    } else if (command.includes("ayuda") || command.includes("asistencia")) {
      speak(
        "Para navegar por el tutorial, puedes decir el nombre de la función sobre la que quieres saber más, decir 'siguiente' para pasar a la siguiente función, o decir 'volver' para regresar al panel principal.",
      )
    } else if (command.includes("siguiente")) {
      handleNextFeature()
    }

    // Buscar si el comando menciona alguna funcionalidad
    features.forEach((feature) => {
      if (command.includes(feature.title.toLowerCase())) {
        handleFeatureClick(feature.id)
      }
    })

    // Verificar si el usuario está probando alguno de los comandos de ejemplo
    features.forEach((feature) => {
      const exampleCommand = feature.command.toLowerCase().replace("mirai, ", "")
      if (command.includes(exampleCommand)) {
        handleFeatureClick(feature.id)
        speak(`Has usado el comando de ejemplo para ${feature.title}. En las gafas reales, esto activaría la función.`)
      }
    })

    resetTranscript()
  }, [transcript, speak, resetTranscript])

  // Inicializar página
  useEffect(() => {
    setIsLoaded(true)

    const timer = setTimeout(() => {
      speak(
        "Tutorial de funcionalidades. Aquí puedes aprender a usar todas las características de tus gafas Mirai. Las funciones disponibles son: Reconocimiento visual, Comandos de voz, Notificaciones, Navegación, Gestión de batería y Conectividad. Selecciona una función, di su nombre o di 'siguiente' para navegar entre ellas.",
        () => {
          // Iniciar reconocimiento de voz solo después de que termine de hablar
          startListening()

          // Set up a less frequent check to ensure speech recognition is working
          checkIntervalRef.current = setInterval(() => {
            if (!listening) {
              console.log("Speech recognition not active, attempting to restart...")
              startListening()
            }
          }, 10000) // Check every 10 seconds
        },
      )
    }, 1000)

    return () => {
      if (timer) clearTimeout(timer)
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
      stopListening()
    }
  }, [speak, startListening, stopListening])

  const handleBack = () => {
    speak("Volviendo al panel principal")
    router.push("/dashboard")
  }

  const handleFeatureClick = (id: number) => {
    setActiveFeature(id)
    const feature = features.find((f) => f.id === id)
    if (feature) {
      // Detener reconocimiento mientras habla
      stopListening()
      // Hablar tanto la descripción como el comando de ejemplo
      speak(`${feature.title}. ${feature.description} Ejemplo de comando: ${feature.command}`, () => {
        // Reanudar reconocimiento después de hablar
        startListening()
      })
    }
  }

  const handleNextFeature = () => {
    // Si no hay función activa, seleccionar la primera
    if (activeFeature === null) {
      handleFeatureClick(1)
      return
    }

    // Encontrar el índice de la función actual
    const currentIndex = features.findIndex((f) => f.id === activeFeature)

    // Calcular el ID de la siguiente función (con ciclo al principio si es la última)
    const nextIndex = (currentIndex + 1) % features.length
    const nextFeatureId = features[nextIndex].id

    // Activar la siguiente función
    handleFeatureClick(nextFeatureId)
  }

  return (
    <main className="flex min-h-screen flex-col bg-white">
      {/* Header con gradiente */}
      <header className="bg-gradient-to-r from-[#6a3de8] to-[#06b6d4] p-4 flex items-center">
        <button onClick={handleBack} className="text-white flex items-center" aria-label="Volver al panel principal">
          <ChevronLeft className="h-6 w-6" />
          <span className="ml-2">Volver</span>
        </button>
        <h1 className="text-white text-lg font-medium flex-1 text-center mr-8">Tutorial de funcionalidades</h1>
      </header>

      {/* Contenido principal */}
      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <Image
              src="/images/mirai-glasses.jpeg"
              alt="Mirai Vision Glasses"
              width={60}
              height={60}
              className="rounded-lg mr-3"
            />
            <div>
              <h2 className="font-bold text-lg">Mirai vision</h2>
              <p className="text-sm text-gray-600">Aprende a usar todas las funciones</p>
            </div>
          </div>

          <p className="text-gray-700 text-sm bg-blue-50 p-3 rounded-lg border border-blue-100">
            Selecciona una función para ver más detalles o usa comandos de voz diciendo el nombre de la función. También
            puedes probar los comandos de ejemplo.
          </p>
        </div>

        {/* Lista de funcionalidades */}
        <div className="space-y-3">
          {features.map((feature) => (
            <div
              key={feature.id}
              onClick={() => handleFeatureClick(feature.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                activeFeature === feature.id
                  ? "border-[#6a3de8] bg-[#6a3de8]/5"
                  : "border-gray-200 hover:border-[#6a3de8]/50"
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`p-2 rounded-full mr-3 ${
                    activeFeature === feature.id ? "bg-[#6a3de8] text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-medium">{feature.title}</h3>
              </div>

              {activeFeature === feature.id && (
                <div className="mt-2 pl-10 space-y-2">
                  <p className="text-sm text-gray-600">{feature.description}</p>
                  <div className="bg-[#6a3de8]/10 p-2 rounded-md">
                    <p className="text-sm font-medium text-[#6a3de8]">
                      Ejemplo de comando: <span className="font-bold">"{feature.command}"</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Botón de ayuda */}
        <button
          onClick={() => {
            stopListening()
            speak(
              "Para navegar por el tutorial, puedes decir el nombre de la función sobre la que quieres saber más, decir 'siguiente' para pasar a la siguiente función, o decir 'volver' para regresar al panel principal. También puedes probar los comandos de ejemplo diciendo exactamente lo que ves en cada función.",
              () => startListening(),
            )
          }}
          className="mt-6 flex items-center justify-center w-full py-3 text-[#6a3de8] font-medium"
        >
          <HelpCircle className="h-5 w-5 mr-2" />
          <span>Necesito ayuda con los comandos de voz</span>
        </button>
      </div>
    </main>
  )
}
