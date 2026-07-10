// components/AccreditedBadge.tsx
import React from 'react';
import { Image, Text, View } from 'react-native';

interface AccreditedBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
}

export const AccreditedBadge = ({ 
  size = 'medium', 
  showTooltip = false 
}: AccreditedBadgeProps) => {
  const sizes = {
    small: {
      iconSize: 20,
    },
    medium: {
      iconSize: 28,
    },
    large: {
      iconSize: 36,
    },
  };

  const selectedSize = sizes[size] || sizes.medium;

  return (
    <View className="relative">
      <Image
        source={require('@/assets/icons/medal.png')}
        style={{
          width: selectedSize.iconSize,
          height: selectedSize.iconSize,
          resizeMode: 'contain',
        }}
      />
      
      {showTooltip && (
        <View
          className="absolute top-full mt-1 px-3 py-2 rounded-lg"
          style={{
            backgroundColor: '#1F2937',
            borderWidth: 1,
            borderColor: '#374151',
          }}
        >
          <Text className="text-xs text-white font-rubik-medium">
            ⭐ Accredited by Nookly
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5">
            3+ positive reviews • 90+ days trusted
          </Text>
        </View>
      )}
    </View>
  );
};