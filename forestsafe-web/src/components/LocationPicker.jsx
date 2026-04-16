import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import '../utils/leafletIcon';

const IFRANE = { lat: 33.5228, lng: -5.1106 };

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ position }) {
  const map = useMap();
  if (position) map.flyTo([position.lat, position.lng], 15, { duration: 0.5 });
  return null;
}

export default function LocationPicker({ position, onChange, recenterKey }) {
  return (
    <MapContainer
      center={[IFRANE.lat, IFRANE.lng]}
      zoom={13}
      scrollWheelZoom
      className="h-72 w-full rounded-lg overflow-hidden border border-neutral-200"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onChange} />
      {position && (
        <Marker
          position={[position.lat, position.lng]}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng();
              onChange({ lat: ll.lat, lng: ll.lng });
            },
          }}
        />
      )}
      {recenterKey && position && <Recenter key={recenterKey} position={position} />}
    </MapContainer>
  );
}
