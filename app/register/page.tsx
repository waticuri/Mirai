"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { Camera, Upload, X, Check } from "lucide-react"
import { UserDatabase } from "@/lib/db"

export default function RegisterPage() {
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const [isLoaded, setIsLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Campos del formulario
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  // Estado para la captura de cámara
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    setIsLoaded(true)
    // Reproducir mensaje de bienvenida después de un breve retraso
    const timer = setTimeout(() => {
      speak(
        "Pantalla de registro. Por favor, completa tus datos y agrega una foto para el reconocimiento facial. Puedes subir una foto o capturarla con la cámara.",
      )
    }, 1000)

    return () => {
      clearTimeout(timer)
      stopCamera()
    }
  }, [speak])

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!photoPreview) {
      speak("Por favor, agrega una foto para el reconocimiento facial antes de continuar.")
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
        "Registro completado. Tu foto ha sido guardada para el reconocimiento facial. Redirigiendo al panel principal.",
      )
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (err: any) {
      speak(`Error al registrar: ${err.message}`)
      setError(err.message)
    }
  }

  const handleBack = () => {
    speak("Volviendo a la pantalla de inicio de sesión.")
    stopCamera()
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

  // Funciones para manejo de cámara
  const startCamera = async () => {
    try {
      stopCamera() // Asegurarse de que no haya una cámara activa
      setPhotoPreview(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsCameraActive(true)
        speak(
          "Cámara activada. Por favor, ubícate frente a la cámara, asegurando que tu rostro esté bien iluminado y centrado. Cuando estés listo, pulsa el botón para capturar tu foto.",
        )
      }
    } catch (err) {
      console.error("Error al acceder a la cámara:", err)
      speak("No se pudo acceder a la cámara. Por favor, intenta subir una foto.")
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
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const context = canvasRef.current.getContext("2d")
    if (!context) return

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

    speak("Foto capturada correctamente. Esta foto se utilizará para el reconocimiento facial.")
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
            >
              {photoPreview ? (
                <>
                  <Image src={photoPreview || "/placeholder.svg"} alt="Vista previa" fill className="object-cover" />
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
              ) : isCameraActive ? (
                <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <Camera className="h-10 w-10 text-white" />
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

            {/* Botones para manejo de foto */}
            <div className="flex gap-3 mt-3">
              {isCameraActive ? (
                <>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="text-white text-sm flex items-center hover:underline"
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
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {photoPreview ? "Cambiar foto" : "Subir foto"}
                  </button>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="text-white text-sm flex items-center hover:underline"
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
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
