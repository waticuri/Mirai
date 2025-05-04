"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, Camera, Upload, X, Check, Mic, MicOff } from "lucide-react"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserDatabase } from "@/lib/db"

export default function AddFamilyMemberPage() {
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const { startListening, stopListening, transcript, resetTranscript, listening } = useSpeechRecognition()
  const [isLoaded, setIsLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [relation, setRelation] = useState("")
  const [phone, setPhone] = useState("")
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentFocus, setCurrentFocus] = useState<string | null>(null)

  // Estado para la captura de cámara
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [countdownActive, setCountdownActive] = useState(false)
  const [countdown, setCountdown] = useState(3)

  // Inicializar página
  useEffect(() => {
    setIsLoaded(true)

    const timer = setTimeout(() => {
      speak(
        "Agregar familiar. Aquí puedes añadir a un familiar o mascota para recibir alertas de proximidad. Por favor, completa el formulario con el nombre, relación y una foto opcional.",
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

  // Manejar comandos de voz
  useEffect(() => {
    if (!transcript) return

    const command = transcript.toLowerCase()
    console.log("Comando recibido:", command)

    // Comandos de navegación
    if (command.includes("volver") || command.includes("atrás") || command.includes("cancelar")) {
      handleBack()
    } else if (command.includes("guardar") || command.includes("agregar") || command.includes("añadir")) {
      handleSubmit()
    }

    // Comandos para campos de formulario
    else if (command.includes("nombre")) {
      focusField("name")
    } else if (command.includes("relación") || command.includes("parentesco")) {
      focusField("relation")
    } else if (command.includes("teléfono") || command.includes("móvil") || command.includes("celular")) {
      focusField("phone")
    }

    // Comandos para dictado de texto
    else if (currentFocus === "name" && !command.includes("nombre")) {
      setName(command.trim())
      speak(`Nombre establecido como: ${command.trim()}. Di 'relación' para continuar con el siguiente campo.`)
    } else if (currentFocus === "relation" && !command.includes("relación") && !command.includes("parentesco")) {
      setRelation(command.trim())
      speak(`Relación establecida como: ${command.trim()}. Di 'teléfono' para continuar con el siguiente campo.`)
    } else if (
      currentFocus === "phone" &&
      !command.includes("teléfono") &&
      !command.includes("móvil") &&
      !command.includes("celular")
    ) {
      // Formatear número de teléfono (eliminar espacios y letras)
      const formattedPhone = command.replace(/[^0-9]/g, "")
      setPhone(formattedPhone)
      speak(
        `Teléfono establecido como: ${formattedPhone}. Di 'foto' para continuar con la foto o 'guardar' para finalizar.`,
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

  const focusField = (field: string) => {
    setCurrentFocus(field)
    const fieldElement = document.getElementById(field)
    if (fieldElement) {
      fieldElement.focus()

      if (field === "name") {
        speak("Campo de nombre activado. Por favor, di el nombre del familiar.")
      } else if (field === "relation") {
        speak(
          "Campo de relación activado. Por favor, di qué relación tiene contigo, por ejemplo: padre, madre, hijo, mascota.",
        )
      } else if (field === "phone") {
        speak("Campo de teléfono activado. Por favor, di el número de teléfono del familiar.")
      }
    }
  }

  const handleBack = () => {
    stopListening()
    speak("Volviendo a la pantalla de cercanía parental.", () => {
      router.push("/parental")
    })
  }

  const handleSubmit = () => {
    if (!name || !relation) {
      stopListening()
      speak("Por favor completa los campos obligatorios de nombre y relación.", () => startListening())
      setError("Por favor completa los campos obligatorios.")
      return
    }

    try {
      // Crear el familiar en la base de datos
      UserDatabase.createFamilyMember({
        name,
        relation,
        phone,
        photoUrl: photoPreview || undefined,
      })

      setSuccess("Familiar agregado correctamente.")
      stopListening()
      speak("Familiar agregado correctamente. Volviendo a la pantalla de cercanía parental.", () => {
        setTimeout(() => {
          router.push("/parental")
        }, 1500)
      })
    } catch (err: any) {
      setError("Error al agregar familiar. Inténtalo de nuevo.")
      speak("Error al agregar familiar. Inténtalo de nuevo.")
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
        speak("Foto agregada correctamente.")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    speak("Foto eliminada.")
  }

  const handleCameraStart = () => {
    speak("Activando cámara para tomar la foto.")
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
                "Cámara activada. Por favor, ubica al familiar frente a la cámara. Cuando estés listo, di 'capturar' para tomar la foto o 'cancelar' para desactivar la cámara.",
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

      speak("Foto capturada correctamente. Para guardar el familiar, di 'guardar'.")
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
        <button onClick={handleBack} className="text-white flex items-center" aria-label="Volver a cercanía parental">
          <ChevronLeft className="h-6 w-6" />
          <span className="ml-2">Volver</span>
        </button>
        <h1 className="text-white text-lg font-medium flex-1 text-center mr-8">Agregar Familiar</h1>

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
              aria-label="Área para foto del familiar. Haz clic para subir una foto o di 'tomar foto' para usar la cámara."
            >
              {photoPreview ? (
                <>
                  <Image
                    src={photoPreview || "/placeholder.svg"}
                    alt="Vista previa de la foto"
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
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setCurrentFocus("name")}
              onBlur={() => setCurrentFocus(null)}
              placeholder="Nombre del familiar o mascota"
              className="border-gray-300"
              required
              aria-label="Campo de nombre. Di 'nombre' para activar este campo y luego dicta el nombre."
            />
          </div>

          {/* Relación */}
          <div className="space-y-2">
            <Label htmlFor="relation" className="text-gray-700">
              Relación <span className="text-red-500">*</span>
            </Label>
            <Select value={relation} onValueChange={setRelation}>
              <SelectTrigger
                id="relation"
                className="border-gray-300"
                onFocus={() => setCurrentFocus("relation")}
                onBlur={() => setCurrentFocus(null)}
                aria-label="Campo de relación. Di 'relación' para activar este campo."
              >
                <SelectValue placeholder="Selecciona la relación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Padre">Padre</SelectItem>
                <SelectItem value="Madre">Madre</SelectItem>
                <SelectItem value="Hijo">Hijo</SelectItem>
                <SelectItem value="Hija">Hija</SelectItem>
                <SelectItem value="Abuelo">Abuelo</SelectItem>
                <SelectItem value="Abuela">Abuela</SelectItem>
                <SelectItem value="Mascota">Mascota</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-700">
              Teléfono (opcional)
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onFocus={() => setCurrentFocus("phone")}
              onBlur={() => setCurrentFocus(null)}
              placeholder="Número de teléfono"
              className="border-gray-300"
              aria-label="Campo de teléfono. Di 'teléfono' para activar este campo y luego dicta el número."
            />
          </div>

          {/* Botones */}
          <div className="flex flex-col space-y-3 pt-4">
            <Button
              type="button"
              onClick={handleSubmit}
              className="bg-gradient-to-r from-[#6a3de8] to-[#06b6d4] text-white py-3 rounded-full"
              aria-label="Guardar familiar. Di 'guardar' o 'agregar' para guardar el familiar."
            >
              Guardar familiar
            </Button>
            <Button
              type="button"
              onClick={handleBack}
              variant="outline"
              className="border-gray-300 text-gray-700 py-3 rounded-full"
              aria-label="Cancelar. Di 'volver' o 'cancelar' para regresar sin guardar."
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
