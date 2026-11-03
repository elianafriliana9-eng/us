"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useBestieStore } from "@/stores/bestieStore";
import {
  subscribeToBestiePins,
  createBestiePin,
  deleteBestiePin,
  getTodayDateKey,
} from "@/lib/services/bestieService";
import {
  BestiePin,
  BestiePinCategory,
  getMemberColor,
} from "@/types/bestie";
import {
  MapPin,
  Plus,
  Navigation,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

const PIN_CATEGORIES: Record<
  BestiePinCategory,
  { label: string; code: string }
> = {
  basecamp: { label: "Basecamp / Kafe", code: "BC" },
  culinary: { label: "Spot Kuliner", code: "KL" },
  trip: { label: "Perjalanan", code: "TR" },
  history: { label: "Histori Circle", code: "HS" },
  favorite: { label: "Spot Favorit", code: "FV" },
};

export default function BestieMapView() {
  const { room, currentUser } = useBestieStore();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [pins, setPins] = useState<BestiePin[]>([]);
  const [selectedPin, setSelectedPin] = useState<BestiePin | null>(null);
  const [filterCat, setFilterCat] = useState<"all" | BestiePinCategory>("all");

  // Add Pin Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{
    lat: number;
    lng: number;
  }>({ lat: -6.2088, lng: 106.8456 });
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<BestiePinCategory>("basecamp");
  const [locationName, setLocationName] = useState("");
  const [date, setDate] = useState(() => getTodayDateKey());

  useEffect(() => {
    if (!room?.id) return;
    const unsub = subscribeToBestiePins(room.id, setPins);
    return () => unsub();
  }, [room?.id]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-6.2088, 106.8456],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control
      .zoom({
        position: "bottomleft",
      })
      .addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;
    mapRef.current = map;

    map.on("click", (e: L.LeafletMouseEvent) => {
      setPickedCoords({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      });
      setIsAddOpen(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render pins with member identity colors
  useEffect(() => {
    const layerGroup = markersLayerRef.current;
    const map = mapRef.current;
    if (!layerGroup || !map || !room) return;

    layerGroup.clearLayers();

    const visiblePins = pins.filter((p) =>
      filterCat === "all" ? true : p.category === filterCat
    );

    visiblePins.forEach((pin) => {
      const memberIdx = room.members.findIndex((m) => m.id === pin.authorId);
      const member = room.members[memberIdx];
      const token = getMemberColor(member?.colorId, Math.max(0, memberIdx));
      const initial = (pin.authorName || "M").charAt(0).toUpperCase();

      const icon = L.divIcon({
        className: "custom-bestie-pin",
        html: `
          <div style="
            width: 34px;
            height: 34px;
            border-radius: 10px;
            background: ${token.hex};
            border: 2px solid #141619;
            box-shadow: 0 3px 0 #141619;
            color: #ffffff;
            font-weight: 800;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">${initial}</div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon });
      marker.on("click", () => {
        setSelectedPin(pin);
        map.panTo([pin.lat, pin.lng]);
      });
      marker.addTo(layerGroup);
    });
  }, [pins, filterCat, room]);

  if (!room || !currentUser) return null;

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung geolokasi");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setPickedCoords(coords);
        mapRef.current?.setView([coords.lat, coords.lng], 15);
        toast.success("Lokasi GPS ditemukan. Ketuk peta untuk menandai pin.");
      },
      () => {
        toast.error("Tidak dapat mengakses lokasi GPS");
      }
    );
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createBestiePin(room.id, currentUser, {
        title,
        caption: caption || title,
        category,
        lat: pickedCoords.lat,
        lng: pickedCoords.lng,
        locationName,
        images: [],
        date,
      });
      setTitle("");
      setCaption("");
      setLocationName("");
      setIsAddOpen(false);
      toast.success("Titik markas berhasil ditandai di peta");
    } catch {
      toast.error("Gagal menyimpan titik peta");
    }
  };

  return (
    <div className="flex flex-col space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-display-bestie text-xl font-bold text-[#141619] uppercase flex items-center gap-2">
            <span>Peta Markas & Jejak</span>
            <MapPin className="w-5 h-5 text-[#2554E8]" />
          </h1>
          <p className="text-xs text-[#525866]">
            Ketuk area peta untuk menandai kafe, tempat makan, atau lokasi trip
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="h-10 px-3.5 rounded-xl bento-btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Pin</span>
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar -mx-4 px-4">
        {[
          { id: "all", label: `Semua (${pins.length})` },
          { id: "basecamp", label: "Basecamp" },
          { id: "culinary", label: "Kuliner" },
          { id: "trip", label: "Perjalanan" },
          { id: "history", label: "Histori" },
          { id: "favorite", label: "Favorit" },
        ].map((chip) => {
          const active = filterCat === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() =>
                setFilterCat(chip.id as "all" | BestiePinCategory)
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 border cursor-pointer ${
                active
                  ? "bg-[#141619] text-white border-[#141619]"
                  : "bg-white text-[#525866] border-[#D8DDD0]"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Map Box */}
      <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border-2 border-[#141619] shadow-[0_4px_0_#141619]">
        <div ref={mapContainerRef} className="w-full h-full" />

        <button
          type="button"
          onClick={handleLocateMe}
          className="absolute bottom-3 right-3 z-20 px-3 py-2 rounded-xl bg-white border-2 border-[#141619] text-xs font-bold flex items-center gap-1.5 shadow-[0_2px_0_#141619] cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5 text-[#2554E8]" />
          <span>Lokasi Saya</span>
        </button>
      </div>

      {/* Selected Pin Detail Card */}
      {selectedPin && (
        <div className="bento-card p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-mono-bestie text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#DBE4FF] text-[#2554E8]">
                {PIN_CATEGORIES[selectedPin.category]?.label ||
                  selectedPin.category}
              </span>
              <h3 className="font-display-bestie text-base font-bold text-[#141619] mt-1">
                {selectedPin.title}
              </h3>
              {selectedPin.locationName && (
                <p className="text-[11px] font-semibold text-[#525866]">
                  {selectedPin.locationName}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={async () => {
                  await deleteBestiePin(room.id, selectedPin.id);
                  setSelectedPin(null);
                  toast.success("Pin dihapus");
                }}
                className="p-1.5 text-[#525866] hover:text-rose-600 cursor-pointer"
                title="Hapus pin"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedPin(null)}
                className="p-1.5 text-[#525866]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-[#141619]">{selectedPin.caption}</p>
          <div className="pt-1 flex items-center justify-between text-[10px] text-[#525866] font-mono-bestie">
            <span>Ditandai oleh {selectedPin.authorName}</span>
            <span>{selectedPin.date}</span>
          </div>
        </div>
      )}

      {/* ADD PIN MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bento-card p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display-bestie text-base font-bold text-[#141619]">
                Tandai Titik Baru di Peta
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1 text-[#525866]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-3">
              <div className="text-[10px] font-mono-bestie px-2.5 py-1.5 rounded bg-[#EFF1EA] text-[#525866]">
                Koordinat: {pickedCoords.lat}, {pickedCoords.lng}
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Nama Tempat / Momen
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Warkop Basecamp Kemang"
                  className="w-full h-10 px-3 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#141619] block mb-1">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as BestiePinCategory)
                    }
                    className="w-full h-10 px-2.5 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs font-bold"
                  >
                    <option value="basecamp">Basecamp / Kafe</option>
                    <option value="culinary">Spot Kuliner</option>
                    <option value="trip">Perjalanan</option>
                    <option value="history">Histori Circle</option>
                    <option value="favorite">Spot Favorit</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#141619] block mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-[#141619] bg-[#F6F7F3] text-xs font-mono-bestie"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#141619] block mb-1">
                  Catatan Singkat
                </label>
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Contoh: Tempat ngumpul tiap malam minggu"
                  className="w-full h-10 px-3 rounded-xl border border-[#D8DDD0] bg-[#F6F7F3] text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bento-btn-lime text-xs font-bold uppercase cursor-pointer"
              >
                Simpan Pin Lokasi
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
