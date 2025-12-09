import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

// Fix default marker icon issue with Leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function LocationMarker({ setLatLng }) {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      setLatLng(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function LocationPicker({ latLng, setLatLng }) {
  return (
    <div>
      <MapContainer
        center={[latLng?.lat || 18.5204, latLng?.lng || 73.8567]}
        zoom={13}
        style={{ height: "300px", width: "100%", borderRadius: "12px", marginBottom: "12px" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        />
        <LocationMarker setLatLng={setLatLng} />
        {latLng?.lat && latLng?.lng && (
          <Marker position={[latLng.lat, latLng.lng]} />
        )}
      </MapContainer>
      <div>
        <b>Latitude:</b> {latLng?.lat || ""} <b>Longitude:</b> {latLng?.lng || ""}
      </div>
    </div>
  );
}

// Add a parking spot
export async function addParkingSpot(spot) {
  await addDoc(collection(db, "parkingSpots"), spot);
}

// Get all parking spots
export async function getParkingSpots() {
  const querySnapshot = await getDocs(collection(db, "parkingSpots"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}