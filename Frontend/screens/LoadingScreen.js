"use client"

import { useEffect, useRef, useState } from "react"
import { View, StyleSheet, Text, Animated, Easing, Dimensions } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import Svg, { Circle, Path, Ellipse, G } from "react-native-svg"

const { width, height } = Dimensions.get("window")
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedPath = Animated.createAnimatedComponent(Path)
const AnimatedG = Animated.createAnimatedComponent(G)

export default function LoadingScreen({ navigation }) {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.5)).current
  const titleSlideUp = useRef(new Animated.Value(50)).current
  const subtitleSlideUp = useRef(new Animated.Value(30)).current

  // Memory particles animations
  const memory1Opacity = useRef(new Animated.Value(0)).current
  const memory2Opacity = useRef(new Animated.Value(0)).current
  const memory3Opacity = useRef(new Animated.Value(0)).current
  const memory4Opacity = useRef(new Animated.Value(0)).current
  const memory5Opacity = useRef(new Animated.Value(0)).current
  const memory6Opacity = useRef(new Animated.Value(0)).current
  const memory7Opacity = useRef(new Animated.Value(0)).current

  const memory1Position = useRef(new Animated.ValueXY({ x: -100, y: 100 })).current
  const memory2Position = useRef(new Animated.ValueXY({ x: width + 50, y: 50 })).current
  const memory3Position = useRef(new Animated.ValueXY({ x: -50, y: height - 100 })).current
  const memory4Position = useRef(new Animated.ValueXY({ x: width + 100, y: height - 150 })).current
  const memory5Position = useRef(new Animated.ValueXY({ x: width / 2 - 100, y: -100 })).current
  const memory6Position = useRef(new Animated.ValueXY({ x: -80, y: height/2 + 100 })).current
  const memory7Position = useRef(new Animated.ValueXY({ x: width + 80, y: height/2 - 120 })).current

  // Pulse animation for the brain
  const brainPulse = useRef(new Animated.Value(1)).current
  const glowOpacity = useRef(new Animated.Value(0.2)).current

  // Brain animation paths
  const brainPathScale = useRef(new Animated.Value(0)).current
  const brainPathOpacity = useRef(new Animated.Value(0)).current

  // Synapse animations
  const synapse1Opacity = useRef(new Animated.Value(0)).current
  const synapse2Opacity = useRef(new Animated.Value(0)).current
  const synapse3Opacity = useRef(new Animated.Value(0)).current
  const synapse4Opacity = useRef(new Animated.Value(0)).current
  const synapse5Opacity = useRef(new Animated.Value(0)).current

  // Neural connection animations
  const connection1Opacity = useRef(new Animated.Value(0)).current
  const connection2Opacity = useRef(new Animated.Value(0)).current
  const connection3Opacity = useRef(new Animated.Value(0)).current

  // Loading dots animation
  const dot1Opacity = useRef(new Animated.Value(0.3)).current
  const dot2Opacity = useRef(new Animated.Value(0.3)).current
  const dot3Opacity = useRef(new Animated.Value(0.3)).current

  // Circular progress
  const progressValue = useRef(new Animated.Value(0)).current
  const [isLoaded, setIsLoaded] = useState(false)
  const [progressText, setProgressText] = useState("0%")

  useEffect(() => {
    // Initial fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start()

    // Logo scale animation
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start()

    // Brain path animations
    Animated.sequence([
      Animated.timing(brainPathOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(brainPathScale, {
        toValue: 1,
        duration: 1000,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
    ]).start()

    // Title and subtitle slide up
    Animated.stagger(200, [
      Animated.timing(titleSlideUp, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleSlideUp, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()

    // Synapse animations
    Animated.stagger(250, [
      Animated.timing(synapse1Opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(synapse2Opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(synapse3Opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(synapse4Opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(synapse5Opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start()

    // Neural connection animations
    Animated.stagger(400, [
      Animated.timing(connection1Opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(connection2Opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(connection3Opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()

    // Memory particles animations
    const memoryAnimations = [
      // Memory 1
      Animated.parallel([
        Animated.timing(memory1Opacity, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(memory1Position, {
          toValue: { x: width / 2 - 85, y: height / 2 - 75 },
          duration: 2000,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ]),

      // Memory 2
      Animated.parallel([
        Animated.timing(memory2Opacity, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(memory2Position, {
          toValue: { x: width / 2 - 25, y: height / 2 - 100 },
          duration: 2200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ]),

      // Memory 3
      Animated.parallel([
        Animated.timing(memory3Opacity, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(memory3Position, {
          toValue: { x: width / 2 + 45, y: height / 2 - 65 },
          duration: 2400,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ]),

      // Memory 4
      Animated.parallel([
        Animated.timing(memory4Opacity, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(memory4Position, {
          toValue: { x: width / 2 - 50, y: height / 2 + 20 },
          duration: 2600,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ]),

      // Memory 5
      Animated.parallel([
        Animated.timing(memory5Opacity, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(memory5Position, {
          toValue: { x: width / 2 + 10, y: height / 2 - 25 },
          duration: 2800,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ]),
      
      // Memory 6
      Animated.parallel([
        Animated.timing(memory6Opacity, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(memory6Position, {
          toValue: { x: width / 2 - 15, y: height / 2 + 40 },
          duration: 3000,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ]),
      
      // Memory 7
      Animated.parallel([
        Animated.timing(memory7Opacity, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(memory7Position, {
          toValue: { x: width / 2 + 60, y: height / 2 + 10 },
          duration: 3200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ]),
    ]

    // Start memory animations
    Animated.stagger(200, memoryAnimations).start()

    // Brain pulse animation with glow effect
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(brainPulse, {
            toValue: 1.1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(brainPulse, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.6,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.2,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ])
    ).start()

    // Loading dots animation
    const animateDots = () => {
      Animated.sequence([
        // Dot 1
        Animated.timing(dot1Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // Dot 2
        Animated.timing(dot2Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // Dot 3
        Animated.timing(dot3Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // Reset
        Animated.parallel([
          Animated.timing(dot1Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (!isLoaded) {
          animateDots()
        }
      })
    }

    animateDots()

    // Progress animation with percentage update
    progressValue.addListener(({value}) => {
      const percentage = Math.floor(value * 100)
      setProgressText(`${percentage}%`)
    })

    // Progress animation
    Animated.timing(progressValue, {
      toValue: 1,
      duration: 5000, // 5 seconds to load
      useNativeDriver: false,
    }).start(() => {
      // When loading is complete
      setIsLoaded(true)
      setProgressText("Ready")

      // Navigate to main app after a short delay
      setTimeout(() => {
        if (navigation && navigation.replace) {
          navigation.replace("Home")
        }
      }, 500)
    })

    // Cleanup
    return () => {
      progressValue.removeAllListeners()
    }
  }, [])

  // Calculate the progress circle
  const circleCircumference = 2 * Math.PI * 45 // radius is 45
  const strokeDashoffset = progressValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circleCircumference, 0],
  })

  return (
    <LinearGradient 
      colors={["#3B3086", "#4C44B9", "#263077", "#1A1F4C"]} 
      locations={[0, 0.3, 0.6, 1]}
      style={styles.container}
    >
      {/* Background neural network effect */}
      <View style={styles.neuralNetworkContainer}>
        <View style={styles.neuralLine1} />
        <View style={styles.neuralLine2} />
        <View style={styles.neuralLine3} />
        <View style={styles.neuralLine4} />
        <View style={styles.neuralLine5} />
        <View style={styles.neuralDot1} />
        <View style={styles.neuralDot2} />
        <View style={styles.neuralDot3} />
        <View style={styles.neuralDot4} />
        <View style={styles.neuralDot5} />
        <View style={styles.neuralDot6} />
      </View>

      {/* Memory particles */}
      <Animated.View
        style={[
          styles.memoryParticle,
          styles.memoryParticle1,
          {
            opacity: memory1Opacity,
            transform: [{ translateX: memory1Position.x }, { translateY: memory1Position.y }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.memoryParticle,
          styles.memoryParticle2,
          {
            opacity: memory2Opacity,
            transform: [{ translateX: memory2Position.x }, { translateY: memory2Position.y }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.memoryParticle,
          styles.memoryParticle3,
          {
            opacity: memory3Opacity,
            transform: [{ translateX: memory3Position.x }, { translateY: memory3Position.y }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.memoryParticle,
          styles.memoryParticle4,
          {
            opacity: memory4Opacity,
            transform: [{ translateX: memory4Position.x }, { translateY: memory4Position.y }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.memoryParticle,
          styles.memoryParticle5,
          {
            opacity: memory5Opacity,
            transform: [{ translateX: memory5Position.x }, { translateY: memory5Position.y }],
          },
        ]}
      />
      
      <Animated.View
        style={[
          styles.memoryParticle,
          styles.memoryParticle6,
          {
            opacity: memory6Opacity,
            transform: [{ translateX: memory6Position.x }, { translateY: memory6Position.y }],
          },
        ]}
      />
      
      <Animated.View
        style={[
          styles.memoryParticle,
          styles.memoryParticle7,
          {
            opacity: memory7Opacity,
            transform: [{ translateX: memory7Position.x }, { translateY: memory7Position.y }],
          },
        ]}
      />

      <View style={styles.contentContainer}>
        {/* Brain SVG animation with glow effect */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: logoScale }, { scale: brainPulse }],
            },
          ]}
        >
          {/* Glow effect */}
          <Animated.View 
            style={[
              styles.glowEffect,
              { opacity: glowOpacity }
            ]}
          />
          
          <Svg width="170" height="170" viewBox="0 0 200 200">
            {/* Connect lines between memory particles and brain */}
            <AnimatedPath
              d="M70,120 C60,150 110,150 130,120"
              fill="none"
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="1"
              opacity={connection1Opacity}
            />
            
            <AnimatedPath
              d="M60,100 C40,80 80,40 120,80"
              fill="none"
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="1"
              opacity={connection2Opacity}
            />
            
            <AnimatedPath
              d="M140,100 C160,80 130,30 90,70"
              fill="none"
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="1"
              opacity={connection3Opacity}
            />
            
            {/* Brain outline with smoother, more detailed shape */}
            <AnimatedPath
              d="M100,40 C135,40 165,55 180,85 C195,115 195,150 180,180 C165,205 135,220 100,220 C65,220 35,205 20,180 C5,150 5,115 20,85 C35,55 65,40 100,40 Z"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              opacity={brainPathOpacity}
              scale={brainPathScale}
            />

            {/* Brain main structure - more organic */}
            <AnimatedPath
              d="M100,60 C125,60 145,70 160,90 C175,110 175,140 160,160 C145,180 125,190 100,190 C75,190 55,180 40,160 C25,140 25,110 40,90 C55,70 75,60 100,60 Z"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              opacity={brainPathOpacity}
              scale={brainPathScale}
            />

            {/* Left hemisphere - enhanced details */}
            <AnimatedPath
              d="M55,100 C60,85 75,75 90,75 C105,75 115,85 120,100 C125,115 120,130 110,140 C100,150 85,155 70,145 C55,135 50,115 55,100 Z
                M75,95 C75,90 85,90 85,95 C85,100 75,100 75,95 Z
                M65,115 C65,110 75,110 75,115 C75,120 65,120 65,115 Z"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              opacity={brainPathOpacity}
              scale={brainPathScale}
            />

            {/* Right hemisphere - enhanced details */}
            <AnimatedPath
              d="M145,100 C140,85 125,75 110,75 C95,75 85,85 80,100 C75,115 80,130 90,140 C100,150 115,155 130,145 C145,135 150,115 145,100 Z
                M125,95 C125,90 115,90 115,95 C115,100 125,100 125,95 Z
                M135,115 C135,110 125,110 125,115 C125,120 135,120 135,115 Z"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              opacity={brainPathOpacity}
              scale={brainPathScale}
            />

            {/* Central connecting tissue */}
            <AnimatedPath
              d="M90,100 C95,95 105,95 110,100 C115,105 115,125 110,130 C105,135 95,135 90,130 C85,125 85,105 90,100 Z"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              opacity={brainPathOpacity}
              scale={brainPathScale}
            />

            {/* Neural connections */}
            <AnimatedPath
              d="M70,100 C80,90 90,95 95,105"
              fill="none"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="1"
              opacity={brainPathOpacity}
              scale={brainPathScale}
            />
            
            <AnimatedPath
              d="M130,100 C120,90 110,95 105,105"
              fill="none"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="1"
              opacity={brainPathOpacity}
              scale={brainPathScale}
            />

            {/* Enhanced synapses */}
            <AnimatedCircle cx="70" cy="100" r="4" fill="rgba(255, 255, 255, 0.9)" opacity={synapse1Opacity} />
            <AnimatedCircle cx="130" cy="100" r="4" fill="rgba(255, 255, 255, 0.9)" opacity={synapse2Opacity} />
            <AnimatedCircle cx="100" cy="140" r="4" fill="rgba(255, 255, 255, 0.9)" opacity={synapse3Opacity} />
            <AnimatedCircle cx="85" cy="80" r="3" fill="rgba(255, 255, 255, 0.9)" opacity={synapse4Opacity} />
            <AnimatedCircle cx="115" cy="80" r="3" fill="rgba(255, 255, 255, 0.9)" opacity={synapse5Opacity} />
          </Svg>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: fadeAnim,
              transform: [{ translateY: titleSlideUp }],
            },
          ]}
        >
          A.M.I.E
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: fadeAnim,
              transform: [{ translateY: subtitleSlideUp }],
            },
          ]}
        >
          Assistant for Memory, Identity & Emotion
        </Animated.Text>

        {/* Loading dots */}
        <View style={styles.loadingDotsContainer}>
          <Animated.View style={[styles.loadingDot, { opacity: dot1Opacity }]} />
          <Animated.View style={[styles.loadingDot, { opacity: dot2Opacity }]} />
          <Animated.View style={[styles.loadingDot, { opacity: dot3Opacity }]} />
        </View>

        {/* Circular progress */}
        <View style={styles.progressContainer}>
          <Svg width="110" height="110" viewBox="0 0 110 110">
            {/* Background glow */}
            <Circle 
              cx="55" 
              cy="55" 
              r="50" 
              fill="rgba(76, 68, 185, 0.1)" 
            />
            
            {/* Background circle */}
            <Circle 
              cx="55" 
              cy="55" 
              r="45" 
              stroke="rgba(255, 255, 255, 0.15)" 
              strokeWidth="4" 
              fill="transparent" 
            />

            {/* Progress circle */}
            <AnimatedCircle
              cx="55"
              cy="55"
              r="45"
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={circleCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </Svg>

          {/* Loading text */}
          <Text style={styles.loadingText}>{progressText}</Text>
        </View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: fadeAnim }]}>
          Empathy-driven Technology for Memory Support
        </Animated.Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 170,
    height: 170,
    marginBottom: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  glowEffect: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(122, 137, 255, 0.3)',
    shadowColor: "#7A89FF",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontFamily: "Poppins-Bold",
    fontSize: 46,
    color: "#FFFFFF",
    letterSpacing: 3,
    marginBottom: 8,
    textShadowColor: "rgba(122, 137, 255, 0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontFamily: "Poppins-Light",
    fontSize: 17,
    color: "#E8E8FF",
    textAlign: "center",
    marginBottom: 40,
    maxWidth: "85%",
    letterSpacing: 0.5,
  },
  loadingDotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 40,
    marginBottom: 20,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 6,
  },
  progressContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  loadingText: {
    position: "absolute",
    fontFamily: "Poppins-Medium",
    fontSize: 16,
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tagline: {
    fontFamily: "Poppins-Italic",
    fontSize: 15,
    color: "#E8E8FF",
    opacity: 0.9,
    marginTop: 20,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  // Enhanced Neural network background
  neuralNetworkContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  neuralLine1: {
    position: "absolute",
    top: "15%",
    left: "5%",
    width: "90%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    transform: [{ rotate: "30deg" }],
  },
  neuralLine2: {
    position: "absolute",
    top: "35%",
    left: "0%",
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    transform: [{ rotate: "-25deg" }],
  },
  neuralLine3: {
    position: "absolute",
    top: "60%",
    left: "10%",
    width: "80%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    transform: [{ rotate: "15deg" }],
  },
  neuralLine4: {
    position: "absolute",
    top: "75%",
    left: "5%",
    width: "90%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    transform: [{ rotate: "-18deg" }],
  },
  neuralLine5: {
    position: "absolute",
    top: "45%",
    left: "0%",
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    transform: [{ rotate: "5deg" }],
  },
  neuralDot1: {
    position: "absolute",
    top: "20%",
    left: "30%",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "#7A89FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  neuralDot2: {
    position: "absolute",
    top: "42%",
    left: "70%",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "#7A89FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  neuralDot3: {
    position: "absolute",
    top: "65%",
    left: "35%",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "#7A89FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  neuralDot4: {
    position: "absolute",
    top: "25%",
    left: "60%",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "#7A89FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  neuralDot5: {
    position: "absolute",
    top: "75%",
    left: "75%",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "#7A89FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  neuralDot6: {
    position: "absolute",
    top: "55%",
    left: "25%",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "#7A89FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  // Enhanced Memory particles
  memoryParticle: {
    position: "absolute",
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#7A89FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  memoryParticle1: {
    width: 30,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 15,
  },
  memoryParticle2: {
    width: 25,
    height: 25,
    backgroundColor: "rgba(230, 230, 255, 0.3)",
    borderRadius: 12.5,
  },
  memoryParticle3: {
    width: 20,
    height: 20,
    backgroundColor: "rgba(200, 200, 255, 0.35)",
    borderRadius: 10,
  },
  memoryParticle4: {
    width: 35,
    height: 35,
    backgroundColor: "rgba(180, 180, 255, 0.25)",
    borderRadius: 17.5,
  },
  memoryParticle5: {
    width: 22,
    height: 22,
    backgroundColor: "rgba(220, 220, 255, 0.3)",
    borderRadius: 11,
  },
  memoryParticle6: {
    width: 28,
    height: 28,
    backgroundColor: "rgba(190, 190, 255, 0.3)",
    borderRadius: 14,
  },
  memoryParticle7: {
    width: 24,
    height: 24,
    backgroundColor: "rgba(210, 210, 255, 0.25)",
    borderRadius: 12,
  },
});