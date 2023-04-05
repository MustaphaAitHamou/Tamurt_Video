import React from "react";

function SignupScreen() {
  return (
  <div className="signupScreen">
    <form>
        <h1>Sign Up</h1>
        <input placeholder="Email" type="email"/>
        <input placeholder="Password" type="password"/>
        <button type="submit">Sign Up</button>
    </form>
  </div>
  )
}

export default SignupScreen;
