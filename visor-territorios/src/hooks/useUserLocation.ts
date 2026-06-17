import { useState } from 'react';
import { useModal } from './useModal';

export interface UserLocationState {
  userLocation: google.maps.LatLngLiteral | null;
  setUserLocation: (loc: google.maps.LatLngLiteral | null) => void;
  handleLocateUser: (mapInstance: google.maps.Map | null, onSuccess?: () => void) => void;
}

/**
 * Hook para gestionar la geolocalización del usuario.
 */
export default function useUserLocation(): UserLocationState {
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const { showAlert } = useModal();



  const handleLocateUser = (mapInstance: google.maps.Map | null, onSuccess?: () => void): void => {
    if (!navigator.geolocation) {
      showAlert('Tu navegador no soporta geolocalización', 'Geolocalización');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        if (onSuccess) onSuccess();
        if (mapInstance) {
          mapInstance.panTo(loc);
          mapInstance.setZoom(16);
        }
      },
      (err) => {
        console.error('Error obteniendo ubicación:', err);
        showAlert('No se pudo obtener tu ubicación', 'Geolocalización');
      },
      { enableHighAccuracy: true }
    );
  };

  return {
    userLocation,
    setUserLocation,
    handleLocateUser,
  };
}
