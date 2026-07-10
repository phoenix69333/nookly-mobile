// components/PropertyMapCard.tsx
import { Colors } from "@/constants/Colors";
import icons from "@/constants/icons";
import * as Location from "expo-location";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import MapView, {
  MapPressEvent,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";

interface PropertyMapCardProps {
  latitude?: number | null;
  longitude?: number | null;
  propertyName?: string;
  address?: string;
}

type Origin = {
  latitude: number;
  longitude: number;
  label: string;
};

type RouteInfo = {
  coords: { latitude: number; longitude: number }[];
  distanceKm: number;
  durationMin: number;
};

type TravelMode = "driving" | "walking";

const WALKING_SPEED_KMH = 5; // average walking speed

const PropertyMapCard = ({
  latitude,
  longitude,
  propertyName,
  address,
}: PropertyMapCardProps) => {
  const [fullMapVisible, setFullMapVisible] = useState(false);
  const [mapType, setMapType] = useState<"standard" | "hybrid">("standard");

  // Directions state
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [originPickerVisible, setOriginPickerVisible] = useState(false);
  const [pickingOnMap, setPickingOnMap] = useState(false);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>("driving");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const fullMapRef = useRef<MapView>(null);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  if (latitude == null || longitude == null) return null;

  const region = {
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const toggleMapType = () =>
    setMapType((prev) => (prev === "standard" ? "hybrid" : "standard"));

  // ==========================================================================
  // ROUTING (OSRM for geometry + real driving time.
  // Public OSRM only supports the car profile, so walking time is
  // computed from route distance at average walking speed.)
  // ==========================================================================
  const fetchRoute = async (mode: TravelMode, from: Origin) => {
    setLoadingRoute(true);
    setRouteError(null);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${longitude},${latitude}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.code !== "Ok" || !data.routes?.length) {
        setRouteError("No route found");
        setLoadingRoute(false);
        return;
      }

      const r = data.routes[0];
      const coords = r.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        }),
      );

      const distanceKm = r.distance / 1000;

      // Driving time comes from OSRM's road-network calculation.
      // Walking time is distance ÷ average walking speed (5 km/h).
      const durationMin =
        mode === "driving"
          ? r.duration / 60
          : (distanceKm / WALKING_SPEED_KMH) * 60;

      setRoute({ coords, distanceKm, durationMin });

      setTimeout(() => {
        fullMapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 120, right: 60, bottom: 260, left: 60 },
          animated: true,
        });
      }, 300);
    } catch (e) {
      console.error("Error fetching route:", e);
      setRouteError("Could not get directions. Check your connection.");
    } finally {
      setLoadingRoute(false);
    }
  };

  // ==========================================================================
  // ORIGIN SELECTION (like Google Maps: "Your location" / map pick / search)
  // ==========================================================================
  const useMyLocation = async () => {
    setLoadingRoute(true);
    setRouteError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setRouteError("Location permission denied");
        setLoadingRoute(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const from: Origin = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        label: "Your location",
      };
      setOrigin(from);
      setOriginPickerVisible(false);
      await fetchRoute(travelMode, from);
    } catch {
      setRouteError("Could not get your location");
      setLoadingRoute(false);
    }
  };

  const startMapPick = () => {
    setOriginPickerVisible(false);
    setPickingOnMap(true);
  };

  const handleMapPress = async (e: MapPressEvent) => {
    if (!pickingOnMap) return;
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    const from: Origin = {
      latitude: lat,
      longitude: lng,
      label: "Pinned location",
    };
    setPickingOnMap(false);
    setOrigin(from);
    await fetchRoute(travelMode, from);
  };

  const searchPlaces = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query,
        )}&format=json&limit=5`,
        { headers: { "User-Agent": "RentifyApp/1.0" } },
      );
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = async (item: any) => {
    const from: Origin = {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      label: item.display_name.split(",")[0],
    };
    setSearchQuery("");
    setSearchResults([]);
    setOriginPickerVisible(false);
    setOrigin(from);
    await fetchRoute(travelMode, from);
  };

  const switchTravelMode = (mode: TravelMode) => {
    setTravelMode(mode);
    if (route && origin) fetchRoute(mode, origin);
  };

  const clearRoute = () => {
    setRoute(null);
    setOrigin(null);
    setRouteError(null);
    fullMapRef.current?.animateToRegion(region, 400);
  };

  const closeFullMap = () => {
    setFullMapVisible(false);
    setRoute(null);
    setOrigin(null);
    setRouteError(null);
    setOriginPickerVisible(false);
    setPickingOnMap(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const formatDuration = (min: number) => {
    if (min < 60) return `${Math.round(min)} min`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h ${m}min`;
  };

  return (
    <>
      {/* ===== MAP PREVIEW CARD ===== */}
      <View
        className="mt-4 rounded-2xl overflow-hidden border border-gray-200"
        style={{ height: 180 }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setFullMapVisible(true)}
          style={{ flex: 1 }}
        >
          <MapView
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            region={region}
            mapType={mapType}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            pointerEvents="none"
          >
            <Marker coordinate={{ latitude, longitude }} />
          </MapView>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleMapType}
          className="absolute top-2 right-2 bg-white px-3 py-1.5 rounded-full shadow"
        >
          <Text
            className="font-rubik-medium"
            style={{ fontSize: 12, color: "#191D31" }}
          >
            {mapType === "standard" ? "Satellite" : "Map"}
          </Text>
        </TouchableOpacity>

        <View className="absolute bottom-2 right-2 bg-black/60 px-3 py-1.5 rounded-full">
          <Text className="text-white text-xs font-rubik-medium">
            Tap to view full map
          </Text>
        </View>
      </View>

      {/* ===== FULL SCREEN MAP MODAL ===== */}
      <Modal
        visible={fullMapVisible}
        animationType="slide"
        onRequestClose={closeFullMap}
      >
        <View style={{ flex: 1 }}>
          <MapView
            ref={fullMapRef}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            initialRegion={region}
            mapType={mapType}
            showsUserLocation
            onPress={handleMapPress}
          >
            <Marker
              coordinate={{ latitude, longitude }}
              title={propertyName || "Property"}
              description={address}
            />

            {origin && (
              <Marker
                coordinate={{
                  latitude: origin.latitude,
                  longitude: origin.longitude,
                }}
                title={origin.label}
                pinColor="#0061FF"
              />
            )}

            {route && (
              <Polyline
                coordinates={route.coords}
                strokeWidth={5}
                strokeColor="#0061FF"
              />
            )}
          </MapView>

          {/* Close button */}
          <TouchableOpacity
            onPress={closeFullMap}
            className="absolute top-14 left-5 bg-white rounded-full p-3 shadow-lg"
          >
            <Image
              source={icons.backArrow}
              className="w-6 h-6"
              style={{ tintColor: "#000" }}
            />
          </TouchableOpacity>

          {/* Map type toggle */}
          <TouchableOpacity
            onPress={toggleMapType}
            className="absolute top-14 right-5 bg-white px-4 py-3 rounded-full shadow-lg"
          >
            <Text
              className="font-rubik-medium"
              style={{ fontSize: 13, color: "#191D31" }}
            >
              {mapType === "standard" ? "Satellite" : "Map"}
            </Text>
          </TouchableOpacity>

          {/* "Tap on map" instruction banner while picking origin */}
          {pickingOnMap && (
            <View className="absolute top-28 left-5 right-5 bg-black/75 rounded-2xl px-4 py-3 mt-2">
              <Text className="text-white text-center font-rubik-medium">
                Tap anywhere on the map to set your starting point
              </Text>
              <TouchableOpacity
                onPress={() => setPickingOnMap(false)}
                className="mt-2"
              >
                <Text className="text-center text-red-400 font-rubik-medium text-sm">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom card (hidden while picking on map) */}
          {!pickingOnMap && (
            <View
              className="absolute bottom-8 left-5 right-5 rounded-2xl p-4 shadow-lg"
              style={{ backgroundColor: theme.background ?? "#fff" }}
            >
              {/* ===== ORIGIN PICKER ===== */}
              {originPickerVisible ? (
                <View>
                  <Text
                    className="text-base font-rubik-bold mb-3"
                    style={{ color: theme.title }}
                  >
                    Directions from...
                  </Text>

                  <TouchableOpacity
                    onPress={useMyLocation}
                    className="flex flex-row items-center gap-2 py-3 border-b border-gray-100"
                  >
                    <Image
                      source={icons.location}
                      className="w-5 h-5"
                      style={{ tintColor: "#0061FF" }}
                    />
                    <Text className="font-rubik-medium text-primary-300">
                      Your location
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={startMapPick}
                    className="flex flex-row items-center gap-2 py-3 border-b border-gray-100"
                  >
                    <Image
                      source={icons.location}
                      className="w-5 h-5"
                      style={{ tintColor: "#191D31" }}
                    />
                    <Text
                      className="font-rubik-medium"
                      style={{ color: theme.title }}
                    >
                      Choose on map
                    </Text>
                  </TouchableOpacity>

                  {/* Search a place */}
                  <TextInput
                    value={searchQuery}
                    onChangeText={searchPlaces}
                    placeholder="Search a place or address..."
                    placeholderTextColor="#8C8E98"
                    className="mt-3 bg-gray-100 rounded-xl px-4 py-3 font-rubik"
                    style={{ color: "#191D31" }}
                  />

                  {searching && (
                    <ActivityIndicator
                      size="small"
                      color="#0061FF"
                      className="mt-2"
                    />
                  )}

                  {searchResults.length > 0 && (
                    <FlatList
                      data={searchResults}
                      keyExtractor={(item) => item.place_id?.toString()}
                      style={{ maxHeight: 160 }}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => selectSearchResult(item)}
                          className="py-3 border-b border-gray-100"
                        >
                          <Text
                            className="font-rubik text-sm"
                            style={{ color: theme.title }}
                            numberOfLines={2}
                          >
                            {item.display_name}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}

                  <TouchableOpacity
                    onPress={() => setOriginPickerVisible(false)}
                    className="mt-3 py-3 rounded-full bg-gray-200"
                  >
                    <Text
                      className="text-center font-rubik-bold"
                      style={{ color: "#191D31" }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text
                    className="text-lg font-rubik-bold"
                    style={{ color: theme.title }}
                    numberOfLines={1}
                  >
                    {propertyName || "Property Location"}
                  </Text>
                  {!!address && (
                    <Text
                      className="text-sm font-rubik mt-1"
                      style={{ color: theme.text }}
                      numberOfLines={2}
                    >
                      {address}
                    </Text>
                  )}

                  {/* From label */}
                  {origin && route && (
                    <Text
                      className="text-xs font-rubik mt-2"
                      style={{ color: theme.text }}
                    >
                      From: {origin.label}
                    </Text>
                  )}

                  {/* Route info */}
                  {route && (
                    <View className="flex flex-row items-center justify-between mt-3 bg-primary-100 rounded-xl px-4 py-3">
                      <View>
                        <Text className="font-rubik-bold text-base text-primary-300">
                          ~{formatDuration(route.durationMin)}
                        </Text>
                        <Text
                          className="font-rubik text-xs"
                          style={{ color: theme.text }}
                        >
                          {route.distanceKm.toFixed(1)} km 
                          
                        </Text>
                      </View>

                      <View className="flex flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => switchTravelMode("driving")}
                          className={`px-3 py-2 rounded-full ${
                            travelMode === "driving"
                              ? "bg-primary-300"
                              : "bg-gray-200"
                          }`}
                        >
                          <Text
                            className="font-rubik-medium text-xs"
                            style={{
                              color:
                                travelMode === "driving" ? "#fff" : "#191D31",
                            }}
                          >
                            Drive
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => switchTravelMode("walking")}
                          className={`px-3 py-2 rounded-full ${
                            travelMode === "walking"
                              ? "bg-primary-300"
                              : "bg-gray-200"
                          }`}
                        >
                          <Text
                            className="font-rubik-medium text-xs"
                            style={{
                              color:
                                travelMode === "walking" ? "#fff" : "#191D31",
                            }}
                          >
                            Walk
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {routeError && (
                    <Text className="text-red-500 text-sm font-rubik mt-2">
                      {routeError}
                    </Text>
                  )}

                  {!route ? (
                    <TouchableOpacity
                      onPress={() => setOriginPickerVisible(true)}
                      disabled={loadingRoute}
                      className="mt-3 py-3 rounded-full bg-primary-300 flex flex-row items-center justify-center"
                    >
                      {loadingRoute ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text className="text-white text-center font-rubik-bold">
                          Get Directions
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={clearRoute}
                      className="mt-3 py-3 rounded-full bg-gray-200"
                    >
                      <Text
                        className="text-center font-rubik-bold"
                        style={{ color: "#191D31" }}
                      >
                        Clear Route
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>
    </>
  );
};

export default PropertyMapCard;