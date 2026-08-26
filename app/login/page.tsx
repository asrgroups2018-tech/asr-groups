"use client";

import "./login.css";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User, ArrowRight } from "lucide-react";

interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
}

interface LoginResponse {
  token: string;
  user: { id: string; name: string; role: string };
}

const authService = {
  login: async (creds: LoginCredentials): Promise<LoginResponse> => {
    await new Promise((r) => setTimeout(r, 1000));
    if (creds.username === "admin" && creds.password === "admin123") {
      return {
        token: "asr-jwt-auth-token",
        user: { id: "1", name: "Super Admin", role: "admin" },
      };
    }
    throw new Error("Invalid username or password. Please verify your credentials.");
  },
};

const BG_IMAGES = [
  "/login-bg-1.jpg",
  "/login-bg-2.jpg",
  "/login-bg-3.jpg"
];

export default function LoginPage() {
  const router = useRouter();

  // Animation state phase: 'intro' (logo coming and going) -> 'reveal'
  const [animPhase, setAnimPhase] = useState<"intro" | "reveal">("intro");
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  const [form, setForm] = useState<LoginCredentials>({
    username: "",
    password: "",
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<"username" | "password" | null>(null);

  // Smooth logo intro timing (1.6s coming and going)
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimPhase("reveal");
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  // Background image slideshow rotation every 5 seconds
  useEffect(() => {
    if (animPhase !== "reveal") return;
    const bgTimer = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % BG_IMAGES.length);
    }, 5000);
    return () => clearInterval(bgTimer);
  }, [animPhase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim()) {
      setError("Please enter your username.");
      return;
    }
    if (!form.password.trim()) {
      setError("Please enter your password.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await authService.login(form);
      const storage = form.rememberMe ? localStorage : sessionStorage;
      storage.setItem("asr_token", res.token);
      storage.setItem("asr_user", JSON.stringify(res.user));

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 600);
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
      setLoading(false);
    }
  };

  return (
    <div className={`asr-login-root asr-phase-${animPhase}`}>
      {/* ── Step 1: Smooth Logo Intro Animation (Coming and Going, Crisp & Blur-Free) ── */}
      {animPhase === "intro" && (
        <div className="asr-intro-screen">
          <div className="asr-intro-badge">
            <Image
              src="/Groups Finalized.png"
              alt="ASR Groups Logo"
              width={160}
              height={160}
              className="asr-intro-logo-img"
              priority
              unoptimized
            />
          </div>
          <h1 className="asr-intro-title">ASR GROUPS</h1>
        </div>
      )}

      {/* ── Step 2: Main Full View — 3-Image Slideshow, Top-Left Logo, Centered Compact Card ── */}
      <div className="asr-full-page">
        {/* Full Screen 3-Image Rotating Background Slideshow */}
        <div className="asr-bg-container">
          {BG_IMAGES.map((imgSrc, idx) => (
            <div
              key={imgSrc}
              className={`asr-bg-slide ${idx === currentBgIndex ? "asr-bg-slide--active" : ""}`}
              style={{ backgroundImage: `url('${imgSrc}')` }}
            />
          ))}
          <div className="asr-bg-overlay" />
        </div>

        {/* Brand Logo in Top-Left Corner — No Box, Clean Float */}
        <header className="asr-header-left">
          <div className="asr-brand-badge">
            <Image
              src="/Groups Finalized.png"
              alt="ASR Groups Logo"
              width={70}
              height={70}
              className="asr-logo-img"
              priority
              unoptimized
            />
            <span className="asr-brand-title">ASR GROUPS</span>
          </div>
        </header>

        {/* Centered Compact Login Card */}
        <main className="asr-center-container">
          <div className="asr-login-card">
            {/* Card Header */}
            <div className="asr-card-header">
              <h2 className="asr-card-title">Sign In</h2>
              <p className="asr-card-subtitle">
                Enter your credentials to access the ASR portal
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="asr-form" noValidate>
              {/* Username Field */}
              <div
                className={`asr-field ${focusedField === "username" ? "asr-field--focused" : ""
                  } ${error && !form.username ? "asr-field--error" : ""}`}
              >
                <label htmlFor="asr-username" className="asr-label">
                  Username
                </label>
                <div className="asr-input-wrapper">
                  <User size={17} className="asr-input-icon" />
                  <input
                    id="asr-username"
                    name="username"
                    type="text"
                    placeholder="Enter username"
                    value={form.username}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                    className="asr-input-field"
                    disabled={loading || success}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div
                className={`asr-field ${focusedField === "password" ? "asr-field--focused" : ""
                  } ${error && !form.password ? "asr-field--error" : ""}`}
              >
                <label htmlFor="asr-password" className="asr-label">
                  Password
                </label>
                <div className="asr-input-wrapper">
                  <Lock size={17} className="asr-input-icon" />
                  <input
                    id="asr-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={form.password}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className="asr-input-field"
                    disabled={loading || success}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="asr-eye-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="asr-checkbox-row">
                <label className="asr-checkbox-label">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={form.rememberMe}
                    onChange={handleChange}
                    disabled={loading || success}
                  />
                  <span className="asr-checkbox-box" />
                  <span className="asr-checkbox-text">Keep me signed in</span>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="asr-error-alert" role="alert">
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className={`asr-submit-btn ${loading ? "asr-submit-btn--loading" : ""
                  } ${success ? "asr-submit-btn--success" : ""}`}
                disabled={loading || success}
              >
                <span className="asr-btn-shine" />
                {success ? (
                  <span>Access Granted...</span>
                ) : loading ? (
                  <>
                    <span className="asr-btn-spinner" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span className="asr-btn-text">Sign In</span>
                    <span className="asr-btn-icon-wrap">
                      <ArrowRight size={16} />
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        </main>

        {/* Footer */}
        <footer className="asr-footer">
          <span>© 2026 ASR Groups. All Rights Reserved.</span>
        </footer>
      </div>
    </div>
  );
}
