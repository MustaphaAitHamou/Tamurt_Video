import React, { Component } from "react";
import "./ProfileScreen.css";
import Nav from "../Nav";
import { selectUser } from "../features/userSlice";
import { useSelector } from "react-redux";
import { auth } from "../firebase";

function ProfileScreen() {
  const user = useSelector(selectUser);

  return (
    <div className="profileScreen">
      <Nav />
      <div className="profileScreen__body">
        <h1>Edit Profile</h1>
        <div className="profileScreen__info">
          <img
            src="https://static.vecteezy.com/ti/vecteur-libre/p3/5005788-user-icon-in-trendy-flat-style-isolated-on-grey-background-user-symbol-for-your-web-site-design-logo-app-ui-vector-illustration-eps10-gratuit-vectoriel.jpg"
            alt=""
          />
          <div className="profileScreen__details">
            <h2>{user.email}</h2>
            <div className="profileScreen__plans">
                <h3>Plans</h3>
              <button
                onClick={() => auth.signOut()}
                className="profileScreen__signOut"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileScreen;
