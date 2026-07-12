import { useState, useRef, useEffect } from 'react';
import { useModal } from './useModal';

export interface UserLocationState {
  userLocation: google.maps.LatLngLiteral | null;
  setUserLocation: (loc: google.maps.LatLngLiteral | null) => void;
  handleLocateUser: (mapInstance: google.maps.Map | null, onSuccess?: () => void) => void;
}

/**
 * Hook para gestionar la geolocalización en tiempo real del usuario.
 */
export default function useUserLocation(): UserLocationState {
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const { showAlert } = useModal();

  // Limpiar el watch al desmontar el hook
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleLocateUser = (mapInstance: google.maps.Map | null, onSuccess?: () => void): void => {
    if (!navigator.geolocation) {
      showAlert('Tu navegador no soporta geolocalización', 'Geolocalización');
      return;
    }

    // Si ya estamos rastreando y tenemos una ubicación, simplemente recentramos el mapa
    if (watchIdRef.current !== null && userLocation) {
      if (onSuccess) onSuccess();
      if (mapInstance) {
        mapInstance.panTo(userLocation);
        mapInstance.setZoom(17);
      }
      return;
    }

    let isFirstPosition = true;

    // Iniciar watchPosition para rastreo continuo en tiempo real
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);

        // La primera vez centramos e incrementamos zoom, luego solo movemos el marcador sin interrumpir la navegación del usuario
        if (isFirstPosition) {
          isFirstPosition = false;
          if (onSuccess) onSuccess();
          if (mapInstance) {
            mapInstance.panTo(loc);
            mapInstance.setZoom(17);
          }
        }
      },
      (err) => {
        console.error('Error en geolocalización en vivo:', err);
        showAlert('No se pudo obtener tu ubicación en tiempo real.', 'Geolocalización');
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    watchIdRef.current = watchId;
  };

  return {
    userLocation,
    setUserLocation,
    handleLocateUser,
  };
}
