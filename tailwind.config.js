/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./App.tsx",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./tabs/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors:{
        darkBackground : "#131313",
        darkSecondary : "#5e5e5e",
        darkTertiary : "#2a2a2a",
        // lightBackground : "#5e5e5e",
        lightSecondary : "#A9A9A9",
        lightTertiary : "#4F4F4F",
        primary : "#FF6F61",
        secondary : "#4ECDC4",
      },
      fontFamily: {
        space: ['SpaceGrotesk-Regular'],
      },

    },
  },
  plugins: [],
}