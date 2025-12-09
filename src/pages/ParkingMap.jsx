import React, { useState } from "react";
import LocationPicker from "../components/LocationPicker";
import { addParkingSpot } from "../utils/parkingSpots";

export default function AddSpot() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) return alert("Please select a location on the map!");
    await addParkingSpot({
      name,
      address,
      latitude: location[0],
      longitude: location[1],
    });
    alert("Spot added!");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Spot Name" required />
      <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" required />
      <LocationPicker location={location} setLocation={setLocation} />
      <button type="submit">Add Spot</button>
    </form>
  );
}