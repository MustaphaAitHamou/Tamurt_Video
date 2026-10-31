import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import "./Nav.css";

function Nav() {
const [show, handleShow] = useState(false);
const navigate = useNavigate();

const transitionNavBar = () => {
    if(window.scrollY > 100){
        handleShow(true);
    } else{
        handleShow(false)
    }
}

useEffect(() => {
window.addEventListener("scroll", transitionNavBar);
return () => window.removeEventListener("scroll", transitionNavBar);
}, [])
        return (
            <div className={`nav ${show && 'nav__black'}`}>
                <div className='nav__contents'>
                <img 
                    className='nav__logo'
                    src='https://assets.stickpng.com/images/580b57fcd9996e24bc43c529.png' alt=''/>
                <img
                onClick={() => navigate("/profile")}
                    className='nav__avatar'
                    src='https://static.vecteezy.com/ti/vecteur-libre/p3/5005788-user-icon-in-trendy-flat-style-isolated-on-grey-background-user-symbol-for-your-web-site-design-logo-app-ui-vector-illustration-eps10-gratuit-vectoriel.jpg' alt=''/>
                </div>
            </div>
        );
}



export default Nav;