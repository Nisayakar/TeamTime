import './App.css'
import Home from './pages/Home';
import Login from './pages/Login';
import Register from "./pages/Register";
import CreateProject from "./pages/CreateProject";


import { Routes, Route } from "react-router-dom"
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import EditProject from './pages/EditProject';


function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/create-project" element={<CreateProject />} />
        <Route path="/edit-project/:id" element={<EditProject />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </>
  )
}

export default App;
