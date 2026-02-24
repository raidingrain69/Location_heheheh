import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Navigation, MapPin, List, Plus, Trash2, X, Target, Zap, Cpu, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

// Fix Leaflet default icon path issues in Vite by using custom DivIcon
const createCustomIcon = (color: string = "#10b981", isUser: boolean = false) => {
  return L.divIcon({
    className: "custom-marker-icon",
    html: `<div class="relative">
      ${isUser ? '<div class="absolute inset-[-20px] bg-blue-500/20 rounded-full animate-ping"></div><div class="absolute inset-[-10px] bg-blue-400/30 rounded-full animate-pulse"></div>' : ''}
      <div class="relative z-10 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg>
      </div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

const userIcon = createCustomIcon("#3b82f6", true);
const pinIcon = createCustomIcon("#10b981");

interface Pin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  timestamp: number;
}

function MapController({ center }: { center: L.LatLngTuple | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { duration: 2, easeLinearity: 0.1 });
    }
  }, [center, map]);
  return null;
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

export default function Home() {
  const { toast } = useToast();
  const [pins, setPins] = useState<Pin[]>([]);
  const [userLocation, setUserLocation] = useState<L.LatLngTuple | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddingPin, setIsAddingPin] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<L.LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const [pinTitle, setPinTitle] = useState("");
  const [pinDesc, setPinDesc] = useState("");

  // Robust location tracking
  useEffect(() => {
    let watchId: number;
    
    const startTracking = () => {
      if (!navigator.geolocation) {
        toast({ title: "GPS Not Supported", variant: "destructive" });
        return;
      }

      setIsLocating(true);
      
      // Get initial position quickly
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: L.LatLngTuple = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setIsLocating(false);
          toast({ title: "System Online", description: "GPS Lock Established" });
        },
        (err) => {
          console.error(err);
          setIsLocating(false);
          toast({ 
            title: "GPS Connection Failed", 
            description: "Please enable location services in your browser settings.",
            variant: "destructive" 
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      // Continuously watch position
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        null,
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    };

    startTracking();
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("uni_tracker_pins");
    if (saved) {
      try {
        setPins(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load pins", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("uni_tracker_pins", JSON.stringify(pins));
  }, [pins]);

  const handleQuickPin = () => {
    if (!userLocation) {
      toast({ title: "Waiting for GPS...", variant: "destructive" });
      return;
    }

    const coords = new L.LatLng(userLocation[0], userLocation[1]);
    setSelectedLocation(coords);
    setIsSidebarOpen(true);
    setIsAddingPin(false);
    toast({ title: "Capturing Coordinates..." });
  };

  const handleMapClick = (latlng: L.LatLng) => {
    if (isAddingPin) {
      setSelectedLocation(latlng);
      setIsSidebarOpen(true);
    }
  };

  const savePin = () => {
    if (!selectedLocation) return;
    if (!pinTitle.trim()) {
      toast({ title: "Input Required", description: "Please name this spot.", variant: "destructive" });
      return;
    }

    const newPin: Pin = {
      id: Date.now().toString(),
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      title: pinTitle,
      description: pinDesc,
      timestamp: Date.now()
    };

    setPins([newPin, ...pins]);
    setPinTitle("");
    setPinDesc("");
    setSelectedLocation(null);
    setIsAddingPin(false);
    toast({ title: "Spot Encoded 💾", description: "Saved to local datastream" });
  };

  const deletePin = (id: string) => {
    setPins(pins.filter(p => p.id !== id));
    toast({ title: "Pin Purged" });
  };

  const flyToPin = (lat: number, lng: number) => {
    setUserLocation([lat, lng]);
    if (window.innerWidth < 640) setIsSidebarOpen(false);
  };

  const defaultCenter: L.LatLngTuple = [51.505, -0.09];

  return (
    <div className="h-screen w-full relative flex overflow-hidden bg-[#0a0a0c] font-sans text-white">
      {/* SCANLINE OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] opacity-20"></div>
      
      {/* MAP AREA */}
      <div className="flex-1 h-full z-0 relative">
        <MapContainer 
          center={userLocation || defaultCenter} 
          zoom={16} 
          className="h-full w-full grayscale contrast-[1.2] invert-[0.05]"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; CartoDB'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            useCache={true}
            crossOrigin={true}
          />
          
          <MapController center={userLocation} />
          <MapClickHandler onLocationSelect={handleMapClick} />

          {userLocation && (
            <Marker position={userLocation} icon={userIcon}>
              <Popup className="cyber-popup">
                <div className="font-mono text-xs uppercase tracking-tighter font-bold">Current Sector</div>
              </Popup>
            </Marker>
          )}

          {pins.map(pin => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={pinIcon}>
              <Popup className="cyber-popup">
                <div className="p-2 min-w-[160px]">
                  <h3 className="font-black text-lg text-emerald-400 tracking-tighter uppercase">{pin.title}</h3>
                  {pin.description && <p className="text-xs text-slate-400 mt-1 font-medium leading-tight">{pin.description}</p>}
                </div>
              </Popup>
            </Marker>
          ))}

          {selectedLocation && (
            <Marker position={selectedLocation} icon={createCustomIcon("#fbbf24")}>
              <Popup>Input Required</Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Cyberpunk HUD - Top Left */}
        <div className="absolute top-8 left-8 z-[400]">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-4"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>
              <div className="bg-black/80 backdrop-blur-2xl border-2 border-emerald-500/30 p-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <Zap className="h-8 w-8 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
              <h1 className="text-2xl font-black italic tracking-tighter leading-none text-white uppercase">UniTracker<span className="text-emerald-500 font-normal">.os</span></h1>
              <div className="flex items-center gap-2 mt-2">
                <div className={`h-1.5 w-1.5 rounded-full ${userLocation ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 animate-pulse'}`}></div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 font-black">{userLocation ? 'GPS: SIGNAL STABLE' : 'GPS: SEARCHING...'}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* HUD - Top Right Stat Block */}
        <div className="absolute top-8 right-8 z-[400] hidden md:block">
           <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-4">
              <div className="text-right">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Saved Nodes</p>
                <p className="text-xl font-black text-emerald-400 leading-none">{pins.length.toString().padStart(2, '0')}</p>
              </div>
              <div className="h-8 w-[1px] bg-white/10"></div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`h-4 w-1 rounded-full ${i < pins.length ? 'bg-emerald-500' : 'bg-white/10'}`}></div>
                ))}
              </div>
           </div>
        </div>

        {/* BOTTOM HUD - MAIN ACTION */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[400] w-full px-8 max-w-lg">
           <div className="relative group">
              <div className="absolute inset-0 bg-emerald-500/20 blur-2xl group-hover:bg-emerald-500/40 transition-all duration-500 rounded-full"></div>
              <Button 
                size="lg"
                className="w-full rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)] bg-emerald-500 hover:bg-emerald-400 text-black h-18 px-10 flex gap-4 font-black text-xl uppercase italic tracking-tighter transition-all active:scale-95 border-b-4 border-emerald-700 relative overflow-hidden group"
                onClick={handleQuickPin}
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                <Target className="h-7 w-7 group-hover:scale-125 transition-transform" />
                Capture Current Sector
              </Button>
           </div>
        </div>

        {/* SIDE ACTIONS HUD */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-[400] flex flex-col gap-6">
          <Button 
            size="icon" 
            className="w-16 h-16 rounded-2xl shadow-2xl bg-black/80 backdrop-blur-2xl border-2 border-white/10 hover:border-emerald-500/50 hover:bg-black text-white transition-all hover:scale-110 group"
            onClick={() => setIsSidebarOpen(true)}
          >
            <List className="h-7 w-7 group-hover:text-emerald-400 transition-colors" />
          </Button>
          
          <Button 
            size="icon" 
            className="w-16 h-16 rounded-2xl shadow-2xl bg-black/80 backdrop-blur-2xl border-2 border-white/10 hover:border-blue-500/50 hover:bg-black text-white transition-all hover:scale-110 group"
            onClick={() => {
              if (userLocation) {
                setUserLocation([...userLocation]);
                toast({ title: "Recalibrating...", description: "Re-centering system view" });
              }
            }}
          >
            <Navigation className={`h-7 w-7 group-hover:text-blue-400 transition-colors ${isLocating ? 'animate-spin' : ''}`} />
          </Button>

          <Button 
            size="icon" 
            className={`w-16 h-16 rounded-2xl shadow-2xl backdrop-blur-2xl border-2 transition-all hover:scale-110 group ${isAddingPin ? 'bg-red-500 border-red-400 text-white' : 'bg-black/80 border-white/10 text-white hover:border-emerald-500/50'}`}
            onClick={() => {
              setIsAddingPin(!isAddingPin);
              if (!isAddingPin) toast({ title: "Input Mode Active", description: "Select coordinates on map view" });
              else setSelectedLocation(null);
            }}
          >
            {isAddingPin ? <X className="h-7 w-7" /> : <Plus className="h-7 w-7 group-hover:text-emerald-400" />}
          </Button>
        </div>
      </div>

      {/* FUTURISTIC SIDE PANEL */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[450]"
            />
            <motion.div 
              initial={{ x: "100%", skewX: "2deg" }}
              animate={{ x: 0, skewX: "0deg" }}
              exit={{ x: "100%", skewX: "2deg" }}
              transition={{ type: "spring", damping: 30, stiffness: 200 }}
              className="absolute inset-y-4 right-4 w-full sm:w-[460px] bg-black/90 backdrop-blur-3xl border-2 border-white/10 rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.8)] z-[500] flex flex-col overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
              
              <div className="p-10 border-b border-white/10 flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5">
                  <Cpu className="h-32 w-32" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic italic">
                    {selectedLocation ? "New Node" : "Data Log"}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em]">
                      {selectedLocation ? "Encoding spatial data" : `${pins.length} entries detected`}
                    </p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="rounded-2xl h-14 w-14 hover:bg-white/10 text-white" onClick={() => setIsSidebarOpen(false)}>
                  <X className="h-8 w-8" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                {selectedLocation && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="bg-white/5 border-2 border-emerald-500/20 rounded-[32px] p-8 space-y-8 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Target className="h-16 w-16" />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/80 ml-1">Identity Tag</label>
                        <Input 
                          placeholder="ASSIGN LABEL..." 
                          value={pinTitle}
                          onChange={e => setPinTitle(e.target.value)}
                          className="bg-black/50 border-2 border-white/10 h-16 px-8 text-xl font-black rounded-2xl focus-visible:ring-emerald-500 focus-visible:border-emerald-500 uppercase tracking-tight"
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/80 ml-1">Sector Intel</label>
                        <Textarea 
                          placeholder="OBSERVATIONS..." 
                          value={pinDesc}
                          onChange={e => setPinDesc(e.target.value)}
                          rows={4}
                          className="bg-black/50 border-2 border-white/10 px-8 py-6 text-lg rounded-2xl focus-visible:ring-emerald-500 focus-visible:border-emerald-500 tracking-tight resize-none font-medium"
                        />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <Button className="flex-1 h-20 rounded-2xl font-black text-xl uppercase italic bg-emerald-500 hover:bg-emerald-400 text-black shadow-2xl shadow-emerald-500/20 border-b-4 border-emerald-700 active:translate-y-1 transition-all" onClick={savePin}>
                          Commit Data
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!selectedLocation && (
                  <div className="grid gap-6">
                    {pins.length === 0 ? (
                      <div className="py-24 flex flex-col items-center justify-center text-white/30 bg-white/5 rounded-[48px] border-4 border-dashed border-white/5">
                        <MapPin className="h-16 w-16 mb-6 opacity-20" />
                        <p className="font-black text-2xl uppercase tracking-tighter text-white/60">No Data Detected</p>
                        <p className="text-xs mt-2 uppercase tracking-widest font-bold">Scanning for spatial anomalies...</p>
                      </div>
                    ) : (
                      pins.map((pin, idx) => (
                        <motion.div
                          key={pin.id}
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <div 
                            className="group relative bg-white/5 hover:bg-white/10 border-2 border-white/5 hover:border-emerald-500/30 transition-all rounded-[32px] cursor-pointer overflow-hidden p-8"
                            onClick={() => flyToPin(pin.lat, pin.lng)}
                          >
                            <div className="absolute top-0 right-0 p-4 flex gap-2">
                               <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-12 w-12 rounded-xl text-white/20 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePin(pin.id);
                                }}
                              >
                                <Trash2 className="h-6 w-6" />
                              </Button>
                            </div>
                            
                            <div className="flex gap-6 items-center">
                              <div className="bg-emerald-500/10 h-16 w-16 rounded-2xl flex items-center justify-center text-emerald-400 flex-shrink-0 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all border border-emerald-500/20">
                                <MapPin className="h-8 w-8" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-black text-2xl uppercase tracking-tighter group-hover:text-emerald-400 transition-colors leading-none">{pin.title}</h4>
                                {pin.description && (
                                  <p className="text-sm text-white/40 line-clamp-1 mt-2 font-medium tracking-tight">
                                    {pin.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-4">
                                  <div className="h-[2px] w-8 bg-emerald-500/30"></div>
                                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">
                                    TS: {new Date(pin.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -200% -200%; }
          100% { background-position: 200% 200%; }
        }
        .cyber-popup .leaflet-popup-content-wrapper {
          background: rgba(0,0,0,0.9) !important;
          color: white !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 12px !important;
          backdrop-filter: blur(10px);
        }
        .cyber-popup .leaflet-popup-tip {
          background: rgba(0,0,0,0.9) !important;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
