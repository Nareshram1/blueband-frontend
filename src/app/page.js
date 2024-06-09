"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), {
      animate: true,
      duration: 1.5 // Adjust the duration for smoother animation
    });
  }, [lat, lng, map]);
  return null;
  
}


const toFixedFloat = (num, decimalPlaces) => {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(num * factor) / factor;
};


function Home() {
  const [cars, setCars] = useState([]);
  const [mapCenter, setMapCenter] = useState([52.07134812014466, -1.015803606943344]);
  const [sosMessages, setSosMessages] = useState([]);
  const [carPaths, setCarPaths] = useState({});

  



  useEffect(() => {
    const socket = io('http://localhost:5000', {
      withCredentials: true,
    });

    // socket.on('locationUpdate', (data) => {
    //   setCars((prevCars) => {
    //     const updatedCars = prevCars.filter(car => car.carId !== data.carId);
    //     updatedCars.push(data);

    //     // Update car paths
    //     setCarPaths((prevPaths) => {
    //       const newPaths = { ...prevPaths };
    //       if (!newPaths[data.carId]) {
    //         newPaths[data.carId] = [];
    //       }
    //       newPaths[data.carId].push([parseFloat(data.latitude,7), parseFloat(data.longitude,7)]);
    //       console.log('Updated Paths:', newPaths); // Debugging line
    //       return newPaths;
    //     });

    //     return updatedCars;
    //   });
    // });

    socket.on('locationUpdate', (data) => {
      const { carId, latitude, longitude } = data;
      const preciseLat = toFixedFloat(parseFloat(latitude), 7);
      const preciseLng = toFixedFloat(parseFloat(longitude), 7);
      setCars((prevCars) => {
        const updatedCars = prevCars.filter(car => car.carId !== carId);
        updatedCars.push({ ...data, latitude: preciseLat, longitude: preciseLng });
        
        return updatedCars;
      });

      setCarPaths((prevPaths) => {
        const newPaths = { ...prevPaths };
        if (!newPaths[carId]) {
          newPaths[carId] = [];
        }
        newPaths[carId].push([preciseLat, preciseLng]);
        console.log('Updated Paths:', newPaths); // Debugging line
        return newPaths;
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
    <div className="flex flex-col min-h-screen ">
      <header className="px-6 py-4 text-white bg-blue-500">
        <div className="container ">
          <h1 className="text-2xl font-bold">Blue Band</h1>
        </div>
      </header>
      <div className='flex flex-row flex-grow'>
        <div className='flex w-[20%] bg-gray-200 shadow-md rounded-r-md'>
          <div className='flex flex-col p-4'>
            <h1 className='text-xl font-bold'>Cars</h1>
            {cars.map((car) => (
              <div key={car.carId} className='flex flex-col mt-2'>
                <span className='font-bold'>Car ID: {car.carId}</span>
                <span>Latitude: {car.latitude}</span>
                <span>Longitude: {car.longitude}</span>
              </div>
            ))}
          </div>
        </div>
        <main className="flex flex-grow ">
          {cars && cars.length > 0 && (
            <MapContainer className="flex flex-grow h-[100%]" center={mapCenter} zoom={15} style={{ width: "100%" }}>
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
              {Object.keys(carPaths).map(carId => (
                <Polyline key={carId} positions={carPaths[carId]} color="blue" />
              ))}
              
              {cars.length > 0 && (
                <RecenterMap lat={cars[cars.length - 1].latitude} lng={cars[cars.length - 1].longitude} />
              )}
            </MapContainer>
          )}
          {sosMessages.length > 0 && (
            <div className="relative px-4 py-3 text-red-700 bg-red-100 border border-red-400 rounded" role="alert">
              <strong className="font-bold">SOS Alerts:</strong>
              <ul className="pl-5 mt-2 list-disc">
                {sosMessages.map((msg, index) => (
                  <li key={index}>{msg.carId}: {msg.message}</li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Home;
