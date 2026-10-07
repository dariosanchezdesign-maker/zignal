import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        canvas: "#F7F7F5",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#0E1116",
          900: "#0E1116",
          800: "#1C2128",
          700: "#2D333B",
          600: "#4A525D",
          500: "#69717C",
          400: "#8C939C",
          300: "#B6BBC2",
          200: "#DCDFE3",
          150: "#E7E9EC",
          100: "#EFF0F2",
          50: "#F6F7F8",
        },
        accent: {
          DEFAULT: "#2647C9",
          50: "#EEF2FD",
          100: "#DCE4FB",
          200: "#B6C6F5",
          500: "#3558DC",
          600: "#2647C9",
          700: "#1D38A3",
          900: "#132469",
        },
        positive: { DEFAULT: "#137A55", 50: "#E8F5EF", 100: "#CDEBDD" },
        caution: { DEFAULT: "#A86A10", 50: "#FBF3E4", 100: "#F4E2BF" },
        negative: { DEFAULT: "#B4412C", 50: "#FBEDEA", 100: "#F4D3CC" },
      },
      boxShadow: {
        card: "0 1px 0 rgba(14,17,22,0.04), 0 1px 3px rgba(14,17,22,0.04)",
        lift: "0 1px 0 rgba(14,17,22,0.04), 0 12px 32px -12px rgba(14,17,22,0.18)",
        pop: "0 24px 64px -16px rgba(14,17,22,0.28)",
      },
      borderRadius: { xl: "14px", "2xl": "18px" },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulsedot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".35", transform: "scale(.85)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-left": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up .5s cubic-bezier(.2,.7,.2,1) both",
        "fade-in": "fade-in .4s ease both",
        shimmer: "shimmer 2.2s linear infinite",
        pulsedot: "pulsedot 1.4s ease-in-out infinite",
        "slide-up": "slide-up .32s cubic-bezier(.2,.8,.2,1) both",
        "slide-left": "slide-left .32s cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
