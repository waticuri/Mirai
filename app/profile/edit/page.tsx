"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, Camera, Upload, X, Check, HelpCircle, Mic, MicOff } from "lucide-react"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserDatabase, type User } from "@/lib/db"

export default function EditProfilePage() {
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const { startListening, stopListening, transcript, resetTranscript, listening } = useSpeechRecognition()
  const [isLoaded, setIsLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Usuario actual
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [currentFocus, setCurrentFocus] = useState<string | null>(null)
  const [helpMode, setHelpMode] = useState(false)

  // Estado para la captura de cámara
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [countdownActive, setCountdownActive] = useState(false)
  const [countdown, setCountdown] = useState(3)

  // Cargar datos del usuario actual
  useEffect(() => {
    const user = UserDatabase.getCurrentUser()
    if (!user) {
      speak("No hay sesión activa. Redirigiendo a la pantalla de inicio de sesión.")
      setTimeout(() => {
        router.push("/")
      }, 1500)
      return
    }

    setCurrentUser(user)
    setName(user.name)
    setEmail(user.email)
    setPhotoPreview(user.photoUrl)
  }, [router, speak])

  // Manejar comandos de voz
  useEffect(() => {
    if (!transcript) return

    const command = transcript.toLowerCase()
    console.log("Comando recibido:", command)

    // Comandos de navegación
    if (command.includes("volver") || command.includes("atrás") || command.includes("cancelar")) {
      handleBack()
    } else if (command.includes("guardar") || command.includes("actualizar")) {
      handleSubmit()
    } else if (command.includes("modo ayuda")) {
      toggleHelpMode()
    } else if (command.includes("ayuda")) {
      provideHelp()
    } else if (command.includes("limpiar") || command.includes("reiniciar")) {
      // Restaurar valores originales
      if (currentUser) {
        setName(currentUser.name)
        setEmail(currentUser.email)
        setPhotoPreview(currentUser.photoUrl)
        speak("Formulario reiniciado a los valores originales.")
      }
    } else if (command.includes("repetir") || command.includes("instrucciones")) {
      speak(
        "Estás en la pantalla de edición de perfil. Puedes modificar tu nombre, correo electrónico y foto. Di 'nombre' para editar tu nombre, 'correo' para tu email, y 'foto' para cambiar tu foto. Cuando hayas terminado, di 'guardar'.",
      )
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
  }, [transcript, speak, resetTranscript, currentFocus, isCameraActive, currentUser])

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
      "Comandos disponibles: Di 'nombre' para editar tu nombre. Di 'correo' para editar tu correo electrónico. " +
        "Di 'foto' o 'tomar foto' para activar la cámara. Di 'capturar' para tomar la foto cuando la cámara esté activa. " +
        "Di 'guardar' o 'actualizar' para guardar los cambios. Di 'volver' para regresar al panel principal. " +
        "Di 'modo ayuda' para activar o desactivar instrucciones detalladas.",
    )
  }

  // Inicializar página
  useEffect(() => {
    setIsLoaded(true)

    const timer = setTimeout(() => {
      speak(
        "Edición de perfil. Aquí puedes modificar tu nombre, correo electrónico y foto. Puedes navegar por voz diciendo 'nombre', 'correo', 'foto', 'ayuda', 'guardar' o 'volver'. Para activar la ayuda detallada, di 'modo ayuda'.",
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
      stopCamera()
    }
  }, [speak, startListening, stopListening])

  const handleBack = () => {
    stopListening()
    speak("Volviendo al panel principal.", () => {
      router.push("/dashboard")
    })
  }

  const handleSubmit = () => {
    if (!name || !email) {
      stopListening()
      speak("Por favor completa los campos obligatorios de nombre y correo electrónico.", () => startListening())
      setError("Por favor completa los campos obligatorios.")
      return
    }

    try {
      // Actualizar el usuario en la base de datos
      if (currentUser) {
        // En una aplicación real, aquí habría una llamada a la API para actualizar el usuario
        // Para esta simulación, actualizamos el usuario en localStorage

        // Obtener todos los usuarios
        const users = UserDatabase.getUsers()

        // Encontrar y actualizar el usuario actual
        const updatedUsers = users.map((user) => {
          if (user.id === currentUser.id) {
            return {
              ...user,
              name,
              email,
              photoUrl: photoPreview || user.photoUrl,
            }
          }
          return user
        })

        // Guardar los usuarios actualizados
        localStorage.setItem(UserDatabase["USERS_KEY"], JSON.stringify(updatedUsers))

        setSuccess("Perfil actualizado correctamente.")
        stopListening()
        speak("Perfil actualizado correctamente. Volviendo al panel principal.", () => {
          setTimeout(() => {
            router.push("/dashboard")
          }, 1500)
        })
      }
    } catch (err: any) {
      setError("Error al actualizar el perfil. Inténtalo de nuevo.")
      speak("Error al actualizar el perfil. Inténtalo de nuevo.")
    }
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setPhotoPreview(reader.result as string)
        speak("Foto actualizada correctamente.")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    speak("Foto eliminada.")
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
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
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

      speak("Foto capturada correctamente. Para guardar los cambios, di 'guardar'.")
      setCountdownActive(false)
    } catch (err) {
      console.error("Error al capturar la foto:", err)
      setCameraError("Error al capturar la foto. Por favor, intenta de nuevo.")
      speak("Error al capturar la foto. Por favor, intenta de nuevo.")
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-white">
      {/* Header con gradiente */}
      <header className="bg-gradient-to-r from-[#6a3de8] to-[#06b6d4] p-4 flex items-center">
        <button
          onClick={handleBack}
          className="text-white flex items-center"
          aria-label="Volver al panel principal. Di 'volver' para regresar."
        >
          <ChevronLeft className="h-6 w-6" />
          <span className="ml-2">Volver</span>
        </button>
        <h1 className="text-white text-lg font-medium flex-1 text-center mr-8">Editar Perfil</h1>

        {/* Indicador de reconocimiento de voz */}
        <div className="flex items-center gap-2">
          {listening ? (
            <div className="animate-pulse">
              <Mic className="h-5 w-5 text-white" aria-label="Micrófono activo" />
            </div>
          ) : (
            <MicOff className="h-5 w-5 text-white/50" aria-label="Micrófono inactivo" />
          )}
        </div>
      </header>

      {/* Contenido principal */}
      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-700 p-3 rounded-md text-sm">{error}</div>
          )}

          {/* Mensaje de éxito */}
          {success && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-700 p-3 rounded-md text-sm">
              {success}
            </div>
          )}

          {/* Foto */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden relative cursor-pointer"
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
                    aria-label="Eliminar foto. Di 'quitar foto' para eliminarla."
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
                  {!isCameraActive && <Camera className="h-10 w-10 text-gray-400" />}

                  {/* Cuenta regresiva para captura */}
                  {countdownActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-4xl font-bold">
                      {countdown}
                    </div>
                  )}
                </>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
              aria-label="Subir foto"
            />

            {/* Mensaje de error de cámara */}
            {cameraError && <div className="mt-2 text-red-500 text-xs text-center">{cameraError}</div>}

            <div className="flex gap-3 mt-3">
              {isCameraActive ? (
                <>
                  <button
                    type="button"
                    onClick={startCountdown}
                    className="text-[#6a3de8] text-sm flex items-center hover:underline"
                    aria-label="Capturar foto. Di 'capturar' para tomar la foto."
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
                    className="text-gray-500 text-sm flex items-center hover:underline"
                    aria-label="Cancelar captura. Di 'cancelar' para desactivar la cámara."
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
                    className="text-[#6a3de8] text-sm flex items-center hover:underline"
                    aria-label="Subir foto desde dispositivo"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {photoPreview ? "Cambiar foto" : "Agregar foto"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCameraStart}
                    className="text-[#6a3de8] text-sm flex items-center hover:underline"
                    aria-label="Usar cámara para tomar foto. Di 'tomar foto' para activar la cámara."
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Usar cámara
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700">
              Nombre completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setCurrentFocus("name")}
              onBlur={() => setCurrentFocus(null)}
              placeholder="Ingresa tu nombre"
              className="border-gray-300"
              required
              aria-label="Campo de nombre completo. Di 'nombre' para activar este campo y luego dicta tu nombre."
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700">
              Correo electrónico <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setCurrentFocus("email")}
              onBlur={() => setCurrentFocus(null)}
              placeholder="correo@ejemplo.com"
              className="border-gray-300"
              required
              aria-label="Campo de correo electrónico. Di 'correo' para activar este campo y luego dicta tu correo."
            />
          </div>

          {/* Botones */}
          <div className="flex flex-col space-y-3 pt-4">
            <Button
              type="button"
              onClick={handleSubmit}
              className="bg-gradient-to-r from-[#6a3de8] to-[#06b6d4] text-white py-3 rounded-full"
              aria-label="Guardar cambios. Di 'guardar' o 'actualizar' para guardar los cambios."
            >
              Guardar cambios
            </Button>
            <Button
              type="button"
              onClick={handleBack}
              variant="outline"
              className="border-gray-300 text-gray-700 py-3 rounded-full"
              aria-label="Cancelar. Di 'volver' o 'cancelar' para regresar sin guardar cambios."
            >
              Cancelar
            </Button>
          </div>
        </form>

        {/* Botón de ayuda */}
        <button
          onClick={provideHelp}
          className="fixed bottom-4 right-4 bg-[#6a3de8]/20 p-2 rounded-full"
          aria-label="Ayuda con comandos de voz. Di 'ayuda' para escuchar los comandos disponibles."
        >
          <HelpCircle className="h-6 w-6 text-[#6a3de8]" />
        </button>
      </div>
    </main>
  )
}
