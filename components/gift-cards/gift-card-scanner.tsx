'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import {
  AlertCircle,
  Camera,
  Loader2,
  QrCode,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react'
import { extractGiftCardCodeFromScan } from '@/lib/gift-card-code-helpers'

interface GiftCardScannerProps {
  onDetected: (extractedCode: string, rawValue: string) => void
  onClose?: () => void
  autoStartCamera?: boolean
}

interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>
}

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike
  }
}

export function GiftCardScanner({
  onDetected,
  onClose,
  autoStartCamera = true,
}: GiftCardScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const lastScanAtRef = useRef<number>(0)
  const detectedLockRef = useRef(false)

  const [cameraState, setCameraState] = useState<
    'idle' | 'starting' | 'active' | 'error'
  >(autoStartCamera ? 'starting' : 'idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [imageScanning, setImageScanning] = useState(false)

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const handleDecodedPayload = useCallback(
    (rawValue: string) => {
      const extracted = extractGiftCardCodeFromScan(rawValue)
      if (!extracted) return false
      detectedLockRef.current = true
      stopCamera()
      onDetected(extracted, rawValue)
      return true
    },
    [onDetected, stopCamera],
  )

  const decodeCanvasFrame = useCallback(
    async (
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
    ): Promise<string | null> => {
      if (typeof window !== 'undefined' && window.BarcodeDetector) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
          const barcodes = await detector.detect(canvas)
          const match = barcodes.find((b) => Boolean(b.rawValue?.trim()))
          if (match?.rawValue) {
            return match.rawValue
          }
        } catch {
          // Fall back to jsQR
        }
      }

      const imageData = ctx.getImageData(0, 0, width, height)
      const qr = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })
      return qr?.data ?? null
    },
    [],
  )

  const startCamera = useCallback(async () => {
    stopCamera()
    detectedLockRef.current = false
    setErrorMessage(null)

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraState('error')
      setErrorMessage(
        'Camera scanning is unavailable in this browser. Upload a QR photo or enter the code manually.',
      )
      return
    }

    setCameraState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        stopCamera()
        return
      }

      video.srcObject = stream
      await video.play()
      setCameraState('active')

      const tick = async (timestamp: number) => {
        if (detectedLockRef.current || !streamRef.current) return
        const currentVideo = videoRef.current
        if (
          currentVideo &&
          currentVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          currentVideo.videoWidth > 0 &&
          timestamp - lastScanAtRef.current >= 160
        ) {
          lastScanAtRef.current = timestamp
          const canvas =
            canvasRef.current ?? document.createElement('canvas')
          canvasRef.current = canvas
          canvas.width = currentVideo.videoWidth
          canvas.height = currentVideo.videoHeight
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (ctx) {
            ctx.drawImage(currentVideo, 0, 0, canvas.width, canvas.height)
            const decoded = await decodeCanvasFrame(
              canvas,
              ctx,
              canvas.width,
              canvas.height,
            )
            if (decoded && handleDecodedPayload(decoded)) {
              return
            }
          }
        }

        if (!detectedLockRef.current && streamRef.current) {
          rafRef.current = requestAnimationFrame((ts) => {
            void tick(ts)
          })
        }
      }

      rafRef.current = requestAnimationFrame((ts) => {
        void tick(ts)
      })
    } catch (err) {
      stopCamera()
      setCameraState('error')
      const message =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access or upload a QR image below.'
          : 'Unable to open camera on this device. You can upload a QR image or type the serial code.'
      setErrorMessage(message)
    }
  }, [decodeCanvasFrame, handleDecodedPayload, stopCamera])

  useEffect(() => {
    if (autoStartCamera) {
      void startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [autoStartCamera, startCamera, stopCamera])

  const handleUploadQrImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImageScanning(true)
    setErrorMessage(null)
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = canvasRef.current ?? document.createElement('canvas')
      canvasRef.current = canvas
      const maxDim = 1400
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        setErrorMessage('Could not read the uploaded image.')
        return
      }
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const decoded = await decodeCanvasFrame(
        canvas,
        ctx,
        canvas.width,
        canvas.height,
      )
      if (decoded && handleDecodedPayload(decoded)) {
        return
      }
      setErrorMessage(
        'No Dermaspace gift card QR code was detected in that image. Try a clearer crop or enter the serial manually.',
      )
    } catch {
      setErrorMessage('Could not decode the selected image file.')
    } finally {
      setImageScanning(false)
    }
  }

  return (
    <div
      data-testid="gift-card-scanner"
      className="rounded-2xl border border-[#7B2D8E]/25 bg-white overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-[#FAF6FB] border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <QrCode className="w-4 h-4 text-[#7B2D8E] shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1a0d1f] truncate">
              QR Gift Card Scanner
            </p>
            <p className="text-xs text-gray-500 truncate">
              Point camera at card back QR or upload a photo
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={() => {
              stopCamera()
              onClose()
            }}
            aria-label="Close scanner"
            className="h-8 w-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Viewfinder */}
      <div className="p-4 space-y-3">
        <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-xl border border-gray-200 bg-[#1a0d1f] overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${
              cameraState === 'active' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Crisp Target Reticle */}
          {cameraState === 'active' && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 border border-white/25 rounded-xl">
                <span className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-[#E9D5FF] rounded-tl-lg" />
                <span className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-[#E9D5FF] rounded-tr-lg" />
                <span className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-[#E9D5FF] rounded-bl-lg" />
                <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-[#E9D5FF] rounded-br-lg" />
              </div>
            </div>
          )}

          {cameraState === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white p-4 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#E9D5FF]" />
              <p className="text-xs text-white/85">Starting camera scanner...</p>
            </div>
          )}

          {cameraState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white p-4 text-center">
              <Camera className="w-7 h-7 text-[#E9D5FF]" aria-hidden="true" />
              <p className="text-xs text-white/80 max-w-xs">
                Activate your device camera to scan a Dermaspace gift card QR code, or upload an image file.
              </p>
              <button
                type="button"
                onClick={() => void startCamera()}
                className="h-9 px-4 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Start Camera</span>
              </button>
            </div>
          )}

          {cameraState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-white p-5 text-center bg-[#1a0d1f]">
              <AlertCircle className="w-7 h-7 text-[#E9D5FF]" aria-hidden="true" />
              <p className="text-xs text-white/85 max-w-sm leading-relaxed">
                {errorMessage || 'Camera could not be started.'}
              </p>
              <button
                type="button"
                onClick={() => void startCamera()}
                className="h-9 px-3.5 rounded-lg border border-white/25 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Retry Camera</span>
              </button>
            </div>
          )}
        </div>

        {errorMessage && cameraState !== 'error' && (
          <div className="rounded-xl border border-[#7B2D8E]/20 bg-[#FAF6FB] px-3 py-2 text-xs text-[#5A1D6A] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#7B2D8E] shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Controls row: Upload QR photo + Camera toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadQrImage}
            className="hidden"
            data-testid="gift-card-qr-file-input"
          />
          <button
            type="button"
            disabled={imageScanning}
            onClick={() => fileInputRef.current?.click()}
            className="h-10 px-3.5 rounded-xl border border-[#7B2D8E]/30 bg-[#FAF6FB] hover:bg-[#F3E8FF] text-[#7B2D8E] text-xs font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {imageScanning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{imageScanning ? 'Reading QR Image...' : 'Upload QR Image'}</span>
          </button>

          {cameraState === 'active' ? (
            <button
              type="button"
              onClick={() => {
                stopCamera()
                setCameraState('idle')
              }}
              className="h-10 px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startCamera()}
              className="h-10 px-3.5 rounded-xl bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Use Camera</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
