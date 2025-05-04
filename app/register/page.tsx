"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { Camera, Upload, X, Check, HelpCircle, Mic, MicOff } from "lucide-react"
import { UserDatabase } from "@/lib/db"

export default function RegisterPage() {
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const { startListening, stopListening, transcript, resetTranscript, listening } = useSpeechRecognition()
  const [isLoaded, setIsLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [helpMode, setHelpMode] = useState(false)

  // Campos del formulario
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [currentFocus, setCurrentFocus] = useState<string | null>(null)

  // Estado para la captura de cámara
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [countdownActive, setCountdownActive] = useState(false)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    setIsLoaded(true)
    // Reproducir mensaje de bienvenida después de un breve retraso
    const timer = setTimeout(() => {
      speak(
        "Pantalla de registro. Para registrarte, necesitarás proporcionar tu nombre, correo electrónico y una foto para el reconocimiento facial. Puedes navegar por voz diciendo 'nombre', 'correo', 'foto', 'ayuda', 'registrar' o 'volver'. Para activar la ayuda detallada, di 'modo ayuda'.",
        () => {
          startListening()
        },
      )
    }, 1000)

    return () => {
      clearTimeout(timer)
      stopCamera()
      stopListening()
    }
  }, [speak, startListening, stopListening])

  // Manejar comandos de voz
  useEffect(() => {
    if (!transcript) return

    const command = transcript.toLowerCase()
    console.log("Comando recibido:", command)

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
    } else if (command.includes("ayuda")) {
      provideHelp()
    }

    // Comandos para campos de formulario
    else if (command.includes("nombre")) {
      focusField("name")
    } else if (command.includes("correo") || command.includes("email")) {
      focusField("email")
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
        `Correo electrónico establecido como: ${formatEmailForSpeech(formattedEmail)}. Di 'foto' para continuar con la foto.`,
      )
    }

    // Comandos para foto
    else if (command.includes("foto") || command.includes("imagen") || command.includes("fotografía")) {
      if (command.includes("tomar") || command.includes("capturar") || command.includes("cámara")) {
        handleCameraStart()
      } else if (command.includes("quitar") || command.includes("eliminar") || command.includes("borrar")) {
        handleRemovePhoto()
      } else {
        speak("Para tomar una foto di 'tomar foto' o 'usar cámara'. Para quitar la foto actual di 'quitar foto'.")
      }
    } else if (
      command.includes("tomar foto") ||
      command.includes("usar cámara") ||
      command.includes("activar cámara")
    ) {
      handleCameraStart()
    } else if (command.includes("capturar") && isCameraActive) {
      startCountdown()
    } else if (command.includes("cancelar") && isCameraActive) {
      stopCamera()
      speak("Cámara desactivada.")
    }

    resetTranscript()
  }, [transcript, speak, resetTranscript, currentFocus, isCameraActive])

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
        "Di 'foto' o 'tomar foto' para activar la cámara. Di 'capturar' para tomar la foto cuando la cámara esté activa. " +
        "Di 'registrar' o 'completar registro' para finalizar. Di 'volver' para regresar a la pantalla anterior. " +
        "Di 'modo ayuda' para activar o desactivar instrucciones detalladas.",
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

    if (!photoPreview) {
      speak("Por favor, agrega una foto para el reconocimiento facial. Di 'tomar foto' para activar la cámara.")
      setError("Se requiere una foto para el reconocimiento facial")
      return
    }

    try {
      // Crear el usuario en la base de datos
      const newUser = UserDatabase.createUser({
        name,
        email,
        photoUrl: photoPreview,
      })

      // Establecer como usuario actual
      UserDatabase.setCurrentUser(newUser.id)

      speak(
        "Registro completado correctamente. Tu foto ha sido guardada para el reconocimiento facial. Redirigiendo a la pantalla de inicio de sesión.",
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
    stopCamera()
    stopListening()
    router.push("/")
  }

  const handlePhotoClick = () => {
    if (isCameraActive) return
    fileInputRef.current?.click()
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setPhotoPreview(reader.result as string)
        speak("Foto agregada correctamente. Esta foto se utilizará para el reconocimiento facial.")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    speak("Foto eliminada. Por favor, agrega una nueva foto para el reconocimiento facial.")
  }

  const handleCameraStart = () => {
    speak("Activando cámara para tomar tu foto.")
    startCamera()
  }

  // Funciones para manejo de cámara
  const startCamera = async () => {
    try {
      // Limpiar errores anteriores
      setCameraError(null)

      // Detener cualquier stream de cámara activo
      stopCamera()
      setPhotoPreview(null)

      console.log("Intentando acceder a la cámara...")

      // Verificar si el navegador soporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = "Tu navegador no soporta acceso a la cámara"
        console.error(errorMsg)
        setCameraError(errorMsg)
        speak(errorMsg)
        return
      }

      // Primero activamos la cámara en la UI para asegurar que el elemento de video se renderice
      setIsCameraActive(true)

      // Pequeña pausa para asegurar que el elemento de video se ha renderizado
      await new Promise((resolve) => setTimeout(resolve, 100))

      if (!videoRef.current) {
        console.error("El elemento de video no está disponible después de activar la cámara")
        setCameraError("Error al inicializar la cámara. Por favor, intenta de nuevo.")
        setIsCameraActive(false)
        return
      }

      // Solicitar acceso a la cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      })

      console.log("Acceso a la cámara concedido:", stream)

      // Asignar el stream al elemento de video
      videoRef.current.srcObject = stream
      streamRef.current = stream

      // Asegurarse de que el video se reproduce correctamente
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current
            .play()
            .then(() => {
              speak(
                "Cámara activada. Por favor, ubícate frente a la cámara, asegurando que tu rostro esté bien iluminado y centrado. Cuando estés listo, di 'capturar' para tomar la foto o 'cancelar' para desactivar la cámara.",
              )
            })
            .catch((err) => {
              console.error("Error al reproducir el video:", err)
              setCameraError("Error al iniciar la cámara. Por favor, intenta de nuevo.")
              stopCamera()
            })
        }
      }

      // Manejar errores en la carga del video
      videoRef.current.onerror = () => {
        console.error("Error en el elemento de video")
        setCameraError("Error al cargar el video. Por favor, intenta de nuevo.")
        stopCamera()
      }
    } catch (err) {
      console.error("Error al acceder a la cámara:", err)
      const errorMsg = "No se pudo acceder a la cámara. Por favor, verifica que has dado permiso para usar la cámara."
      setCameraError(errorMsg)
      speak(errorMsg)
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch (e) {
          console.error("Error al detener track:", e)
        }
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null
      } catch (e) {
        console.error("Error al limpiar srcObject:", e)
      }
    }

    setIsCameraActive(false)
    setCountdownActive(false)
    setCountdown(3)
  }

  // Función para iniciar la cuenta regresiva antes de capturar la foto
  const startCountdown = () => {
    setCountdownActive(true)
    setCountdown(3)
    speak("Preparando para capturar. 3...")

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        const newCount = prev - 1
        if (newCount > 0) {
          speak(newCount.toString())
        } else if (newCount === 0) {
          speak("¡Capturando!")
          capturePhoto()
          clearInterval(countdownInterval)
        }
        return newCount
      })
    }, 1000)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error("Video o canvas no disponibles")
      setCameraError("Error al capturar la foto. Por favor, intenta de nuevo.")
      speak("Error al capturar la foto. Por favor, intenta de nuevo.")
      return
    }

    try {
      const context = canvasRef.current.getContext("2d")
      if (!context) {
        console.error("No se pudo obtener el contexto del canvas")
        setCameraError("Error al procesar la imagen. Por favor, intenta de nuevo.")
        speak("Error al procesar la imagen. Por favor, intenta de nuevo.")
        return
      }

      // Establecer dimensiones del canvas al tamaño del video
      canvasRef.current.width = videoRef.current.videoWidth
      canvasRef.current.height = videoRef.current.videoHeight

      // Dibujar el frame actual del video en el canvas
      context.drawImage(videoRef.current, 0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight)

      // Convertir el canvas a una URL de datos
      const photoData = canvasRef.current.toDataURL("image/png")
      setPhotoPreview(photoData)

      // Detener la cámara
      stopCamera()

      speak(
        "Foto capturada correctamente. Esta foto se utilizará para el reconocimiento facial. Para completar el registro, di 'registrar'.",
      )
      setCountdownActive(false)
    } catch (err) {
      console.error("Error al capturar la foto:", err)
      setCameraError("Error al capturar la foto. Por favor, intenta de nuevo.")
      speak("Error al capturar la foto. Por favor, intenta de nuevo.")
    }
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

          {/* Foto para reconocimiento facial */}
          <div className="flex flex-col items-center mb-6">
            <p className="text-white text-sm mb-3">Foto para reconocimiento facial</p>
            <div
              className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center overflow-hidden relative cursor-pointer"
              onClick={isCameraActive ? undefined : handlePhotoClick}
              role="button"
              aria-label="Área para foto de perfil. Haz clic para subir una foto o di 'tomar foto' para usar la cámara."
            >
              {photoPreview ? (
                <>
                  <Image
                    src={photoPreview || "/placeholder.svg"}
                    alt="Vista previa de tu foto"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemovePhoto()
                    }}
                    className="absolute top-1 right-1 bg-white rounded-full p-1"
                    aria-label="Eliminar foto"
                  >
                    <X className="h-4 w-4 text-gray-600" />
                  </button>
                </>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`absolute inset-0 w-full h-full object-cover ${isCameraActive ? "block" : "hidden"}`}
                    aria-label="Vista previa de la cámara"
                  />
                  {!isCameraActive && <Camera className="h-10 w-10 text-white" />}

                  {/* Cuenta regresiva para captura */}
                  {countdownActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-4xl font-bold">
                      {countdown}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Canvas oculto para capturar la foto */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Input para subir foto */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
              aria-label="Subir foto"
            />

            {/* Mensaje de error de cámara */}
            {cameraError && <div className="mt-2 text-red-300 text-xs text-center">{cameraError}</div>}

            {/* Botones para manejo de foto */}
            <div className="flex gap-3 mt-3">
              {isCameraActive ? (
                <>
                  <button
                    type="button"
                    onClick={startCountdown}
                    className="text-white text-sm flex items-center hover:underline"
                    aria-label="Capturar foto"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Capturar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera()
                      speak("Cámara desactivada.")
                    }}
                    className="text-white text-sm flex items-center hover:underline"
                    aria-label="Cancelar captura"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePhotoClick}
                    className="text-white text-sm flex items-center hover:underline"
                    aria-label="Subir foto desde dispositivo"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {photoPreview ? "Cambiar foto" : "Subir foto"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCameraStart}
                    className="text-white text-sm flex items-center hover:underline"
                    aria-label="Usar cámara para tomar foto"
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Usar cámara
                  </button>
                </>
              )}
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
