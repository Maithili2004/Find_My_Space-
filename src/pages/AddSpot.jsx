import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import 'leaflet/dist/leaflet.css';

function LocationMarker({ setLocation }) {
  useMapEvents({
    click(e) {
      setLocation([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}

export default function LocationPicker({ location, setLocation }) {
  return (
    <MapContainer center={[28.6139, 77.2090]} zoom={13} style={{ height: "300px", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {location && <Marker position={location} />}
      <LocationMarker setLocation={setLocation} />
    </MapContainer>
  );
}