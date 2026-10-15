"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { MemoryPin, PinCategory } from "@/types/pin";
import { useRoomStore } from "@/stores/roomStore";
import { subscribeToMemoryPins, deleteMemoryPin } from "@/lib/services/pinService";
import { AddPinModal } from "./add-pin-modal";
import {
  MapPin,
  Plus,
  Navigation,
  ExternalLink,
  Trash2,
  X,
  Calendar,
  Sparkles,
  Maximize2,
  Search,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  subscribeToCoupleLocations,
  updatePartnerLocation,
} from "@/lib/services/locationService";
import { PartnerLocation } from "@/types/location";

interface NominatimPlace {
  place_id: number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
}

const CATEGORY_MAP: Record<
  PinCategory,
  { label: string; emoji: string; color: string }
> = {
  first_date: { label: "First Date", emoji: "💕", color: "#e11d48" },
  travel: { label: "Liburan", emoji: "✈️", color: "#0284c7" },
  cafe: { label: "Cafe", emoji: "☕", color: "#d97706" },
  anniversary: { label: "Anniversary", emoji: "🎂", color: "#9333ea" },
  milestone: { label: "Pencapaian", emoji: "💍", color: "#059669" },
  daily: { label: "Kenangan Manis", emoji: "🌿", color: "#65a30d" },
};

function formatMemoryDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ];
    if (month < 1 || month > 12) return dateStr;
    return `${day} ${months[month - 1]} ${year}`;
  } catch {
    return dateStr;
  }
}

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function createCoupleMarkerIcon(name: string, isCurrentUser: boolean) {
  const initial = (name || "U").trim().charAt(0).toUpperCase();
  const label = isCurrentUser ? "Kamu 💕" : `${name} 💖`;
  const bgGradient = isCurrentUser
    ? "from-[#b80035] to-[#f43f5e]"
    : "from-[#ec4899] to-[#fb7185]";
  const pulseColor = isCurrentUser ? "bg-rose-500/35" : "bg-pink-500/35";

  const html = `
    <div class="relative flex flex-col items-center justify-center cursor-pointer select-none">
      <div class="absolute w-12 h-12 rounded-full ${pulseColor} animate-ping pointer-events-none -translate-y-1"></div>
      <div class="relative flex flex-col items-center">
        <div class="px-2 py-0.5 rounded-full ${
          isCurrentUser ? "bg-[#1e1b19]" : "bg-[#b80035]"
        } text-white text-[10px] font-bold shadow-md whitespace-nowrap mb-1 flex items-center gap-1 border border-white/40">
          <span class="w-1.5 h-1.5 rounded-full ${
            isCurrentUser ? "bg-emerald-400" : "bg-rose-300"
          } animate-pulse"></span>
          <span>${label}</span>
        </div>
        <div class="w-8 h-8 rounded-full bg-gradient-to-tr ${bgGradient} text-white border-2 border-white shadow-lg flex items-center justify-center text-xs font-black">
          ${initial}
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: "custom-couple-marker",
    html,
    iconSize: [48, 54],
    iconAnchor: [24, 38],
  });
}

function createPinIcon(pin: MemoryPin, isSelected: boolean = false) {
  const meta = CATEGORY_MAP[pin.category] || { label: "Kenangan", emoji: "💕", color: "#e11d48" };
  const imageUrl = pin.images && pin.images.length > 0 ? pin.images[0] : null;

  const scale = isSelected ? "scale-120 -translate-y-1 z-30" : "scale-100 hover:scale-110";
  const glow = isSelected
    ? "filter drop-shadow-[0_6px_14px_rgba(225,29,72,0.65)]"
    : "filter drop-shadow-[0_3px_6px_rgba(0,0,0,0.25)]";

  const safeTitle = (pin.title || "").replace(/"/g, "&quot;");

  const centerContent = imageUrl
    ? `<img src="${imageUrl}" alt="${safeTitle}" class="w-full h-full object-cover rounded-full" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><span class="hidden items-center justify-center w-full h-full text-[12px] leading-none select-none">${meta.emoji}</span>`
    : `<span class="flex items-center justify-center w-full h-full text-[12px] leading-none select-none">${meta.emoji}</span>`;

  const html = `
    <div class="relative w-[46px] h-[52px] flex items-center justify-center cursor-pointer transition-all duration-200 origin-bottom ${scale} ${glow}">
      ${
        isSelected
          ? `<div class="absolute -top-1 -inset-x-1 bottom-2 rounded-full bg-rose-500/35 animate-ping -z-10 pointer-events-none"></div>`
          : ""
      }
      <svg class="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 46 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 23 49 C 9 35 2 25 2 15 C 2 6.5 8.5 2 16 2 C 20.5 2 22.5 4.5 23 6 C 23.5 4.5 25.5 2 30 2 C 37.5 2 44 6.5 44 15 C 44 25 37 35 23 49 Z" 
              fill="${meta.color}" 
              stroke="#ffffff" 
              stroke-width="2.5" 
              stroke-linejoin="round" />
      </svg>
      <div class="relative -mt-2.5 w-[25px] h-[25px] rounded-full overflow-hidden border-2 border-white shadow-inner bg-white flex items-center justify-center">
        ${centerContent}
      </div>
    </div>
  `;

  return L.divIcon({
    className: "custom-heart-pin",
    html,
    iconSize: [46, 52],
    iconAnchor: [23, 49],
    popupAnchor: [0, -49],
  });
}

export default function MemoryMapView() {
  const { room, currentUser } = useRoomStore();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const coupleLayerRef = useRef<L.LayerGroup | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialCenteredRef = useRef<boolean>(false);
  const initialCoupleFittedRef = useRef<boolean>(false);

  const [pins, setPins] = useState<MemoryPin[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPin, setSelectedPin] = useState<MemoryPin | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Live Couple Location & GPS state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coupleLocations, setCoupleLocations] = useState<PartnerLocation[]>([]);

  // Search places & memories state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [placeResults, setPlaceResults] = useState<NominatimPlace[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [discoveredPlaceName, setDiscoveredPlaceName] = useState<string>("");

  const selectedPinRef = useRef<MemoryPin | null>(null);
  useEffect(() => {
    selectedPinRef.current = selectedPin;
  }, [selectedPin]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Subscribe to pins in Firestore
  useEffect(() => {
    if (!room) return;
    const unsubscribe = subscribeToMemoryPins(room.id, (loadedPins) => {
      setPins(loadedPins);
    });
    return () => unsubscribe();
  }, [room]);

  // Search Places using OpenStreetMap Nominatim
  const executePlaceSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPlaceResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          trimmed
        )}&limit=5&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "id,en",
          },
        }
      );
      if (!res.ok) throw new Error("Search failed");
      const data: NominatimPlace[] = await res.json();
      setPlaceResults(data);
    } catch {
      setPlaceResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced place search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      executePlaceSearch(trimmed);
    }, 450);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, executePlaceSearch]);

  // Matching memory pins from search query
  const matchingPins =
    searchQuery.trim().length >= 1
      ? pins.filter((p) => {
          const q = searchQuery.toLowerCase();
          return (
            p.title.toLowerCase().includes(q) ||
            (p.locationName && p.locationName.toLowerCase().includes(q)) ||
            (p.caption && p.caption.toLowerCase().includes(q))
          );
        })
      : [];

  // Open add pin modal at given coordinate
  const handleOpenAddModal = useCallback(
    (coords?: { lat: number; lng: number }, placeName?: string) => {
      if (coords) {
        setClickedCoords(coords);
      } else if (mapInstanceRef.current) {
        const center = mapInstanceRef.current.getCenter();
        setClickedCoords({
          lat: Number(center.lat.toFixed(6)),
          lng: Number(center.lng.toFixed(6)),
        });
      }
      if (placeName) {
        setDiscoveredPlaceName(placeName);
      }
      setIsAddModalOpen(true);
    },
    [setClickedCoords, setDiscoveredPlaceName, setIsAddModalOpen]
  );

  // Jump to existing memory pin from search
  const handleSelectMemoryPin = (pin: MemoryPin) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([pin.lat, pin.lng], 16, { duration: 1.2 });
    }
    setSelectedPin(pin);
    setIsSearchOpen(false);
    setSearchQuery("");
    toast.success(`Membuka kenangan: ${pin.title} 💕`);
  };

  // Fly to discovered place from Nominatim
  const handleSelectPlace = (place: NominatimPlace) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    if (isNaN(lat) || isNaN(lng)) return;

    const parts = place.display_name.split(", ");
    const name = place.name || parts[0];

    // Fly map to place
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
    }

    // Remove previous temp marker if any
    if (tempMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(tempMarkerRef.current);
    }

    // Add temp heart marker at target location
    const tempIcon = L.divIcon({
      className: "custom-heart-pin",
      html: `
        <div class="relative w-[46px] h-[52px] flex items-center justify-center cursor-pointer origin-bottom animate-bounce filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
          <div class="absolute -top-6 px-2.5 py-0.5 rounded-full bg-[#1e1b19] text-white text-[10px] font-bold shadow-md whitespace-nowrap">
            ${name.slice(0, 20)} ✨
          </div>
          <svg class="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 46 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 23 49 C 9 35 2 25 2 15 C 2 6.5 8.5 2 16 2 C 20.5 2 22.5 4.5 23 6 C 23.5 4.5 25.5 2 30 2 C 37.5 2 44 6.5 44 15 C 44 25 37 35 23 49 Z" 
                  fill="#b80035" 
                  stroke="#ffffff" 
                  stroke-width="2.5" 
                  stroke-linejoin="round" />
          </svg>
          <div class="relative -mt-2.5 w-[25px] h-[25px] rounded-full overflow-hidden border-2 border-white shadow-inner bg-white flex items-center justify-center text-[#b80035]">
            <span class="text-[13px] font-bold leading-none">+</span>
          </div>
        </div>
      `,
      iconSize: [46, 52],
      iconAnchor: [23, 49],
    });

    if (mapInstanceRef.current) {
      const marker = L.marker([lat, lng], { icon: tempIcon }).addTo(mapInstanceRef.current);
      tempMarkerRef.current = marker;
      marker.on("click", () => {
        handleOpenAddModal({ lat, lng }, name);
      });
    }

    setClickedCoords({ lat, lng });
    setDiscoveredPlaceName(name);
    setSelectedPin(null);
    setIsSearchOpen(false);
    setSearchQuery("");
    toast.success(`Peta diarahkan ke ${name} 📍`);
  };

  // Automatic Geolocation & Location Sync on Map Open
  useEffect(() => {
    if (!navigator.geolocation) return;

    let isCancelled = false;

    // Immediate GPS lookup on open
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (isCancelled) return;
        const { latitude, longitude } = pos.coords;
        const lat = Number(latitude.toFixed(6));
        const lng = Number(longitude.toFixed(6));

        setUserCoords({ lat, lng });

        // Broadcast to Firestore for partner to see
        if (room && currentUser) {
          updatePartnerLocation(room.id, {
            userId: currentUser.id,
            userName: currentUser.name,
            lat,
            lng,
            updatedAt: Date.now(),
          }).catch(console.error);
        }

        // Center map to user's location on open
        if (mapInstanceRef.current && !initialCenteredRef.current) {
          initialCenteredRef.current = true;
          mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1 });
        }
      },
      (err) => {
        console.warn("Geolocation on open:", err.message);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );

    // Watch position as user moves
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (isCancelled) return;
        const { latitude, longitude } = pos.coords;
        const lat = Number(latitude.toFixed(6));
        const lng = Number(longitude.toFixed(6));

        setUserCoords({ lat, lng });

        if (room && currentUser) {
          updatePartnerLocation(room.id, {
            userId: currentUser.id,
            userName: currentUser.name,
            lat,
            lng,
            updatedAt: Date.now(),
          }).catch(console.error);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000 }
    );

    return () => {
      isCancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [room, currentUser]);

  // Subscribe to couple locations in Firestore
  useEffect(() => {
    if (!room) return;
    const unsubscribe = subscribeToCoupleLocations(room.id, (locations) => {
      setCoupleLocations(locations);
    });
    return () => unsubscribe();
  }, [room]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center: Jakarta, Indonesia
    const defaultCenter: L.LatLngExpression = [-6.2088, 106.8456];
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: false,
    });

    // Official OpenStreetMap Tile Server (100% Free, No API Key, No Watermark)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control in top-right
    L.control
      .zoom({
        position: "topright",
      })
      .addTo(map);

    const coupleLayer = L.layerGroup().addTo(map);
    coupleLayerRef.current = coupleLayer;

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Map click handler to place pin
    map.on("click", (e: L.LeafletMouseEvent) => {
      // If a pin summary is currently open, tap anywhere on map deselects it
      if (selectedPinRef.current) {
        setSelectedPin(null);
        return;
      }

      const { lat, lng } = e.latlng;
      const roundedLat = Number(lat.toFixed(6));
      const roundedLng = Number(lng.toFixed(6));

      // Remove previous temp marker if any
      if (tempMarkerRef.current) {
        map.removeLayer(tempMarkerRef.current);
      }

      // Add a small animated temp heart marker
      const tempIcon = L.divIcon({
        className: "custom-heart-pin",
        html: `
          <div class="relative w-[46px] h-[52px] flex items-center justify-center cursor-pointer origin-bottom animate-bounce filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
            <div class="absolute -top-6 px-2.5 py-0.5 rounded-full bg-[#1e1b19] text-white text-[10px] font-bold shadow-md whitespace-nowrap">
              Tap untuk Buat Pin ✨
            </div>
            <svg class="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 46 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 23 49 C 9 35 2 25 2 15 C 2 6.5 8.5 2 16 2 C 20.5 2 22.5 4.5 23 6 C 23.5 4.5 25.5 2 30 2 C 37.5 2 44 6.5 44 15 C 44 25 37 35 23 49 Z" 
                    fill="#b80035" 
                    stroke="#ffffff" 
                    stroke-width="2.5" 
                    stroke-linejoin="round" />
            </svg>
            <div class="relative -mt-2.5 w-[25px] h-[25px] rounded-full overflow-hidden border-2 border-white shadow-inner bg-white flex items-center justify-center text-[#b80035]">
              <span class="text-[13px] font-bold leading-none">+</span>
            </div>
          </div>
        `,
        iconSize: [46, 52],
        iconAnchor: [23, 49],
      });

      const tempMarker = L.marker([roundedLat, roundedLng], { icon: tempIcon }).addTo(map);
      tempMarkerRef.current = tempMarker;

      tempMarker.on("click", () => {
        handleOpenAddModal({ lat: roundedLat, lng: roundedLng });
      });

      setClickedCoords({ lat: roundedLat, lng: roundedLng });
    });

    // Invalidate size after rendering to avoid gray tiles
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      coupleLayerRef.current = null;
      markersLayerRef.current = null;
    };
  }, [handleOpenAddModal]);

  // Render Couple Markers & Romantic Love Line
  useEffect(() => {
    const map = mapInstanceRef.current;
    const coupleLayer = coupleLayerRef.current;
    if (!map || !coupleLayer) return;

    coupleLayer.clearLayers();

    const myLoc =
      userCoords ||
      coupleLocations.find((l) => l.userId === currentUser?.id);

    const partnerLoc = coupleLocations.find(
      (l) => l.userId !== currentUser?.id
    );

    const points: L.LatLngExpression[] = [];

    // Current User Marker ("Kamu 💕")
    if (myLoc) {
      const myIcon = createCoupleMarkerIcon(currentUser?.name || "Kamu", true);
      const myMarker = L.marker([myLoc.lat, myLoc.lng], {
        icon: myIcon,
        zIndexOffset: 1000,
      });
      coupleLayer.addLayer(myMarker);
      points.push([myLoc.lat, myLoc.lng]);
    }

    // Partner Marker
    if (partnerLoc) {
      const partnerIcon = createCoupleMarkerIcon(
        partnerLoc.userName || "Pasangan",
        false
      );
      const partnerMarker = L.marker([partnerLoc.lat, partnerLoc.lng], {
        icon: partnerIcon,
        zIndexOffset: 990,
      });
      coupleLayer.addLayer(partnerMarker);
      points.push([partnerLoc.lat, partnerLoc.lng]);
    }

    // Connect them with a romantic love line if both exist
    if (myLoc && partnerLoc) {
      const loveLine = L.polyline(
        [
          [myLoc.lat, myLoc.lng],
          [partnerLoc.lat, partnerLoc.lng],
        ],
        {
          color: "#e11d48",
          weight: 2.5,
          opacity: 0.75,
          dashArray: "6, 8",
        }
      );
      coupleLayer.addLayer(loveLine);

      // Auto fit both lovers on first time both locations are ready
      if (!initialCoupleFittedRef.current && points.length === 2) {
        initialCoupleFittedRef.current = true;
        map.fitBounds(L.latLngBounds(points), {
          padding: [90, 90],
          maxZoom: 16,
        });
      }
    }
  }, [coupleLocations, userCoords, currentUser]);

  // Render Pins whenever pins or filter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const filteredPins =
      selectedCategory === "all"
        ? pins
        : pins.filter((p) => p.category === selectedCategory);

    if (filteredPins.length === 0) return;

    const latLngs: L.LatLngExpression[] = [];

    filteredPins.forEach((pin) => {
      const isSelected = selectedPin?.id === pin.id;
      const icon = createPinIcon(pin, isSelected);
      const marker = L.marker([pin.lat, pin.lng], { icon });

      if (pin.title) {
        marker.bindTooltip(pin.title, {
          direction: "top",
          offset: [0, -48],
          className: "heart-pin-tooltip",
        });
      }

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedPin(pin);
        setClickedCoords(null);
        if (tempMarkerRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(tempMarkerRef.current);
          tempMarkerRef.current = null;
        }
        map.panTo([pin.lat, pin.lng], { animate: true, duration: 0.5 });
      });

      markersLayer.addLayer(marker);
      latLngs.push([pin.lat, pin.lng]);
    });

    // If first load with pins and no couple fitted yet, fit bounds
    if (latLngs.length > 0 && !selectedPin && !initialCenteredRef.current && !initialCoupleFittedRef.current) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [pins, selectedCategory, selectedPin]);

  // Locate User GPS manually
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung geolokasi GPS");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const lat = Number(latitude.toFixed(6));
        const lng = Number(longitude.toFixed(6));
        setUserCoords({ lat, lng });

        if (room && currentUser) {
          updatePartnerLocation(room.id, {
            userId: currentUser.id,
            userName: currentUser.name,
            lat,
            lng,
            updatedAt: Date.now(),
          }).catch(console.error);
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
        }
        setIsLocating(false);
        toast.success("Peta diarahkan ke lokasi kamu saat ini! 📍");
      },
      (err) => {
        setIsLocating(false);
        toast.error("Gagal mendapatkan lokasi GPS: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Delete Pin
  const handleDeletePin = async (pinId: string) => {
    if (!room) return;
    if (!confirm("Hapus titik kenangan ini dari peta kita?")) return;
    setDeletingId(pinId);
    try {
      await deleteMemoryPin(room.id, pinId);
      toast.success("Titik kenangan telah dihapus.");
      if (selectedPin?.id === pinId) {
        setSelectedPin(null);
      }
    } catch {
      toast.error("Gagal menghapus pin.");
    } finally {
      setDeletingId(null);
    }
  };

  const myLocation =
    userCoords ||
    coupleLocations.find((l) => l.userId === currentUser?.id);

  const partnerLocation = coupleLocations.find(
    (l) => l.userId !== currentUser?.id
  );

  const coupleDistance =
    myLocation && partnerLocation
      ? calculateDistanceKm(
          myLocation.lat,
          myLocation.lng,
          partnerLocation.lat,
          partnerLocation.lng
        )
      : null;

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[500px] rounded-3xl overflow-hidden shadow-[0_10px_25px_-5px_rgba(68,64,60,0.08)] border border-[#e5bdbe]/60 bg-[#faf2ee]">
      {/* OpenStreetMap Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Bar: Category Filter Chips, Count & Search */}
      <div className="absolute top-3 inset-x-3 z-20 flex flex-col gap-2 pointer-events-none">
        {/* Top Summary Header */}
        <div className="flex items-center justify-between pointer-events-auto gap-2">
          <div className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-sm border border-[#e5bdbe]/60 flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#e11d48] animate-ping" />
            <span className="text-xs font-bold text-[#1e1b19]">
              {pins.length} Jejak Kenangan 💕
            </span>
          </div>

          <button
            onClick={() => handleOpenAddModal()}
            className="px-3.5 py-1.5 rounded-full bg-[#b80035] hover:bg-[#a1002e] text-white text-xs font-bold shadow-md shadow-rose-900/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Pin</span>
          </button>
        </div>

        {/* Couple Live Distance Widget */}
        {partnerLocation && myLocation ? (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-sm border border-[#e5bdbe]/80 pointer-events-auto animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping shrink-0" />
              <span className="text-[11px] font-bold text-[#1e1b19] truncate">
                {partnerLocation.userName}:
              </span>
              <span className="text-[11px] font-semibold text-[#b80035] truncate">
                {coupleDistance !== null && coupleDistance < 0.1
                  ? "Sedang bersama! 💕"
                  : coupleDistance !== null
                  ? `${
                      coupleDistance < 1
                        ? Math.round(coupleDistance * 1000) + " m"
                        : coupleDistance.toFixed(1) + " km"
                    } dari kamu`
                  : "Lokasi terdeteksi 💖"}
              </span>
            </div>
            <button
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo(
                    [partnerLocation.lat, partnerLocation.lng],
                    16,
                    { duration: 1.2 }
                  );
                }
              }}
              className="ml-2 text-[10px] font-bold text-[#b80035] hover:underline flex items-center gap-0.5 shrink-0"
            >
              Lihat 💖
            </button>
          </div>
        ) : !partnerLocation && myLocation ? (
          <div className="flex items-center justify-between px-3 py-1 rounded-full bg-white/90 backdrop-blur-md shadow-xs border border-[#e5bdbe]/60 pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-medium text-[#5c3f40]">
                Lokasimu aktif di peta 📍
              </span>
            </div>
            <button
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([myLocation.lat, myLocation.lng], 16, { duration: 1 });
                }
              }}
              className="text-[10px] font-bold text-[#b80035] hover:underline"
            >
              Ke Lokasiku
            </button>
          </div>
        ) : null}

        {/* Search Bar Input & Autocomplete Dropdown */}
        <div ref={searchContainerRef} className="relative pointer-events-auto">
          <div className="relative flex items-center">
            <div className="absolute left-3 text-[#5c3f40] flex items-center pointer-events-none">
              <Search className="w-3.5 h-3.5 text-[#b80035]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.trim().length < 2) {
                  setPlaceResults([]);
                  setIsSearching(false);
                }
                setIsSearchOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim().length >= 1) setIsSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                  executePlaceSearch(searchQuery);
                  setIsSearchOpen(true);
                }
              }}
              placeholder="Cari tempat, kota, cafe, atau kenangan..."
              className="w-full pl-9 pr-9 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-[#e5bdbe]/80 text-xs text-[#1e1b19] placeholder:text-[#5c3f40]/60 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#e11d48]/30 focus:border-[#e11d48] transition-all"
            />
            {isSearching ? (
              <div className="absolute right-3 flex items-center pointer-events-none">
                <Loader2 className="w-3.5 h-3.5 text-[#b80035] animate-spin" />
              </div>
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPlaceResults([]);
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 p-1 rounded-full text-[#5c3f40] hover:bg-[#faf2ee]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {/* Autocomplete Results Dropdown */}
          {isSearchOpen && searchQuery.trim().length >= 1 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#e5bdbe] max-h-72 overflow-y-auto z-40 p-1.5 divide-y divide-[#eee7e3] animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Section 1: Matching Memory Pins */}
              {matchingPins.length > 0 && (
                <div className="p-1">
                  <p className="px-2 py-1 text-[10px] font-bold tracking-wide uppercase text-[#b80035] flex items-center gap-1">
                    <span>💕 Kenangan Kita</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#ffdada] text-[#b80035]">
                      {matchingPins.length}
                    </span>
                  </p>
                  <div className="space-y-0.5 mt-0.5">
                    {matchingPins.map((pin) => (
                      <button
                        key={`memory-${pin.id}`}
                        onClick={() => handleSelectMemoryPin(pin)}
                        className="w-full px-2.5 py-1.5 rounded-xl hover:bg-[#fff5f5] text-left flex items-center gap-2.5 transition-colors group cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#ffdada] text-[#b80035] flex items-center justify-center shrink-0 text-xs shadow-xs group-hover:scale-105 transition-transform">
                          {CATEGORY_MAP[pin.category]?.emoji || "💕"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#1e1b19] truncate leading-tight group-hover:text-[#b80035]">
                            {pin.title}
                          </p>
                          <p className="text-[10px] text-[#5c3f40] truncate mt-0.5">
                            {pin.locationName || CATEGORY_MAP[pin.category]?.label || "Kenangan"} • {formatMemoryDate(pin.date)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: OpenStreetMap Places */}
              <div className="p-1">
                <p className="px-2 py-1 text-[10px] font-bold tracking-wide uppercase text-[#5c3f40] flex items-center gap-1">
                  <span>📍 Tempat di Peta</span>
                  {isSearching && (
                    <span className="text-[9px] text-[#5c3f40]/70 font-normal">
                      (mencari...)
                    </span>
                  )}
                </p>

                {placeResults.length > 0 ? (
                  <div className="space-y-0.5 mt-0.5">
                    {placeResults.map((place) => {
                      const parts = place.display_name.split(", ");
                      const title = place.name || parts[0];
                      const subtitle = parts.slice(1, 4).join(", ");
                      return (
                        <button
                          key={`place-${place.place_id}`}
                          onClick={() => handleSelectPlace(place)}
                          className="w-full px-2.5 py-1.5 rounded-xl hover:bg-[#faf2ee] text-left flex items-center gap-2.5 transition-colors group cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full bg-[#f4ece8] text-[#b80035] flex items-center justify-center shrink-0 shadow-xs group-hover:bg-[#ffdada] transition-colors">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#1e1b19] truncate leading-tight group-hover:text-[#b80035]">
                              {title}
                            </p>
                            {subtitle && (
                              <p className="text-[10px] text-[#5c3f40] truncate mt-0.5">
                                {subtitle}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : !isSearching && searchQuery.trim().length >= 2 && matchingPins.length === 0 ? (
                  <div className="px-3 py-3 text-center">
                    <p className="text-xs text-[#5c3f40]">
                      Tidak ada tempat ditemukan. Coba ketik nama kota atau tempat lebih spesifik ✨
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pointer-events-auto scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shadow-xs backdrop-blur-md transition-all ${
              selectedCategory === "all"
                ? "bg-[#1e1b19] text-white"
                : "bg-white/85 text-[#5c3f40] border border-[#e5bdbe]/50 hover:bg-white"
            }`}
          >
            Semua ✨
          </button>
          {Object.entries(CATEGORY_MAP).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shadow-xs backdrop-blur-md transition-all flex items-center gap-1 ${
                selectedCategory === key
                  ? "bg-[#1e1b19] text-white"
                  : "bg-white/85 text-[#5c3f40] border border-[#e5bdbe]/50 hover:bg-white"
              }`}
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Action Button: Current Location */}
      <div className="absolute right-3 bottom-6 z-20 flex flex-col gap-2">
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          title="Lokasi Saya"
          className="w-11 h-11 rounded-full bg-white/90 backdrop-blur-md text-[#b80035] shadow-lg border border-[#e5bdbe]/70 flex items-center justify-center active:scale-95 transition-all hover:bg-white"
        >
          <Navigation className={`w-5 h-5 ${isLocating ? "animate-spin text-rose-500" : ""}`} />
        </button>
      </div>

      {/* Tap Hint Banner (if no pin selected & user tapped on map or searched place) */}
      {clickedCoords && !selectedPin && (
        <div className="absolute bottom-6 inset-x-4 z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto max-w-sm w-full bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-[#e5bdbe] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#ffdada] text-[#b80035] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 fill-current" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-[#1e1b19] truncate">
                  {discoveredPlaceName || "Titik Terpilih"}
                </p>
                <p className="text-[10px] text-[#5c3f40] font-mono truncate">
                  {clickedCoords.lat}, {clickedCoords.lng}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  if (tempMarkerRef.current && mapInstanceRef.current) {
                    mapInstanceRef.current.removeLayer(tempMarkerRef.current);
                    tempMarkerRef.current = null;
                  }
                  setClickedCoords(null);
                  setDiscoveredPlaceName("");
                }}
                className="p-1.5 rounded-full text-[#5c3f40] hover:bg-[#faf2ee]"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleOpenAddModal(clickedCoords, discoveredPlaceName)}
                className="px-3 py-1.5 rounded-xl bg-[#b80035] text-white text-xs font-bold shadow-xs active:scale-95 transition-all whitespace-nowrap"
              >
                Buat Kenangan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Pin Details Bottom Sheet / Summary Card */}
      {selectedPin && (
        <div className="absolute bottom-4 inset-x-3 z-30 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl p-4 shadow-2xl border border-[#e5bdbe] overflow-hidden pointer-events-auto">
            {/* Top Handle Pill */}
            <div className="w-8 h-1 bg-[#e5bdbe]/80 rounded-full mx-auto mb-2.5" />

            {/* Header: Category Badge + Formatted Date + Close */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#eee7e3]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm">
                  {CATEGORY_MAP[selectedPin.category]?.emoji || "💕"}
                </span>
                <span
                  style={{
                    backgroundColor: `${CATEGORY_MAP[selectedPin.category]?.color || "#b80035"}18`,
                    color: CATEGORY_MAP[selectedPin.category]?.color || "#b80035",
                  }}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                >
                  {CATEGORY_MAP[selectedPin.category]?.label || "Kenangan"}
                </span>
                {selectedPin.date && (
                  <span className="text-[11px] text-[#5c3f40] flex items-center gap-1 font-medium ml-1">
                    <Calendar className="w-3 h-3 text-[#5c3f40]" />
                    {formatMemoryDate(selectedPin.date)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedPin(null)}
                className="p-1 rounded-full text-[#5c3f40] hover:bg-[#faf2ee] transition-colors"
                title="Tutup Card"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: Photo + Title + Location + Caption */}
            <div className="flex gap-3.5 items-start">
              {/* Photo Thumbnail or Cute Category Box */}
              {selectedPin.images && selectedPin.images.length > 0 ? (
                <div
                  onClick={() => setPreviewPhoto(selectedPin.images[0])}
                  className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 border border-[#e5bdbe]/70 bg-[#faf2ee] shadow-xs cursor-pointer group"
                  title="Klik untuk perbesar foto"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedPin.images[0]}
                    alt={selectedPin.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-4 h-4 text-white drop-shadow-md" />
                  </div>
                  {selectedPin.images.length > 1 && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold">
                      +{selectedPin.images.length - 1}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shrink-0 border border-[#e5bdbe]/60 bg-gradient-to-br from-[#fff1f2] to-[#fce7f3] flex flex-col items-center justify-center text-center p-2 shadow-xs">
                  <span className="text-3xl mb-1">
                    {CATEGORY_MAP[selectedPin.category]?.emoji || "💕"}
                  </span>
                  <span className="text-[10px] text-[#5c3f40] font-semibold">
                    Kenangan Kita
                  </span>
                </div>
              )}

              {/* Text Summary */}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base text-[#1e1b19] line-clamp-2 leading-tight">
                  {selectedPin.title}
                </h4>

                {selectedPin.locationName && (
                  <p className="text-[11px] text-[#b80035] font-semibold flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{selectedPin.locationName}</span>
                  </p>
                )}

                {selectedPin.caption && (
                  <p className="text-xs text-[#5c3f40] mt-1.5 line-clamp-3 leading-relaxed">
                    &ldquo;{selectedPin.caption}&rdquo;
                  </p>
                )}

                <p className="text-[10px] text-[#5c3f40]/80 mt-2 flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3 text-[#e11d48]" />
                  <span>Diabadikan oleh {selectedPin.authorName}</span>
                </p>
              </div>
            </div>

            {/* Bottom Actions: Directions in Google Maps & Delete */}
            <div className="mt-3.5 pt-2.5 border-t border-[#eee7e3] flex items-center justify-between gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedPin.lat},${selectedPin.lng}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-full bg-[#faf2ee] hover:bg-[#eee7e3] text-[#1e1b19] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#5c3f40]" />
                <span>Petunjuk Arah</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeletePin(selectedPin.id)}
                  disabled={deletingId === selectedPin.id}
                  className="px-3 py-1.5 rounded-full text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                  title="Hapus Pin"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Photo Modal Lightbox */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={() => setPreviewPhoto(null)}
                className="w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center transition-colors"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto}
              alt="Foto Kenangan"
              className="w-full max-h-[75vh] object-contain bg-[#1e1b19]"
            />
          </div>
        </div>
      )}

      {/* Modal Add Pin */}
      <AddPinModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          if (tempMarkerRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(tempMarkerRef.current);
            tempMarkerRef.current = null;
          }
          setClickedCoords(null);
          setDiscoveredPlaceName("");
        }}
        initialCoords={clickedCoords}
        initialLocationName={discoveredPlaceName}
        onPinSaved={(newPin) => {
          setSelectedPin(newPin);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([newPin.lat, newPin.lng], 16, { duration: 1 });
          }
        }}
      />
    </div>
  );
}
