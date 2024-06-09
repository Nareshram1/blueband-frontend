"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.gridlayer.googlemutant';
import io from 'socket.io-client';
import './styles.css';

// Custom car icons
const RaceCar = L.icon({
  iconUrl: '/racingcar.png',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19]
});
const SosIcon = L.icon({
  iconUrl: '/sos.png',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19]
});

function DashBoard() {
  const [cars, setCars] = useState([]);
  const [mapCenter, setMapCenter] = useState([52.07134812014466, -1.015803606943344]);
  const [sosMessages, setSosMessages] = useState(new Map());
  const [carPaths, setCarPaths] = useState({});

  function RecenterMap({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
      if (lat && lng) {
        map.flyTo([lat, lng], map.getZoom(), {
          animate: true,
          duration: 1.5 // Adjust the duration for smoother animation
        });
      }
    }, [lat, lng, map]);
    return null;
  }

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      withCredentials: true,
    });

    socket.on('locationUpdate', (data) => {
      setCars((prevCars) => {
        const updatedCars = prevCars.filter(car => car.carId !== data.carId);
        updatedCars.push(data);

        // Update car paths
        setCarPaths((prevPaths) => {
          const newPaths = { ...prevPaths };
          if (!newPaths[data.carId]) {
            newPaths[data.carId] = [];
          }
          newPaths[data.carId].push([data.latitude, data.longitude]);
          console.log('Updated Paths:', newPaths); // Debugging line
          return newPaths;
        });

        return updatedCars;
      });
    });

    socket.on('sos', (data) => {
      setSosMessages((prevMessages) => {
        const newMessages = new Map(prevMessages);
        newMessages.set(data.carId, data.message);
        console.log('SOS message received:', data.carId, data.message);
        console.log('Updated SOS messages:', newMessages);
        readMessage(data.carId, data.message);
        return newMessages;
      });
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (cars.length > 0) {
      const lastCarPosition = [cars[cars.length - 1].latitude, cars[cars.length - 1].longitude];
      setMapCenter(lastCarPosition);
    }
  }, [cars]);

  // Function to read out the message using Web Speech API
  const readMessage = (carId, message) => {
    const msg = new SpeechSynthesisUtterance(`${carId}: ${message}`);
    // in production 2 times, dev 4 times
    if (typeof window !== "undefined") {
      window.speechSynthesis.speak(msg);
      window.speechSynthesis.speak(msg);
    }
  };

  const sortedCars = cars.slice().sort((a, b) => a.carId - b.carId);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 py-4 text-white bg-blue-500">
        <div className="container">
          <h1 className="text-2xl font-bold">Blue Band</h1>
        </div>
      </header>
      <div className='flex flex-row flex-grow'>
        <div className='flex w-[20%] bg-gray-900 shadow-md rounded-r-md'>
          <div className='flex flex-col p-4'>
            <h1 className='text-xl font-bold'>Cars</h1>
            {sortedCars.map((car) => (
              <CarInfo key={car.carId} car={car} sosMessages={sosMessages} />
            ))}
          </div>
        </div>
        <main className="flex flex-grow">
          {cars && cars.length > 0 && (
            <MapContainer className="flex flex-grow h-[100%]" center={mapCenter} zoom={15} style={{ width: "100%" }}>
              <TileLayer
                url="http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
                subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
              />
              {cars.map((car) => (
                <Marker key={car.carId} position={[car.latitude, car.longitude]} icon={sosMessages.has(car.carId) ? SosIcon : RaceCar}>
                  <Popup>
                    Car ID: {car.carId}<br />
                    Latitude: {car.latitude}<br />
                    Longitude: {car.longitude}
                  </Popup>
                </Marker>
              ))}
              {Object.keys(carPaths).map(carId => (
                carPaths[carId] && carPaths[carId].length > 0 && (
                  <Polyline key={carId} positions={carPaths[carId]} color="blue" />
                )
              ))}
              {cars.length > 0 && (
                <RecenterMap lat={cars[cars.length - 1].latitude} lng={cars[cars.length - 1].longitude} />
              )}
            </MapContainer>
          )}
          {sosMessages.size > 0 && (
            <div className="relative px-4 py-3 text-red-700 bg-red-100 border border-red-400 rounded" role="alert">
              <strong className="font-bold">SOS Alerts:</strong>
              <ul className="pl-5 mt-2 list-disc">
                {Array.from(sosMessages.entries()).map(([carId, message], index) => (
                  <li key={index}>{carId}: {message}</li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const CarInfo = ({ car, sosMessages }) => {
  const hasSos = sosMessages.has(car.carId);

  return (
    <div className={`relative flex flex-col mt-2 p-2 rounded-lg ${hasSos ? 'border-4 border-red-600 animate-blinking' : 'border border-green-300'}`}>
      <span className='font-bold'>Car: {car.carId}</span>
      <span>Latitude: {car.latitude}</span>
      <span>Longitude: {car.longitude}</span>
    </div>
  );
};

export default DashBoard;
