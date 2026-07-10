// components/LocationPicker.tsx
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { MapPressEvent, Marker, Region } from "react-native-maps";

export type PickedLocation = {
  latitude: number;
  longitude: number;
  houseNumber: string;
  streetName: string;
  suburb: string;
  city: string;
  formattedAddress: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (location: PickedLocation) => void;
  initialCoords?: { latitude: number; longitude: number } | null;
};

const PRIMARY = "#0061FF";

const DEFAULT_REGION: Region = {
  latitude: -17.8252,
  longitude: 31.0335,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const LocationPicker = ({ visible, onClose, onConfirm, initialCoords }: Props) => {
  const mapRef = useRef<MapView>(null);

  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(
    initialCoords ?? null,
  );
  const [confirming, setConfirming] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [mapType, setMapType] = useState<"standard" | "hybrid">("standard");
  const [previewAddress, setPreviewAddress] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Auto-jump to GPS on open (only when no pin exists yet)
  useEffect(() => {
    if (!visible || initialCoords) return;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        mapRef.current?.animateToRegion(
          {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          800,
        );
      } catch {
        // GPS unavailable — user can search instead
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, initialCoords]);

  // Reverse-geocode the pinned spot for the live preview
  const loadPreview = async (latitude: number, longitude: number) => {
    setPreviewLoading(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const a = results[0];
      const label = a
        ? [a.streetNumber, a.street, a.district ?? a.subregion, a.city ?? a.region]
            .filter((p) => p && String(p).trim() !== "")
            .join(", ")
        : "";
      setPreviewAddress(label || "Unnamed location — coordinates will still be saved");
    } catch {
      setPreviewAddress("Address preview unavailable");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Drop the pin at a coordinate, center the map on it, and load the preview
  const placePin = (latitude: number, longitude: number, zoomDelta?: number) => {
    setPin({ latitude, longitude });
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: zoomDelta ?? 0.008,
        longitudeDelta: zoomDelta ?? 0.008,
      },
      500,
    );
    loadPreview(latitude, longitude);
  };

  // Tap anywhere on the map to place the pin
  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    placePin(latitude, longitude);
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    Keyboard.dismiss();
    setSearching(true);
    setSearchError("");
    try {
      const results = await Location.geocodeAsync(query);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        // Move the map there but don't pin yet — user taps the exact spot
        mapRef.current?.animateToRegion(
          { latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
          800,
        );
      } else {
        setSearchError("Place not found. Try a suburb or city name.");
      }
    } catch {
      setSearchError("Search failed. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  };

  const goToMyLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      // Pin directly at the user's GPS position
      placePin(pos.coords.latitude, pos.coords.longitude, 0.005);
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = async () => {
    if (!pin) return;
    setConfirming(true);
    try {
      const { latitude, longitude } = pin;
      let houseNumber = "";
      let streetName = "";
      let suburb = "";
      let city = "";
      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        const a = results[0];
        if (a) {
          houseNumber = a.streetNumber ?? "";
          streetName = a.street ?? "";
          suburb = a.district ?? a.subregion ?? "";
          city = a.city ?? a.region ?? "";
        }
      } catch {
        // coords still get saved
      }
      const formattedAddress = [houseNumber, streetName, suburb, city]
        .filter((p) => p && p.trim() !== "")
        .join(", ");
      onConfirm({ latitude, longitude, houseNumber, streetName, suburb, city, formattedAddress });
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={
            initialCoords
              ? { ...initialCoords, latitudeDelta: 0.01, longitudeDelta: 0.01 }
              : DEFAULT_REGION
          }
          mapType={mapType}
          onPress={handleMapPress}
          showsUserLocation
        >
          {pin && (
            <Marker
              coordinate={pin}
              pinColor="#EF4444" // ✅ Default red pin color
              // ✅ Removed custom image
            />
          )}
        </MapView>

        {/* Header: title + search */}
        <View style={{ position: "absolute", top: 50, left: 16, right: 16, gap: 8 }}>
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 14,
              elevation: 4,
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <Text className="font-rubik-bold" style={{ fontSize: 16, color: "#191D31" }}>
              Pin your property
            </Text>
            <Text className="font-rubik" style={{ fontSize: 12, color: "#c94300", marginTop: 2 }}>
              Tap the map exactly where your property is
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              backgroundColor: "white",
              borderRadius: 12,
              alignItems: "center",
              paddingHorizontal: 12,
              elevation: 4,
            }}
          >
            <TextInput
              value={searchQuery}
              onChangeText={(t) => {
                setSearchQuery(t);
                if (searchError) setSearchError("");
              }}
              onSubmitEditing={handleSearch}
              placeholder="Search suburb or city, e.g. Harare"
              placeholderTextColor="#8C8E98"
              returnKeyType="search"
              className="font-rubik"
              style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: "#191D31" }}
            />
            <TouchableOpacity onPress={handleSearch} disabled={searching} style={{ padding: 8 }}>
              {searching ? (
                <ActivityIndicator size="small" color={PRIMARY} />
              ) : (
                <Text className="font-rubik-bold" style={{ color: PRIMARY }}>Go</Text>
              )}
            </TouchableOpacity>
          </View>
          {searchError ? (
            <View style={{ backgroundColor: "white", borderRadius: 10, padding: 10, elevation: 3 }}>
              <Text className="font-rubik" style={{ color: "#D32F2F", fontSize: 13 }}>
                {searchError}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Map type toggle */}
        <TouchableOpacity
          onPress={() => setMapType(mapType === "standard" ? "hybrid" : "standard")}
          style={{
            position: "absolute",
            right: 16,
            top: 220,
            backgroundColor: "white",
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 12,
            elevation: 4,
          }}
        >
          <Text className="font-rubik-medium" style={{ fontSize: 12, color: "#191D31" }}>
            {mapType === "standard" ? "Satellite" : "Map"}
          </Text>
        </TouchableOpacity>

        {/* Bottom sheet: live preview + actions */}
        <View style={{ position: "absolute", bottom: 24, left: 16, right: 16, gap: 10 }}>
          {/* Live address preview */}
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 14,
              elevation: 4,
              borderLeftWidth: 4,
              borderLeftColor: PRIMARY,
            }}
          >
            <Text className="font-rubik-medium" style={{ fontSize: 11, color: "#8C8E98" }}>
              PIN IS NEAR
            </Text>
            {previewLoading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text className="font-rubik" style={{ fontSize: 13, color: "#8C8E98" }}>
                  Finding address...
                </Text>
              </View>
            ) : (
              <Text
                className="font-rubik-medium"
                numberOfLines={2}
                style={{ fontSize: 14, color: "#191D31", marginTop: 2 }}
              >
                {previewAddress || "Tap the map to place your pin"}
              </Text>
            )}
            {pin && (
              <Text className="font-rubik" style={{ fontSize: 11, color: "#8C8E98", marginTop: 4 }}>
                {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
              </Text>
            )}
            <Text className="font-rubik-medium" style={{ fontSize: 11, color: "#c24f07", marginTop: 2 }}>
              you can always edit the address later in the form
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={goToMyLocation}
              style={{
                flex: 1,
                backgroundColor: "white",
                padding: 14,
                borderRadius: 12,
                alignItems: "center",
                elevation: 4,
                borderWidth: 1,
                borderColor: "#E8E8E8",
              }}
            >
              {locating ? (
                <ActivityIndicator color={PRIMARY} />
              ) : (
                <Text className="font-rubik-bold" style={{ fontSize: 13, color: "#191D31" }}>
                  My location
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={confirming || !pin}
              style={{
                flex: 2,
                backgroundColor: pin ? PRIMARY : "#B9CBEA",
                padding: 14,
                borderRadius: 12,
                alignItems: "center",
                elevation: 4,
              }}
            >
              {confirming ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-rubik-bold" style={{ fontSize: 14, color: "white" }}>
                  Confirm location
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose} style={{ alignItems: "center", padding: 6 }}>
            <Text className="font-rubik" style={{ color: "#8C8E98" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default LocationPicker;