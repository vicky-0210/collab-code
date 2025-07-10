import Signup from './pages/Signup'
import Signin from './pages/Signin'
import Home from './pages/Home'
import Room from './pages/Room'
import RoomPrivateChat from './pages/RoomPrivateChat';
import { BrowserRouter , Routes ,Route } from 'react-router-dom'

function App() {
  return <BrowserRouter>
    <Routes>
      <Route path="/signup" element={<Signup/>}/>
      <Route path="/signin" element={<Signin/>}/>
      <Route path="/home" element={<Home/>}/>
      <Route path="/room/:roomId" element={<Room/>}/>
      <Route path="/room/:roomId/private-chat" element={<RoomPrivateChat/>}/>
      <Route path="/" element={<Home/>}/>
    </Routes>
  </BrowserRouter>
}

export default App