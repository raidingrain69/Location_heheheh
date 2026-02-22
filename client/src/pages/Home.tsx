import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Navigation, MapPin, List, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Fix Leaflet default icon path issues in Vite by using custom DivIcon
const createCustomIcon = (color: string = "#10b981") => {
  return L.divIcon({
    className: "custom-marker-icon",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-md"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const userIcon = createCustomIcon("#3b82f6"); // Blue for user
const pinIcon = createCustomIcon("#10b981"); // Emerald for pins

interface Pin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  timestamp: number;
}

// Helper to center map
function MapController({ center }: { center: L.LatLngTuple | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Helper to handle clicks on the map
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
  
  // Form state
  const [pinTitle, setPinTitle] = useState("");
  const [pinDesc, setPinDesc] = useState("");

  // Load pins from local storage on mount (Offline capability)
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

  // Save pins to local storage whenever they change
  useEffect(() => {
    localStorage.setItem("uni_tracker_pins", JSON.stringify(pins));
  }, [pins]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }
    
    toast({ title: "Locating you..." });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        toast({ title: "Unable to retrieve your location.", variant: "destructive" });
      }
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
      toast({ title: "Please enter a title", variant: "destructive" });
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

    setPins([...pins, newPin]);
    
    // Reset form
    setPinTitle("");
    setPinDesc("");
    setSelectedLocation(null);
    setIsAddingPin(false);
    
    toast({ title: "Location pinned successfully!" });
  };

  const deletePin = (id: string) => {
    setPins(pins.filter(p => p.id !== id));
    toast({ title: "Pin removed" });
  };

  const flyToPin = (lat: number, lng: number) => {
    setUserLocation([lat, lng]);
    setIsSidebarOpen(false);
  };

  // Initial location (approximate center, maybe London or a generic city if userLocation is null)
  const defaultCenter: L.LatLngTuple = [51.505, -0.09];

  return (
    <div className="h-screen w-full relative flex overflow-hidden bg-background font-sans">
      
      {/* MAP AREA */}
      <div className="flex-1 h-full z-0 relative">
        <MapContainer 
          center={userLocation || defaultCenter} 
          zoom={13} 
          className="h-full w-full"
          zoomControl={false}
        >
          {/* Using standard OSM tiles. These will be cached by the browser somewhat, 
              but true offline requires a service worker which we mock here with localStorage for pins. */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapController center={userLocation} />
          <MapClickHandler onLocationSelect={handleMapClick} />

          {/* User Location Marker */}
          {userLocation && (
            <Marker position={userLocation} icon={userIcon}>
              <Popup>
                <div className="font-sans font-medium text-sm">You are here</div>
              </Popup>
            </Marker>
          )}

          {/* Saved Pins */}
          {pins.map(pin => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={pinIcon}>
              <Popup className="font-sans">
                <div className="p-1">
                  <h3 className="font-semibold text-base mb-1">{pin.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{pin.description}</p>
                  <div className="text-xs text-muted-foreground">
                    Added: {new Date(pin.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Selected Location (being added) */}
          {selectedLocation && (
            <Marker position={selectedLocation} icon={createCustomIcon("#f59e0b")}>
              <Popup>Selected Location</Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Floating Controls */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
          <Button 
            size="icon" 
            variant="secondary" 
            className="rounded-full shadow-lg bg-card text-card-foreground hover:bg-accent"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            data-testid="button-toggle-sidebar"
          >
            <List className="h-5 w-5" />
          </Button>
          
          <Button 
            size="icon" 
            variant="secondary" 
            className="rounded-full shadow-lg bg-card text-card-foreground hover:bg-accent"
            onClick={handleLocateMe}
            data-testid="button-locate-me"
          >
            <Navigation className="h-5 w-5 text-blue-500" />
          </Button>

          <Button 
            size="icon" 
            variant={isAddingPin ? "default" : "secondary"} 
            className={`rounded-full shadow-lg transition-colors ${isAddingPin ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-card text-card-foreground hover:bg-accent"}`}
            onClick={() => {
              setIsAddingPin(!isAddingPin);
              if (!isAddingPin) toast({ title: "Tap anywhere on the map to drop a pin" });
              else setSelectedLocation(null);
            }}
            data-testid="button-add-pin"
          >
            {isAddingPin ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* SIDEBAR / DRAWER */}
      <div 
        className={`absolute inset-y-0 right-0 w-full sm:w-96 bg-card border-l border-border shadow-2xl z-[500] transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "translate-x-full"} flex flex-col`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-md">
          <h2 className="text-xl font-bold text-foreground font-ui tracking-tight">
            {selectedLocation ? "New Spot" : "My Spots"}
          </h2>
          <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Add Pin Form */}
          {selectedLocation && (
            <Card className="border-primary/20 bg-primary/5 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <MapPin className="h-5 w-5" /> Save Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Spot Name</label>
                  <Input 
                    placeholder="e.g., Good Coffee Shop" 
                    value={pinTitle}
                    onChange={e => setPinTitle(e.target.value)}
                    data-testid="input-pin-title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Details (optional)</label>
                  <Textarea 
                    placeholder="Notes about this spot..." 
                    value={pinDesc}
                    onChange={e => setPinDesc(e.target.value)}
                    rows={3}
                    className="resize-none"
                    data-testid="input-pin-desc"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 font-semibold" onClick={savePin} data-testid="button-save-pin">
                    Save Spot
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setSelectedLocation(null);
                    setIsAddingPin(false);
                  }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* List of Pins */}
          {!selectedLocation && pins.length === 0 && (
            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
              <MapPin className="h-8 w-8 mb-2 opacity-50" />
              <p>No spots pinned yet.</p>
              <p className="text-sm text-center px-4 mt-1 opacity-70">
                Tap the + button and click the map to add one.
              </p>
            </div>
          )}

          {!selectedLocation && pins.map(pin => (
            <Card 
              key={pin.id} 
              className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/30 cursor-pointer"
              onClick={() => flyToPin(pin.lat, pin.lng)}
              data-testid={`card-pin-${pin.id}`}
            >
              <div className="p-4 flex gap-4">
                <div className="bg-primary/10 p-2.5 rounded-full h-fit text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-base truncate">{pin.title}</h4>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePin(pin.id);
                      }}
                      data-testid={`button-delete-${pin.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {pin.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {pin.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-2 font-mono">
                    {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Toast notifications handler is rendered in App.tsx */}
    </div>
  );
}
