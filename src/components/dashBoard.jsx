"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotatedmarker';
import io from 'socket.io-client';
import './styles.css';
import Image from 'next/image';
import supabase from '../../utils/supabase/client';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.setView(center, 18, {  // Adjust the zoom level for high zoom
        animate: true,
        duration: 5 // Adjust the duration for smoother animation
      });
    }
  }, [center, map]);
  return null;
}

const audio = new Audio("alert.mp3");

function DashBoard() {
  const [cars, setCars] = useState(new Map());
  const [mapCenter, setMapCenter] = useState([11.10223, 76.9659]); // Default center based on selected option (SREC)
  const [sosMessages, setSosMessages] = useState(new Map());
  const [trackData, setTrackData] = useState([]);
  const [newTrackData, setNewTrackData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    zoom: ""
  });

  const updateCarData = useCallback((data) => {
    console.log('hit ',data);
    setCars((prevCars) => {
      const newCars = new Map(prevCars);
      data.forEach(car => {
        newCars.set(car.carId, car);
      });
      return newCars;
    });
  }, []);

  const updateCarStatus = useCallback((dataArray) => {
    // Assuming dataArray is an array with a single object as described
    const data = dataArray[0];
  
    setSosMessages((prevMessages) => {
      // Convert the Map to an array of entries
      const entriesArray = Array.from(prevMessages.entries());
  
      // Ensure carId is the same type as the keys in the Map
      const carId = typeof Array.from(prevMessages.keys())[0] === 'number' ? Number(data.carId) : String(data.carId);
  
      // Filter out the entry with the specified carId
      const filteredEntries = entriesArray.filter(([key]) => key !== carId);
  
      // Convert the filtered array back to a Map
      const newMessages = new Map(filteredEntries);
  
      // console.log('Before filtering:', prevMessages);
      // console.log('After filtering:', newMessages);
  
      // Check if the newMessages Map is empty, if so, stop the audio
      if (newMessages.size === 0) {
        if (typeof window !== "undefined") {
          window.speechSynthesis.cancel();
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
          }
          audio.volume = 0;
          audio.currentTime = 0;
          audio.pause();
        }
      }
  
      return newMessages;
    });
  }, []);
  
  

  useEffect(() => {
    const getTrackData = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*');

      if (error) {
        console.error(error);
        return;
      }
      if (data.length > 0) {
        setTrackData(data);
      }
    };
    getTrackData();

    const socket = io('https://blueband-backend.onrender.com');

    socket.on('locationUpdate', updateCarData);
    socket.on('ok', updateCarStatus);

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
  }, [updateCarData, updateCarStatus]);

  useEffect(() => {
    if (sosMessages.size === 0) {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
        audio.volume = 0;
        audio.currentTime = 0;
        audio.pause();
      }
    }
  }, [sosMessages]);

  const readMessage = (carId, message) => {
    const msg = new SpeechSynthesisUtterance(`${carId}: ${message}`);
    if (typeof window !== "undefined") {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance("SOS Alert"));
      window.speechSynthesis.speak(msg);
    }
  };

  const sortedCars = useMemo(() => Array.from(cars.values()).sort((a, b) => a.carId - b.carId), [cars]);

  const handleCarInfoClick = useCallback((lat, lng) => {
    setMapCenter([lat, lng]);
  }, []);

  const handleSosAlertClick = useCallback(() => {
    setSosMessages(new Map());
    window.speechSynthesis.cancel();
    setMapCenter([11.10223, 76.9659]); // Reset to default center (SREC)
  }, []);

  const handleAddNewTrack = async () => {
    // Validate all fields are filled
    // console.log('gonna i: ', newTrackData);
    if (!newTrackData.name || !newTrackData.latitude || !newTrackData.longitude || !newTrackData.zoom) {
      alert('Please fill out all fields.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tracks')
        .insert([
          {
            name: newTrackData.name,
            latitude: parseFloat(newTrackData.latitude),
            longitude: parseFloat(newTrackData.longitude),
            zoom: parseInt(newTrackData.zoom)
          }
        ])
        .select();

      console.log(data);
      if (error) {
        console.error(error);
        return;
      }

      if (data && data.length > 0) {
        console.log('New track added:', data);
        // Optionally, update local state with new track data
        setTrackData([...trackData, data[0]]);
        // setShowDialog(false);
        setNewTrackData({
          name: "",
          latitude: "",
          longitude: "",
          zoom: ""
        });
      }
    } catch (error) {
      console.error('Error adding new track:', error.message);
    }
  };

  const handleRaceTrackChange = (event) => {
    if (event.target.value === "d") return;
    if (event.target.value === "addTrack") {
      setShowDialog(true);
      // console.log('t');
      return;
    }

    const selectedTrackId = event.target.value;
    const selectedTrack = trackData.find(track => track.id === parseInt(selectedTrackId));
    // console.log(selectedTrack);
    if (selectedTrack) {
      setMapCenter([selectedTrack.latitude, selectedTrack.longitude]);
    } else {
      // Default to SREC if no valid track is selected
      setMapCenter([11.10223, 76.9659]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTrackData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Dialog>
        <header className="p-0 text-white bg-slate-900">
          <div className="flex flex-row items-center w-full p-4">
            <Image
              src="/blueband_logo.png"
              width={50}
              height={50}
              alt="BlueBand Sports Logo"
            />
            <h1 className="ml-3 text-2xl font-bold">BlueBand Sports</h1>
            {/* <div className='bg-red-500'> */}

            <select className="w-auto h-10 p-2 ml-auto text-lg font-bold rounded-lg bg-slate-900 hover:cursor-pointer" onChange={handleRaceTrackChange}>
              <option value="d" className='bg-slate-400'>Select a track</option>
              {trackData.map((track) => (
                <option key={track.id} value={track.id}>{track.name}</option>
              ))}
            </select>
            <DialogTrigger asChild className='w-4 ml-8'>
              <Button variant="outline" className='bg-slate-600'>+</Button>
            </DialogTrigger>
          </div>
          {/* </div> */}
        </header>
        <div className='flex flex-col flex-grow h-max md:flex-row'>
          <div className='flex md:w-[20%] w-[100%] bg-gray-900 shadow-md rounded-r-md'>
            <div className='flex-row flex-grow hidden p-4 md:flex md:flex-col'>
              <h1 className='text-xl font-bold text-white'>Cars</h1>
              {sortedCars.map((car) => (
                <CarInfo key={car.carId} car={car} sosMessages={sosMessages} onClick={handleCarInfoClick} />
              ))}
            </div>
          </div>
          <main className="flex flex-col flex-grow min-h-[100%]">
            {sosMessages.size > 0 && (
              <div onDoubleClick={handleSosAlertClick} className="relative px-4 py-3 text-red-700 bg-red-100 border border-red-400 rounded h-max " role="alert">
                <strong className="font-bold">SOS Alerts:</strong>
                <ul className="pl-5 mt-2 list-disc">
                  {Array.from(sosMessages.entries()).map(([carId, message], index) => (
                    <li key={index}>{carId}: {message}</li>
                  ))}
                </ul>
              </div>
            )}
            {cars.size > 0 ? (
              <MapContainer className="z-10 flex flex-grow" center={mapCenter} zoom={18} style={{ width: "100%" }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  maxZoom={23} // Increase the max zoom level
                />
                {sortedCars.map((car) => (
                  <Marker
                    key={car.carId}
                    position={[car.latitude, car.longitude]}
                    icon={sosMessages.has(parseInt(car.carId)) ? SosIcon : RaceCar}
                    rotationOrigin="center"
                  >
                    <Popup>
                      Car ID: {car.carId}<br />
                      Latitude: {car.latitude}<br />
                      Longitude: {car.longitude}
                    </Popup>
                  </Marker>
                ))}
                <RecenterMap center={mapCenter} />
              </MapContainer>
            ) : (
              <div className='flex items-center justify-center flex-grow'>
                <h1>Tracking Not Enabled</h1>
              </div>
            )}
          </main>
        </div>

        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Track</DialogTitle>
            <DialogDescription>
              Enter all details of track.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" name="name" value={newTrackData.name} onChange={handleInputChange} className="col-span-3 font-bold text-slate-500" />
            </div>
            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="latitude" className="text-right">
                Latitude
              </Label>
              <Input id="latitude" name="latitude" value={newTrackData.latitude} onChange={handleInputChange} className="col-span-3 font-bold text-slate-500" />
            </div>
            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="longitude" className="text-right">
                Longitude
              </Label>
              <Input id="longitude" name="longitude" value={newTrackData.longitude} onChange={handleInputChange} className="col-span-3 font-bold text-slate-500" />
            </div>
            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="zoom" className="text-right">
                Zoom
              </Label>
              <Input id="zoom" name="zoom" value={newTrackData.zoom} onChange={handleInputChange} className="col-span-3 font-bold text-slate-500" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddNewTrack}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CarInfo = ({ car, sosMessages, onClick }) => {
  const hasSos = sosMessages.has(parseInt(car.carId));
  // console.log('--',sosMessages);
  // console.log('R/G', hasSos, car.carId);
  return (
    <div
      className={`relative flex flex-col mt-2 p-2 rounded-lg cursor-pointer ${hasSos ? 'border-4 border-red-600 animate-blinking' : 'border border-green-300 bg-green-500'}`}
      onClick={() => onClick(car.latitude, car.longitude)}
    >
      <span className='font-bold text-white'>Car: {car.carId}</span>
      <span className='text-white'>Latitude: {car.latitude}</span>
      <span className='text-white'>Longitude: {car.longitude}</span>
    </div>
  );
};

export default DashBoard;
