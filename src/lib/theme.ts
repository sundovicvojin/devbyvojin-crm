// Prati sistemsku temu (svetla/tamna).
const media = window.matchMedia('(prefers-color-scheme: dark)')

function apply() {
  document.documentElement.classList.toggle('dark', media.matches)
}

export function initTheme() {
  apply()
  media.addEventListener('change', apply)
}
