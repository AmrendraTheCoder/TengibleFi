"use client";

import Footer from "@/components/footer";
import Hero from "@/components/hero";
import Navbar from "@/components/navbar";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle,
  Coins,
  FileCheck,
  Globe,
  Landmark,
  ShieldCheck,
  Wallet,
  TrendingUp,
  Users,
  Zap,
  Lock,
  Target,
  DollarSign,
  Building,
  Package,
  Settings,
  Upload,
  Eye,
  Sparkles,
  Shield,
  Cpu,
  Database,
  Network,
  Layers,
  Server,
  HardDrive,
  Monitor,
  Smartphone,
  Play,
  Star,
  Award,
  LineChart,
  PieChart,
  Activity,
  Clock,
} from "lucide-react";
import { createClient } from "../../supabase/client";
import Link from "next/link";
import React, { useState, useEffect, useRef, useMemo } from "react";

// Custom hook for scroll-based animations - Optimized
function useScrollAnimation(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Disconnect after first trigger for performance
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin: "50px 0px -50px 0px", // Optimized margins
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible] as const;
}

// Enhanced scroll animations hook with stagger support - Optimized
function useStaggeredAnimation(itemCount: number, delay = 80) {
  const [visibleItems, setVisibleItems] = useState<boolean[]>(
    new Array(itemCount).fill(false)
  );
  const ref = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Clear any existing timeouts
          timeoutsRef.current.forEach(clearTimeout);
          timeoutsRef.current = [];

          // Stagger the animation of items
          for (let i = 0; i < itemCount; i++) {
            const timeout = setTimeout(() => {
              setVisibleItems((prev) => {
                const newState = [...prev];
                newState[i] = true;
                return newState;
              });
            }, i * delay);
            timeoutsRef.current.push(timeout);
          }
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "30px 0px -30px 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, [itemCount, delay]);

  return [ref, visibleItems] as const;
}

// Optimized Parallax scroll hook with throttling
function useParallax(factor = 0.3) {
  const [transform, setTransform] = useState("translateY(0px)");
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
      if (ref.current) {
        const scrolled = window.pageYOffset;
        const rate = scrolled * factor;
        setTransform(`translateY(${rate}px)`);
      }
      });
    };

    // Throttled scroll listener
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", throttledScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", throttledScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [factor]);

  return [ref, transform] as const;
}

// Optimized Animated Counter Component
function AnimatedCounter({
  targetValue,
  duration = 1500,
  prefix = "",
  suffix = "",
  className = "",
  decimals = 0,
}: {
  targetValue: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
}) {
  const [currentValue, setCurrentValue] = useState(0);
  const [ref, isVisible] = useScrollAnimation(0.2);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!isVisible) return;

    const startTime = Date.now();
    const startValue = 0;

    const updateValue = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing function
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const newValue = startValue + (targetValue - startValue) * easeOutCubic;
      setCurrentValue(newValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(updateValue);
      }
    };

    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(updateValue);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [targetValue, duration, isVisible]);

  const formatNumber = (num: number) => {
    if (decimals > 0) {
      return num.toFixed(decimals);
    }
    return Math.floor(num).toLocaleString();
  };

  return (
    <div ref={ref}>
      <span className={className}>
        {prefix}
        {formatNumber(currentValue)}
        {suffix}
      </span>
    </div>
  );
}

// Optimized Animated Text Component
function AnimatedText({
  text,
  delay = 0,
  className = "",
}: {
  text: string;
  delay?: number;
  className?: string;
}) {
  const [ref, isVisible] = useScrollAnimation(0.1);
  const words = useMemo(() => text.split(" "), [text]);

  return (
    <div ref={ref} className={className}>
      {words.map((word, index) => (
        <span
          key={index}
          className={`inline-block transition-all duration-600 ease-out will-change-transform ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
          style={{
            transitionDelay: `${delay + index * 40}ms`,
            backfaceVisibility: "hidden", // Performance optimization
          }}
        >
          {word}
          {index < words.length - 1 && "\u00A0"}
        </span>
      ))}
    </div>
  );
}

// Animated Stat Card Component with scroll trigger
function AnimatedStatCard({
  value,
  label,
  delay = 0,
  color = "blue",
  suffix = "",
}: {
  value: number;
  label: string;
  delay?: number;
  color?: "blue" | "purple" | "green" | "orange";
  suffix?: string;
}) {
  const [ref, isVisible] = useScrollAnimation(0.2);

  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
    green: "bg-green-50 border-green-200 text-green-600",
    orange: "bg-orange-50 border-orange-200 text-orange-600",
  };

  return (
    <div
      ref={ref}
      className={`bg-white rounded-xl p-6 border shadow-lg transition-all duration-1000 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-12 scale-95"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
        } ${colorClasses[color]}`}
        style={{ transitionDelay: `${delay + 200}ms` }}
      >
        <TrendingUp className="w-4 h-4 mr-1" />
        Live
      </div>

      <div
        className={`transition-all duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`}
        style={{ transitionDelay: `${delay + 400}ms` }}
      >
        <AnimatedCounter
          targetValue={value}
          suffix={suffix}
          duration={2000}
          decimals={suffix === "%" ? 1 : 0}
          className="text-2xl font-bold text-gray-900 mb-2 block"
        />
      </div>

      <div
        className={`text-gray-600 text-sm font-medium transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
        style={{ transitionDelay: `${delay + 600}ms` }}
      >
        {label}
      </div>
    </div>
  );
}

// Live Metric Component
function LiveMetric({
  value,
  label,
  suffix = "",
  trend,
  icon: Icon,
  color = "blue",
}: {
  value: number;
  label: string;
  suffix?: string;
  trend: string;
  icon: any;
  color?: "green" | "blue" | "purple" | "emerald";
}) {
  const [ref, isVisible] = useScrollAnimation(0);

  const colorClasses = {
    green: "text-green-600 bg-green-50",
    blue: "text-blue-600 bg-blue-50",
    purple: "text-purple-600 bg-purple-50",
    emerald: "text-emerald-600 bg-emerald-50",
  };

  return (
    <div
      ref={ref}
      className={`bg-white rounded-xl p-6 border border-gray-200 shadow-lg transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0 rotate-0"
          : "opacity-0 translate-y-8 -rotate-2"
      }`}
    >
      <div
        className={`flex items-center justify-between mb-4 transition-all duration-500 ${
          isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
        }`}
        style={{ transitionDelay: "100ms" }}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${
            isVisible ? "scale-100 rotate-0" : "scale-0 rotate-180"
          } ${colorClasses[color]}`}
          style={{ transitionDelay: "200ms" }}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div
          className={`text-right transition-all duration-500 ${
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          <div className="text-sm text-gray-500">{trend}</div>
        </div>
      </div>

      <div
        className={`transition-all duration-500 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
        style={{ transitionDelay: "400ms" }}
      >
        <AnimatedCounter
          targetValue={value}
          suffix={suffix}
          duration={1500}
          className="text-3xl font-bold text-gray-900 mb-2 block"
        />
      </div>

      <div
        className={`text-gray-600 font-medium transition-all duration-500 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
        style={{ transitionDelay: "500ms" }}
      >
        {label}
      </div>
    </div>
  );
}

// Portfolio Chart Component with Full Animation
function PortfolioChart() {
  const [isAnimated, setIsAnimated] = useState(false);
  const [currentValue, setCurrentValue] = useState(0);
  const [currentPercentage, setCurrentPercentage] = useState(0);

  // Sample data points for the chart line
  const dataPoints = [
    { month: "Jan", value: 850000, percentage: 0 },
    { month: "Feb", value: 920000, percentage: 8.2 },
    { month: "Mar", value: 1100000, percentage: 19.6 },
    { month: "Apr", value: 1050000, percentage: -4.5 },
    { month: "May", value: 1280000, percentage: 21.9 },
    { month: "Jun", value: 1450000, percentage: 13.3 },
    { month: "Jul", value: 1620000, percentage: 11.7 },
    { month: "Aug", value: 1850000, percentage: 14.2 },
  ];

  const finalValue = 1850000;
  const finalGrowth = 117.6;

  // Animation effect on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimated(true);
    }, 500);

    // Animate the numbers
    const valueInterval = setInterval(() => {
      setCurrentValue((prev) => {
        if (prev < finalValue) {
          return Math.min(prev + 25000, finalValue);
        }
        return finalValue;
      });
    }, 50);

    const percentageInterval = setInterval(() => {
      setCurrentPercentage((prev) => {
        if (prev < finalGrowth) {
          return Math.min(prev + 2, finalGrowth);
        }
        return finalGrowth;
      });
    }, 80);

    return () => {
      clearTimeout(timer);
      clearInterval(valueInterval);
      clearInterval(percentageInterval);
    };
  }, []);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-8 lg:p-12">
      {/* Portfolio Stats Header */}
      <div className="grid lg:grid-cols-3 gap-8 mb-12">
        <div className="text-center lg:text-left">
          <div className="text-white/70 text-sm font-medium mb-2">
            Total Portfolio Value
          </div>
          <div className="text-3xl lg:text-4xl font-bold text-white">
            ${currentValue.toLocaleString()}
          </div>
        </div>

        <div className="text-center">
          <div className="text-white/70 text-sm font-medium mb-2">
            Total Growth
          </div>
          <div className="text-3xl lg:text-4xl font-bold text-green-400">
            +{currentPercentage.toFixed(1)}%
          </div>
        </div>

        <div className="text-center lg:text-right">
          <div className="text-white/70 text-sm font-medium mb-2">
            Monthly Return
          </div>
          <div className="text-3xl lg:text-4xl font-bold text-blue-400">
            +14.2%
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative h-80 bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        {/* Grid Lines */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full border-t border-white/10"
              style={{ top: `${(i + 1) * 16.66}%` }}
            />
          ))}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute h-full border-l border-white/10"
              style={{ left: `${(i + 1) * 12.5}%` }}
            />
          ))}
        </div>

        {/* Chart Line */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ overflow: "visible" }}
        >
          {/* Gradient Definition */}
          <defs>
            <linearGradient
              id="chartGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor="rgb(59, 130, 246)"
                stopOpacity="0.3"
              />
              <stop
                offset="100%"
                stopColor="rgb(59, 130, 246)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {/* Chart Path */}
          <path
            d="M 60 240 Q 120 220 180 180 Q 240 160 300 140 Q 360 120 420 100 Q 480 85 540 70"
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="3"
            strokeLinecap="round"
            className={`transition-all duration-3000 ease-out ${
              isAnimated
                ? "stroke-dasharray-none opacity-100"
                : "stroke-dasharray-1000 stroke-dashoffset-1000 opacity-0"
            }`}
            style={{
              strokeDasharray: isAnimated ? "none" : "1000",
              strokeDashoffset: isAnimated ? "0" : "1000",
              transition: "stroke-dashoffset 3s ease-out, opacity 1s ease-out",
            }}
          />

          {/* Area Fill */}
          <path
            d="M 60 240 Q 120 220 180 180 Q 240 160 300 140 Q 360 120 420 100 Q 480 85 540 70 L 540 300 L 60 300 Z"
            fill="url(#chartGradient)"
            className={`transition-all duration-3000 ease-out ${
              isAnimated ? "opacity-100" : "opacity-0"
            }`}
            style={{
              transition: "opacity 2s ease-out 1s",
            }}
          />

          {/* Data Points */}
          {dataPoints.map((point, index) => (
            <circle
              key={index}
              cx={60 + index * 70}
              cy={240 - point.value / 25000}
              r="4"
              fill="rgb(59, 130, 246)"
              className={`transition-all duration-500 ease-out ${
                isAnimated ? "opacity-100 scale-100" : "opacity-0 scale-0"
              }`}
              style={{
                transitionDelay: `${1.5 + index * 0.2}s`,
              }}
            />
          ))}
        </svg>

        {/* Month Labels */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-between px-12 text-white/60 text-sm">
          {dataPoints.map((point, index) => (
            <div
              key={point.month}
              className={`transition-all duration-500 ease-out ${
                isAnimated
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{
                transitionDelay: `${2 + index * 0.1}s`,
              }}
            >
              {point.month}
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <div
          className={`bg-white/5 rounded-xl p-4 border border-white/10 transition-all duration-700 ease-out ${
            isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "2.5s" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-4 h-4 text-orange-400" />
            <span className="text-white/70 text-sm">Real Estate</span>
          </div>
          <div className="text-xl font-bold text-white">$1.2M</div>
          <div className="text-green-400 text-sm">+12.3%</div>
        </div>

        <div
          className={`bg-white/5 rounded-xl p-4 border border-white/10 transition-all duration-700 ease-out ${
            isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "2.7s" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-white/70 text-sm">Commodities</span>
          </div>
          <div className="text-xl font-bold text-white">$450K</div>
          <div className="text-green-400 text-sm">+8.7%</div>
        </div>

        <div
          className={`bg-white/5 rounded-xl p-4 border border-white/10 transition-all duration-700 ease-out ${
            isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "2.9s" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-blue-400" />
            <span className="text-white/70 text-sm">Equipment</span>
          </div>
          <div className="text-xl font-bold text-white">$200K</div>
          <div className="text-green-400 text-sm">+15.2%</div>
        </div>

        <div
          className={`bg-white/5 rounded-xl p-4 border border-white/10 transition-all duration-700 ease-out ${
            isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "3.1s" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-white/70 text-sm">Average APY</span>
          </div>
          <div className="text-xl font-bold text-white">18.9%</div>
          <div className="text-emerald-400 text-sm">Industry Leading</div>
        </div>
      </div> */}
    </div>
  );
}

// Carousel Hero Component
function CarouselHero({ user }: { user: any }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const slides = [
    {
      badge: "New Partnership",
      icon: Star,
      title: "TangibleFi x DeFi Alliance",
      description: "Multi-chain RWA tokenization with AI verification.",
      link: "/partnership",
    },
    {
      badge: "New Feature",
      icon: Sparkles,
      title: "AI-Powered Valuations",
      description: "Real-time asset pricing using machine learning.",
      link: "/features/ai-valuations",
    },
    {
      badge: "Update",
      icon: Globe,
      title: "Multi-Chain Support",
      description: "Now supporting 5 blockchain networks.",
      link: "/features/multi-chain",
    },
  ];

  const totalSlides = slides.length;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  // Initialize animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-advance slides with pause on hover
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 6000); // Change slide every 6 seconds

    return () => clearInterval(interval);
  }, [totalSlides]);

  const CurrentIcon = slides[currentSlide].icon;

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 overflow-hidden">
      {/* Geometric Background Elements */}
      <div className="absolute inset-0">
        {/* Floating 3D Geometric Shapes */}
        <div className="absolute top-20 left-20 w-32 h-32 transform rotate-45 animate-pulse opacity-20">
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 transform perspective-1000 rotateX-45 rotateY-45 shadow-2xl"></div>
        </div>

        <div
          className="absolute top-40 right-32 w-24 h-24 transform -rotate-12 animate-pulse opacity-30"
          style={{ animationDelay: "1s" }}
        >
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 transform perspective-1000 rotateX-30 rotateY-30 shadow-xl"></div>
        </div>

        <div
          className="absolute bottom-32 left-32 w-40 h-40 transform rotate-12 animate-pulse opacity-15"
          style={{ animationDelay: "2s" }}
        >
          <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-blue-500 transform perspective-1000 rotateX-60 rotateY-45 shadow-2xl"></div>
        </div>

        <div
          className="absolute bottom-40 right-20 w-28 h-28 transform -rotate-45 animate-pulse opacity-25"
          style={{ animationDelay: "3s" }}
        >
          <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 transform perspective-1000 rotateX-45 rotateY-60 shadow-xl"></div>
        </div>

        <div
          className="absolute top-1/2 left-1/4 w-16 h-16 transform rotate-90 animate-pulse opacity-20"
          style={{ animationDelay: "1.5s" }}
        >
          <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-500 transform perspective-1000 rotateX-30 rotateY-45 shadow-lg"></div>
        </div>

        <div
          className="absolute top-1/3 right-1/4 w-20 h-20 transform -rotate-30 animate-pulse opacity-30"
          style={{ animationDelay: "2.5s" }}
        >
          <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-500 transform perspective-1000 rotateX-45 rotateY-30 shadow-xl"></div>
        </div>

        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-6xl mx-auto text-center">
          {/* Announcement Badge */}
          <div
            className={`inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm text-blue-200 rounded-full text-sm font-medium mb-8 border border-white/20 transition-all duration-1000 ease-out ${
              isLoaded
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-4 scale-95"
            }`}
          >
            <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
            Introducing: Aggregated Blockchains
            <ArrowRight className="w-4 h-4 ml-2" />
          </div>

          {/* Main Headline */}
          <AnimatedText
            text="RWA, Aggregated."
            className={`text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight transition-all duration-1200 ease-out ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            delay={200}
          />

          {/* Subtitle */}
          <p
            className={`text-xl lg:text-2xl text-gray-300 mb-16 max-w-4xl mx-auto leading-relaxed transition-all duration-1000 ease-out ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: "600ms" }}
          >
            Enabling an infinitely scalable ecosystem of real-world assets that
            feels like a single marketplace. Powered by AI-driven tokenization.
          </p>

          {/* Central Dashboard Button */}
          <div
            className={`mb-12 transition-all duration-1000 ease-out ${
              isLoaded
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-8 scale-95"
            }`}
            style={{ transitionDelay: "800ms" }}
          >
            <Link
              href={user ? "/dashboard" : "/sign-up"}
              className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-lg rounded-2xl hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-lg border border-blue-400/30 backdrop-blur-sm overflow-hidden"
            >
              {/* Animated background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-indigo-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>

              <div className="relative flex items-center">
                <BarChart3 className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300 drop-shadow-sm" />
                {user ? "Go to Dashboard" : "Start Tokenizing Assets"}
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform duration-300 drop-shadow-sm" />
              </div>
            </Link>
            {user && (
              <p className="text-gray-300 mt-3 text-sm animate-pulse">
                Welcome back! Access your portfolio and manage your assets.
              </p>
            )}
          </div>

          {/* Three Main Action Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Tokenize Card */}
            <div
              className={`group bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-500 hover:bg-white/10 hover:scale-105 hover:shadow-xl ${
                isLoaded
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: "1000ms" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Tokenize</h3>
                <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <p className="text-gray-300 mb-8 text-left">
                Convert real estate, commodities, and equipment into digital
                tokens with institutional-grade compliance.
              </p>
              <div className="text-left">
                <Link
                  href="/dashboard/assets/new"
                  className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium group-hover:text-blue-300 transition-colors"
                >
                  Get started tokenizing
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>

            {/* Lend Card */}
            <div
              className={`group bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-500 hover:bg-white/10 hover:scale-105 hover:shadow-xl ${
                isLoaded
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: "1200ms" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Lend</h3>
                <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <p className="text-gray-300 mb-8 text-left">
                Access instant USDC liquidity by lending against your tokenized
                assets with competitive rates.
              </p>
              <div className="text-left">
                <Link
                  href="/dashboard/lending"
                  className="inline-flex items-center text-purple-400 hover:text-purple-300 font-medium group-hover:text-purple-300 transition-colors"
                >
                  Start lending now
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>

            {/* Trade Card */}
            <div
              className={`group bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-500 hover:bg-white/10 hover:scale-105 hover:shadow-xl ${
                isLoaded
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: "1400ms" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Trade</h3>
                <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <p className="text-gray-300 mb-8 text-left">
                Buy, sell and manage your portfolio of tokenized real-world
                assets on our unified platform.
              </p>
              <div className="text-left">
                <Link
                  href="/dashboard/portfolio"
                  className="inline-flex items-center text-emerald-400 hover:text-emerald-300 font-medium group-hover:text-emerald-300 transition-colors"
                >
                  Explore marketplace
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Carousel Section */}
          <div className="mt-16 max-w-6xl mx-auto">
            {/* Carousel Container */}
            <div className="relative bg-black/20 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden">
              {/* Slide Indicators */}
              <div className="absolute top-8 left-8 z-20 flex items-center gap-2">
                <span className="text-white/70 text-sm font-medium">
                  0{currentSlide + 1}
                </span>
                <div className="w-8 h-0.5 bg-white/30"></div>
                <span className="text-white/70 text-sm font-medium">
                  0{totalSlides}
                </span>
              </div>

              {/* Slide Content */}
              <div className="relative h-80 flex items-center">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 via-purple-800/30 to-indigo-900/40"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20"></div>

                {/* Content */}
                <div className="relative z-10 w-full px-16 py-12">
                  <div className="grid lg:grid-cols-2 gap-8 items-center max-w-5xl">
                    {/* Left Content */}
                    <div>
                      <div className="inline-flex items-center px-3 py-1.5 bg-white/15 backdrop-blur-md text-white rounded-full text-sm font-medium mb-4 border border-white/20">
                        <CurrentIcon className="w-4 h-4 mr-2" />
                        {slides[currentSlide].badge}
                      </div>

                      <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                        {slides[currentSlide].title}
                      </h3>

                      <p className="text-lg text-white/90 mb-6 leading-relaxed drop-shadow-md">
                        {slides[currentSlide].description}
                      </p>

                      <Link
                        href={slides[currentSlide].link}
                        className="inline-flex items-center px-5 py-2.5 bg-white/15 backdrop-blur-md text-white font-medium rounded-xl border border-white/25 hover:bg-white/25 hover:border-white/40 transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        Learn More
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </div>

                    {/* Right Content - Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 ml-0 lg:ml-0">
                      <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="w-5 h-5 text-blue-300 drop-shadow-sm" />
                          <span className="text-white font-semibold text-xs drop-shadow-sm">
                            Real Estate
                          </span>
                        </div>
                        <div className="text-xl font-bold text-white drop-shadow-sm">
                          $2.1B
                        </div>
                        <div className="text-white/80 text-xs">Volume</div>
                      </div>

                      <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Coins className="w-5 h-5 text-yellow-300 drop-shadow-sm" />
                          <span className="text-white font-semibold text-xs drop-shadow-sm">
                            Commodities
                          </span>
                        </div>
                        <div className="text-xl font-bold text-white drop-shadow-sm">
                          $580M
                        </div>
                        <div className="text-white/80 text-xs">Volume</div>
                      </div>

                      <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Settings className="w-5 h-5 text-emerald-300 drop-shadow-sm" />
                          <span className="text-white font-semibold text-xs drop-shadow-sm">
                            Equipment
                          </span>
                        </div>
                        <div className="text-xl font-bold text-white drop-shadow-sm">
                          $340M
                        </div>
                        <div className="text-white/80 text-xs">Volume</div>
                      </div>

                      <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-purple-300 drop-shadow-sm" />
                          <span className="text-white font-semibold text-xs drop-shadow-sm">
                            Growth
                          </span>
                        </div>
                        <div className="text-xl font-bold text-white drop-shadow-sm">
                          +247%
                        </div>
                        <div className="text-white/80 text-xs">YoY</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [user, setUser] = useState<any>(null);

  // Get user data on component mount
  useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.warn("Auth error:", error);
        setUser(null);
      }
    };

    getUser();
  }, []);

  // Scroll animation refs for major sections
  const [tokenizationRef, tokenizationVisible] = useScrollAnimation(0);
  const [tvlRef, tvlVisible] = useScrollAnimation(0);
  const [analyticsRef, analyticsVisible] = useScrollAnimation(0);
  const [featuresRef, featuresVisible] = useStaggeredAnimation(4, 100);
  const [statsRef, statsVisible] = useStaggeredAnimation(4, 100);
  const [parallaxRef, parallaxTransform] = useParallax(-0.3);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <CarouselHero user={user} />

      {/* Tokenization Platform Section */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        {/* Animated background elements */}
        <div
          ref={parallaxRef}
          className="absolute inset-0 opacity-5"
          style={{ transform: parallaxTransform }}
        >
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-500 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Content */}
              <div ref={tokenizationRef}>
                <div
                  className={`inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6 transition-all duration-700 ${
                    tokenizationVisible
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-8 scale-90"
                  }`}
                >
                  <FileCheck className="w-4 h-4 mr-2" />
                  Asset Tokenization
                </div>

                <AnimatedText
                  text="The only asset tokenization platform you'll ever need"
                  className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
                  delay={100}
                />

                <div className="space-y-6 mb-8" ref={featuresRef}>
                  {[
                    {
                      icon: Upload,
                      title: "Upload and verify with ease",
                      description:
                        "Submit documentation for your real-world assets including deeds, certificates, and valuations.",
                    },
                    {
                      icon: Sparkles,
                      title: "Mint verified NFTs",
                      description:
                        "AI-powered verification system creates immutable blockchain tokens of your assets.",
                    },
                    {
                      icon: DollarSign,
                      title: "Access instant liquidity",
                      description:
                        "Use your NFTs as collateral to borrow USDC with automated EMI repayments.",
                    },
                    {
                      icon: Globe,
                      title: "Connect to multi-chain DeFi",
                      description:
                        "Deploy across Ethereum, Polygon, BSC, and Arbitrum for optimal rates and liquidity.",
                    },
                  ].map((feature, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-4 transition-all duration-700 ease-out ${
                        featuresVisible[index]
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-12"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 transition-all duration-500 ${
                          featuresVisible[index]
                            ? "scale-100 rotate-0"
                            : "scale-0 rotate-180"
                        }`}
                        style={{ transitionDelay: `${index * 100 + 150}ms` }}
                      >
                        <feature.icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h3
                          className={`font-semibold text-gray-900 mb-2 transition-all duration-500 ${
                            featuresVisible[index]
                              ? "opacity-100 translate-y-0"
                              : "opacity-0 translate-y-4"
                          }`}
                          style={{ transitionDelay: `${index * 100 + 250}ms` }}
                        >
                          {feature.title}
                        </h3>
                        <p
                          className={`text-gray-600 transition-all duration-500 ${
                            featuresVisible[index]
                              ? "opacity-100 translate-y-0"
                              : "opacity-0 translate-y-4"
                          }`}
                          style={{ transitionDelay: `${index * 100 + 350}ms` }}
                        >
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className={`transition-all duration-700 ${
                    tokenizationVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: "500ms" }}
                >
                  <Link
                    href={user ? "/dashboard" : "/sign-up"}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    Get Started
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </div>
              </div>

              {/* Right Content - Dashboard Preview */}
              <div
                className={`relative transition-all duration-1500 ease-out ${
                  tokenizationVisible
                    ? "opacity-100 translate-x-0 rotate-0"
                    : "opacity-0 translate-x-12 rotate-3"
                }`}
                style={{ transitionDelay: "600ms" }}
              >
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transform hover:scale-105 transition-transform duration-500">
                  {/* Dashboard Header */}
                  <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">Tf</span>
                      </div>
                      <span className="text-white font-medium">
                        TangibleFi Dashboard
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <div
                        className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"
                        style={{ animationDelay: "500ms" }}
                      ></div>
                      <div
                        className="w-3 h-3 bg-green-500 rounded-full animate-pulse"
                        style={{ animationDelay: "1000ms" }}
                      ></div>
                    </div>
                  </div>

                  {/* Dashboard Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div
                        className={`bg-blue-50 rounded-xl p-4 transition-all duration-700 ${
                          tokenizationVisible
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-4"
                        }`}
                        style={{ transitionDelay: "1200ms" }}
                      >
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          $2.5M
                        </div>
                        <div className="text-blue-600 text-sm font-medium">
                          Assets Tokenized
                        </div>
                      </div>
                      <div
                        className={`bg-green-50 rounded-xl p-4 transition-all duration-700 ${
                          tokenizationVisible
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-4"
                        }`}
                        style={{ transitionDelay: "1400ms" }}
                      >
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          $850K
                        </div>
                        <div className="text-green-600 text-sm font-medium">
                          USDC Borrowed
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        {
                          name: "Manhattan Apartment",
                          type: "Real Estate • Verified",
                          value: "$750K",
                          change: "+2.1%",
                        },
                        {
                          name: "Gold Reserve",
                          type: "Commodity • Pending",
                          value: "$425K",
                          change: "+5.7%",
                        },
                        {
                          name: "Tesla Model S",
                          type: "Vehicle • Verified",
                          value: "$85K",
                          change: "-1.2%",
                        },
                      ].map((asset, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-700 ${
                            tokenizationVisible
                              ? "opacity-100 translate-x-0"
                              : "opacity-0 -translate-x-4"
                          }`}
                          style={{ transitionDelay: `${1600 + index * 200}ms` }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Building className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {asset.name}
                              </div>
                              <div className="text-gray-500 text-sm">
                                {asset.type}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              {asset.value}
                            </div>
                            <div
                              className={`text-sm ${asset.change.startsWith("+") ? "text-green-600" : "text-red-600"}`}
                            >
                              {asset.change}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Total Value Locked Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto text-center">
            <div ref={tvlRef}>
              <AnimatedCounter
                targetValue={3847652891234}
                prefix="$"
                duration={3000}
                className={`text-6xl lg:text-8xl font-mono font-bold text-gray-900 mb-4 tracking-wider transition-all duration-1500 ${
                  tvlVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
                }`}
              />
              <div
                className={`flex items-center justify-center gap-2 mb-16 transition-all duration-1000 ${
                  tvlVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: "500ms" }}
              >
                <h3 className="text-lg font-semibold text-gray-600 uppercase tracking-wide">
                  TOTAL VALUE LOCKED IN RWA PROTOCOLS
                </h3>
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <div
                className={`text-left transition-all duration-1200 ${
                  tvlVisible
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-12"
                }`}
                style={{ transitionDelay: "800ms" }}
              >
                <AnimatedText
                  text="Why TangibleFi is the RWA standard"
                  className="text-4xl lg:text-5xl font-bold text-gray-900 mb-8"
                  delay={1000}
                />

                <div className="space-y-8">
                  {[
                    {
                      title: "Institutional-grade security",
                      description:
                        "TangibleFi protocols are secured by enterprise-level security audits with a proven track record of protecting billions in tokenized assets.",
                    },
                    {
                      title: "Cross-chain compatibility",
                      description:
                        "TangibleFi connects existing RWA ecosystems to any public or private blockchain and enables seamless multi-chain asset management.",
                    },
                    {
                      title: "Enterprise-ready infrastructure",
                      description:
                        "TangibleFi provides institutions across all major asset classes with comprehensive documentation, dedicated support, and proven scalability.",
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className={`transition-all duration-1000 ${
                        tvlVisible
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-8"
                      }`}
                      style={{ transitionDelay: `${1200 + index * 300}ms` }}
                    >
                      <h4 className="text-xl font-bold text-gray-900 mb-3">
                        {item.title}
                      </h4>
                      <p className="text-gray-600 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6" ref={statsRef}>
                <AnimatedStatCard
                  value={12847}
                  label="Assets Tokenized"
                  delay={statsVisible[0] ? 0 : 1000}
                  color="blue"
                />
                <AnimatedStatCard
                  value={247}
                  label="Institutional Partners"
                  delay={statsVisible[1] ? 200 : 1000}
                  color="purple"
                />
                <AnimatedStatCard
                  value={98.7}
                  suffix="%"
                  label="Uptime Guarantee"
                  delay={statsVisible[2] ? 400 : 1000}
                  color="green"
                />
                <AnimatedStatCard
                  value={157}
                  label="Countries Supported"
                  delay={statsVisible[3] ? 600 : 1000}
                  color="orange"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Performance Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm text-blue-200 rounded-full text-sm font-medium mb-8 border border-white/20">
                <TrendingUp className="w-4 h-4 mr-2" />
                Portfolio Performance
                <Sparkles className="w-4 h-4 ml-2" />
              </div>

              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Track Your Asset Growth
              </h2>

              <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Real-time portfolio analytics with AI-powered insights and
                performance tracking across all your tokenized assets.
              </p>
            </div>

            <PortfolioChart />
          </div>
        </div>
      </section>
      {/* Multi-Chain Trading Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Content - Network Selection */}
              <div className="relative">
                <div className="bg-gray-50 rounded-2xl p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    Multi-chain asset deployment
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-sm">
                            Ξ
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            Ethereum
                          </div>
                          <div className="text-gray-500 text-sm">
                            Most liquid DeFi ecosystem
                          </div>
                        </div>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <span className="text-purple-600 font-bold text-sm">
                            ⬟
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            Polygon
                          </div>
                          <div className="text-gray-500 text-sm">
                            Low-cost, fast transactions
                          </div>
                        </div>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <span className="text-yellow-600 font-bold text-sm">
                            ◉
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            BNB Chain
                          </div>
                          <div className="text-gray-500 text-sm">
                            High throughput network
                          </div>
                        </div>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 opacity-60">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                          <span className="text-cyan-600 font-bold text-sm">
                            △
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            Arbitrum
                          </div>
                          <div className="text-gray-500 text-sm">
                            Layer 2 scaling solution
                          </div>
                        </div>
                      </div>
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                    <div className="text-sm font-medium text-blue-900 mb-1">
                      Network Activity
                    </div>
                    <div className="text-blue-700 text-sm">
                      Cross-chain compatibility ensures optimal rates and
                      maximum liquidity access
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Content */}
              <div>
                <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
                  <Globe className="w-4 h-4 mr-2" />
                  Multi-Chain
                </div>

                <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                  Lightning-fast asset trading
                </h2>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="text-gray-700 font-medium">
                      Deploy across 4+ blockchain networks
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="text-gray-700 font-medium">
                      AI-powered optimal rate discovery
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="text-gray-700 font-medium">
                      Cross-chain liquidity aggregation
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="text-gray-700 font-medium">
                      24/7 live monitoring and support
                    </span>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Start Trading
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="py-48 bg-gray-50 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-red-500 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Content */}
              <div ref={analyticsRef}>
                <div
                  className={`inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-6 transition-all duration-1000 ${
                    analyticsVisible
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-8 scale-90"
                  }`}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Analytics
                </div>

                <AnimatedText
                  text="RWA data is in our DNA"
                  className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
                  delay={200}
                />

                <div
                  className={`space-y-6 mb-8 transition-all duration-1000 ${
                    analyticsVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: "400ms" }}
                >
                  <p className="text-xl text-gray-600 leading-relaxed">
                    Explore the top tokenized assets, analyze the market, or
                    simply learn more about real-world asset tokenization.
                  </p>

                  <div className="space-y-4">
                    {[
                      "Comprehensive asset data API",
                      "Industry-leading analytics dashboard",
                      "Real-time asset valuations",
                      "Market trend analysis",
                    ].map((feature, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3 transition-all duration-700 ${
                          analyticsVisible
                            ? "opacity-100 translate-x-0"
                            : "opacity-0 -translate-x-8"
                        }`}
                        style={{ transitionDelay: `${600 + index * 150}ms` }}
                      >
                        <div
                          className={`w-2 h-2 bg-blue-500 rounded-full transition-all duration-500 ${
                            analyticsVisible ? "scale-100" : "scale-0"
                          }`}
                          style={{ transitionDelay: `${800 + index * 150}ms` }}
                        ></div>
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={`transition-all duration-1000 ${
                    analyticsVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: "1200ms" }}
                >
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    Explore Analytics
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </div>
              </div>

              {/* Right Content - Analytics Dashboard */}
              <div
                className={`relative transition-all duration-1500 ease-out ${
                  analyticsVisible
                    ? "opacity-100 translate-x-0 rotate-0"
                    : "opacity-0 translate-x-12 rotate-3"
                }`}
                style={{ transitionDelay: "600ms" }}
              >
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transform hover:scale-105 transition-transform duration-500">
                  {/* Dashboard Header */}
                  <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center transition-all duration-700 ${
                          analyticsVisible
                            ? "scale-100 rotate-0"
                            : "scale-0 rotate-180"
                        }`}
                        style={{ transitionDelay: "1000ms" }}
                      >
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                      <span
                        className={`text-white font-medium transition-all duration-700 ${
                          analyticsVisible
                            ? "opacity-100 translate-x-0"
                            : "opacity-0 -translate-x-4"
                        }`}
                        style={{ transitionDelay: "1200ms" }}
                      >
                        RWA Analytics Dashboard
                      </span>
                    </div>
                    <div
                      className={`text-orange-400 text-sm font-medium transition-all duration-700 ${
                        analyticsVisible
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 translate-x-4"
                      }`}
                      style={{ transitionDelay: "1400ms" }}
                    >
                      Live Data
                    </div>
                  </div>

                  {/* Dashboard Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {[
                        {
                          value: "$2.5B",
                          label: "Assets Tokenized",
                          color: "text-gray-900",
                        },
                        {
                          value: "25.7K",
                          label: "NFTs Minted",
                          color: "text-blue-600",
                        },
                        {
                          value: "99.8%",
                          label: "Success Rate",
                          color: "text-green-600",
                        },
                      ].map((stat, index) => (
                        <div
                          key={index}
                          className={`text-center transition-all duration-700 ${
                            analyticsVisible
                              ? "opacity-100 translate-y-0"
                              : "opacity-0 translate-y-4"
                          }`}
                          style={{ transitionDelay: `${1600 + index * 200}ms` }}
                        >
                          <div
                            className={`text-2xl font-bold mb-1 ${stat.color}`}
                          >
                            {stat.value}
                          </div>
                          <div className="text-gray-500 text-sm">
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Chart Area */}
                    <div
                      className={`bg-gray-50 rounded-xl p-4 h-32 flex items-center justify-center mb-4 transition-all duration-1000 ${
                        analyticsVisible
                          ? "opacity-100 scale-100"
                          : "opacity-0 scale-95"
                      }`}
                      style={{ transitionDelay: "2200ms" }}
                    >
                      <div className="flex items-end gap-2">
                        {[16, 20, 12, 24, 18, 22, 14].map((height, index) => (
                          <div
                            key={index}
                            className={`w-4 bg-blue-500 rounded-t transition-all duration-1000 ease-out ${
                              analyticsVisible ? "opacity-100" : "opacity-0"
                            }`}
                            style={{
                              height: `${height * 4}px`,
                              transitionDelay: `${2400 + index * 100}ms`,
                              backgroundColor: `hsl(${210 + index * 10}, 70%, ${50 + index * 5}%)`,
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[
                        { category: "Real Estate", percentage: "68.4%" },
                        { category: "Commodities", percentage: "23.1%" },
                        { category: "Equipment", percentage: "8.5%" },
                      ].map((item, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between text-sm transition-all duration-700 ${
                            analyticsVisible
                              ? "opacity-100 translate-x-0"
                              : "opacity-0 -translate-x-4"
                          }`}
                          style={{ transitionDelay: `${3000 + index * 200}ms` }}
                        >
                          <span className="text-gray-600">{item.category}</span>
                          <span className="font-medium text-gray-900">
                            {item.percentage}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {/* <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden">
        Geometric Background
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.1)_75%)] bg-[length:60px_60px]"></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6">
              Let us take you from zero to
              <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                tokenized assets
              </span>
            </h2>

            <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join thousands of asset owners leveraging blockchain technology to
              unlock liquidity and access global DeFi markets through verified
              NFT tokenization.
            </p>

            <Link
              href={user ? "/dashboard" : "/sign-up"}
              className="inline-flex items-center px-8 py-4 bg-white text-blue-900 font-bold text-lg rounded-xl hover:bg-blue-50 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              {user ? "Launch Dashboard" : "Get Started"}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section> */}

      {/* Total Value Locked Section */}

      {/* Platform Statistics Section */}

      <Footer />
    </div>
  );
}
