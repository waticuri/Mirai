"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { HelpCircle, Mic, MicOff } from "lucide-react"
import { UserDatabase } from "@/lib/db"

export default function RegisterPage() {
  const router = useRouter()
  const { speak, speaking } = useSpeechSynthesis()
  const { startListening, stopListening, transcript, resetTranscript, listening } = useSpeechRecognition()
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [helpMode, setHelpMode] = useState(false)
  const hasInitializedRef = useRef(false)

  // Campos del formulario
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [voicePassphrase, setVoicePassphrase] = useState("")
  const [currentFocus, setCurrentFocus] = useState<string | null>(null)
  const [isRecordingPassphrase, setIsRecordingPassphrase] = useState(false)

  // Inicializar la página y activar el micrófono
  useEffect(() => {
    setIsLoaded(true)

    // Reproducir mensaje de bienvenida después de un breve retraso
    const timer = setTimeout(() => {
      console.log("Iniciando mensaje de bienvenida")
      speak(
        "Pantalla de registro. Para registrarte, necesitarás proporcionar tu nombre, correo electrónico y una frase de voz para el reconocimiento. Puedes navegar por voz diciendo 'nombre', 'correo', 'frase de voz', 'ayuda', 'registrar' o 'volver'. Para activar la ayuda detallada, di 'modo ayuda'.",
        () => {
          console.log("Mensaje de bienvenida completado, iniciando reconocimiento de voz")
          // Asegurarse de que el reconocimiento de voz se inicie después de hablar
          startListening()
          hasInitializedRef.current = true
        },
      )
    }, 1000)

    // Verificar si el reconocimiento de voz se ha iniciado
    const checkMicrophoneTimer = setTimeout(() => {
      if (!listening && hasInitializedRef.current) {
        console.log("El micrófono no se activó automáticamente, intentando de nuevo")
        startListening()
      }
    }, 5000)

    return () => {
      clearTimeout(timer)
      clearTimeout(checkMicrophoneTimer)
      stopListening()
    }
  }, [speak, startListening, stopListening, listening])

  // Manejar comandos de voz
  useEffect(() => {
    if (!transcript) return

    const command = transcript.toLowerCase()
    console.log("Comando recibido:", command)

    // Si estamos grabando la frase de voz, guardarla
    if (isRecordingPassphrase) {
      setVoicePassphrase(transcript)
      setIsRecordingPassphrase(false)
      speak(
        "Frase de voz grabada correctamente. Esta frase se utilizará para el reconocimiento de voz en futuros inicios de sesión.",
      )
      resetTranscript()
      return
    }

    // Comandos de navegación
    if (command.includes("volver") || command.includes("atrás") || command.includes("cancelar")) {
      handleBack()
    } else if (
      command.includes("registrar") ||
      command.includes("completar") ||
      command.includes("guardar") ||
      command.includes("finalizar")
    ) {
      handleRegister({ preventDefault: () => {} } as React.FormEvent)
    } else if (command.includes("modo ayuda")) {
      toggleHelpMode()
    } else if (command.includes("ayuda") || command.includes("asistencia") || command.includes("comandos")) {
      provideHelp()
    } else if (command.includes("limpiar") || command.includes("borrar") || command.includes("reiniciar")) {
      // Limpiar el formulario
      setName("")
      setEmail("")
      setVoicePassphrase("")
      speak("Formulario reiniciado. Puedes comenzar de nuevo.")
    } else if (command.includes("repetir instrucciones") || command.includes("qué debo hacer")) {
      speak(
        "Para registrarte, necesitas proporcionar tu nombre, correo electrónico y una frase de voz para el reconocimiento. Di 'nombre' para ingresar tu nombre, 'correo' para tu email, y 'frase de voz' para grabar tu frase. Cuando hayas completado todos los campos, di 'registrar'.",
      )
    }

    // Comandos para campos de formulario
    else if (command.includes("nombre")) {
      focusField("name")
    } else if (command.includes("correo") || command.includes("email")) {
      focusField("email")
    } else if (command.includes("frase") || command.includes("voz") || command.includes("grabar")) {
      handleVoiceRecording()
    }

    // Comandos para dictado de texto
    else if (currentFocus === "name" && !command.includes("nombre")) {
      setName(command.trim())
      speak(`Nombre establecido como: ${command.trim()}. Di 'correo' para continuar con el siguiente campo.`)
    } else if (currentFocus === "email" && !command.includes("correo") && !command.includes("email")) {
      // Intentar formatear el correo electrónico dictado
      const formattedEmail = formatDictatedEmail(command.trim())
      setEmail(formattedEmail)
      speak(
        `Correo electrónico establecido como: ${formatEmailForSpeech(formattedEmail)}. Di 'frase de voz' para continuar con la grabación de tu frase.`,
      )
    }

    resetTranscript()
  }, [transcript, speak, resetTranscript, currentFocus, isRecordingPassphrase])

  // Asegurarse de que el micrófono se active cuando la síntesis de voz termine
  useEffect(() => {
    if (!speaking && hasInitializedRef.current && !listening) {
      console.log("La síntesis de voz terminó, activando el micrófono")
      startListening()
    }
  }, [speaking, listening, startListening])

  // Función para formatear email dictado
  const formatDictatedEmail = (text: string): string => {
    // Reemplazar palabras comunes con símbolos de email
    let email = text
      .toLowerCase()
      .replace(/arroba/g, "@")
      .replace(/punto/g, ".")
      .replace(/guion/g, "-")
      .replace(/guion bajo/g, "_")
      .replace(/espacio/g, "")
      .replace(/ /g, "") // Eliminar espacios

    // Si no tiene @, intentar encontrar "at" o similares
    if (!email.includes("@")) {
      email = email.replace(/at/g, "@")
    }

    // Si no tiene punto, intentar encontrar "dot" o similares
    if (!email.includes(".")) {
      const dotIndex = email.lastIndexOf("dot")
      if (dotIndex !== -1) {
        email = email.substring(0, dotIndex) + "." + email.substring(dotIndex + 3)
      }
    }

    return email
  }

  // Función para leer el email de forma más clara
  const formatEmailForSpeech = (email: string): string => {
    return email
      .replace("@", " arroba ")
      .replace(/\./g, " punto ")
      .replace(/-/g, " guion ")
      .replace(/_/g, " guion bajo ")
  }

  const focusField = (field: string) => {
    setCurrentFocus(field)
    const fieldElement = document.getElementById(field)
    if (fieldElement) {
      fieldElement.focus()

      if (field === "name") {
        speak("Campo de nombre activado. Por favor, di tu nombre completo.")
      } else if (field === "email") {
        speak(
          "Campo de correo electrónico activado. Por favor, di tu correo electrónico, pronunciando 'arroba' y 'punto' donde corresponda.",
        )
      }
    }
  }

  const toggleHelpMode = () => {
    setHelpMode(!helpMode)
    if (!helpMode) {
      speak("Modo de ayuda activado. Ahora recibirás instrucciones detalladas para cada acción.")
    } else {
      speak("Modo de ayuda desactivado.")
    }
  }

  const provideHelp = () => {
    speak(
      "Comandos disponibles: Di 'nombre' para ingresar tu nombre. Di 'correo' para ingresar tu correo electrónico. " +
        "Di 'frase de voz' para grabar tu frase de reconocimiento. " +
        "Di 'registrar' o 'completar registro' para finalizar. Di 'volver' para regresar a la pantalla anterior. " +
        "Di 'modo ayuda' para activar o desactivar instrucciones detalladas.",
    )
  }

  const handleVoiceRecording = () => {
    speak(
      "A continuación, di una frase que utilizarás para iniciar sesión. Esta frase debe ser clara y fácil de recordar. Comienza a hablar después del pitido.",
      () => {
        // Pequeña pausa antes de comenzar a grabar
        setTimeout(() => {
          // Reproducir un pitido (simulado con un mensaje)
          speak("", () => {
            setIsRecordingPassphrase(true)
            resetTranscript() // Limpiar cualquier transcripción anterior
          })
        }, 500)
      },
    )
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validaciones
    if (!name) {
      speak("Por favor, proporciona tu nombre. Di 'nombre' para activar el campo.")
      setError("Se requiere un nombre")
      return
    }

    if (!email) {
      speak("Por favor, proporciona tu correo electrónico. Di 'correo' para activar el campo.")
      setError("Se requiere un correo electrónico")
      return
    }

    if (!voicePassphrase) {
      speak("Por favor, graba tu frase de voz para el reconocimiento. Di 'frase de voz' para comenzar la grabación.")
      setError("Se requiere una frase de voz para el reconocimiento")
      return
    }

    try {
      // Crear el usuario en la base de datos
      const newUser = UserDatabase.createUser({
        name,
        email,
        photoUrl: "", // Mantener para compatibilidad
        voicePassphrase, // Añadir la frase de voz
      })

      // Establecer como usuario actual
      UserDatabase.setCurrentUser(newUser.id)

      speak(
        "Registro completado correctamente. Tu frase de voz ha sido guardada para el reconocimiento. Redirigiendo a la pantalla de inicio de sesión.",
      )
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (err: any) {
      speak(`Error al registrar: ${err.message}`)
      setError(err.message)
    }
  }

  const handleBack = () => {
    speak("Volviendo a la pantalla de inicio de sesión.")
    stopListening()
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

        {/* Indicador de reconocimiento de voz */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {listening ? (
            <>
              <div className="animate-pulse">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <span className="text-white text-sm">Escuchando...</span>
            </>
          ) : (
            <>
              <MicOff className="h-6 w-6 text-white/50" />
              <span className="text-white/50 text-sm">Micrófono inactivo</span>
            </>
          )}
        </div>

        <form
          onSubmit={handleRegister}
          className="w-full space-y-6 bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20"
        >
          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-white p-3 rounded-md text-sm">{error}</div>
          )}

          {/* Frase de voz para reconocimiento */}
          <div className="flex flex-col items-center mb-6">
            <p className="text-white text-sm mb-3">Frase de voz para reconocimiento</p>
            <div
              className={`w-32 h-32 rounded-full ${isRecordingPassphrase ? "bg-red-500/30 animate-pulse" : "bg-white/20"} flex items-center justify-center overflow-hidden relative cursor-pointer`}
              onClick={isRecordingPassphrase ? undefined : handleVoiceRecording}
              role="button"
              aria-label="Área para grabar frase de voz. Haz clic para grabar o di 'frase de voz'."
            >
              {isRecordingPassphrase ? (
                <Mic className="h-16 w-16 text-white animate-pulse" />
              ) : (
                <Mic className="h-10 w-10 text-white" />
              )}
            </div>

            {voicePassphrase && (
              <div className="mt-4 text-white text-center">
                <p className="font-medium">Tu frase de voz:</p>
                <p className="text-sm opacity-80 mt-1">"{voicePassphrase}"</p>
              </div>
            )}

            {/* Botones para manejo de frase de voz */}
            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={handleVoiceRecording}
                className="text-white text-sm flex items-center hover:underline"
                aria-label="Grabar frase de voz"
              >
                <Mic className="h-4 w-4 mr-1" />
                {voicePassphrase ? "Cambiar frase" : "Grabar frase"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">
              Nombre completo
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setCurrentFocus("name")}
              onBlur={() => setCurrentFocus(null)}
              placeholder="Ingresa tu nombre"
              className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              required
              aria-label="Campo de nombre completo. Di 'nombre' para activar este campo y luego dicta tu nombre."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Correo electrónico
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setCurrentFocus("email")}
              onBlur={() => setCurrentFocus(null)}
              placeholder="correo@ejemplo.com"
              className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              required
              aria-label="Campo de correo electrónico. Di 'correo' para activar este campo y luego dicta tu correo."
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-white text-gray-700 hover:bg-gray-100"
            aria-label="Botón para completar registro. Di 'registrar' o 'completar registro' para finalizar."
          >
            Completar registro
          </Button>
        </form>

        <button
          onClick={handleBack}
          className="text-white hover:underline text-sm mt-6"
          aria-label="Volver a inicio de sesión. Di 'volver' para regresar."
        >
          Volver a inicio de sesión
        </button>

        {/* Botón de ayuda */}
        <button
          onClick={provideHelp}
          className="absolute bottom-4 right-4 bg-white/20 p-2 rounded-full"
          aria-label="Ayuda con comandos de voz. Di 'ayuda' para escuchar los comandos disponibles."
        >
          <HelpCircle className="h-6 w-6 text-white" />
        </button>
      </div>
    </main>
  )
}
