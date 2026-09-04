'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Camera, Link2, Loader2, QrCode, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

function getBarcodeDetector() {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
    return null
  }

  try {
    return new window.BarcodeDetector({ formats: ['qr_code'] })
  } catch {
    return null
  }
}

function getPaymentPath(value) {
  const text = String(value ?? '').trim()

  if (!text) {
    throw new Error('Enter a Quid payment link.')
  }

  let url

  try {
    url = text.startsWith('/') ? new URL(text, window.location.origin) : new URL(text)
  } catch {
    throw new Error('That QR does not contain a valid Quid payment link.')
  }

  if (!['http:', 'https:'].includes(url.protocol) || !/^\/pay\/[a-z0-9_-]+$/i.test(url.pathname)) {
    throw new Error('That QR is not a Quid payment link.')
  }

  return `${url.pathname}${url.search}`
}

export function ScanPayCard() {
  const router = useRouter()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [paymentLink, setPaymentLink] = useState('')
  const [error, setError] = useState('')
  const [detectorAvailable, setDetectorAvailable] = useState(null)

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }

  function openPayment(rawValue) {
    try {
      const path = getPaymentPath(rawValue)
      setError('')
      stopCamera()
      router.push(path)
    } catch (scanError) {
      setError(scanError.message)
    }
  }

  async function startCamera() {
    const detector = getBarcodeDetector()

    if (!detector || !navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot scan QR codes from camera. Paste or upload the Quid link instead.')
      return
    }

    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      })
      streamRef.current = stream
      setIsScanning(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setError('Camera permission was not granted.')
      stopCamera()
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const detector = getBarcodeDetector()

    if (!detector) {
      setError('This browser cannot read QR uploads. Paste the Quid payment link instead.')
      return
    }

    setIsReadingFile(true)
    setError('')

    try {
      const bitmap = await createImageBitmap(file)
      const results = await detector.detect(bitmap)
      bitmap.close?.()

      if (!results.length) {
        throw new Error('No QR code was found in that image.')
      }

      openPayment(results[0].rawValue)
    } catch (uploadError) {
      setError(uploadError.message ?? 'Could not read that QR image.')
    } finally {
      setIsReadingFile(false)
      event.target.value = ''
    }
  }

  useEffect(() => {
    if (!isScanning) {
      return undefined
    }

    const detector = getBarcodeDetector()

    if (!detector) {
      return undefined
    }

    let cancelled = false
    const interval = window.setInterval(async () => {
      const video = videoRef.current

      if (!video || video.readyState < 2) {
        return
      }

      try {
        const results = await detector.detect(video)

        if (!cancelled && results[0]?.rawValue) {
          openPayment(results[0].rawValue)
        }
      } catch {
        // Keep scanning; some frames are unreadable while the camera settles.
      }
    }, 650)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [isScanning])

  useEffect(() => {
    setDetectorAvailable(Boolean(getBarcodeDetector()))
  }, [])

  useEffect(() => (
    () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  ), [])

  return (
    <section className="quid-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-arc">Scan to pay</p>
          <h2 className="mt-2 text-2xl font-black text-ink">Open a Quid QR payment.</h2>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-md border border-arc/20 bg-haze text-arc">
          <QrCode size={20} />
        </div>
      </div>

      {isScanning ? (
        <div className="mt-5 overflow-hidden rounded-lg border border-arc/20 bg-night">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">Quid payment link</span>
          <input
            value={paymentLink}
            onChange={(event) => setPaymentLink(event.target.value)}
            className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-arc"
            placeholder="/pay/username?amount=5"
          />
        </label>
        <button
          type="button"
          onClick={() => openPayment(paymentLink)}
          className="quid-primary-action h-11 self-end px-4"
        >
          <Link2 size={16} /> Open
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={isScanning ? stopCamera : startCamera} className="quid-secondary-action">
          {isScanning ? <X size={16} /> : <Camera size={16} />}
          {isScanning ? 'Stop camera' : 'Use camera'}
        </button>
        <label className="quid-secondary-action cursor-pointer">
          {isReadingFile ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Upload QR
          <input type="file" accept="image/*" onChange={handleUpload} className="sr-only" />
        </label>
        {detectorAvailable === false ? (
          <span className="inline-flex min-h-10 items-center rounded-md bg-haze px-3 text-xs font-bold text-ink/55">
            Paste link supported
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 flex gap-2 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">
          <AlertCircle size={18} /> {error}
        </p>
      ) : null}
    </section>
  )
}
