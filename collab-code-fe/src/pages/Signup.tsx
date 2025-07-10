import { Button } from "../components/button";
import { Input } from "../components/Input";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import "../styles/theme.css";

export default function Signup() {
  const usernameref = useRef<HTMLInputElement | null>(null);
  const passwordref = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();
  async function signup() {

    const username = usernameref.current?.value;
    const password = passwordref.current?.value;

    try {
      const res = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
        username,
        password
      });
      console.log("Signup success:", res.data);
      alert("You are signed up");
    } catch (e: any) {
      console.error("Signup failed", e);
      alert("Signup failed: " + (e.response?.data?.message || e.message));
    }
    navigate("/signin")
  }


  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Get started with your free account</p>

        <form className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <Input ref={usernameref} placeholder={"Username"} />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <Input ref={passwordref} placeholder={"••••••••"} />
          </div>

          <div>
            <Button variant="primary" text="Sign Up" fullWidth onClick={signup} type="button" />
          </div>

          <p>
            Already have an account?{' '}
            <a href="/signin">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}