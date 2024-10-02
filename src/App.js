import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import carIconUrl from './img/car-moving.png'; // Path to your moving car image
import waypointIconUrl from './img/waypoint.png'; // Path to your waypoint image

import API_KEY from './API_KEY';

const carIcon = new L.Icon({
  iconUrl: carIconUrl,
  iconSize: [50, 50],
});

const waypointIcon = new L.Icon({
  iconUrl: waypointIconUrl,
  iconSize: [25, 25],
});

// Define routes with multiple waypoints
const routes = [
  {
    waypoints: [
      [25.4358, 81.8463],
      [25.555, 81.9863],
    ],
  }, // Route 1
  {
    waypoints: [
      [25.4358, 81.8463],
      [25.565, 81.9963],
    ],
  }, // Route 2
];

function App() {
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [vehiclePos, setVehiclePos] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [speed, setSpeed] = useState(5); // Speed control (lower values = faster)

  const routeIndexRef = useRef(0);
  const animationRef = useRef(null);

  // Fetch route from OpenRouteService with waypoints
  const fetchRoute = async (waypoints) => {
    const waypointsParam = waypoints
      .map((point) => `${point[1]},${point[0]}`) // OpenRouteService requires the format longitude,latitude
      .join('|');

    try {
      const response = await axios.get(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${API_KEY}&start=${waypoints[0][1]},${waypoints[0][0]}&end=${waypoints[waypoints.length - 1][1]},${waypoints[waypoints.length - 1][0]}&waypoints=${waypointsParam}`
      );

      // Extract coordinates from the response
      const coords = response.data.features[0].geometry.coordinates.map((coord) => [coord[1], coord[0]]);
      setRouteCoords(coords);
      setVehiclePos(coords[0]); // Start vehicle at the first point
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  // Handle vehicle movement along the route
  const moveVehicle = () => {
    if (routeCoords.length === 0 || isMoving) return;

    const start = routeCoords[routeIndexRef.current];
    const end = routeCoords[routeIndexRef.current + 1];

    if (!end) {
      // Stop moving if reached the end of the route
      setIsMoving(false);
      cancelAnimationFrame(animationRef.current);
      return;
    }

    const distance = L.latLng(start).distanceTo(L.latLng(end));
    const duration = (distance / speed) * 10; // Speed control (lower speed -> longer duration)

    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;

      const progress = (timestamp - startTime) / duration;

      if (progress < 1) {
        // Interpolate vehicle position between start and end
        const lat = start[0] + progress * (end[0] - start[0]);
        const lng = start[1] + progress * (end[1] - start[1]);
        setVehiclePos([lat, lng]);

        // Request next frame
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Move to next point
        routeIndexRef.current++;
        moveVehicle();
      }
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);
  };

  // Handle route selection from the dropdown
  const handleRouteChange = (e) => {
    const selectedIndex = e.target.value;
    setSelectedRoute(routes[selectedIndex]);
    fetchRoute(routes[selectedIndex].waypoints);
  };

  // Start/Stop vehicle movement
  const toggleMovement = () => {
    setIsMoving((prev) => {
      if (!prev) {
        // Start movement if it's not already moving
        routeIndexRef.current = 0; // Reset index
        moveVehicle();
      } else {
        // Stop movement if it's currently moving
        cancelAnimationFrame(animationRef.current);
        setVehiclePos(routeCoords[routeCoords.length - 1]); // Ensure vehicle is placed at the last position
      }
      return !prev;
    });
  };

  return (
    <div>
      <div style={{position:'absolute',zIndex:'10000',top:'10px',right:'200px'}}>
        <select onChange={handleRouteChange}>
          <option value="">Select a route</option>
          {routes.map((route, index) => (
            <option value={index} key={index}>
              Route {index + 1}
            </option>
          ))}
        </select>
      </div>
      <button style={{position:'absolute',zIndex:'10000',top:'10px',right:'10px', background:"#00f",padding:"10px",margin:"10px", color:'white',border:"1px solid white", borderRadius:"0.7rem"}} onClick={toggleMovement}>{isMoving ? 'Stop Vehicle' : 'Start Vehicle'}</button>
      
      <MapContainer center={[25.4358, 81.8463]} zoom={13} style={{ height: '100vh', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {routeCoords.length > 0 && (
          <Polyline positions={routeCoords} color="blue" />
        )}
        {vehiclePos && <Marker position={vehiclePos} icon={carIcon} />}
        {selectedRoute && selectedRoute.waypoints.map((coord, index) => (
          <Marker key={index} position={coord} icon={waypointIcon} />
        ))}
      </MapContainer>
    </div>
  );
}

export default App;
