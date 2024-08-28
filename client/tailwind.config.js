/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            'code::before': {
              content: '&nbsp;&nbsp;',
            },
            'code::after': {
              content: '&nbsp;&nbsp;',
            },
            code: {
              wordWrap: 'break-word',
              boxDecorationBreak: 'clone',
              padding: '.1rem .3rem .2rem',
              borderRadius: '.2rem',
            }
          },
        },
      }
    },
    animation: {
      'congrats': 'wiggle 0.3s linear infinite',
      'leftToRight':'leftToRight 2s ease infinite',
      textLeft: 'pulses 1s',
      textRight: 'pulses 2s',
    },
    keyframes: {
      pulses: {
        "0%": { opacity: "0" },
        "75%": { opacity: "0" },
        "100%": { opacity: "1" },
      },
      wiggle: {
        '0%': { transform: 'translate(1px, 1px) rotate(0deg)' },
        '10%': { transform: 'translate(-1px, -2px) rotate(-1deg)' },
        '20%': { transform: 'translate(-3px, 0px) rotate(1deg)' },
        '30%': { transform: 'translate(3px, 2px) rotate(0deg)' },
        '40%': { transform: 'translate(1px, -1px) rotate(1deg)' },
        '50%': { transform: 'translate(-1px, 2px) rotate(-1deg)' },
        '60%': { transform: 'translate(-3px, 1px) rotate(0deg)' },
        '70%': { transform: 'translate(3px, 1px) rotate(-1deg)' },
        '80%': { transform: 'translate(-1px, -1px) rotate(1deg)' },
        '90%': { transform: 'translate(1px, 2px) rotate(0deg)' },
        '100%': { transform: 'translate(1px, -2px) rotate(-1deg)' },
      },
      leftToRight: {
        '0%': {
            'background-size':'400% 400%',
            'background-position': '0% 50%'
        },
        '50%': {
            'background-size':'400% 400%',
            'background-position': '100% 50%'
        },
        '100%': {
          'background-size':'400% 400%',
          'background-position': '0% 50%'
      },
      
    },
    },
    fontFamily: {
      poppins: "Poppins",
      aubette: "Aubette",
      bandal: "Bandal",
      bricolage: "Bricolage",
    },
  },
  daisyui: {
    themes: [
      {
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          "primary": "#141BEB",
          "primary-content": "#FFFFFF",
          "accent": "#00ECBD"
          
        },
      },
      {
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          "primary": "#435bff",
          "primary-content": "#FFFFFF",
          "accent": "#00e8b7"
          
        },
      },
    ],
  },
  
  plugins: [require("daisyui"),require('@tailwindcss/typography') ],
};
