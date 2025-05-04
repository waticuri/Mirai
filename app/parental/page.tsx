"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Triangle, Square, Circle } from "lucide-react"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"

interface Person {
  id: number
  name: string
  relation: string
  avatar: string
}

export default function ParentalPage() {
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const { startListening, stopListening, transcript, resetTranscript } = useSpeechRecognition()
  const [isLoaded, setIsLoaded] = useState(false)

  // Lista de personas
  const [people, setPeople] = useState<Person[]>([
    { id: 1, name: "Rodrigo", relation: "Padre", avatar: "R" },
    { id: 2, name: "Sofia", relation: "Madre", avatar: "S" },
    { id: 3, name: "Juan", relation: "Hermano", avatar: "J" },
    { id: 4, name: "Firulais", relation: "Mascota", avatar: "F" },
  ])

  // Manejar comandos de voz
  useEffect(() => {
    if (!transcript) return

    const command = transcript.toLowerCase()

    if (
      command.includes("volver") ||
      command.includes("atrás") ||
      command.includes("dashboard") ||
      command.includes("salir")
    ) {
      handleBack()
    } else if (command.includes("agregar") || command.includes("añadir") || command.includes("nuevo familiar")) {
      handleAddPerson()
    } else if (command.includes("ayuda") || command.includes("asistencia")) {
      speak(
        "Esta es la pantalla de cercanía parental. Aquí puedes configurar alertas cuando tus familiares o mascotas estén cerca. Para agregar un familiar, di 'agregar familiar'. Para volver al panel principal, di 'volver'.",
      )
    }

    // Buscar si el comando menciona alguna persona
    people.forEach((person) => {
      if (command.includes(person.name.toLowerCase())) {
        speak(
          `Has seleccionado a ${person.name}, ${person.relation}. Aquí podrás configurar las alertas de proximidad para esta persona.`,
        )
      }
    })

    resetTranscript()
  }, [transcript, people, speak, resetTranscript])

  // Inicializar página
  useEffect(() => {
    setIsLoaded(true)

    const timer = setTimeout(() => {
      speak(
        "Cercanía parental. Aquí puedes configurar alertas cuando tus familiares o mascotas estén cerca. Tienes 4 personas configuradas: Rodrigo, Sofia, Juan y Firulais.",
      )
      startListening()
    }, 1000)

    return () => {
      clearTimeout(timer)
      stopListening()
    }
  }, [speak, startListening, stopListening])

  const handleBack = () => {
    speak("Volviendo al panel principal")
    router.push("/dashboard")
  }

  const handleAddPerson = () => {
    speak("Abriendo formulario para agregar un familiar")
    router.push("/parental/agregar")
  }

  const handlePersonClick = (person: Person) => {
    speak(
      `Has seleccionado a ${person.name}, ${person.relation}. Aquí podrás configurar las alertas de proximidad para esta persona.`,
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-white">
      {/* Header con gradiente */}
      <header className="bg-gradient-to-r from-[#6a3de8] to-[#06b6d4] p-4 flex items-center">
        <button onClick={handleBack} className="text-white flex items-center" aria-label="Volver al panel principal">
          <ChevronLeft className="h-6 w-6" />
          <span className="ml-2">Volver</span>
        </button>
        <h1 className="text-white text-lg font-medium flex-1 text-center mr-8">Cercanía Parental</h1>
      </header>

      {/* Contenido principal */}
      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        <h2 className="text-2xl font-bold mb-6">Cercanía Parental</h2>

        {/* Lista de personas */}
        <div className="space-y-3 mb-8">
          {people.map((person) => (
            <div
              key={person.id}
              onClick={() => handlePersonClick(person)}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                  <span className="text-purple-800 font-medium">A</span>
                </div>
                <div>
                  <h3 className="font-medium">{person.name}</h3>
                  <p className="text-sm text-gray-500">{person.relation}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Triangle className="h-5 w-5 text-gray-400" />
                <Square className="h-5 w-5 text-gray-400" />
                <Circle className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>

        {/* Botón agregar familiar */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleAddPerson}
            className="bg-[#6a3de8] text-white px-6 py-3 rounded-full flex items-center justify-center mb-4"
          >
            <Plus className="h-5 w-5 mr-2" />
            <span>Agregar familiar</span>
          </button>
          <button onClick={handleBack} className="text-gray-500">
            Salir
          </button>
        </div>
      </div>
    </main>
  )
}
