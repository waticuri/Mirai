"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Trash2 } from "lucide-react"
import { UserDatabase } from "@/lib/db"
import { Button } from "@/components/ui/button"

export default function AdminPage() {
  const router = useRouter()
  const [isCleared, setIsCleared] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const handleClearDatabase = () => {
    if (!isConfirming) {
      setIsConfirming(true)
      return
    }

    // Limpiar la base de datos
    UserDatabase.clearDatabase()
    setIsCleared(true)
    setIsConfirming(false)

    // Redirigir a la página de inicio después de 2 segundos
    setTimeout(() => {
      router.push("/")
    }, 2000)
  }

  const handleBack = () => {
    router.push("/dashboard")
  }

  return (
    <main className="flex min-h-screen flex-col bg-white">
      {/* Header con gradiente */}
      <header className="bg-gradient-to-r from-[#6a3de8] to-[#06b6d4] p-4 flex items-center">
        <button onClick={handleBack} className="text-white flex items-center" aria-label="Volver al panel principal">
          <ChevronLeft className="h-6 w-6" />
          <span className="ml-2">Volver</span>
        </button>
        <h1 className="text-white text-lg font-medium flex-1 text-center mr-8">Administración</h1>
      </header>

      {/* Contenido principal */}
      <div className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col items-center justify-center">
        <div className="bg-white p-6 rounded-xl shadow-md w-full">
          <h2 className="text-xl font-bold mb-4 text-center">Administración de datos</h2>

          {isCleared ? (
            <div className="bg-green-100 border border-green-300 text-green-700 p-4 rounded-md mb-4 text-center">
              Base de datos limpiada correctamente. Redirigiendo...
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 text-center">
                Esta acción eliminará todos los datos de usuarios y familiares almacenados en la aplicación.
              </p>

              <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-4">
                <p className="text-red-600 text-sm">
                  <strong>Advertencia:</strong> Esta acción no se puede deshacer. Todos los datos serán eliminados
                  permanentemente.
                </p>
              </div>

              <Button
                onClick={handleClearDatabase}
                variant="destructive"
                className="w-full flex items-center justify-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isConfirming ? "¿Estás seguro? Haz clic de nuevo para confirmar" : "Limpiar base de datos"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
