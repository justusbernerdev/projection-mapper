import SubmitView from './views/SubmitView'
import AdminView from './views/AdminView'
import DisplayView from './views/DisplayView'

const path = window.location.pathname

export default function App() {
  if (path.startsWith('/admin')) return <AdminView />
  if (path.startsWith('/display')) return <DisplayView />
  return <SubmitView />
}
