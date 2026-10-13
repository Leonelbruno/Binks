import { NavLink, Outlet } from 'react-router-dom'
import { navItems } from './navItems'
import styles from './AppLayout.module.css'

function AppLayout() {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.brand}>Binks</span>

        <nav className={styles.nav} aria-label="Principal">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.linkActive}` : styles.link
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
