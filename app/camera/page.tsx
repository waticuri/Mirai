"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"

export default function CameraPage() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()
  const { speak } = useSpeechSynthesis()
  const [waveAnimation, setWaveAnimation] = useState(0)

  // Animar las ondas de sonido
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveAnimation((prev) => (prev + 1) % 3)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Inicializar cámara para reconocimiento facial
  useEffect(() => {
    speak("Bienvenido")

    // Mostrar pantalla de bienvenida por 2 segundos
    setTimeout(() => {
      setShowWelcome(false)
      setIsCameraActive(true)
      speak("Acércate a la cámara para iniciar sesión")

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: "user" } })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream
              videoRef.current.onloadedmetadata = () => {
                // Comenzar a dibujar el marco de reconocimiento facial después de que el video esté listo
                setTimeout(() => {
                  setIsRecognizing(true)
                  simulateFacialRecognition()
                }, 1500)
              }
            }
          })
          .catch((err) => {
            console.error("Error accessing camera:", err)
            speak("No se pudo acceder a la cámara.")
          })
      }
    }, 2000)

    return () => {
      // Limpiar stream de la cámara al desmontar
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [speak])

  // Dibujar puntos de reconocimiento facial simulados
  useEffect(() => {
    if (!isRecognizing || !canvasRef.current || !videoRef.current) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    const drawFacialRecognitionPoints = () => {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)

      // Dibujar puntos simulados de reconocimiento facial
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"
      ctx.lineWidth = 1

      // Centro aproximado de la cara
      const centerX = canvasRef.current!.width / 2
      const centerY = canvasRef.current!.height / 2
      const faceWidth = canvasRef.current!.width * 0.6
      const faceHeight = canvasRef.current!.height * 0.8

      // Dibujar líneas para simular el reconocimiento facial
      // Contorno facial
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, faceWidth / 2, faceHeight / 2, 0, 0, 2 * Math.PI)
      ctx.stroke()

      // Líneas horizontales para ojos, nariz y boca
      const eyeLevel = centerY - faceHeight * 0.15
      const noseLevel = centerY + faceHeight * 0.05
      const mouthLevel = centerY + faceHeight * 0.25

      // Ojos
      const eyeWidth = faceWidth * 0.2
      ctx.beginPath()
      ctx.ellipse(centerX - faceWidth * 0.2, eyeLevel, eyeWidth / 2, eyeWidth / 4, 0, 0, 2 * Math.PI)
      ctx.stroke()

      ctx.beginPath()
      ctx.ellipse(centerX + faceWidth * 0.2, eyeLevel, eyeWidth / 2, eyeWidth / 4, 0, 0, 2 * Math.PI)
      ctx.stroke()

      // Nariz
      ctx.beginPath()
      ctx.moveTo(centerX, eyeLevel + 10)
      ctx.lineTo(centerX, noseLevel)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(centerX - 10, noseLevel)
      ctx.lineTo(centerX + 10, noseLevel)
      ctx.stroke()

      // Boca
      ctx.beginPath()
      ctx.ellipse(centerX, mouthLevel, faceWidth * 0.25, faceWidth * 0.1, 0, 0, Math.PI)
      ctx.stroke()

      // Puntos adicionales en la cara
      const points = [
        [centerX - faceWidth * 0.3, centerY - faceHeight * 0.3],
        [centerX + faceWidth * 0.3, centerY - faceHeight * 0.3],
        [centerX - faceWidth * 0.35, centerY],
        [centerX + faceWidth * 0.35, centerY],
        [centerX - faceWidth * 0.25, centerY + faceHeight * 0.35],
        [centerX + faceWidth * 0.25, centerY + faceHeight * 0.35],
      ]

      points.forEach(([x, y]) => {
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, 2 * Math.PI)
        ctx.stroke()
      })
    }

    const interval = setInterval(drawFacialRecognitionPoints, 100)
    return () => clearInterval(interval)
  }, [isRecognizing])

  // Simular reconocimiento facial
  const simulateFacialRecognition = () => {
    setTimeout(() => {
      speak("Reconocimiento facial completado. Iniciando sesión.")
      setTimeout(() => {
        router.push("/dashboard")
      }, 1500)
    }, 3000)
  }

  // Renderizar ondas de sonido
  const renderSoundWaves = () => {
    const waves = [
      "M10,50 Q15,40 20,50 Q25,60 30,50 Q35,40 40,50 Q45,60 50,50 Q55,40 60,50 Q65,60 70,50 Q75,40 80,50 Q85,60 90,50",
      "M10,50 Q15,30 20,50 Q25,70 30,50 Q35,30 40,50 Q45,70 50,50 Q55,30 60,50 Q65,70 70,50 Q75,30 80,50 Q85,70 90,50",
      "M10,50 Q15,45 20,50 Q25,55 30,50 Q35,45 40,50 Q45,55 50,50 Q55,45 60,50 Q65,55 70,50 Q75,45 80,50 Q85,55 90,50",
    ]

    return (
      <svg className="w-32 h-12" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={waves[waveAnimation]} stroke="white" strokeWidth="2" fill="none" />
      </svg>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#6a3de8] via-[#3b82f6] to-[#06b6d4] p-4">
      {showWelcome ? (
        // Pantalla de bienvenida
        <div className="flex flex-col items-center justify-center h-full">
          {renderSoundWaves()}
          <p className="text-white text-xl mt-4">Bienvenido</p>
        </div>
      ) : (
        // Pantalla de reconocimiento facial
        <div className="flex flex-col items-center justify-center w-full max-w-xs">
          <div className="relative w-64 h-64 rounded-full overflow-hidden bg-white/10 mb-8">
            {isCameraActive && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover rounded-full"
                />
                <canvas
                  ref={canvasRef}
                  width={256}
                  height={256}
                  className="absolute inset-0 w-full h-full object-cover rounded-full"
                />
              </>
            )}
          </div>

          <div className="flex flex-col items-center">
            {renderSoundWaves()}
            <p className="text-white text-center mt-4">
              Acércate a la cámara para
              <br />
              iniciar sesión
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
