document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar')
  const mobileMenuBtn = document.getElementById('mobile-menu-btn')
  const mobileMenu = document.getElementById('mobile-menu')
  const navLinks = document.querySelectorAll('.nav-link')
  const mobileNavLinks = document.querySelectorAll('#mobile-menu a')
  const sections = document.querySelectorAll('section[id]')
  const reveals = document.querySelectorAll('.reveal')

  // ── Sticky Nav ──
  const updateNav = () => {
    const scrollY = window.scrollY
    if (scrollY > 80) {
      navbar.classList.remove('bg-transparent')
      navbar.classList.add('glass')
      navbar.style.boxShadow = '0 1px 0 rgba(255,255,255,0.05)'
    } else {
      navbar.classList.add('bg-transparent')
      navbar.classList.remove('glass')
      navbar.style.boxShadow = 'none'
    }
    lastScrollY = scrollY
  }
  updateNav()
  window.addEventListener('scroll', updateNav, { passive: true })

  // ── Mobile Menu ──
  mobileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const isOpen = !mobileMenu.classList.contains('hidden')
    mobileMenu.classList.toggle('hidden')
    document.getElementById('menu-icon-open').classList.toggle('hidden', !isOpen)
    document.getElementById('menu-icon-close').classList.toggle('hidden', isOpen)
  })

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden')
      document.getElementById('menu-icon-open').classList.remove('hidden')
      document.getElementById('menu-icon-close').classList.add('hidden')
    })
  })

  document.addEventListener('click', (e) => {
    if (!mobileMenu.classList.contains('hidden') && !mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
      mobileMenu.classList.add('hidden')
      document.getElementById('menu-icon-open').classList.remove('hidden')
      document.getElementById('menu-icon-close').classList.add('hidden')
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

  // ── Typing Animation ──
  const roles = [
    'Data Engineer',
    'Pipeline Builder',
    'Data Architect',
    'ETL Specialist',
    'ML Ops Enthusiast',
  ]
  const typedTextEl = document.getElementById('typed-text')
  let roleIndex = 0
  let charIndex = 0
  let isDeleting = false
  let typingTimeout

  const typeEffect = () => {
    const currentRole = roles[roleIndex]
    if (isDeleting) {
      charIndex--
      typedTextEl.textContent = currentRole.substring(0, charIndex)
    } else {
      typedTextEl.textContent = currentRole.substring(0, charIndex + 1)
      charIndex++
    }

    if (!isDeleting && charIndex === currentRole.length) {
      isDeleting = true
      typingTimeout = setTimeout(typeEffect, 2000)
      return
    }

    if (isDeleting && charIndex === 0) {
      isDeleting = false
      roleIndex = (roleIndex + 1) % roles.length
      typingTimeout = setTimeout(typeEffect, 500)
      return
    }

    const delay = isDeleting ? 40 : 80
    typingTimeout = setTimeout(typeEffect, delay)
  }
  typeEffect()

  // ── Scroll Reveal ──
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-slide-up', 'opacity-100')
        revealObserver.unobserve(entry.target)
      }
    })
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' })

  reveals.forEach(el => {
    el.classList.add('opacity-0')
    revealObserver.observe(el)
  })

  // ── Smooth Scroll for nav links (edge cases) ──
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href')
      if (targetId === '#') return
      const target = document.querySelector(targetId)
      if (target) {
        e.preventDefault()
        const offset = 80
        const top = target.getBoundingClientRect().top + window.scrollY - offset
        window.scrollTo({ top, behavior: 'smooth' })
      }
    })
  })

  // ── Cleanup on page unload ──
  window.addEventListener('beforeunload', () => {
    clearTimeout(typingTimeout)
    revealObserver.disconnect()
  })
})
