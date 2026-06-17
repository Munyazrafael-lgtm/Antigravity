import { useState, useEffect, useRef } from 'react';
import useOfflineMaps, { type GeojsonDataMap } from './useOfflineMaps';
import { fetchTerritoriosPorCliente, limpiarTexto } from '../services/territoriosService';

export interface UserSessionState {
  userName: string | null;
  territoryNumber: string | null;
  setTerritoryNumber: (num: string | null) => void;
  geojsonData: GeojsonDataMap;
  handleNameSubmit: (name: string) => void;
  handleTerritorySelect: (id: string) => void;
}

/**
 * Hook para gestionar la sesión del usuario (nombre y territorio seleccionado).
 */
export default function useUserSession(onNameSubmitCallback?: () => void): UserSessionState {
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem('userName');
  });

  const [territoryNumber, setTerritoryNumber] = useState<string | null>(() => {
    return localStorage.getItem('territoryNumber');
  });

  const { geojsonData } = useOfflineMaps(territoryNumber);

  // Refs para acceder al estado actual sin crear dependencias reactivas
  const onNameSubmitRef = useRef(onNameSubmitCallback);
  onNameSubmitRef.current = onNameSubmitCallback;

  // Leer parámetros de la URL una sola vez al montar.
  // Los query params no cambian durante la vida de la app, así que no necesita re-ejecutarse.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clienteParam = params.get('cliente');
    const territorioParam = params.get('territorio');

    // Leer el estado inicial desde localStorage (el mismo que useState lazy init)
    const currentName = localStorage.getItem('userName');
    const currentTerritory = localStorage.getItem('territoryNumber');

    // Cambiar a territorio específico si viene en la URL
    if (territorioParam && territorioParam !== currentTerritory) {
      setTerritoryNumber(territorioParam);
      localStorage.setItem('territoryNumber', territorioParam);
    }

    // Auto-login o cambio de cliente si viene en la URL y es diferente al actual
    const isDifferentClient = clienteParam && (!currentName || limpiarTexto(currentName) !== limpiarTexto(clienteParam));
    if (clienteParam && isDifferentClient) {
      const loadFromUrl = async () => {
        try {
          const { nombreReal } = await fetchTerritoriosPorCliente(clienteParam);
          if (nombreReal) {
            localStorage.setItem('userName', nombreReal);
            setUserName(nombreReal);
            
            // Si no vino un territorio específico en la URL, inicializar con el primero
            if (!territorioParam) {
              setTerritoryNumber('1');
              localStorage.setItem('territoryNumber', '1');
            }
            onNameSubmitRef.current?.();
          }
        } catch (err) {
          console.error('Error auto-iniciando sesión desde URL:', err);
        }
      };
      loadFromUrl();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Asegurar que si hay usuario pero no hay territorio, use el predeterminado
  useEffect(() => {
    if (userName && !territoryNumber) {
      setTerritoryNumber('1');
      localStorage.setItem('territoryNumber', '1');
    }
  }, [userName, territoryNumber]);

  const handleNameSubmit = (name: string): void => {
    console.log('Nombre ingresado:', name);
    localStorage.setItem('userName', name);
    setUserName(name);
    setTerritoryNumber('1');
    localStorage.setItem('territoryNumber', '1');
    if (onNameSubmitCallback) onNameSubmitCallback();
  };

  const handleTerritorySelect = (id: string): void => {
    setTerritoryNumber(id);
    localStorage.setItem('territoryNumber', id);
  };

  return {
    userName,
    territoryNumber,
    setTerritoryNumber,
    geojsonData,
    handleNameSubmit,
    handleTerritorySelect,
  };
}
