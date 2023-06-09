import React, { useEffect } from "react";
import "./App.css";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import LoginScreen from "./screens/LoginScreen";
import { auth } from "./firebase";
import { useDispatch, useSelector } from "react-redux";
import { logout, selectUser } from "./features/userSlice";
import { login } from "./features/userSlice";


function App() {

  const user = useSelector(selectUser);
  const dispatch = useDispatch();

  useEffect(() => {
   const unsubscribe = auth.onAuthStateChanged(userAuth => {
      if (userAuth) {
        dispatch(login({
          uid: userAuth.uid,
          email: userAuth.email,
        }));
      }
       else {
        dispatch(logout());
       }
    });

    return unsubscribe;
  }, [dispatch]);

  return (
    <div className="App">
      <Router>
        {!user ? (
          <LoginScreen />
        ): (
        <Routes>
          <Route path="/profile" element={<ProfileScreen />}/>
          <Route path="/" element={<HomeScreen />}/>
        </Routes>
        )}
      </Router>
    </div>
  );
}

export default App;
