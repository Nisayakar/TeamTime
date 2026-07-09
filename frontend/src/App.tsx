import './App.css'
import Home from './pages/Home';
import Login from './pages/Login';
import Register from "./pages/Register";
import CreateProject from "./pages/CreateProject";

import {Routes, Route} from "react-router-dom"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/create-project" element={<CreateProject />} />
    </Routes>
  )
}

export default App;
