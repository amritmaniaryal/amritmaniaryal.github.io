document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar')
  const mobileMenuBtn = document.getElementById('mobile-menu-btn')
  const mobileMenu = document.getElementById('mobile-menu')
  const navLinks = document.querySelectorAll('.nav-link')
  const mobileNavLinks = document.querySelectorAll('#mobile-menu a')
  const sections = document.querySelectorAll('section[id]')

  // ── Mobile Menu ──
  const setMenuState = (open) => {
    mobileMenu.classList.toggle('hidden', !open)
    document.getElementById('menu-icon-open').classList.toggle('hidden', open)
    document.getElementById('menu-icon-close').classList.toggle('hidden', !open)
  }

  // ── Sticky Nav ──
  // This handler used to end with `lastScrollY = scrollY`, assigning to an
  // undeclared identifier. Inside a module (strict mode) that throws a
  // ReferenceError on the first call, which aborted the rest of this listener:
  // the mobile menu, the scroll-spy and the hero typing effect never ran.
  // The variable tracked nothing, so it is simply gone.
  const updateNav = () => {
    navbar.classList.toggle('nav-solid', window.scrollY > 80)
  }
  updateNav()
  window.addEventListener('scroll', updateNav, { passive: true })

  mobileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    setMenuState(mobileMenu.classList.contains('hidden'))
  })

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => setMenuState(false))
  })

  document.addEventListener('click', (e) => {
    if (!mobileMenu.classList.contains('hidden') &&
        !mobileMenu.contains(e.target) &&
        !mobileMenuBtn.contains(e.target)) {
      setMenuState(false)
    }
  })

  // ── Active Nav Link ──
  const updateActiveLink = () => {
    let current = ''
    sections.forEach(section => {
      const top = section.offsetTop - 150
      const bottom = top + section.offsetHeight
      if (window.scrollY >= top && window.scrollY < bottom) {
        current = section.getAttribute('id')
      }
    })
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`)
    })
  }
  updateActiveLink()
  window.addEventListener('scroll', updateActiveLink, { passive: true })

  // ── Smooth Scroll for nav links (edge cases) ──
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href')
      if (targetId === '#') return
      const target = document.querySelector(targetId)
      if (target) {
        e.preventDefault()
        // Clear the fixed nav by its measured height plus breathing room.
        // A hardcoded 80 left every target 1px under the nav, whose border
        // makes it 81px tall.
        const offset = Math.round(navbar.getBoundingClientRect().height) + 16
        const top = target.getBoundingClientRect().top + window.scrollY - offset
        window.scrollTo({ top, behavior: 'smooth' })
      }
    })
  })
})
