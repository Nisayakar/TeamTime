import './App.css'
import './styles/phase1.css'
import Home from './pages/Home';
import Login from './pages/Login';
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import CreateProject from "./pages/CreateProject";


import { Routes, Route } from "react-router-dom"
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Profile from './pages/Profile';
import MyTasks from './pages/MyTasks';
import AppShell from './components/AppShell';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import EditProject from './pages/EditProject';
import ProjectDetails from "./pages/ProjectDetails";
import Teams from "./pages/Teams";
import TeamDetails from "./pages/TeamDetails";
import TeamInvitations from "./pages/TeamInvitations";
import Forbidden from "./pages/Forbidden";
import NotFound from "./pages/NotFound";
import './styles/auth-layout.css'


function App() {
  return (
    <>
      <Navbar />
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/create-project" element={<CreateProject />} />
            <Route path="/edit-project/:id" element={<EditProject />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/my-tasks" element={<MyTasks />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/invitations" element={<TeamInvitations />} />
            <Route path="/teams/:id" element={<TeamDetails />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/project/:id" element={<ProjectDetails />} />
            <Route path="/forbidden" element={<Forbidden />} />
          </Route>

          <Route path="/not-found" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppShell>
    </>
  )
}

export default App;
