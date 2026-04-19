'use client'

import { useEffect, useRef, useState } from 'react'
import {
  MapPin,
  Navigation,
  Clock,
  Car,
  ExternalLink,
  X,
  Loader2,
  Footprints,
  Bike,
  ArrowUp,
  ArrowUpRight,
  ArrowUpLeft,
  CornerUpRight,
  CornerUpLeft,
  RotateCcw,
  Flag,
  Crosshair,
  List,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
// Leaflet's base stylesheet — static import so Next.js bundles it at build time.
// The Leaflet JS itself is dynamic-imported below to keep the initial bundle slim.
import 'leaflet/dist/leaflet.css'

// Coordinates for our two Lagos branches.
// Exposed so the parent can pass them down or tests can reference them.
export type BranchId = 'vi' | 'ikoyi'

export interface Branch {
  id: BranchId
  name: string
  address: string
  phone: string
  whatsapp: string
  hours: string
  lat: number
  lng: number
}

export const BRANCHES: Branch[] = [
  {
    id: 'vi',
    name: 'Victoria Island',
    address: '237B Muri Okunola Street, VI, Lagos',
    phone: '+234 906 183 6625',
    whatsapp: '+2349061836625',
    hours: 'Mon – Sat: 9am – 7pm',
    lat: 6.4302,
    lng: 3.4217,
  },
  {
    id: 'ikoyi',
    name: 'Ikoyi',
    address: '44A, Awolowo Road, Ikoyi, Lagos',
    phone: '+234 901 313 4945',
    whatsapp: '+2349013134945',
    hours: 'Mon – Sat: 9am – 7pm',
    lat: 6.4481,
    lng: 3.4316,
  },
]

type LatLng = { lat: number; lng: number }

// A single turn-by-turn instruction, modelled on OSRM's `RouteStep`. We keep
// just the fields we actually render so the UI is trivial to reason about.
export interface RouteStep {
  instruction: string   // Human-readable "Turn right onto Awolowo Road"
  distanceM: number     // Length of this step in metres
  durationS: number     // Duration of this step in seconds
  maneuver: string      // 'turn' | 'depart' | 'arrive' | 'continue' | …
  modifier?: string     // 'left' | 'right' | 'slight left' | …
  name?: string         // Street name for the step
  start: [number, number] // [lat, lng] — step's starting point
}

type RouteInfo = {
  distanceKm: number
  durationMin: number
  coords: [number, number][]
  steps: RouteStep[]
}

// Travel modes supported inside the map. OSRM's public demo only provides
// driving / walking / cycling profiles — motorcycle reuses the driving graph
// but applies a 0.85x duration multiplier to reflect how motorbikes weave
// through Lagos traffic, and deep-links to Google Maps with `two-wheeler`.
export type TravelMode = 'car' | 'walk' | 'bike' | 'motor'

interface ModeConfig {
  id: TravelMode
  label: string
  osrm: 'driving' | 'walking' | 'cycling'
  googleMode: 'driving' | 'walking' | 'bicycling' | 'two-wheeler'
  icon: typeof Car
  durationFactor: number
  // Fallback km/h for when OSRM is unreachable (for haversine estimates)
  fallbackKmh: number
  // Style for the fallback dashed polyline
  dashArray: string
}

const MODES: Record<TravelMode, ModeConfig> = {
  car: {
    id: 'car',
    label: 'Drive',
    osrm: 'driving',
    googleMode: 'driving',
    icon: Car,
    durationFactor: 1,
    fallbackKmh: 25,
    dashArray: '',
  },
  motor: {
    id: 'motor',
    label: 'Motorcycle',
    osrm: 'driving',
    googleMode: 'two-wheeler',
    icon: MotorcycleIcon,
    durationFactor: 0.85,
    fallbackKmh: 35,
    dashArray: '',
  },
  bike: {
    id: 'bike',
    label: 'Bike',
    osrm: 'cycling',
    googleMode: 'bicycling',
    icon: Bike,
    durationFactor: 1,
    fallbackKmh: 15,
    dashArray: '2,6',
  },
  walk: {
    id: 'walk',
    label: 'Walk',
    osrm: 'walking',
    googleMode: 'walking',
    icon: Footprints,
    durationFactor: 1,
    fallbackKmh: 5,
    dashArray: '2,6',
  },
}

const MODE_ORDER: TravelMode[] = ['car', 'motor', 'bike', 'walk']

// Lucide doesn't ship a motorcycle glyph, so we inline a compact SVG that
// matches the stroke-width of neighbouring icons. Typed loosely to share the
// `typeof Car` slot in MODES above.
function MotorcycleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="5.5" cy="17" r="3.5" />
      <circle cx="18.5" cy="17" r="3.5" />
      <path d="M15 6h3l2 4" />
      <path d="M5.5 17 8 10l4 4h4" />
      <path d="M8 10h5" />
    </svg>
  )
}

interface InteractiveMapProps {
  activeBranchId?: BranchId
  onSelectBranch?: (id: BranchId) => void
  height?: string
}

// Haversine fallback if OSRM is unreachable — distance as the crow flies (km)
function haversine(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

// Turn a raw OSRM maneuver into a short, readable instruction. We don't use
// the optional `osrm-text-instructions` lib because it'd pull ~60kB for what
// amounts to a small lookup table — this covers everything OSRM emits in
// driving / cycling / walking profiles.
function osrmStepToText(
  step: {
    name?: string
    maneuver: { type: string; modifier?: string }
  },
  destinationName: string,
): string {
  const { type, modifier } = step.maneuver
  const road = step.name?.trim()
  const onRoad = road ? ` onto ${road}` : ''
  const stayOn = road ? ` on ${road}` : ''
  const modLabel =
    modifier === 'slight left' ? 'slight left'
    : modifier === 'slight right' ? 'slight right'
    : modifier === 'sharp left' ? 'sharp left'
    : modifier === 'sharp right' ? 'sharp right'
    : modifier === 'left' ? 'left'
    : modifier === 'right' ? 'right'
    : modifier === 'straight' ? 'straight'
    : modifier === 'uturn' ? 'U-turn'
    : modifier || ''

  switch (type) {
    case 'depart':       return road ? `Head out on ${road}` : 'Start the route'
    case 'arrive':       return `Arrive at ${destinationName}`
    case 'turn':         return `Turn ${modLabel}${onRoad}`
    case 'new name':     return road ? `Continue on ${road}` : 'Continue'
    case 'continue':     return modLabel && modLabel !== 'straight' ? `Keep ${modLabel}${stayOn}` : `Continue${stayOn}`
    case 'merge':        return `Merge ${modLabel}${onRoad}`.trim()
    case 'on ramp':      return `Take the ramp${modLabel ? ` ${modLabel}` : ''}${onRoad}`
    case 'off ramp':     return `Take the exit${modLabel ? ` ${modLabel}` : ''}${onRoad}`
    case 'fork':         return `Keep ${modLabel || 'straight'}${onRoad}`.trim()
    case 'end of road':  return `At the end of the road, turn ${modLabel}${onRoad}`
    case 'roundabout':
    case 'rotary':       return `At the roundabout, take the exit${onRoad}`
    case 'roundabout turn': return `At the roundabout, turn ${modLabel}${onRoad}`
    case 'exit roundabout':
    case 'exit rotary':  return `Exit the roundabout${onRoad}`
    case 'notification': return road ? `Continue on ${road}` : 'Continue'
    default:             return modLabel ? `Turn ${modLabel}${onRoad}` : `Continue${stayOn}`
  }
}

// Human readable "0.5 km" / "120 m"
function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.max(10, Math.round(metres / 10) * 10)} m`
  return `${(metres / 1000).toFixed(metres < 10000 ? 1 : 0)} km`
}

// Render the right directional icon for a maneuver. Icons stay a clean 18px
// square so they line up with the fixed-size rounded squares around them.
function getManeuverIcon(maneuver: string, modifier?: string) {
  const cls = 'w-[18px] h-[18px]'
  if (maneuver === 'arrive') return <Flag className={cls} aria-hidden="true" />
  if (maneuver === 'depart') return <Navigation className={cls} aria-hidden="true" />
  if (maneuver === 'roundabout' || maneuver === 'rotary' || maneuver === 'roundabout turn') {
    return <RotateCcw className={cls} aria-hidden="true" />
  }
  const mod = modifier || ''
  if (mod === 'uturn') return <RotateCcw className={cls} aria-hidden="true" />
  if (mod.includes('sharp') && mod.includes('left')) return <CornerUpLeft className={cls} aria-hidden="true" />
  if (mod.includes('sharp') && mod.includes('right')) return <CornerUpRight className={cls} aria-hidden="true" />
  if (mod.includes('slight') && mod.includes('left')) return <ArrowUpLeft className={cls} aria-hidden="true" />
  if (mod.includes('slight') && mod.includes('right')) return <ArrowUpRight className={cls} aria-hidden="true" />
  if (mod === 'left') return <CornerUpLeft className={cls} aria-hidden="true" />
  if (mod === 'right') return <CornerUpRight className={cls} aria-hidden="true" />
  return <ArrowUp className={cls} aria-hidden="true" />
}

// Pick the step the user is currently on by finding the closest step start.
function nearestStepIndex(steps: RouteStep[], user: LatLng): number {
  if (steps.length === 0) return 0
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < steps.length; i++) {
    const d = haversine(user, { lat: steps[i].start[0], lng: steps[i].start[1] })
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

export default function InteractiveMap({
  activeBranchId = 'vi',
  onSelectBranch,
  height = '420px',
}: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // We store Leaflet itself + the map instance + marker/route references in
  // refs to avoid re-renders when they change.
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const LRef = useRef<typeof import('leaflet') | null>(null)
  const branchMarkersRef = useRef<Record<BranchId, import('leaflet').Marker | null>>({
    vi: null,
    ikoyi: null,
  })
  // User location uses a divIcon Marker now (for a proper pulsing halo look)
  // instead of a flat CircleMarker, so this ref is typed as a Marker.
  const userMarkerRef = useRef<import('leaflet').Marker | null>(null)
  const routeLineRef = useRef<import('leaflet').Polyline | null>(null)
  // White "casing" polyline underneath the purple route line — gives the
  // route the crisp outlined look that Google Maps uses so the path stays
  // legible against any tile colour (roads, parks, water).
  const routeCasingRef = useRef<import('leaflet').Polyline | null>(null)

  const [mapReady, setMapReady] = useState(false)
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [userHeading, setUserHeading] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const [route, setRoute] = useState<RouteInfo | null>(null)
  const [routing, setRouting] = useState(false)
  const [currentBranch, setCurrentBranch] = useState<BranchId>(activeBranchId)
  const [travelMode, setTravelMode] = useState<TravelMode>('car')

  // --- Full-page-only "Google Maps"-style state ------------------------
  // `followMode` keeps the map centred on the user as they move (toggled
  // off as soon as the user pans manually, just like Google Maps).
  // `stepsOpen` controls whether the turn-by-turn list is expanded in the
  // bottom card on the full-page variant.
  const [followMode, setFollowMode] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)
  // Index of the active step — updated as the user moves along the route.
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  // `watchId` is kept in a ref so the cleanup in `clearRoute` / unmount can
  // cancel the geolocation watcher deterministically.
  const watchIdRef = useRef<number | null>(null)

  // Ephemeral "Use two fingers to move the map" toast — only used on the
  // full-page variant when a touch user tries to single-finger drag.
  const [showTwoFingerHint, setShowTwoFingerHint] = useState(false)

  // Compact embeds (every home-page usage) should NOT hijack touch scrolling.
  // When a user's finger lands on the map while scrolling, Leaflet's default
  // single-finger drag would pan the map and "swallow" the page scroll,
  // making the map content appear to lap/slide around inside its box instead
  // of scrolling the page. Full-page usage (/locations, height="100%") keeps
  // the normal draggable behaviour — but on touch devices we still require
  // two fingers to pan so vertical page scroll is never hijacked there either.
  const isCompact = height !== '100%'

  // Keep internal currentBranch in sync with parent
  useEffect(() => {
    setCurrentBranch(activeBranchId)
  }, [activeBranchId])

  // Initialise Leaflet once on mount (client-only via dynamic import)
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current) return

      LRef.current = L

      const map = L.map(containerRef.current, {
        center: [6.44, 3.43],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        // Subtle inertia for the premium feel
        inertia: true,
        worldCopyJump: false,
        scrollWheelZoom: false, // Avoid hijacking page scroll
        // On the compact home-page embed, disable single-finger drag so
        // vertical touch gestures scroll the page instead of panning the
        // map. Users can still zoom with the +/- buttons or tap "Open full
        // map" below for the fully interactive experience.
        dragging: !isCompact,
        touchZoom: !isCompact,
        doubleClickZoom: !isCompact,
        boxZoom: !isCompact,
        keyboard: !isCompact,
        tap: true,
      })
      mapRef.current = map

      // CartoDB "Positron" tiles — clean, light, on-brand with our palette
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
        }
      ).addTo(map)

      // Zoom control only shown on the full-page interactive map — on the
      // compact home-page preview the map is non-interactive, so the zoom
      // buttons would just be visual clutter.
      if (!isCompact) {
        L.control.zoom({ position: 'topright' }).addTo(map)
      }
      L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map)

      // Branch markers — custom HTML with pulsing halo, matches brand purple
      for (const branch of BRANCHES) {
        const icon = L.divIcon({
          className: 'dermaspace-marker',
          html: `
            <div class="ds-marker-root" aria-label="${branch.name}">
              <span class="ds-marker-pulse"></span>
              <span class="ds-marker-pin">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </span>
            </div>
          `,
          iconSize: [40, 52],
          iconAnchor: [20, 52],
        })

        const marker = L.marker([branch.lat, branch.lng], { icon, title: branch.name })
          .addTo(map)
          .on('click', () => {
            setCurrentBranch(branch.id)
            onSelectBranch?.(branch.id)
          })
        branchMarkersRef.current[branch.id] = marker
      }

      // flyTo the active branch after tiles paint for a smooth opening
      const active = BRANCHES.find((b) => b.id === activeBranchId) || BRANCHES[0]
      map.flyTo([active.lat, active.lng], 15, { duration: 1.2 })

      setMapReady(true)
    }

    init()

    // --------------------------------------------------------------------
    // Two-finger-pan gate (full-page map, touch devices only).
    //
    // Even on the full-page /locations map, a single-finger touch should
    // never steal the user's vertical page-scroll gesture. We follow the
    // Google-Maps-embed convention: Leaflet's dragging is disabled by
    // default and only enabled while two or more fingers are on the map.
    // A quick hint toast flashes when the user tries to single-finger drag
    // so the affordance is obvious the first time.
    // --------------------------------------------------------------------
    let cleanupTouch: (() => void) | null = null
    const isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0)

    if (!isCompact && isTouchDevice && containerRef.current) {
      const container = containerRef.current
      let hintTimer: ReturnType<typeof setTimeout> | null = null

      const handleTouchStart = (e: TouchEvent) => {
        const map = mapRef.current
        if (!map) return
        if (e.touches.length >= 2) {
          // Multi-touch: allow panning / pinch-zooming.
          map.dragging.enable()
          setShowTwoFingerHint(false)
          if (hintTimer) {
            clearTimeout(hintTimer)
            hintTimer = null
          }
        }
      }

      const handleTouchMove = (e: TouchEvent) => {
        const map = mapRef.current
        if (!map) return
        // Single-finger attempts to drag — flash the hint so the user knows
        // to use two fingers. We DON'T preventDefault, so the browser still
        // scrolls the page naturally.
        if (e.touches.length === 1 && !map.dragging.enabled()) {
          setShowTwoFingerHint(true)
          if (hintTimer) clearTimeout(hintTimer)
          hintTimer = setTimeout(() => setShowTwoFingerHint(false), 1400)
        }
      }

      const handleTouchEnd = (e: TouchEvent) => {
        const map = mapRef.current
        if (!map) return
        if (e.touches.length < 2) {
          map.dragging.disable()
        }
      }

      container.addEventListener('touchstart', handleTouchStart, { passive: true })
      container.addEventListener('touchmove', handleTouchMove, { passive: true })
      container.addEventListener('touchend', handleTouchEnd, { passive: true })
      container.addEventListener('touchcancel', handleTouchEnd, { passive: true })

      // Start in the "locked" state — dragging only turns on when the user
      // puts a second finger down.
      const waitForMap = () => {
        if (mapRef.current) {
          mapRef.current.dragging.disable()
        } else if (!cancelled) {
          setTimeout(waitForMap, 50)
        }
      }
      waitForMap()

      cleanupTouch = () => {
        container.removeEventListener('touchstart', handleTouchStart)
        container.removeEventListener('touchmove', handleTouchMove)
        container.removeEventListener('touchend', handleTouchEnd)
        container.removeEventListener('touchcancel', handleTouchEnd)
        if (hintTimer) clearTimeout(hintTimer)
      }
    }

    return () => {
      cancelled = true
      if (cleanupTouch) cleanupTouch()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      LRef.current = null
      branchMarkersRef.current = { vi: null, ikoyi: null }
      userMarkerRef.current = null
      routeLineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When currentBranch changes, smoothly pan to it and highlight
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const branch = BRANCHES.find((b) => b.id === currentBranch)
    if (!branch) return
    mapRef.current.flyTo([branch.lat, branch.lng], 15.5, { duration: 1 })

    // Swap classes on markers so the active one stands out
    for (const b of BRANCHES) {
      const m = branchMarkersRef.current[b.id]
      const el = m?.getElement()
      if (el) {
        const root = el.querySelector('.ds-marker-root') as HTMLElement | null
        if (root) root.classList.toggle('is-active', b.id === currentBranch)
      }
    }
  }, [currentBranch, mapReady])

  // Request user location and draw route. On the full-page variant we
  // then start a `watchPosition` session so the user dot updates live as
  // they move — that's what makes the experience feel like Google Maps.
  const handleLocateAndRoute = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocateError('Your browser does not support location.')
      return
    }
    setLocating(true)
    setLocateError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const user: LatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        setUserLocation(user)
        if (typeof pos.coords.heading === 'number' && !Number.isNaN(pos.coords.heading)) {
          setUserHeading(pos.coords.heading)
        }
        setLocating(false)

        await drawRoute(user, currentBranch, travelMode)

        // Full-page variant gets live tracking. On the compact embed we
        // keep it cheap — one-shot position + static route is plenty.
        if (!isCompact) {
          setFollowMode(true)
          startWatch()
        }
      },
      (err) => {
        setLocating(false)
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enable it and try again.'
            : 'Could not get your location.'
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  // Start / stop the live geolocation watcher. We re-drive only the
  // user marker and (optionally) follow-mode camera — we don't re-hit
  // OSRM on every tick (that'd hammer the public demo router and
  // thrash the polyline). Re-routing happens only when the branch or
  // travel mode changes.
  const startWatch = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return
    if (watchIdRef.current !== null) return // already watching
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next: LatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        setUserLocation(next)
        if (typeof pos.coords.heading === 'number' && !Number.isNaN(pos.coords.heading)) {
          setUserHeading(pos.coords.heading)
        }
      },
      () => { /* swallow transient errors — we keep the last-known position */ },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    )
  }

  const stopWatch = () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    watchIdRef.current = null
  }

  // Recenter the camera on the user and re-enable follow mode. Used by
  // the floating "my location" button on the full-page map.
  const recenterOnUser = () => {
    if (!mapRef.current || !userLocation) return
    setFollowMode(true)
    mapRef.current.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 0.8 })
  }

  // Re-route whenever the selected branch OR travel mode changes (if already located)
  useEffect(() => {
    if (userLocation) {
      drawRoute(userLocation, currentBranch, travelMode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBranch, travelMode])

  // Live-update the user marker as geolocation ticks come in. We only
  // move the existing marker here (it's created by `drawRoute` on first
  // fix). If follow mode is on, gently pan the camera to keep the dot
  // on screen — same UX pattern as Google Maps.
  useEffect(() => {
    if (!userLocation || !mapRef.current || !userMarkerRef.current) return
    userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng])

    if (followMode) {
      // panTo feels smoother than flyTo on rapid GPS updates because it
      // doesn't reset zoom or queue long animations.
      mapRef.current.panTo([userLocation.lat, userLocation.lng], {
        animate: true,
        duration: 0.5,
      })
    }

    // Advance the active step based on proximity to each step start.
    if (route && route.steps.length > 0) {
      const idx = nearestStepIndex(route.steps, userLocation)
      setActiveStepIndex(idx)
    }
  }, [userLocation, followMode, route])

  // Rotate the user marker's arrow glyph to match device heading (if we
  // got one from the Geolocation API). We touch the DOM directly because
  // the marker is a divIcon — cheaper than re-issuing `setIcon`.
  useEffect(() => {
    if (!userMarkerRef.current) return
    const el = userMarkerRef.current.getElement()
    const arrow = el?.querySelector<HTMLElement>('.ds-user-heading')
    if (!arrow) return
    if (userHeading === null) {
      arrow.style.display = 'none'
      return
    }
    arrow.style.display = ''
    arrow.style.transform = `rotate(${userHeading}deg)`
  }, [userHeading])

  // Any manual drag/zoom = the user took control, so we stop following.
  // This mirrors Google Maps, where pressing "my location" re-engages
  // follow mode via `recenterOnUser`.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const handleUserInteraction = () => {
      if (followMode) setFollowMode(false)
    }
    map.on('dragstart', handleUserInteraction)
    map.on('zoomstart', handleUserInteraction)
    return () => {
      map.off('dragstart', handleUserInteraction)
      map.off('zoomstart', handleUserInteraction)
    }
  }, [followMode, mapReady])

  // Stop watching when the component unmounts — critical on mobile so
  // we don't keep the GPS radio hot after the user leaves the page.
  useEffect(() => {
    return () => stopWatch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const drawRoute = async (user: LatLng, branchId: BranchId, mode: TravelMode) => {
    const L = LRef.current
    const map = mapRef.current
    if (!L || !map) return
    const branch = BRANCHES.find((b) => b.id === branchId)
    if (!branch) return

    const cfg = MODES[mode]
    setRouting(true)

    // Drop/update a user-location dot. We use a custom divIcon instead of a
    // flat circleMarker so we can layer a subtle pulsing halo behind a
    // crisp white-ringed center — the same visual language as iOS/Google
    // Maps, which everyone instantly recognises as "you are here".
    // Colour is Dermaspace brand purple; the round dot shape is already
    // clearly distinct from the teardrop branch pins so there's no ambiguity.
    const userIcon = L.divIcon({
      className: 'dermaspace-user-marker',
      html: `
        <div class="ds-user-root" aria-label="Your location">
          <span class="ds-user-pulse"></span>
          <span class="ds-user-heading" style="display:none">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#7B2D8E" aria-hidden="true">
              <path d="M12 2 4 20l8-4 8 4z"/>
            </svg>
          </span>
          <span class="ds-user-ring">
            <span class="ds-user-core"></span>
          </span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([user.lat, user.lng])
    } else {
      userMarkerRef.current = L.marker([user.lat, user.lng], {
        icon: userIcon,
        // Keep the user dot below branch pins so it never occludes a pin
        // when the user is standing right next to a branch.
        zIndexOffset: -100,
        keyboard: false,
      })
        .addTo(map)
        .bindTooltip('You are here', { direction: 'top', offset: [0, -8] })
    }

    // Ask OSRM (public demo) for a real route using the selected profile.
    // We opt into `steps=true` so we get turn-by-turn instructions we can
    // render Google-Maps-style in the bottom sheet on the full-page view.
    try {
      const url = `https://router.project-osrm.org/route/v1/${cfg.osrm}/${user.lng},${user.lat};${branch.lng},${branch.lat}?overview=full&geometries=geojson&steps=true&annotations=false`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Route fetch failed')
      const data = await res.json()
      const leg = data?.routes?.[0]
      if (!leg) throw new Error('No route returned')
      const coords: [number, number][] = leg.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]]
      )
      const distanceKm = leg.distance / 1000
      // Apply per-mode duration factor (e.g. motorcycles are faster than cars
      // on the same road in Lagos because they filter through traffic).
      const durationMin = (leg.duration / 60) * cfg.durationFactor

      // Flatten OSRM's nested legs[].steps[] into our RouteStep[].
      type OsrmStep = {
        distance: number
        duration: number
        name?: string
        maneuver: {
          type: string
          modifier?: string
          location: [number, number]
        }
      }
      const steps: RouteStep[] = []
      for (const osrmLeg of (leg.legs || []) as { steps?: OsrmStep[] }[]) {
        for (const s of osrmLeg.steps || []) {
          steps.push({
            instruction: osrmStepToText(s, branch.name),
            distanceM: s.distance,
            durationS: s.duration,
            maneuver: s.maneuver.type,
            modifier: s.maneuver.modifier,
            name: s.name,
            // OSRM returns [lng, lat] — our state keeps [lat, lng]
            start: [s.maneuver.location[1], s.maneuver.location[0]],
          })
        }
      }

      // Replace any prior polyline. We draw the route as two stacked
      // polylines — a thicker white "underline" and the purple route on
      // top — which is the classic Google Maps look and stays readable
      // over any tile colour.
      if (routeLineRef.current) {
        routeLineRef.current.remove()
        routeLineRef.current = null
      }
      if (routeCasingRef.current) {
        routeCasingRef.current.remove()
        routeCasingRef.current = null
      }
      const mainWeight = mode === 'walk' || mode === 'bike' ? 5 : 6
      routeCasingRef.current = L.polyline(coords, {
        color: '#ffffff',
        weight: mainWeight + 4,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)
      routeLineRef.current = L.polyline(coords, {
        color: '#7B2D8E',
        weight: mainWeight,
        opacity: 0.98,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: cfg.dashArray || undefined,
        className: 'ds-route-line',
      }).addTo(map)

      // Fit map to the full route with generous padding
      map.fitBounds(routeLineRef.current.getBounds(), { padding: [60, 60], maxZoom: 15 })

      setRoute({ distanceKm, durationMin, coords, steps })
      setActiveStepIndex(0)
    } catch {
      // Fallback: crow-flies estimate using the mode's fallback speed
      const km = haversine(user, { lat: branch.lat, lng: branch.lng }) * 1.3
      const durationMin = ((km / cfg.fallbackKmh) * 60) * cfg.durationFactor
      if (routeLineRef.current) {
        routeLineRef.current.remove()
        routeLineRef.current = null
      }
      if (routeCasingRef.current) {
        routeCasingRef.current.remove()
        routeCasingRef.current = null
      }
      routeLineRef.current = L.polyline(
        [
          [user.lat, user.lng],
          [branch.lat, branch.lng],
        ],
        {
          color: '#7B2D8E',
          weight: 4,
          opacity: 0.85,
          dashArray: '8,8',
          className: 'ds-route-line',
        }
      ).addTo(map)
      map.fitBounds(routeLineRef.current.getBounds(), { padding: [60, 60], maxZoom: 15 })
      setRoute({ distanceKm: km, durationMin, coords: [], steps: [] })
      setActiveStepIndex(0)
    } finally {
      setRouting(false)
    }
  }

  const clearRoute = () => {
    if (routeLineRef.current) {
      routeLineRef.current.remove()
      routeLineRef.current = null
    }
    if (routeCasingRef.current) {
      routeCasingRef.current.remove()
      routeCasingRef.current = null
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }
    // Stop the live GPS watcher — important on mobile so the radio
    // doesn't stay hot after the user exits turn-by-turn.
    stopWatch()
    setRoute(null)
    setUserLocation(null)
    setUserHeading(null)
    setFollowMode(false)
    setStepsOpen(false)
    setActiveStepIndex(0)
    // Return focus to the current branch
    const branch = BRANCHES.find((b) => b.id === currentBranch)
    if (branch && mapRef.current) {
      mapRef.current.flyTo([branch.lat, branch.lng], 15.5, { duration: 1 })
    }
  }

  const activeBranch = BRANCHES.find((b) => b.id === currentBranch) || BRANCHES[0]

  return (
    // When `height="100%"` we drop the rounded corners + ring so the map
    // can sit flush inside a full-page layout (e.g. our /locations page).
    // For any fixed height value we keep the card-style chrome that fits
    // nicely inside a home-page section.
    <div
      className={
        height === '100%'
          ? 'relative w-full h-full overflow-hidden bg-gray-50'
          : 'relative w-full rounded-2xl overflow-hidden ring-1 ring-gray-200 bg-gray-50'
      }
      // `isolation` + `translateZ(0)` force the container onto its own GPU
      // compositing layer. Without this, iOS Safari / mobile Chrome fail to
      // clip Leaflet's absolutely-positioned tile panes to the rounded
      // corners during momentum scroll, so the map tiles visibly "escape"
      // past the card edges while the user is scrolling the page.
      style={
        height === '100%'
          ? { isolation: 'isolate', transform: 'translateZ(0)' }
          : { height, isolation: 'isolate', transform: 'translateZ(0)' }
      }
    >
      {/* Map canvas.
          We set `touchAction: pan-y` on both variants so vertical page-scroll
          gestures are never swallowed by the map. On the compact embed the
          map is fully non-interactive; on the full-page variant we gate
          multi-touch panning through the two-finger-pan hook above (which
          toggles dragging on when a second finger lands). */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'pan-y' }}
        aria-label="Interactive map of Dermaspace locations"
      />

      {/* Two-finger-pan hint — only rendered on the full-page map; shown
          briefly when a user attempts a single-finger drag. Purely a
          visual affordance; pointer-events are disabled so it never
          blocks interactions. */}
      {!isCompact && (
        <div
          aria-hidden={!showTwoFingerHint}
          className={`absolute inset-0 z-[600] flex items-center justify-center pointer-events-none transition-opacity duration-200 ${
            showTwoFingerHint ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="px-4 py-2 rounded-full bg-gray-900/85 text-white text-xs font-semibold shadow-lg backdrop-blur-sm">
            Use two fingers to move the map
          </div>
        </div>
      )}

      {/* Loading placeholder (tiles haven't painted yet) */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="flex items-center gap-2 text-[#7B2D8E]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-medium">Loading map…</span>
          </div>
        </div>
      )}

      {/* Branch switch pill — top-left. Compact so it never crowds other chrome. */}
      <div className="absolute top-3 left-3 z-[500] bg-white rounded-full shadow-md ring-1 ring-gray-100 p-1 flex items-center gap-1">
        {BRANCHES.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              setCurrentBranch(b.id)
              onSelectBranch?.(b.id)
            }}
            aria-pressed={b.id === currentBranch}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors ${
              b.id === currentBranch
                ? 'bg-[#7B2D8E] text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Clear-route chip — only shows while a route is drawn, top-right. Sits
          BELOW the zoom control so nothing overlaps. */}
      {route && (
        <div className="absolute top-14 right-3 z-[500] flex flex-col gap-2 items-end">
          <button
            type="button"
            onClick={clearRoute}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-white text-gray-600 rounded-full shadow-md ring-1 ring-gray-100 hover:bg-gray-50"
          >
            <X className="w-3 h-3" />
            Exit
          </button>
          {/* Recenter / follow control — full-page only, mirrors the
              Google Maps "my location" FAB. Shows filled purple when we
              are currently following the user, outline otherwise. */}
          {!isCompact && userLocation && (
            <button
              type="button"
              onClick={recenterOnUser}
              aria-pressed={followMode}
              aria-label={followMode ? 'Following your location' : 'Recenter on your location'}
              className={`w-10 h-10 rounded-full shadow-md ring-1 flex items-center justify-center transition-colors ${
                followMode
                  ? 'bg-[#7B2D8E] text-white ring-[#7B2D8E]/30 hover:bg-[#6B2278]'
                  : 'bg-white text-[#7B2D8E] ring-gray-100 hover:bg-[#7B2D8E]/10'
              }`}
            >
              <Crosshair className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Error banner */}
      {locateError && (
        <div className="absolute top-14 left-3 right-3 z-[500] px-3 py-2 text-[11px] text-rose-700 bg-rose-50 rounded-lg ring-1 ring-rose-100 shadow-sm">
          {locateError}
        </div>
      )}

      {/* Bottom info card — address, mode tabs, and route details */}
      <div className="absolute bottom-3 left-3 right-3 z-[500]">
        <div className="bg-white rounded-2xl shadow-lg ring-1 ring-gray-100 overflow-hidden">
          {/* Travel mode tabs — always visible, like Google Maps. Clicking a
              tab immediately re-routes if we already have the user's location. */}
          <div
            role="tablist"
            aria-label="Travel mode"
            className="flex items-stretch border-b border-gray-100"
          >
            {MODE_ORDER.map((m) => {
              const cfg = MODES[m]
              const Icon = cfg.icon
              const isActive = travelMode === m
              return (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTravelMode(m)}
                  disabled={routing}
                  className={`group relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors disabled:cursor-wait ${
                    isActive
                      ? 'text-[#7B2D8E]'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{cfg.label}</span>
                  {/* Active underline */}
                  <span
                    className={`absolute left-3 right-3 bottom-0 h-0.5 rounded-t-full transition-all ${
                      isActive ? 'bg-[#7B2D8E] opacity-100' : 'bg-[#7B2D8E] opacity-0'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              )
            })}
          </div>

          {/* Body — route summary (active route) OR address + primary CTA (idle) */}
          {route ? (
            <>
              {/* On the full-page variant, lead with the CURRENT maneuver —
                  exactly like Google Maps' top banner. On the compact
                  embed we skip this to keep the card tiny. */}
              {!isCompact && route.steps.length > 0 && (() => {
                const step = route.steps[Math.min(activeStepIndex, route.steps.length - 1)]
                return (
                  <div className="p-3 flex items-center gap-3 bg-[#7B2D8E] text-white">
                    <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                      {getManeuverIcon(step.maneuver, step.modifier)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                        {formatDistance(step.distanceM)}
                      </p>
                      <p className="text-sm font-semibold leading-tight line-clamp-2">
                        {step.instruction}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStepsOpen((v) => !v)}
                      aria-expanded={stepsOpen}
                      aria-label={stepsOpen ? 'Hide all steps' : 'Show all steps'}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-white/15 rounded-full hover:bg-white/25 transition-colors flex-shrink-0"
                    >
                      <List className="w-3 h-3" />
                      <span className="hidden sm:inline">Steps</span>
                      {stepsOpen ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronUp className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )
              })()}

              {/* Expanded step list — Google-Maps-style turn-by-turn. Scrollable
                  so even a long route fits without eating the whole viewport. */}
              {!isCompact && stepsOpen && route.steps.length > 0 && (
                <ol className="max-h-60 overflow-y-auto divide-y divide-gray-100 bg-white">
                  {route.steps.map((step, idx) => {
                    const isCurrent = idx === activeStepIndex
                    const isPast = idx < activeStepIndex
                    return (
                      <li
                        key={idx}
                        className={`flex items-start gap-3 px-3 py-2.5 ${
                          isCurrent ? 'bg-[#7B2D8E]/5' : ''
                        } ${isPast ? 'opacity-50' : ''}`}
                      >
                        <div
                          className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isCurrent
                              ? 'bg-[#7B2D8E] text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {getManeuverIcon(step.maneuver, step.modifier)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] leading-snug ${isCurrent ? 'text-gray-900 font-semibold' : 'text-gray-800'}`}>
                            {step.instruction}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 tabular-nums">
                            {formatDistance(step.distanceM)}
                            {' · '}
                            {Math.max(1, Math.round(step.durationS / 60))} min
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}

              {/* Summary strip — always shown so the user can see total
                  distance / ETA at a glance and jump to Google Maps. */}
              <div className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                  {routing ? (
                    <Loader2 className="w-5 h-5 text-[#7B2D8E] animate-spin" />
                  ) : (
                    (() => {
                      const ActiveIcon = MODES[travelMode].icon
                      return <ActiveIcon className="w-5 h-5 text-[#7B2D8E]" />
                    })()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                    <span className="text-base font-bold text-gray-900 tabular-nums">
                      {Math.max(1, Math.round(route.durationMin))} min
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 tabular-nums">
                      {route.distanceKm.toFixed(1)} km
                    </span>
                    <span className="text-[11px] font-medium text-gray-400 capitalize">
                      · {MODES[travelMode].label.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    To {activeBranch.name} · {activeBranch.address}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeBranch.lat},${activeBranch.lng}&travelmode=${MODES[travelMode].googleMode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-full hover:bg-[#7B2D8E]/20 transition-colors flex-shrink-0"
                  aria-label="Open in Google Maps"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="hidden sm:inline">Open in Maps</span>
                </a>
              </div>
            </>
          ) : (
            <div className="p-3 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-[#7B2D8E]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                  {activeBranch.name}
                </p>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  {activeBranch.address}
                </p>
              </div>
              {/* Primary directions CTA lives inside the card now, so it never
                  fights with the branch switcher or zoom control. */}
              <button
                type="button"
                onClick={handleLocateAndRoute}
                disabled={locating || routing}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#6B2278] disabled:opacity-60 disabled:cursor-wait transition-colors flex-shrink-0 shadow-sm"
              >
                {locating || routing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                <span>
                  {locating ? 'Locating' : routing ? 'Routing' : 'Directions'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Component-scoped styles for custom markers + animated route dash */}
      <style jsx global>{`
        .dermaspace-marker,
        .dermaspace-user-marker {
          background: transparent !important;
          border: none !important;
        }

        /* ---------- User location dot (iOS / Google Maps style) ----------
           Three stacked elements:
             1. pulse  — a ring that scales out and fades, creating the
                soft heartbeat feel.
             2. ring   — a 22px white disc, feels like the rubber halo
                around the location blip on phone maps.
             3. core   — a small solid dot sitting centred in the ring.
           Kept in a cool blue so it's clearly distinct from our brand
           purple branch pins. */
        .ds-user-root {
          position: relative;
          width: 28px;
          height: 28px;
          pointer-events: auto;
        }
        .ds-user-pulse {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          /* Brand purple halo (was blue) — 7B2D8E at 35% alpha. */
          background: rgba(123, 45, 142, 0.35);
          transform: scale(0.5);
          animation: ds-user-pulse 2s ease-out infinite;
          pointer-events: none;
        }
        .ds-user-ring {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: #ffffff;
          /* Soft brand-purple glow behind the white ring. */
          box-shadow: 0 2px 10px rgba(123, 45, 142, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ds-user-core {
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          /* Dermaspace brand purple core. */
          background: #7B2D8E;
        }
        /* Heading arrow — only shown when the Geolocation API supplies a
           compass bearing. Sits just above the white ring and rotates via
           inline transform so it always points in the direction of travel. */
        .ds-user-heading {
          position: absolute;
          left: 50%;
          top: -6px;
          margin-left: -5px;
          width: 10px;
          height: 10px;
          transform-origin: 5px 19px; /* pivot at centre of the dot below */
          pointer-events: none;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
        }
        @keyframes ds-user-pulse {
          0% {
            transform: scale(0.5);
            opacity: 0.85;
          }
          75% {
            transform: scale(2);
            opacity: 0;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .ds-marker-root {
          position: relative;
          width: 40px;
          height: 52px;
          pointer-events: auto;
        }
        .ds-marker-pulse {
          position: absolute;
          left: 50%;
          bottom: 4px;
          width: 32px;
          height: 32px;
          margin-left: -16px;
          border-radius: 9999px;
          background: rgba(123, 45, 142, 0.35);
          transform: scale(0.4);
          animation: ds-pulse 2s ease-out infinite;
          pointer-events: none;
        }
        .ds-marker-root.is-active .ds-marker-pulse {
          background: rgba(123, 45, 142, 0.55);
        }
        .ds-marker-pin {
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 28px;
          height: 36px;
          margin-left: -14px;
          background: #7b2d8e;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 14px rgba(123, 45, 142, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 180ms ease, background-color 180ms ease;
        }
        .ds-marker-root.is-active .ds-marker-pin {
          background: #5a1d6a;
          transform: rotate(-45deg) scale(1.08);
        }
        .ds-marker-pin > svg {
          transform: rotate(45deg);
        }
        @keyframes ds-pulse {
          0% {
            transform: scale(0.4);
            opacity: 0.9;
          }
          70% {
            transform: scale(1.8);
            opacity: 0;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
        .ds-route-line {
          filter: drop-shadow(0 2px 6px rgba(123, 45, 142, 0.25));
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: ds-route-draw 1.2s ease-out forwards;
        }
        @keyframes ds-route-draw {
          from {
            stroke-dashoffset: 2000;
            opacity: 0.35;
          }
          to {
            stroke-dashoffset: 0;
            opacity: 0.95;
          }
        }
        .leaflet-container {
          font-family: inherit;
          background: #f3f4f6 !important;
        }
        .leaflet-tooltip {
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
          color: #111827;
        }
        .leaflet-tooltip-top:before {
          border-top-color: #fff;
        }
        .leaflet-control-zoom a {
          background: #ffffff !important;
          color: #6b7280 !important;
          border-color: rgba(0, 0, 0, 0.05) !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          border-radius: 8px !important;
        }
        .leaflet-control-zoom a:hover {
          color: #7b2d8e !important;
          background: #faf5fb !important;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08) !important;
          border-radius: 10px !important;
          overflow: hidden;
        }
        .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.85) !important;
          border-radius: 6px;
          padding: 2px 6px !important;
          font-size: 9px !important;
        }
      `}</style>
    </div>
  )
}
