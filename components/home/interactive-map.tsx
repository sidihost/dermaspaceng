'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation, Clock, Car, ExternalLink, X, Loader2, Footprints, Bike } from 'lucide-react'
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
type RouteInfo = { distanceKm: number; durationMin: number; coords: [number, number][] }

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
  const userMarkerRef = useRef<import('leaflet').CircleMarker | null>(null)
  const routeLineRef = useRef<import('leaflet').Polyline | null>(null)

  const [mapReady, setMapReady] = useState(false)
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const [route, setRoute] = useState<RouteInfo | null>(null)
  const [routing, setRouting] = useState(false)
  const [currentBranch, setCurrentBranch] = useState<BranchId>(activeBranchId)
  const [travelMode, setTravelMode] = useState<TravelMode>('car')

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

      // Place zoom control at top-right so it never overlaps the info card
      // sitting at the bottom. Hidden on mobile via CSS (users can pinch-zoom).
      L.control.zoom({ position: 'topright' }).addTo(map)
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

    return () => {
      cancelled = true
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

  // Request user location and draw route
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
        setLocating(false)

        await drawRoute(user, currentBranch, travelMode)
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

  // Re-route whenever the selected branch OR travel mode changes (if already located)
  useEffect(() => {
    if (userLocation) {
      drawRoute(userLocation, currentBranch, travelMode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBranch, travelMode])

  const drawRoute = async (user: LatLng, branchId: BranchId, mode: TravelMode) => {
    const L = LRef.current
    const map = mapRef.current
    if (!L || !map) return
    const branch = BRANCHES.find((b) => b.id === branchId)
    if (!branch) return

    const cfg = MODES[mode]
    setRouting(true)

    // Drop/update a user-location dot
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([user.lat, user.lng])
    } else {
      userMarkerRef.current = L.circleMarker([user.lat, user.lng], {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#2563EB',
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip('You are here', { direction: 'top', offset: [0, -6] })
    }

    // Ask OSRM (public demo) for a real route using the selected profile
    try {
      const url = `https://router.project-osrm.org/route/v1/${cfg.osrm}/${user.lng},${user.lat};${branch.lng},${branch.lat}?overview=full&geometries=geojson`
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

      // Replace any prior polyline
      if (routeLineRef.current) {
        routeLineRef.current.remove()
        routeLineRef.current = null
      }
      routeLineRef.current = L.polyline(coords, {
        color: '#7B2D8E',
        weight: mode === 'walk' || mode === 'bike' ? 4 : 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: cfg.dashArray || undefined,
        className: 'ds-route-line',
      }).addTo(map)

      // Fit map to the full route with generous padding
      map.fitBounds(routeLineRef.current.getBounds(), { padding: [60, 60], maxZoom: 15 })

      setRoute({ distanceKm, durationMin, coords })
    } catch {
      // Fallback: crow-flies estimate using the mode's fallback speed
      const km = haversine(user, { lat: branch.lat, lng: branch.lng }) * 1.3
      const durationMin = ((km / cfg.fallbackKmh) * 60) * cfg.durationFactor
      if (routeLineRef.current) {
        routeLineRef.current.remove()
        routeLineRef.current = null
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
      setRoute({ distanceKm: km, durationMin, coords: [] })
    } finally {
      setRouting(false)
    }
  }

  const clearRoute = () => {
    if (routeLineRef.current) {
      routeLineRef.current.remove()
      routeLineRef.current = null
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }
    setRoute(null)
    setUserLocation(null)
    // Return focus to the current branch
    const branch = BRANCHES.find((b) => b.id === currentBranch)
    if (branch && mapRef.current) {
      mapRef.current.flyTo([branch.lat, branch.lng], 15.5, { duration: 1 })
    }
  }

  const activeBranch = BRANCHES.find((b) => b.id === currentBranch) || BRANCHES[0]

  return (
    <div className="relative w-full rounded-2xl overflow-hidden ring-1 ring-gray-200 bg-gray-50" style={{ height }}>
      {/* Map canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        aria-label="Interactive map of Dermaspace locations"
      />

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
        <div className="absolute top-14 right-3 z-[500]">
          <button
            type="button"
            onClick={clearRoute}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-white text-gray-600 rounded-full shadow-md ring-1 ring-gray-100 hover:bg-gray-50"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
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
            <div className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                {routing ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  (() => {
                    const ActiveIcon = MODES[travelMode].icon
                    return <ActiveIcon className="w-5 h-5 text-white" />
                  })()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                  <span className="text-base font-bold text-gray-900 tabular-nums">
                    {route.distanceKm.toFixed(1)} km
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span className="tabular-nums">
                      {Math.max(1, Math.round(route.durationMin))} min
                    </span>
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
        .dermaspace-marker {
          background: transparent !important;
          border: none !important;
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
