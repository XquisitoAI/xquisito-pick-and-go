"use client";

import { useState, Suspense, useEffect, useCallback } from "react";
import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { useRouter, useSearchParams } from "next/navigation";
import { ScanFace, Mail, KeyRound } from "lucide-react";
import { useTableNavigation } from "@/hooks/useTableNavigation";
import { useUser, useSignIn } from "@clerk/nextjs";
import { usePasskeySupport } from "@/hooks/usePasskeySupport";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { navigateWithTable } = useTableNavigation();
  const { isSignedIn, isLoaded } = useUser();
  const [hasRedirected, setHasRedirected] = useState(false);
  const { signIn } = useSignIn();
  const [forgotPasswordStep, setForgotPasswordStep] = useState<
    "idle" | "email" | "code" | "password"
  >("idle");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState("");
  const { isSupported: passkeySupported } = usePasskeySupport();

  const tableNumber = searchParams.get("table");

  // Store table number and remember me preference for post-signin redirect
  useEffect(() => {
    if (tableNumber) {
      sessionStorage.setItem("pendingTableRedirect", tableNumber);
    }
    // Store remember me preference
    localStorage.setItem("rememberMe", rememberMe.toString());
  }, [tableNumber, rememberMe]);

  const handleSignInSuccess = useCallback(() => {
    navigateWithTable("/card-selection");
  }, [navigateWithTable]);

  useEffect(() => {
    if (isLoaded && isSignedIn && !hasRedirected) {
      setHasRedirected(true);
      // Prevent any automatic navigation by Clerk
      const timer = setTimeout(() => {
        handleSignInSuccess();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, isSignedIn, hasRedirected, handleSignInSuccess]);

  // Intercept if user gets redirected to root after sign-in
  useEffect(() => {
    if (
      isSignedIn &&
      tableNumber &&
      window.location.pathname === "/" &&
      !hasRedirected
    ) {
      setHasRedirected(true);
      handleSignInSuccess();
    }
  }, [isSignedIn, tableNumber, hasRedirected, handleSignInSuccess]);

  const handleForgotPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn?.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setForgotPasswordStep("code");
      setError("");
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Error al enviar el código");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordStep("password");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn?.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });
      setForgotPasswordStep("idle");
      setError("");
      alert("Contraseña actualizada exitosamente");
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Error al actualizar la contraseña");
    }
  };

  const handlePasskeySignIn = async () => {
    if (!passkeySupported) {
      setPasskeyError("Tu navegador no soporta autenticación biométrica");
      return;
    }

    setPasskeyLoading(true);
    setPasskeyError("");

    try {
      await signIn?.authenticateWithPasskey();
      // El usuario será redirigido automáticamente por los useEffect existentes
    } catch (err: any) {
      console.error("Error en autenticación con Passkey:", err);

      // Mensajes de error en español
      if (err.code === "passkey_not_found") {
        setPasskeyError(
          "No tienes ninguna llave de acceso registrada. Registra una desde tu perfil."
        );
      } else if (err.code === "passkey_cancelled") {
        setPasskeyError("Autenticación cancelada");
      } else if (err.message?.includes("not allowed")) {
        setPasskeyError("Autenticación no permitida. Intenta nuevamente.");
      } else {
        setPasskeyError(
          err.errors?.[0]?.message || "Error en autenticación biométrica"
        );
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  if (forgotPasswordStep !== "idle") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col justify-center items-center px-4">
        <div className="relative z-10 w-full max-w-md text-center flex flex-col items-center">
          <div className="mb-6">
            <img
              src="/logos/logo-short-green.webp"
              alt="Xquisito Logo"
              className="size-18 justify-self-center"
            />
          </div>
          <div className="w-full">
            {forgotPasswordStep === "email" && (
              <form onSubmit={handleForgotPasswordEmail}>
                <div className="mb-6 text-center">
                  <h1 className="text-xl font-medium text-white mb-2">
                    Recupera tu contraseña
                  </h1>
                  <p className="text-gray-200 text-sm">
                    Ingresa tu email para recibir un código
                  </p>
                </div>

                <div className="relative mb-4">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent"
                    placeholder="Email"
                  />
                </div>

                {error && <p className="text-rose-400 text-xs mb-4">{error}</p>}

                <button
                  type="submit"
                  className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full cursor-pointer transition-colors"
                >
                  Enviar código
                </button>

                <button
                  type="button"
                  onClick={() => setForgotPasswordStep("idle")}
                  className="text-white text-sm underline cursor-pointer mt-4 block text-center w-full"
                >
                  Volver al inicio de sesión
                </button>
              </form>
            )}

            {forgotPasswordStep === "code" && (
              <form onSubmit={handleVerifyCode}>
                <div className="mb-6 text-center">
                  <h1 className="text-xl font-medium text-white mb-2">
                    Revisa tu email
                  </h1>
                  <p className="text-gray-200 text-sm">
                    Hemos enviado un código de verificación a {email}
                  </p>
                </div>

                <input
                  required
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 border bg-white text-black border-[#d9d9d9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent text-center tracking-widest mb-4"
                  placeholder="Código"
                />

                <button
                  type="submit"
                  className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full cursor-pointer transition-colors"
                >
                  Continuar
                </button>
              </form>
            )}

            {forgotPasswordStep === "password" && (
              <form onSubmit={handleResetPassword}>
                <div className="mb-6 text-center">
                  <h1 className="text-xl font-medium text-white mb-2">
                    Nueva contraseña
                  </h1>
                  <p className="text-gray-200 text-sm">
                    Ingresa tu nueva contraseña
                  </p>
                </div>

                <div className="relative mb-4">
                  <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                  <input
                    required
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent"
                    placeholder="Nueva contraseña"
                  />
                </div>

                {error && <p className="text-rose-400 text-xs mb-4">{error}</p>}

                <button
                  type="submit"
                  className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full cursor-pointer transition-colors"
                >
                  Actualizar contraseña
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col justify-center items-center px-4">
      <div className="relative z-10 w-full max-w-md text-center flex flex-col items-center mb-12">
        <div className="mb-6">
          <img
            src="/logos/logo-short-green.webp"
            alt="Xquisito Logo"
            className="size-18 justify-self-center"
          />
        </div>
        <div className="w-full">
          <SignIn.Root routing="virtual">
            <SignIn.Step name="start">
              <div className="mb-6 text-center">
                <h1 className="text-xl font-medium text-white mb-2">
                  Accede a tu cuenta de Xquisito
                </h1>
              </div>

              <div className="space-y-3">
                <Clerk.Field name="identifier" className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                    <Clerk.Input
                      required
                      type="email"
                      autoComplete="username email"
                      className="w-full pl-10 pr-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent"
                      placeholder="Email"
                    />
                  </div>
                  <Clerk.FieldError className="text-rose-400 text-xs" />
                </Clerk.Field>

                <Clerk.Field name="password" className="space-y-2">
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                    <Clerk.Input
                      required
                      type="password"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent"
                      placeholder="Contraseña"
                    />
                  </div>
                  <Clerk.FieldError className="text-rose-400 text-xs" />
                </Clerk.Field>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#0a8b9b] bg-white border-gray-300 rounded focus:ring-[#0a8b9b] focus:ring-2 cursor-pointer"
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-2 text-sm text-white cursor-pointer"
                >
                  Mantener sesión activa
                </label>
              </div>

              {passkeyError && (
                <div className="text-rose-400 text-xs mb-4 text-center">
                  {passkeyError}
                </div>
              )}

              <div className="flex items-center justify-center gap-3 mt-5">
                <SignIn.Action
                  submit
                  className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full cursor-pointer transition-colors"
                >
                  Iniciar sesión
                </SignIn.Action>
                {passkeySupported && (
                  <button
                    type="button"
                    onClick={handlePasskeySignIn}
                    disabled={passkeyLoading}
                    className={`p-3 border border-white hover:bg-white/10 rounded-full transition-colors ${
                      passkeyLoading
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    title="Iniciar sesión con Face ID / Touch ID / Windows Hello"
                  >
                    {passkeyLoading ? (
                      <div className="size-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ScanFace className="size-6" />
                    )}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setForgotPasswordStep("email")}
                className="text-white text-sm underline cursor-pointer mt-6 mb-2 block mx-auto"
              >
                Olvidaste tu contraseña
              </button>

              <div className="mb-6">
                <div
                  className="text-white text-sm underline cursor-pointer text-center"
                  onClick={() => {
                    navigateWithTable("/user");
                  }}
                >
                  Continuar como invitado
                </div>
              </div>

              {/* Social Login */}
              <div className="flex items-center justify-center gap-12">
                <Clerk.Connection
                  name="google"
                  className="p-3 border border-white rounded-full hover:bg-white/10 transition-colors font-medium cursor-pointer"
                >
                  <svg className="size-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </Clerk.Connection>

                <Clerk.Connection
                  name="microsoft"
                  className="p-3 border border-white rounded-full hover:bg-white/10 transition-colors font-medium cursor-pointer"
                >
                  <svg className="size-6" viewBox="0 0 24 24">
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M13 1h10v10H13z" />
                    <path fill="#05a6f0" d="M1 13h10v10H1z" />
                    <path fill="#ffba08" d="M13 13h10v10H13z" />
                  </svg>
                </Clerk.Connection>

                <Clerk.Connection
                  name="facebook"
                  className="p-3 border border-white rounded-full hover:bg-white/10 transition-colors font-medium cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-6"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#1877F2"
                      d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z"
                    />
                    <path
                      fill="#fff"
                      d="M16.671 15.47L17.203 12h-3.328V9.749c0-.949.465-1.874 1.956-1.874h1.513V4.922s-1.374-.234-2.686-.234c-2.741 0-4.533 1.66-4.533 4.668V12H7.078v3.47h3.047v8.385a12.09 12.09 0 003.75 0V15.47h2.796z"
                    />
                  </svg>
                </Clerk.Connection>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center pr-5">
                  <div className="w-1/2 border-t border-white" />
                </div>
                <div className="absolute inset-0 flex items-center  justify-end pl-5">
                  <div className="w-1/2 border-t border-white" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 text-white">ó</span>
                </div>
              </div>

              <div
                className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full font-normal cursor-pointer transition-colors"
                onClick={() => {
                  navigateWithTable("/sign-up");
                }}
              >
                Crear cuenta
              </div>
            </SignIn.Step>
          </SignIn.Root>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
