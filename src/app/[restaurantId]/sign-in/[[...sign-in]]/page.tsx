"use client";

import { useState, Suspense, useEffect, useCallback } from "react";
import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { useRouter, useSearchParams } from "next/navigation";
import { ScanFace, Phone, ArrowLeft } from "lucide-react";
import { useNavigation } from "@/hooks/useNavigation";
import { useUser, useSignIn } from "@clerk/nextjs";
import { usePasskeySupport } from "@/hooks/usePasskeySupport";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { navigateWithRestaurantId } = useNavigation();
  const { isSignedIn, isLoaded } = useUser();
  const [hasRedirected, setHasRedirected] = useState(false);
  const { signIn } = useSignIn();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState("");
  const { isSupported: passkeySupported } = usePasskeySupport();
  const [countryCode, setCountryCode] = useState("+52");
  const [phoneNumber, setPhoneNumber] = useState("");

  const tableNumber = searchParams.get("table");

  // Store table number for post-signin redirect
  useEffect(() => {
    if (tableNumber) {
      sessionStorage.setItem("pendingTableRedirect", tableNumber);
    }
  }, [tableNumber]);

  const handleSignInSuccess = useCallback(() => {
    navigateWithRestaurantId("/card-selection");
  }, [navigateWithRestaurantId]);

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

  // Handle resend verification code
  const handleResendCode = useCallback(async () => {
    if (!signIn || resendCooldown > 0) return;

    try {
      console.log("🔄 Resending verification code...");
      const phoneCodeFactor = signIn.supportedFirstFactors?.find(
        (f) => f.strategy === "phone_code"
      );

      if (phoneCodeFactor && "phoneNumberId" in phoneCodeFactor) {
        await signIn.prepareFirstFactor({
          strategy: "phone_code",
          phoneNumberId: phoneCodeFactor.phoneNumberId,
        });

        setResendAttempts((prev) => prev + 1);
        setResendCooldown(30); // 30 second cooldown

        console.log("✅ Verification code resent successfully");
      }
    } catch (error) {
      console.error("❌ Error resending verification code:", error);
    }
  }, [signIn, resendCooldown]);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col justify-center items-center px-4">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 md:top-6 lg:top-8 left-4 md:left-6 lg:left-8 p-2 md:p-3 text-white hover:bg-white/10 rounded-full transition-colors z-20"
      >
        <ArrowLeft className="size-5 md:size-6 lg:size-7" />
      </button>

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
                <div className="space-y-2">
                  <div className="relative flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-24 px-2 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent cursor-pointer"
                    >
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+52">🇲🇽 +52</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+39">🇮🇹 +39</option>
                      <option value="+54">🇦🇷 +54</option>
                      <option value="+56">🇨🇱 +56</option>
                      <option value="+57">🇨🇴 +57</option>
                    </select>
                    <Clerk.Field name="identifier" className="flex-1">
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                        <Clerk.Input
                          required
                          type="tel"
                          value={countryCode + phoneNumber}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Remove country code if present
                            const withoutCode = value.replace(countryCode, '');
                            setPhoneNumber(withoutCode);
                          }}
                          className="w-full pl-10 pr-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent"
                          placeholder={`${countryCode} Número de teléfono`}
                        />
                      </div>
                      <Clerk.FieldError className="text-rose-400 text-xs mt-1" />
                    </Clerk.Field>
                  </div>
                </div>
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
                  Continuar
                </SignIn.Action>
                {/*
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
                )}*/}
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
                  navigateWithRestaurantId("/sign-up");
                }}
              >
                Crear cuenta
              </div>
            </SignIn.Step>

            <SignIn.Step name="verifications">
              <SignIn.Strategy name="phone_code">
                <div className="mb-6 text-center">
                  <h1 className="text-2xl font-medium text-white mb-2">
                    Revisa tus mensajes
                  </h1>
                  <p className="text-gray-200">
                    Hemos enviado un código de verificación a tu teléfono
                  </p>
                  {resendAttempts > 0 && (
                    <p className="text-green-200 text-sm mt-2">
                      Código reenviado {resendAttempts}{" "}
                      {resendAttempts === 1 ? "vez" : "veces"}
                    </p>
                  )}
                </div>

                <Clerk.Field name="code" className="space-y-2">
                  <Clerk.Input
                    placeholder="Código"
                    className="w-full px-3 py-2 border bg-white text-black border-[#d9d9d9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent text-center tracking-widest"
                  />
                  <Clerk.FieldError className="text-rose-400 text-xs" />
                </Clerk.Field>

                <SignIn.Action
                  submit
                  className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full font-normal cursor-pointer transition-colors mt-6"
                >
                  Verificar teléfono
                </SignIn.Action>

                {/* Resend Code Button */}
                <div className="mt-4 text-center">
                  <button
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0}
                    className={`text-sm underline transition-colors ${
                      resendCooldown > 0
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-white hover:text-gray-200 cursor-pointer"
                    }`}
                  >
                    {resendCooldown > 0
                      ? `Reenviar código en ${resendCooldown}s`
                      : "¿No recibiste el código? Reenviar"}
                  </button>
                </div>

                {/* Troubleshooting Tips */}
                <div className="mt-4 text-center">
                  <details className="text-xs text-gray-300">
                    <summary className="cursor-pointer hover:text-white">
                      ¿Problemas para recibir el código?
                    </summary>
                    <div className="mt-2 text-left space-y-1">
                      <p>• Verifica que el número de teléfono sea correcto</p>
                      <p>• Espera de 1-2 minutos para recibir el SMS</p>
                      <p>• Revisa que tu teléfono tenga señal</p>
                      <p>
                        • Intenta reenviar el código usando el botón de arriba
                      </p>
                    </div>
                  </details>
                </div>
              </SignIn.Strategy>
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
