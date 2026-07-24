export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-white/[0.02] backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-5 md:flex-row md:items-center">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
          className="flex items-center"
        >
          <img
            src="/logo_design.png"
            alt="KubeCanvas"
            className="h-18 w-auto object-contain"
          />
        </a>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[var(--text-muted)]">made by</span>
          <span className="font-medium bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Amandeep
          </span>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          © {new Date().getFullYear()} KubeCanvas
        </p>
      </div>
    </footer>
  )
}
