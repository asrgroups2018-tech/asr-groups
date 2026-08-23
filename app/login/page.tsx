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

export default function LoginPage() {
  const router = useRouter();
  
  // Animation state phases: 'centered' -> 'splitting' -> 'complete'
  const [animPhase, setAnimPhase] = useState<"centered" | "splitting" | "complete">("centered");
  
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

  useEffect(() => {
    // Hold big centered splash logo for 1.2s
    const t1 = setTimeout(() => {
      setAnimPhase("splitting");
    }, 1200);

    // Complete smooth entrance at 2.1s
    const t2 = setTimeout(() => {
      setAnimPhase("complete");
    }, 2100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

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
      }, 500);
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
      setLoading(false);
    }
  };

  return (
    <div className={`asr-login-root asr-phase-${animPhase}`}>
      {/* Huge HD Center Splash Intro Overlay */}
      <div className="asr-center-intro">
        <div className="asr-center-badge">
          <Image
            src="/Groups Finalized.png"
            alt="ASR Groups Logo"
            width={190}
            height={190}
            className="asr-center-logo-img"
            priority
            unoptimized
          />
        </div>
        <h1 className="asr-center-title">ASR GROUPS</h1>
        <p className="asr-center-sub">FINANCE</p>
      </div>

      {/* Main 50/50 Split View Layout */}
      <div className="asr-split-layout">
        {/* Left Half: Building Visual Hero */}
        <div className="asr-left-half">
          <Image
            src="/login-bg.png"
            alt="ASR Headquarters Building"
            fill
            className="asr-visual-bg"
            priority
          />
          <div className="asr-visual-overlay" />

          <div className="asr-left-content">
            {/* BIG BOLD SQUARE LOGO in Top Left Corner */}
            <div className="asr-left-brand">
              <div className="asr-left-logo-square">
                <Image
                  src="/Groups Finalized.png"
                  alt="ASR Groups Logo"
                  width={104}
                  height={104}
                  className="asr-left-logo-img"
                  priority
                  unoptimized
                />
              </div>
              <div className="asr-left-brand-text">
                <span className="asr-left-title">ASR GROUPS</span>
                <span className="asr-left-subtitle">FINANCE</span>
              </div>
            </div>

            {/* Middle Title */}
            <div className="asr-left-hero-text">
              <h1 className="asr-hero-title">
                Precision & Excellence in Financial Operations
              </h1>
            </div>

            {/* Left Footer Copyright */}
            <div className="asr-left-footer">
              <span>© 2026 ASR Groups. All Rights Reserved.</span>
            </div>
          </div>
        </div>

        {/* Right Half: Sign In Form Panel */}
        <div className="asr-right-half">
          <div className="asr-card">
            {/* Card Header */}
            <div className="asr-card-header">
              <h2 className="asr-card-title">Sign In</h2>
              <p className="asr-card-subtitle">
                Enter your credentials to access your account
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="asr-form" noValidate>
              {/* Username Input */}
              <div
                className={`asr-field ${
                  focusedField === "username" ? "asr-field--focused" : ""
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
                    placeholder="Enter your username"
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

              {/* Password Input */}
              <div
                className={`asr-field ${
                  focusedField === "password" ? "asr-field--focused" : ""
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
                    placeholder="Enter your password"
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

              {/* Keep Me Signed In Checkbox */}
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

              {/* Error Banner */}
              {error && (
                <div className="asr-error-alert" role="alert">
                  <span>{error}</span>
                </div>
              )}

              {/* Creative Gold Shimmer Submit Button */}
              <button
                type="submit"
                className={`asr-submit-btn ${
                  loading ? "asr-submit-btn--loading" : ""
                } ${success ? "asr-submit-btn--success" : ""}`}
                disabled={loading || success}
              >
                <span className="asr-btn-shine" />
                {success ? (
                  <span>Access Granted — Launching...</span>
                ) : loading ? (
                  <>
                    <span className="asr-btn-spinner" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span className="asr-btn-text">Access Dashboard</span>
                    <span className="asr-btn-icon-wrap">
                      <ArrowRight size={16} />
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
