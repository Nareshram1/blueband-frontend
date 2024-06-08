"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.gridlayer.googlemutant';
import io from 'socket.io-client';

// Custom car icon
const CarIcon = L.icon({
  iconUrl: '/racingcar.png',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19]
});

function Home() {
  const [cars, setCars] = useState([]);
  const [mapCenter, setMapCenter] = useState([52.07134812014466,-1.015803606943344]);
  const [sosMessages, setSosMessages] = useState([]);

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      withCredentials: true,
    });

    socket.on('locationUpdate', (data) => {
      setCars((prevCars) => {
        const updatedCars = prevCars.filter(car => car.carId !== data.carId);
        updatedCars.push(data);
        // console.log(cars)
        return updatedCars;
      });
    });

    socket.on('sos', (data) => {
      setSosMessages((prevMessages) => [...prevMessages, data]);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (cars.length > 0) {
      const lastCarPosition = [cars[cars.length - 1].latitude, cars[cars.length - 1].longitude];
      setMapCenter(lastCarPosition);
    }
  }, [cars]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="bg-blue-500 text-white py-4 px-6">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Blue Band</h1>
        </div>
      </header>
      <main className="container mx-auto p-6 flex-1">
        <h2 className="text-xl font-semibold mb-4">Dashboard - Silverstone Circuit</h2>
        <h2 className="text-lg font-semibold mb-4">Cars on circuit {cars.length}</h2>
        <MapContainer center={mapCenter} zoom={15} style={{ height: "60vh", width: "100%" }} className="mb-6">
          <TileLayer
            url="http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          />
          {cars.map((car) => (
            <Marker key={car.carId} position={[car.latitude, car.longitude]} icon={CarIcon}>
              <Popup>
                Car ID: {car.carId}<br />
                Latitude: {car.latitude}<br />
                Longitude: {car.longitude}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {sosMessages.length > 0 && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">SOS Alerts:</strong>
            <ul className="list-disc pl-5 mt-2">
              {sosMessages.map((msg, index) => (
                <li key={index}>{msg.carId}: {msg.message}</li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

export default Home;
