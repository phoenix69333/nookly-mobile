// components/AccreditedBadge.tsx
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, useColorScheme, View } from 'react-native';

interface AccreditedBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
}

export const AccreditedBadge = ({ 
  size = 'medium', 
  showTooltip = false 
}: AccreditedBadgeProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const sizes = {
    small: {
      padding: 'px-2 py-0.5',
      fontSize: 'text-[8px]',
      iconSize: 10,
      gap: 'gap-0.5',
    },
    medium: {
      padding: 'px-3 py-1',
      fontSize: 'text-[10px]',
      iconSize: 12,
      gap: 'gap-1',
    },
    large: {
      padding: 'px-4 py-1.5',
      fontSize: 'text-xs',
      iconSize: 14,
      gap: 'gap-1.5',
    },
  };

  const selectedSize = sizes[size] || sizes.medium;

  return (
    <View className="relative">
      <View
        className={`flex-row items-center ${selectedSize.gap} ${selectedSize.padding} rounded-full`}
        style={{
          backgroundColor: '#10B981',
          shadowColor: '#10B981',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Ionicons 
          name="checkmark-circle" 
          size={selectedSize.iconSize} 
          color="#FFFFFF" 
        />
        <Text 
          className={`font-rubik-bold text-white ${selectedSize.fontSize}`}
          style={{ color: '#FFFFFF' }}
        >
          Accredited by Nookly
        </Text>
      </View>
      
      {showTooltip && (
        <View
          className="absolute top-full mt-1 px-2 py-1 rounded-lg"
          style={{
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.muted + '30',
          }}
        >
          <Text className="text-xs" style={{ color: theme.muted }}>
            ✓ 3+ positive reviews • 90+ days trusted
          </Text>
        </View>
      )}
    </View>
  );
};