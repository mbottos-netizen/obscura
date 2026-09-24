// Standalone (non-Next) entry used to produce a single-file preview build.
import { createRoot } from 'react-dom/client'
import Experience from '../src/experience/Experience'
import '../app/globals.css'

createRoot(document.getElementById('root')!).render(<Experience />)
