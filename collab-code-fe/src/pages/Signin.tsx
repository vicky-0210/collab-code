import axios from "axios";
import { BACKEND_URL } from "../config";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/theme.css";

export default function Signin() {
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    
    const username = usernameRef.current?.value;
    const password = passwordRef.current?.value;

    if (!username || !password) {
      alert('Please enter both username and password');
      return;
    }

    try {
      const res = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
        username,
        password
      });
      const jwt = res.data.token;
      localStorage.setItem("token", jwt);
      navigate("/home");
    } catch (e: any) {
      console.error("Signin failed", e);
      alert("Signin failed: " + (e.response?.data?.message || e.message));
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">Sign in to continue</p>

        <form className="auth-form" onSubmit={handleSignin}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              ref={usernameRef}
              type="text"
              id="username"
              placeholder="Username"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              ref={passwordRef}
              type="password"
              id="password"
              placeholder="••••••••"
              className="form-control"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
          >
            Sign In
          </button>

          <p className="mt-4 text-center">
            Don't have an account?{' '}
            <a href="/signup" className="text-primary hover:underline">
              Sign up
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}