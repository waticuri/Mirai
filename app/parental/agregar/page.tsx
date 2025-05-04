"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, Camera, Upload, X } from "lucide-react"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

  // Manejar comandos de voz
  useEffect(() => {
    if (!transcript) return

    const command = transcript.toLowerCase()

    if (command.includes("volver") || command.includes("atrás") || command.includes("cancelar")) {
      handleBack()
    } else if (command.includes("guardar") || command.includes("agregar") || command.includes("crear")) {
      handleSubmit()
    } else if (command.includes("foto") || command.includes("imagen") || command.includes("fotografía")) {
      handlePhotoClick()
    } else if (command.includes("ayuda")) {
      speak(
        "Este es el formulario para agregar un familiar. Completa los campos de nombre, parentesco y número de teléfono opcional. También puedes agregar una foto. Di 'guardar' para confirmar o 'volver' para cancelar.",
      )
    }

    resetTranscript()
  }, [transcript, speak, resetTranscript])

  // Modificar la inicialización para esperar a que termine de hablar

  // Inicializar página
  useEffect(() => {
    setIsLoaded(true)

    const timer = setTimeout(() => {
      speak(
        "Formulario para agregar un familiar. Por favor, completa los campos requeridos. Puedes usar comandos de voz para navegar.",
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

  // Modificar el manejo de comandos para pausar y reanudar el reconocimiento
  const handleBack = () => {
    stopListening()
    speak("Cancelando. Volviendo a la pantalla anterior.", () => {
      router.push("/parental")
    })
  }

  const handleSubmit = () => {
    if (!name || !relation) {
      stopListening()
      speak("Por favor completa los campos obligatorios de nombre y parentesco.", () => startListening())
      return
    }

    stopListening()
    speak("Familiar agregado correctamente. Volviendo a la lista de familiares.", () => {
      setTimeout(() => {
        router.push("/parental")
      }, 500)
    })
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

  return (
    <main className="flex min-h-screen flex-col bg-white">
      {/* Header con gradiente */}
      <header className="bg-gradient-to-r from-[#6a3de8] to-[#06b6d4] p-4 flex items-center">
        <button onClick={handleBack} className="text-white flex items-center" aria-label="Volver">
          <ChevronLeft className="h-6 w-6" />
          <span className="ml-2">Volver</span>
        </button>
        <h1 className="text-white text-lg font-medium flex-1 text-center mr-8">Agregar Familiar</h1>
      </header>

      {/* Contenido principal */}
      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Foto */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden relative cursor-pointer"
              onClick={handlePhotoClick}
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
              ) : (
                <Camera className="h-10 w-10 text-gray-400" />
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
              aria-label="Subir foto"
            />
            <button type="button" onClick={handlePhotoClick} className="text-[#6a3de8] text-sm mt-2 flex items-center">
              <Upload className="h-4 w-4 mr-1" />
              Agregar foto
            </button>
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
              placeholder="Nombre del familiar o mascota"
              className="border-gray-300"
              required
            />
          </div>

          {/* Parentesco */}
          <div className="space-y-2">
            <Label htmlFor="relation" className="text-gray-700">
              Parentesco <span className="text-red-500">*</span>
            </Label>
            <Input
              id="relation"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              placeholder="Padre, Madre, Hermano, Mascota, etc."
              className="border-gray-300"
              required
            />
          </div>

          {/* Número de teléfono */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-700">
              Número de teléfono (opcional)
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Número de teléfono"
              className="border-gray-300"
            />
          </div>

          {/* Botones */}
          <div className="flex flex-col space-y-3 pt-4">
            <Button
              type="button"
              onClick={handleSubmit}
              className="bg-gradient-to-r from-[#6a3de8] to-[#06b6d4] text-white py-3 rounded-full"
            >
              Guardar
            </Button>
            <Button
              type="button"
              onClick={handleBack}
              variant="outline"
              className="border-gray-300 text-gray-700 py-3 rounded-full"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
