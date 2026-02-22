import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Navigation, MapPin, List, Plus, Trash2, X, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

// Fix Leaflet default icon path issues in Vite by using custom DivIcon
const createCustomIcon = (color: string = "#10b981", isUser: boolean = false) => {
  return L.divIcon({
    className: "custom-marker-icon",
    html: `<div class="relative">
      ${isUser ? '<div class="absolute inset-0 bg-blue-500/30 rounded-full animate-ping scale-150"></div>' : ''}
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-xl relative z-10"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg>
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
      map.flyTo(center, map.getZoom(), { duration: 1.5 });
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

  // Auto-locate on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: L.LatLngTuple = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          toast({ title: "Found your location! 📍" });
        },
        () => {
          console.log("Initial location access denied or unavailable.");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
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

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: L.LatLngTuple = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        setIsLocating(false);
      },
      () => {
        toast({ title: "Position unavailable", variant: "destructive" });
        setIsLocating(false);
      }
    );
  };

  const handleQuickPin = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }

    toast({ title: "Capturing current spot..." });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = new L.LatLng(position.coords.latitude, position.coords.longitude);
        setSelectedLocation(coords);
        setUserLocation([coords.lat, coords.lng]);
        setIsSidebarOpen(true);
        setIsAddingPin(false);
      },
      () => toast({ title: "Could not get current location", variant: "destructive" })
    );
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
      toast({ title: "Give it a name!", variant: "destructive" });
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
    toast({ title: "Spot saved! 📍" });
  };

  const deletePin = (id: string) => {
    setPins(pins.filter(p => p.id !== id));
    toast({ title: "Pin removed" });
  };

  const flyToPin = (lat: number, lng: number) => {
    setUserLocation([lat, lng]);
    if (window.innerWidth < 640) setIsSidebarOpen(false);
  };

  const defaultCenter: L.LatLngTuple = [51.505, -0.09];

  return (
    <div className="h-screen w-full relative flex overflow-hidden bg-background font-sans text-foreground">
      
      {/* MAP AREA */}
      <div className="flex-1 h-full z-0 relative">
        <MapContainer 
          center={userLocation || defaultCenter} 
          zoom={15} 
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          <MapController center={userLocation} />
          <MapClickHandler onLocationSelect={handleMapClick} />

          {userLocation && (
            <Marker position={userLocation} icon={userIcon}>
              <Popup>
                <div className="font-sans font-medium">Your Location</div>
              </Popup>
            </Marker>
          )}

          {pins.map(pin => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={pinIcon}>
              <Popup className="font-sans custom-popup">
                <div className="p-2 min-w-[150px]">
                  <h3 className="font-bold text-lg text-primary">{pin.title}</h3>
                  {pin.description && <p className="text-sm text-muted-foreground mt-1">{pin.description}</p>}
                </div>
              </Popup>
            </Marker>
          ))}

          {selectedLocation && (
            <Marker position={selectedLocation} icon={createCustomIcon("#f59e0b")}>
              <Popup>New Spot</Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Floating Header */}
        <div className="absolute top-6 left-6 z-[400] flex items-center gap-3">
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl">
              <Zap className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">UniTracker</h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">Van Commute Explorer</p>
            </div>
          </div>
        </div>

        {/* Bottom Quick Action Bar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-4 w-full px-6 justify-center max-w-md">
           <Button 
            size="lg"
            className="rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 flex-1 gap-2 font-bold text-lg transition-all active:scale-95 group"
            onClick={handleQuickPin}
            data-testid="button-quick-pin"
          >
            <Target className="h-6 w-6 group-hover:rotate-12 transition-transform" />
            Pin Current Spot
          </Button>
        </div>

        {/* Side Actions */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[400] flex flex-col gap-4">
          <Button 
            size="icon" 
            variant="secondary" 
            className="w-14 h-14 rounded-2xl shadow-xl bg-card/90 backdrop-blur-lg border border-border/50 hover:bg-accent text-foreground transition-all hover:scale-110"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <List className="h-6 w-6" />
          </Button>
          
          <Button 
            size="icon" 
            variant="secondary" 
            className="w-14 h-14 rounded-2xl shadow-xl bg-card/90 backdrop-blur-lg border border-border/50 hover:bg-accent text-foreground transition-all hover:scale-110"
            onClick={handleLocateMe}
            disabled={isLocating}
          >
            <Navigation className={`h-6 w-6 ${isLocating ? 'animate-spin' : 'text-blue-500'}`} />
          </Button>

          <Button 
            size="icon" 
            variant={isAddingPin ? "destructive" : "secondary"} 
            className={`w-14 h-14 rounded-2xl shadow-xl backdrop-blur-lg border border-border/50 transition-all hover:scale-110 ${!isAddingPin ? 'bg-card/90' : ''}`}
            onClick={() => {
              setIsAddingPin(!isAddingPin);
              if (!isAddingPin) toast({ title: "Tap map to drop pin" });
              else setSelectedLocation(null);
            }}
          >
            {isAddingPin ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6 text-primary" />}
          </Button>
        </div>
      </div>

      {/* REFINED SIDEBAR */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 right-0 w-full sm:w-[420px] bg-card/95 backdrop-blur-2xl border-l border-border shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-[500] flex flex-col"
          >
            <div className="p-8 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  {selectedLocation ? "Pin Spot" : "My spots"}
                </h2>
                <p className="text-sm text-muted-foreground font-medium">
                  {selectedLocation ? "Tell us about this location" : `${pins.length} locations saved`}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="rounded-xl h-12 w-12 hover:bg-accent" onClick={() => setIsSidebarOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedLocation && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-none bg-primary/5 shadow-inner rounded-3xl overflow-hidden">
                    <CardContent className="p-8 space-y-6">
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-primary">Spot Name</label>
                        <Input 
                          placeholder="e.g. Favorite Juice Stand" 
                          value={pinTitle}
                          onChange={e => setPinTitle(e.target.value)}
                          className="bg-background/50 border-none h-14 px-6 text-lg font-bold rounded-2xl focus-visible:ring-primary shadow-sm"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-primary">Notes</label>
                        <Textarea 
                          placeholder="Add details about this spot..." 
                          value={pinDesc}
                          onChange={e => setPinDesc(e.target.value)}
                          rows={4}
                          className="bg-background/50 border-none px-6 py-4 text-base rounded-2xl focus-visible:ring-primary shadow-sm resize-none"
                        />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <Button className="flex-1 h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" onClick={savePin}>
                          Save Location
                        </Button>
                        <Button variant="outline" className="h-16 px-8 rounded-2xl border-border/50" onClick={() => setSelectedLocation(null)}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {!selectedLocation && (
                <div className="grid gap-4">
                  {pins.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-muted-foreground bg-accent/20 rounded-[40px] border-4 border-dashed border-border/50">
                      <div className="bg-background p-6 rounded-full shadow-lg mb-4">
                        <MapPin className="h-10 w-10 text-primary opacity-40" />
                      </div>
                      <p className="font-bold text-xl text-foreground">No pins yet!</p>
                      <p className="text-sm mt-2">Start mapping your university route.</p>
                    </div>
                  ) : (
                    pins.map((pin, idx) => (
                      <motion.div
                        key={pin.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card 
                          className="group border-none bg-accent/30 hover:bg-accent/50 transition-all rounded-[32px] overflow-hidden cursor-pointer"
                          onClick={() => flyToPin(pin.lat, pin.lng)}
                        >
                          <div className="p-6 flex gap-5">
                            <div className="bg-primary/20 h-14 w-14 rounded-2xl flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-110 transition-transform">
                              <MapPin className="h-7 w-7" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="flex justify-between items-start">
                                <h4 className="font-black text-xl truncate tracking-tight">{pin.title}</h4>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deletePin(pin.id);
                                  }}
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </div>
                              {pin.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1 mt-1 font-medium">
                                  {pin.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-background/50 px-2 py-1 rounded-md text-muted-foreground">
                                  {new Date(pin.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
