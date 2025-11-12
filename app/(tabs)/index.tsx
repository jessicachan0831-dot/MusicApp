import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, DevSettings, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const songs = [
  {
    title: 'Yarin Primak - Highway',
    source: require('../../assets/music/YarinPrimak-Highway.mp3'),
    image: require('../../assets/images/cd1.jpg'),
  },
  {
    title: 'KOLA - Space',
    source: require('../../assets/music/KOLA-Space.mp3'),
    image: require('../../assets/images/cd2.jpg'),
  },
  {
    title: 'djosama',
    source: require('../../assets/music/djosama.mp3'),
    image: require('../../assets/images/cd3.jpg'),
  },
];

export default function MusicPlayer() {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0); 

  // animation control
  const spinAnim = useRef(new Animated.Value(0)).current;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // spinnnn
  const spinLoop = () => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 9500,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && isPlaying) {
        spinLoop();
      }
    });
  };
  
  //shake to change songs
  useEffect(() => {
    if ((DevSettings as any).setShakeToShowDevMenu) {
    (DevSettings as any).setShakeToShowDevMenu(false);
  }
  let subscription: any;
  let lastShakeTime = 0;

  const handleAccelerometerData = (data: any) => {
    const acceleration = Math.sqrt(
      data.x * data.x + data.y * data.y + data.z * data.z
    );

    // change threshold here
    if (acceleration > 1.4) {
      const now = Date.now();
      if (now - lastShakeTime > 1000) {
        lastShakeTime = now;
        handleNext(); 
      }
    }
  };

  Accelerometer.setUpdateInterval(200); 
  subscription = Accelerometer.addListener(handleAccelerometerData);

  return () => {
    subscription && subscription.remove();
  };
}, []);


  useEffect(() => {
    if (isPlaying) {
      spinLoop();
    } else {
      spinAnim.stopAnimation();
    }
  }, [isPlaying]);

  // change to play current track
  useEffect(() => {
    loadAndPlayTrack();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [currentTrack]);

  // play songs
  async function loadAndPlayTrack() {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        songs[currentTrack].source,
        { shouldPlay: true, positionMillis: 0 }
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis);
          setDuration(status.durationMillis || 0);
          if (status.didJustFinish) {
            handleNext();
          }
        }
      });
    } catch (error) {
      console.error('Play error:', error);
    }
  }

  // puase/continue
  async function togglePlayPause() {
    if (!sound) return;
    const status = await sound.getStatusAsync();

    if (status.isLoaded && status.isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  }
//drag to new position
  async function handleSeek(value: number){
    if(!sound || !duration)return;
    const newPosition = value * duration;
    await sound.setPositionAsync(newPosition);
    setPosition(newPosition);
  }

  // next
  async function handleNext() {
    setIsPlaying(false);
    setPosition(0);
    setCurrentTrack((prev) => (prev + 1) % songs.length);
  }

  // last
  async function handlePrev() {
    setIsPlaying(false);
    setPosition(0);
    setCurrentTrack((prev) => (prev - 1 + songs.length) % songs.length);
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.container}>
      <Animated.Image
        source={songs[currentTrack].image}
        style={[styles.cdImage, { transform: [{ rotate: spin }] }]}
      />

      <Text style={styles.title}>{songs[currentTrack].title}</Text>

      {/* slidebar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.progressSlider}
          minimumValue={0}
          maximumValue={1}
          minimumTrackTintColor="#aeaaffff"
          maximumTrackTintColor="#ccc"
          thumbTintColor="#aeaaffff"
          value={progress}
          onValueChange={(val) => setPosition(val*duration)}
          onSlidingComplete={(val)=> handleSeek(val)}
        />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(position / 1000)}</Text>
          <Text style={styles.timeText}>{formatTime(duration / 1000)}</Text>
        </View>
      </View>

      {/* buttonss*/}
      <View style={styles.panel}>
        <View style={styles.controls}>
          <TouchableOpacity onPress={handlePrev}>
            <Ionicons name="play-skip-back" size={40} color="#6c63ff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={40} color="white" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext}>
            <Ionicons name="play-skip-forward" size={40} color="#6c63ff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cdImage: {
    width: 250,
    height: 250,
    borderRadius: 125,
    marginBottom: 40,
  },
  title: {
    color: '#111',
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 20,
  },
  progressContainer: {
    width: '85%',
    alignItems: 'center',
    marginBottom: 15,
  },
  progressSlider: {
    width: '100%',
    height: 30,
  },
  timeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -5,
  },
  timeText: {
    color: '#333',
    fontSize: 12,
  },
  panel: {
    width: '85%',
    backgroundColor: 'rgba(216, 214, 255, 0.25)',
    borderRadius: 30,
    paddingVertical: 45,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  playButton: {
    backgroundColor: '#6c63ff',
    borderRadius: 50,
    padding: 15,
  },
});
