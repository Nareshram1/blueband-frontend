"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.gridlayer.googlemutant';
import 'leaflet-rotatedmarker'; // Import the plugin
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

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], map.getZoom(), {
        animate: true,
        duration: 5 // Adjust the duration for smoother animation
      });
    }
  }, [lat, lng, map]);
  return null;
}

const audio = new Audio("alert.mp3");

function DashBoard() {
  const [cars, setCars] = useState(new Map());
  const [mapCenter, setMapCenter] = useState([53.324547401, 9.876795653]);
  const [sosMessages, setSosMessages] = useState(new Map());
  const [carPaths, setCarPaths] = useState({});
  const [carDirections, setCarDirections] = useState({});

  const updateCarData = useCallback((data) => {
    setCars((prevCars) => {
      const newCars = new Map(prevCars);
      newCars.set(data.carId, data);

      setCarPaths((prevPaths) => {
        const newPaths = { ...prevPaths };
        if (!newPaths[data.carId]) {
          newPaths[data.carId] = [];
        }
        newPaths[data.carId].push([data.latitude, data.longitude]);
        return newPaths;
      });

      setCarDirections((prevDirections) => {
        const newDirections = { ...prevDirections };
        const path = carPaths[data.carId];
        if (path && path.length > 1) {
          const lastPoint = path[path.length - 2];
          const newPoint = [data.latitude, data.longitude];
          const angle = calculateAngle(lastPoint, newPoint);
          newDirections[data.carId] = angle + 50;
        }
        return newDirections;
      });

      return newCars;
    });
  }, [carPaths]);

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      withCredentials: true,
    });

    socket.on('locationUpdate', updateCarData);

    socket.on('sos', (data) => {
      setSosMessages((prevMessages) => {
        const newMessages = new Map(prevMessages);
        newMessages.set(data.carId, data.message);
        audio.play();
        readMessage(data.carId, data.message);
        return newMessages;
      });
    });

    return () => socket.disconnect();
  }, [updateCarData]);

  useEffect(() => {
    if (cars.size > 0) {
      const lastCarPosition = Array.from(cars.values()).slice(-1)[0];
      setMapCenter([lastCarPosition.latitude, lastCarPosition.longitude]);
    }
  }, [cars]);

  const calculateAngle = useCallback((start, end) => {
    const dx = end[1] - start[1];
    const dy = end[0] - start[0];
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return angle;
  }, []);

  const readMessage = (carId, message) => {
    const msg = new SpeechSynthesisUtterance(`${carId}: ${message}`);
    if (typeof window !== "undefined") {
      for (let i = 0; i < 3; i++) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance("SOS Alert"));
        window.speechSynthesis.speak(msg);
      }
    }
  };

  const sortedCars = useMemo(() => Array.from(cars.values()).sort((a, b) => a.carId - b.carId), [cars]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 py-4 text-white bg-blue-500">
        <div className="container">
          <h1 className="text-2xl font-bold">Blue Band</h1>
        </div>
      </header>
      <div className='flex flex-col flex-grow h-max md:flex-row'>
        <div className='flex md:w-[20%] w-[100%] bg-gray-900 shadow-md rounded-r-md'>
          <div className='flex-row flex-grow hidden p-4 md:flex md:flex-col'>
            <h1 className='text-xl font-bold'>Cars</h1>
            {sortedCars.map((car) => (
              <CarInfo key={car.carId} car={car} sosMessages={sosMessages} />
            ))}
          </div>
        </div>
        <main className="flex flex-col  flex-grow min-h-[100%]">
        {sosMessages.size > 0 && (
            <div onClick={()=>{setSosMessages(new Map())}} className="relative px-4 py-3 text-red-700 bg-red-100 border border-red-400 rounded h-max " role="alert">
              <strong className="font-bold">SOS Alerts:</strong>
              <ul className="pl-5 mt-2 list-disc">
                {Array.from(sosMessages.entries()).map(([carId, message], index) => (
                  <li key={index}>{carId}: {message}</li>
                ))}
              </ul>
            </div>
          )}
          {cars.size > 0 ? (
            <MapContainer className="flex flex-grow " center={mapCenter} zoom={35} style={{ width: "100%"}}>
              <TileLayer
                url="http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
                subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
              />
              {sortedCars.map((car) => (
                <Marker
                  key={car.carId}
                  position={[car.latitude, car.longitude]}
                  icon={sosMessages.has(car.carId) ? SosIcon : RaceCar}
                  rotationAngle={carDirections[car.carId] || 0}
                  rotationOrigin="center"
                >
                  <Popup>
                    Car ID: {car.carId}<br />
                    Latitude: {car.latitude}<br />
                    Longitude: {car.longitude}
                  </Popup>
                </Marker>
              ))}
              {cars.size > 0 && (
                <RecenterMap lat={Array.from(cars.values()).slice(-1)[0].latitude} lng={Array.from(cars.values()).slice(-1)[0].longitude} />
              )}
            </MapContainer>
          ) : (
            <div className='flex items-center justify-center flex-grow'>
              <h1>Tracking Not Enabled</h1>
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
    <div className={`relative  flex flex-col mt-2 p-2 rounded-lg ${hasSos ? 'border-4  border-red-600 animate-blinking' : 'border border-green-300'}`}>
      <span className='font-bold'>Car: {car.carId}</span>
      <span>Latitude: {car.latitude}</span>
      <span>Longitude: {car.longitude}</span>
    </div>
  );
};

export default DashBoard;
