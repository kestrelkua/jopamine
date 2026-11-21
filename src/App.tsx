import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Editor from './editor/Editor'
import WriteHome from './editor/WriteHome'
import Home from './pages/Home'
import Reader, { Preview } from './reader/Reader'
import Tracker from './tracker/Tracker'

// The 3D world brings three.js with it, so it only loads when someone goes there.
const World = lazy(() => import('./world/World'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/post/:slug" element={<Reader />} />
        <Route path="/write" element={<WriteHome />} />
        <Route path="/write/:id" element={<Editor />} />
        <Route path="/preview/:id" element={<Preview />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route
          path="/world"
          element={
            <Suspense fallback={<div className="world" />}>
              <World />
            </Suspense>
          }
        />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  )
}
