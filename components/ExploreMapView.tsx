// components/ExploreMapView.tsx
import { Colors } from "@/constants/Colors";
import icons from "@/constants/icons";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

interface MapProperty {
  $id: string;
  propertyName?: string;
  address?: string;
  price?: number;
  latitude?: number | null;
  longitude?: number | null;
  image?: string;
  image1?: string;
  images?: string[];
  bedrooms?: number;
  views?: number;
  likes?: number;
  area?: number;
  facilities?: string | string[];
  requests?: number;
}

interface ExploreMapViewProps {
  properties: MapProperty[] | null | undefined;
  loading?: boolean;
  onPropertyPress: (id: string) => void;
  filters?: {
    priceRange?: any;
    customPrice?: { min: number; max: number };
    facilities?: string[];
    bedrooms?: number;
    location?: string;
    query?: string;
    filter?: string;
  };
  onFilterChange?: (filters: any) => void;
}

const DEFAULT_REGION: Region = {
  latitude: -17.8252,
  longitude: 31.0335,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

// ✅ Color grading based on OR logic
const getMarkerColor = (property: MapProperty): string => {
  const price = property.price || 0;
  const views = property.views || 0;
  const likes = property.likes || 0;
  const area = property.area || 0;
  
  let facilitiesCount = 0;
  if (property.facilities) {
    if (Array.isArray(property.facilities)) {
      facilitiesCount = property.facilities.length;
    } else if (typeof property.facilities === 'string') {
      facilitiesCount = property.facilities.split(',').filter(f => f.trim()).length;
    }
  }
  
  const requests = property.requests || 0;

  // RED - Premium/Luxury
  if (
    price >= 500 ||
    views >= 80 ||
    likes >= 80 ||
    area >= 700 ||
    facilitiesCount >= 10 ||
    requests >= 80
  ) {
    return '#ef2906';
  }

  // ORANGE - Mid-High Value
  if (
    (price >= 300 && price < 500) ||
    (views >= 50 && views < 80) ||
    (likes >= 40 && likes < 80) ||
    (area >= 500 && area < 700) ||
    (facilitiesCount >= 7 && facilitiesCount < 10) ||
    (requests >= 40 && requests < 80)
  ) {
    return '#ef7c29';
  }

  // BLUE - Mid Value
  if (
    (price >= 150 && price < 300) ||
    (views >= 20 && views < 50) ||
    (likes >= 10 && likes < 40) ||
    (area >= 300 && area < 500) ||
    (facilitiesCount >= 4 && facilitiesCount < 7) ||
    (requests >= 10 && requests < 40)
  ) {
    return '#3B82F6';
  }

  // GOLDEN YELLOW - Entry Level
  return '#F59E0B';
};

// ✅ Get shadow color matching the marker
const getShadowColor = (bgColor: string): string => {
  return bgColor;
};

// ✅ Filter modal component (unchanged)
const FilterModal = ({ 
  visible, 
  onClose, 
  filters, 
  onApply 
}: { 
  visible: boolean; 
  onClose: () => void; 
  filters: any; 
  onApply: (filters: any) => void;
}) => {
  const [tempFilters, setTempFilters] = useState(filters || {});
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View
          className="rounded-t-3xl p-6"
          style={{
            backgroundColor: theme.background,
            maxHeight: "80%",
          }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text
              className="text-xl font-rubik-bold"
              style={{ color: theme.title }}
            >
              Filter Map
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.text, fontSize: 24 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Price Range */}
            <View className="mb-4">
              <Text className="text-sm font-rubik-medium mb-2" style={{ color: theme.text }}>
                Price Range
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                {[
                  { label: 'All', value: undefined },
                  { label: '$0 - $150', value: { min: 0, max: 150 } },
                  { label: '$150 - $300', value: { min: 150, max: 300 } },
                  { label: '$300 - $500', value: { min: 300, max: 500 } },
                  { label: '$500+', value: { min: 500, max: Infinity } },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => {
                      setTempFilters({
                        ...tempFilters,
                        customPrice: option.value,
                        priceRange: option.label === 'All' ? undefined : option.label,
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full ${
                      tempFilters.customPrice === option.value &&
                      tempFilters.priceRange === (option.label === 'All' ? undefined : option.label)
                        ? 'bg-primary-300'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-rubik-medium ${
                        tempFilters.customPrice === option.value &&
                        tempFilters.priceRange === (option.label === 'All' ? undefined : option.label)
                          ? 'text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bedrooms */}
            <View className="mb-4">
              <Text className="text-sm font-rubik-medium mb-2" style={{ color: theme.text }}>
                Bedrooms
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                {[
                  { label: 'All', value: undefined },
                  { label: '1+', value: 1 },
                  { label: '2+', value: 2 },
                  { label: '3+', value: 3 },
                  { label: '4+', value: 4 },
                  { label: '5+', value: 5 },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => setTempFilters({ ...tempFilters, bedrooms: option.value })}
                    className={`px-3 py-1.5 rounded-full ${
                      tempFilters.bedrooms === option.value
                        ? 'bg-primary-300'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-rubik-medium ${
                        tempFilters.bedrooms === option.value
                          ? 'text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Facilities */}
            <View className="mb-4">
              <Text className="text-sm font-rubik-medium mb-2" style={{ color: theme.text }}>
                Facilities
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                {[
                  { label: 'All', value: undefined },
                  { label: 'WiFi', value: 'WiFi' },
                  { label: 'Parking', value: 'Parking' },
                  { label: 'Pool', value: 'Swimming Pool' },
                  { label: 'Gym', value: 'Gym' },
                  { label: 'AC', value: 'Air Conditioning' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => {
                      const currentFacilities = tempFilters.facilities || [];
                      if (option.value === undefined) {
                        setTempFilters({ ...tempFilters, facilities: [] });
                      } else {
                        const newFacilities = currentFacilities.includes(option.value)
                          ? currentFacilities.filter((f: string) => f !== option.value)
                          : [...currentFacilities, option.value];
                        setTempFilters({ ...tempFilters, facilities: newFacilities });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full ${
                      option.value === undefined
                        ? tempFilters.facilities?.length === 0 || !tempFilters.facilities
                          ? 'bg-primary-300'
                          : 'bg-gray-200 dark:bg-gray-700'
                        : tempFilters.facilities?.includes(option.value)
                        ? 'bg-primary-300'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-rubik-medium ${
                        option.value === undefined
                          ? tempFilters.facilities?.length === 0 || !tempFilters.facilities
                            ? 'text-white'
                            : 'text-gray-700 dark:text-gray-300'
                          : tempFilters.facilities?.includes(option.value)
                          ? 'text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              onPress={() => {
                onApply(tempFilters);
                onClose();
              }}
              className="py-3 rounded-full mt-4"
              style={{ backgroundColor: theme.primary[300] }}
            >
              <Text className="text-white text-center font-rubik-bold">
                Apply Filters
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const ExploreMapView = ({
  properties,
  loading,
  onPropertyPress,
  filters: parentFilters,
  onFilterChange,
}: ExploreMapViewProps) => {
  const [mapVisible, setMapVisible] = useState(false);
  const [mapType, setMapType] = useState<"standard" | "hybrid">("standard");
  const [selected, setSelected] = useState<MapProperty | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [localFilters, setLocalFilters] = useState<any>({});

  const mapRef = useRef<MapView>(null);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  // Apply filters to properties
  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    
    let filtered = [...properties];
    
    if (localFilters.customPrice) {
      const { min, max } = localFilters.customPrice;
      filtered = filtered.filter(p => 
        (p.price || 0) >= min && (p.price || 0) < max
      );
    }
    
    if (localFilters.bedrooms) {
      filtered = filtered.filter(p => (p.bedrooms || 0) >= localFilters.bedrooms);
    }
    
    if (localFilters.facilities && localFilters.facilities.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.facilities) return false;
        let propertyFacilities: string[] = [];
        if (Array.isArray(p.facilities)) {
          propertyFacilities = p.facilities;
        } else if (typeof p.facilities === 'string') {
          propertyFacilities = p.facilities.split(',').map(f => f.trim());
        }
        return localFilters.facilities.some((f: string) => 
          propertyFacilities.includes(f)
        );
      });
    }
    
    return filtered;
  }, [properties, localFilters]);

  // Only properties that actually have coordinates
  const mappable = useMemo(
    () =>
      (filteredProperties ?? []).filter(
        (p) => p.latitude != null && p.longitude != null,
      ),
    [filteredProperties],
  );

  // Region that contains all pins
  const initialRegion = useMemo<Region>(() => {
    if (mappable.length === 0) return DEFAULT_REGION;
    if (mappable.length === 1) {
      return {
        latitude: mappable[0].latitude!,
        longitude: mappable[0].longitude!,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    const lats = mappable.map((p) => p.latitude!);
    const lngs = mappable.map((p) => p.longitude!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.05),
      longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.05),
    };
  }, [mappable]);

  const openMap = () => {
    setSelected(null);
    setMapVisible(true);
  };

  const closeMap = () => {
    setMapVisible(false);
    setSelected(null);
  };

  const handleMarkerPress = (property: MapProperty) => {
    setSelected(property);
    mapRef.current?.animateToRegion(
      {
        latitude: property.latitude!,
        longitude: property.longitude!,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      400,
    );
  };

  const propertyImage = (p: MapProperty) =>
    p.image1 || p.image || (p.images && p.images[0]) || undefined;

  const handleApplyFilters = (filters: any) => {
    setLocalFilters(filters);
    if (onFilterChange) {
      onFilterChange(filters);
    }
  };

  return (
    <>
      {/* ===== MAP BANNER CARD ===== */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={openMap}
        className="rounded-2xl overflow-hidden mb-4"
        style={{ height: 130 }}
      >
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          region={initialRegion}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          pointerEvents="none"
          liteMode
        >
          {mappable.slice(0, 30).map((p) => (
            <Marker
              key={p.$id}
              coordinate={{ latitude: p.latitude!, longitude: p.longitude! }}
            />
          ))}
        </MapView>

        {/* Overlay label */}
        <View className="absolute inset-0 items-center justify-center bg-black/30">
          <View className="bg-white px-5 py-2.5 rounded-full flex-row items-center gap-2 shadow-lg">
            <Image
              source={icons.location}
              className="w-4 h-4"
              style={{ tintColor: "#0061FF" }}
            />
            <Text className="font-rubik-bold" style={{ color: "#191D31" }}>
              View properties on map
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ===== FULL SCREEN MAP ===== */}
      <Modal
        visible={mapVisible}
        animationType="slide"
        onRequestClose={closeMap}
      >
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            initialRegion={initialRegion}
            mapType={mapType}
            showsUserLocation
            onPress={() => setSelected(null)}
          >
            {mappable.map((p) => {
              const markerColor = getMarkerColor(p);
              const isSelected = selected?.$id === p.$id;
              
              return (
                <Marker
                  key={p.$id}
                  coordinate={{ latitude: p.latitude!, longitude: p.longitude! }}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleMarkerPress(p);
                  }}
                >
                  {/* ✅ Small colored circle marker */}
                  <View
                    className="rounded-full shadow-lg"
                    style={{
                      width: isSelected ? 20 : 16,
                      height: isSelected ? 20 : 16,
                      backgroundColor: isSelected ? '#191D31' : markerColor,
                      borderWidth: isSelected ? 3 : 2,
                      borderColor: '#fff',
                      shadowColor: getShadowColor(markerColor),
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 4,
                    }}
                  />
                </Marker>
              );
            })}
          </MapView>

          {/* Close button */}
          <TouchableOpacity
            onPress={closeMap}
            className="absolute top-14 left-5 bg-white rounded-full p-3 shadow-lg"
          >
            <Image
              source={icons.backArrow}
              className="w-6 h-6"
              style={{ tintColor: "#000" }}
            />
          </TouchableOpacity>

          {/* Filter button */}
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            className="absolute top-14 right-5 bg-white rounded-full p-3 shadow-lg"
          >
            <Image
              source={icons.filter}
              className="w-6 h-6"
              style={{ tintColor: "#0061FF" }}
            />
          </TouchableOpacity>

          {/* Map type toggle */}
          <TouchableOpacity
            onPress={() =>
              setMapType(mapType === "standard" ? "hybrid" : "standard")
            }
            className="absolute top-28 right-5 bg-white px-4 py-3 rounded-full shadow-lg"
          >
            <Text
              className="font-rubik-medium"
              style={{ fontSize: 13, color: "#191D31" }}
            >
              {mapType === "standard" ? "Satellite" : "Map"}
            </Text>
          </TouchableOpacity>

          {/* Legend - Shows color meanings */}
          <View className="absolute top-28 left-5 bg-white/90 px-3 py-2 rounded-lg shadow-lg">
            <Text className="text-xs font-rubik-bold text-gray-700 mb-1">Legend</Text>
            <View className="flex-row items-center gap-1 mb-0.5">
              <View className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef2906' }} />
              <Text className="text-[10px] text-gray-600">Premium</Text>
            </View>
            <View className="flex-row items-center gap-1 mb-0.5">
              <View className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef7c29' }} />
              <Text className="text-[10px] text-gray-600">High Value</Text>
            </View>
            <View className="flex-row items-center gap-1 mb-0.5">
              <View className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
              <Text className="text-[10px] text-gray-600">Mid Value</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
              <Text className="text-[10px] text-gray-600">Entry Level</Text>
            </View>
          </View>

          {/* Count badge */}
          <View className="absolute top-28 self-center bg-black/70 px-4 py-2 rounded-full mt-2">
            <Text className="text-white text-xs font-rubik-medium">
              {mappable.length}{" "}
              {mappable.length === 1 ? "property" : "properties"} shown
            </Text>
          </View>

          {loading && (
            <View className="absolute top-40 self-center">
              <ActivityIndicator color="#0061FF" />
            </View>
          )}

          {/* ===== SELECTED PROPERTY MINI CARD ===== */}
          {selected && (
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => {
                closeMap();
                onPropertyPress(selected.$id);
              }}
              className="absolute bottom-8 left-5 right-5 rounded-2xl shadow-lg flex-row overflow-hidden"
              style={{ backgroundColor: theme.background ?? "#fff" }}
            >
              {propertyImage(selected) ? (
                <Image
                  source={{ uri: propertyImage(selected) }}
                  className="w-24 h-24"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-24 h-24 items-center justify-center bg-gray-200">
                  <Image
                    source={icons.location}
                    className="w-8 h-8"
                    style={{ tintColor: "#8C8E98" }}
                  />
                </View>
              )}
              <View className="flex-1 p-3 justify-center">
                <Text
                  className="font-rubik-bold text-base"
                  style={{ color: theme.title }}
                  numberOfLines={1}
                >
                  {selected.propertyName || "Property"}
                </Text>
                {!!selected.address && (
                  <Text
                    className="font-rubik text-xs mt-0.5"
                    style={{ color: theme.text }}
                    numberOfLines={1}
                  >
                    {selected.address}
                  </Text>
                )}
                <View className="flex-row items-center justify-between mt-1.5">
                  {selected.price != null && (
                    <Text className="font-rubik-bold text-primary-300">
                      ${selected.price}/mo
                    </Text>
                  )}
                  <Text className="font-rubik-medium text-xs text-primary-300">
                    View details →
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={localFilters}
        onApply={handleApplyFilters}
      />
    </>
  );
};

export default ExploreMapView;