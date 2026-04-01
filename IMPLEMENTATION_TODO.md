# KidQuest - Profile Pictures & AI Theme Implementation Status

## ✅ COMPLETED (Backend + Types)

### Backend (100%)
- ✅ Models updated with profile_picture fields (Child, Family)
- ✅ CustomTheme model created
- ✅ AIThemeRequest model created
- ✅ AI theme generation endpoint working: `POST /api/ai/generate-theme`
- ✅ Backend restarted and running successfully
- ✅ All CRUD endpoints support profile picture updates

### Frontend Types (100%)
- ✅ TypeScript types updated
- ✅ CustomTheme interface added
- ✅ Family.custom_theme added
- ✅ Family.parent_profile_picture added  
- ✅ Child.profile_picture added
- ✅ expo-image-picker installed

---

## 🚧 TODO - Frontend Implementation

### 1. Update API Client (`/app/frontend/src/api/client.ts`)

Add these functions:

```typescript
// AI API
export const aiAPI = {
  suggestTasks: async (data: AITaskSuggestion): Promise<AITaskResponse[]> => {
    const response = await api.post('/ai/suggest-tasks', data);
    return response.data;
  },
  
  // NEW: AI Theme Generator
  generateTheme: async (description: string): Promise<CustomTheme> => {
    const response = await api.post('/ai/generate-theme', { description });
    return response.data;
  },
};
```

### 2. Create Profile Picture Component (`/app/frontend/src/components/ProfilePicturePicker.tsx`)

```typescript
import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

interface ProfilePicturePickerProps {
  currentImage?: string; // base64 or emoji
  onImageSelected: (base64: string) => void;
  size?: number;
}

export default function ProfilePicturePicker({ 
  currentImage, 
  onImageSelected,
  size = 100 
}: ProfilePicturePickerProps) {
  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      onImageSelected(base64Image);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      onImageSelected(base64Image);
    }
  };

  const showOptions = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <TouchableOpacity onPress={showOptions} style={styles.container}>
      {currentImage?.startsWith('data:image') ? (
        <Image source={{ uri: currentImage }} style={[styles.image, { width: size, height: size }]} />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size }]}>
          <Text style={{ fontSize: size * 0.5 }}>{currentImage || '👤'}</Text>
        </View>
      )}
      <View style={styles.iconOverlay}>
        <Ionicons name="camera" size={20} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    borderRadius: 50,
  },
  placeholder: {
    borderRadius: 50,
    backgroundColor: '#2d2d44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6B35',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### 3. Update Child Management (`/app/frontend/app/(parent)/index.tsx`)

Add profile picture picker to the Add/Edit Child modal:

```typescript
import ProfilePicturePicker from '../../src/components/ProfilePicturePicker';

// In the modal, add before name input:
<ProfilePicturePicker
  currentImage={newChildAvatar}
  onImageSelected={setNewChildAvatar}
  size={80}
/>

// Update handleAddChild to include profile_picture:
await childrenAPI.create({
  name: newChildName.trim(),
  avatar: newChildAvatar.startsWith('data:image') ? '👦' : newChildAvatar,
  profile_picture: newChildAvatar.startsWith('data:image') ? newChildAvatar : undefined,
  age: newChildAge ? parseInt(newChildAge) : undefined,
});
```

### 4. Add AI Theme Generator to Settings (`/app/frontend/app/(parent)/settings.tsx`)

Add after the theme grid:

```typescript
const [showAIThemeModal, setShowAIThemeModal] = useState(false);
const [themeDescription, setThemeDescription] = useState('');
const [generatedTheme, setGeneratedTheme] = useState<CustomTheme | null>(null);
const [generatingTheme, setGeneratingTheme] = useState(false);

const handleGenerateTheme = async () => {
  if (!themeDescription.trim()) {
    Alert.alert('Error', 'Please describe your theme');
    return;
  }

  setGeneratingTheme(true);
  try {
    const theme = await aiAPI.generateTheme(themeDescription);
    setGeneratedTheme(theme);
    Alert.alert('Theme Generated!', `Created "${theme.name}" theme`);
  } catch (error) {
    Alert.alert('Error', 'Failed to generate theme');
  } finally {
    setGeneratingTheme(false);
  }
};

const handleApplyCustomTheme = async () => {
  if (!generatedTheme) return;
  
  try {
    await familyAPI.update({ custom_theme: generatedTheme });
    const updatedFamily = { ...localFamily!, custom_theme: generatedTheme };
    setLocalFamily(updatedFamily);
    setFamily(updatedFamily);
    setShowAIThemeModal(false);
    
    // Update colors
    useAppStore.setState({ theme: 'custom' }); // or handle custom theme application
    
    Alert.alert('Success', 'Custom theme applied!');
  } catch (error) {
    Alert.alert('Error', 'Failed to apply theme');
  }
};

// Add button after theme grid:
<TouchableOpacity
  style={[styles.aiThemeButton, { backgroundColor: colors.primary }]}
  onPress={() => setShowAIThemeModal(true)}
>
  <Ionicons name="sparkles" size={20} color="#fff" />
  <Text style={styles.aiThemeButtonText}>Create AI Theme</Text>
</TouchableOpacity>

// Add modal:
<Modal visible={showAIThemeModal} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <ScrollView contentContainerStyle={styles.modalScrollContent}>
      <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
        <Text style={styles.modalTitle}>✨ AI Theme Generator</Text>
        
        <TextInput
          style={[styles.input, { borderColor: colors.primary }]}
          placeholder="Describe your dream theme..."
          placeholderTextColor="#999"
          value={themeDescription}
          onChangeText={setThemeDescription}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleGenerateTheme}
          disabled={generatingTheme}
        >
          {generatingTheme ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate Theme</Text>
          )}
        </TouchableOpacity>

        {generatedTheme && (
          <View style={styles.themePreview}>
            <Text style={styles.themePreviewTitle}>{generatedTheme.name}</Text>
            <View style={styles.colorSwatches}>
              <View style={[styles.swatch, { backgroundColor: generatedTheme.primary }]} />
              <View style={[styles.swatch, { backgroundColor: generatedTheme.background }]} />
              <View style={[styles.swatch, { backgroundColor: generatedTheme.card }]} />
              <View style={[styles.swatch, { backgroundColor: generatedTheme.accent }]} />
            </View>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: generatedTheme.primary }]}
              onPress={handleApplyCustomTheme}
            >
              <Text style={styles.applyButtonText}>Use This Theme</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton, { marginTop: 16 }]}
          onPress={() => {
            setShowAIThemeModal(false);
            setGeneratedTheme(null);
            setThemeDescription('');
          }}
        >
          <Text style={styles.cancelButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </View>
</Modal>
```

### 5. Update Theme System to Support Custom Themes

In `/app/frontend/src/constants/theme.ts`:

```typescript
export const getThemeColors = (theme: Theme | 'custom', customTheme?: CustomTheme) => {
  if (theme === 'custom' && customTheme) {
    return customTheme;
  }
  return THEME_COLORS[theme as Theme] || THEME_COLORS.gaming;
};
```

In stores, handle custom theme:

```typescript
interface AppState {
  family: Family | null;
  currentChild: Child | null;
  children: Child[];
  theme: Theme | 'custom';
  customTheme: CustomTheme | null;
  setFamily: (family: Family) => void;
  setCustomTheme: (theme: CustomTheme) => void;
  // ...
}
```

---

## 🎯 Implementation Priority

**Phase 1: Profile Pictures (2-3 hours)**
1. Create ProfilePicturePicker component
2. Update Child Management screen
3. Test upload and display

**Phase 2: AI Theme Generator (2-3 hours)**
4. Add aiAPI.generateTheme to API client
5. Create AI theme modal in Settings
6. Test theme generation and application

**Phase 3: Polish (1 hour)**
7. Add loading states
8. Add error handling
9. Test on both platforms

---

## 📝 Notes

- Backend is 100% ready
- All API endpoints tested and working
- Types are updated
- expo-image-picker installed
- Just need UI implementation

---

## ⚠️ Known Issues

1. expo-linear-gradient version warning (non-blocking)
2. Need to handle custom theme in getThemeColors function
3. Need to store custom theme in zustand

---

**Estimated Time to Complete: 6-8 hours**
**Backend Status: ✅ Ready**
**Frontend Status: 🚧 40% (types done, UI needed)**
