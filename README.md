# Proyecto de Gestión de Territorios

Este proyecto permite visualizar y gestionar territorios utilizando Google Maps y Firebase.

## Configuración

La configuración de Firebase ya ha sido aplicada en `index.html` y `app.js`.

## Cómo ejecutar localmente

Para ver la aplicación en tu navegador, necesitas servir los archivos estáticos. Puedes usar Python, que ya está instalado en este entorno.

1.  Abre una terminal.
2.  Navega a la carpeta pública:
    ```bash
    cd servidor/public
    ```
3.  Inicia un servidor HTTP simple:
    ```bash
    python3 -m http.server 8080
    ```
4.  Abre tu navegador en:
    *   **Visor de Territorios**: [http://localhost:8080](http://localhost:8080)
    *   **Panel de Administración**: [http://localhost:8080/dt.html](http://localhost:8080/dt.html)

## Estructura de Archivos

*   `/servidor/public/index.html`: Visor público con mapa.
*   `/servidor/public/dt.html`: Panel de administración.
*   `/servidor/public/app.js`: Lógica principal de administración.
*   `/servidor/public/kml/`: Archivos de mapas (actualmente se cargan desde la versión web).
