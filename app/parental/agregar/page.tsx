"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"

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

  // Manejar comandos de voz
  useEffect(() => {
    if (!transcript) return

    const command = transcript.toLowerCase()
    console.log("Comando recibido:", command)

    // Comandos de navegación
    if (command.includes("volver") || command.includes("atrás") || command.includes("cancelar")) {
      handleBack()
    } else if (command.includes(\"guar
