import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '16px'
};

const defaultCenter = {
  lat: 40.4168,
  lng: -3.7038
};

export const TerritoryMap = ({ territoryNumber, onMapLoad, userLocation }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyAl448oXvGDgH6KSFwh7NP1nUlCXVMWxiU",
    version: '3.65'
  });

  const [map, setMap] = useState(null);

  const onLoad = React.useCallback(function callback(mapInstance) {
    setMap(mapInstance);
    if (onMapLoad) onMapLoad(mapInstance);
  }, [onMapLoad]);

  const onUnmount = React.useCallback(function callback() {
    setMap(null);
    if (onMapLoad) onMapLoad(null);
  }, [onMapLoad]);

  // Carga del GeoJSON usando el Data Layer de Google Maps
  useEffect(() => {
    if (map && territoryNumber && window.google) {
      console.log('🔄 Cargando territorio:', territoryNumber);

      // Limpiar datos previos de la capa de datos
      map.data.forEach(feature => map.data.remove(feature));

      // La ruta es relativa a la carpeta public de la PWA
        const geojsonUrl = `${import.meta.env.BASE_URL}geojson/${territoryNumber}.json`;

      fetch(geojsonUrl)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          console.log('✅ GeoJSON cargado:', data);

          // Añadir los datos del territorio a la capa
          map.data.addGeoJson(data);

          // Procesar las geometrías para ajustar el mapa
          const bounds = new window.google.maps.LatLngBounds();
          map.data.forEach(feature => {
            const geometry = feature.getGeometry();
            if (geometry) {
              geometry.forEachLatLng(latlng => {
                bounds.extend(latlng);
              });
            }
          });

          if (!bounds.isEmpty()) {
            map.fitBounds(bounds);
          }
        })
        .catch(err => {
          console.error('❌ Error cargando GeoJSON:', err);
        });

      // Estilo de los territorios (el interior siempre transparente)
      map.data.setStyle({
        fillColor: 'transparent',
        fillOpacity: 0,
        strokeColor: '#d53232ff',
        strokeWeight: 6,
        clickable: false
      });
    }
  }, [map, territoryNumber]);

  if (!isLoaded) return <div className="map-loading">Iniciando motor cartográfico...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={6}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        mapTypeId: 'hybrid',
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: true,
      }}
    >
      {userLocation && (
        <Marker
          position={userLocation}
          title="Tu ubicación"
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2,
          }}
          zIndex={999}
        />
      )}
    </GoogleMap>
  );
};
