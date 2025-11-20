"use client";

import { useState, useEffect, useCallback } from "react";
import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import { useUser, useSignUp } from "@clerk/nextjs";
import { useUserData } from "@/context/userDataContext";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { Mail, KeyRound, User } from "lucide-react";
import { useTableNavigation } from "@/hooks/useTableNavigation";
import { useRestaurant } from "@/context/RestaurantContext";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [hasRedirected, setHasRedirected] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);

  const { user, isSignedIn, isLoaded: userLoaded } = useUser();
  const { signUp, isLoaded } = useSignUp();
  const { updateSignUpData } = useUserData();
  const { navigateWithTable } = useTableNavigation();

  const tableNumber = searchParams.get("table");

  // Store table number and restaurantId for post-signup redirect
  useEffect(() => {
    if (tableNumber) {
      console.log("🔍 SignUp: Storing payment flow context:", tableNumber);
      sessionStorage.setItem("pendingTableRedirect", tableNumber);
      sessionStorage.setItem("signupFromPaymentFlow", "true");
    } else {
      console.log("🔍 SignUp: No table number found in URL");
    }
    if (restaurantId) {
      sessionStorage.setItem("pendingRestaurantId", restaurantId);
      setRestaurantId(parseInt(restaurantId));
    }
  }, [tableNumber, restaurantId, setRestaurantId]);

  const handleSignUpSuccess = useCallback(() => {
    navigateWithTable("/payment-options");
  }, [navigateWithTable]);

  // Handle resend verification code
  const handleResendCode = useCallback(async () => {
    if (!signUp || resendCooldown > 0) return;

    try {
      console.log("🔄 Resending verification code...");
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      setResendAttempts((prev) => prev + 1);
      setResendCooldown(30); // 30 second cooldown

      console.log("✅ Verification code resent successfully");
    } catch (error) {
      console.error("❌ Error resending verification code:", error);
    }
  }, [signUp, resendCooldown]);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Note: Redirect handling is now managed in the root page (/)
  // to properly distinguish between payment flow vs payment-success contexts

  const handleContinueSubmit = async () => {
    // This function is handled by the dashboard sync now
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col justify-center items-center px-4">
      <div className="relative z-10 w-full max-w-md text-center flex flex-col items-center mb-12">
        <div className="mb-6">
          <img
            src="/logo-short-green.webp"
            alt="Xquisito Logo"
            className="size-18 justify-self-center"
          />
        </div>
        <div className="w-full">
          <SignUp.Root routing="virtual" path={`/${restaurantId}/sign-up`}>
            <SignUp.Step name="start">
              {/* Personal Information */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Clerk.Field name="firstName" className="space-y-1">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <Clerk.Input
                        required
                        className="w-full pl-10 pr-3 py-2 text-gray-600 border bg-white border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent"
                        placeholder="Nombre"
                      />
                    </div>
                    <Clerk.FieldError className="text-rose-400 text-xs" />
                  </Clerk.Field>

                  <Clerk.Field name="lastName" className="space-y-1">
                    <Clerk.Input
                      required
                      className="w-full px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent"
                      placeholder="Apellido"
                    />
                    <Clerk.FieldError className="text-rose-400 text-xs" />
                  </Clerk.Field>
                </div>

                <Clerk.Field name="emailAddress" className="space-y-1">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                    <Clerk.Input
                      required
                      type="email"
                      className="w-full pl-10 pr-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent"
                      placeholder="Email"
                    />
                  </div>
                  <Clerk.FieldError className="text-rose-400 text-xs" />
                </Clerk.Field>

                <Clerk.Field name="password" className="space-y-1 relative">
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                    <Clerk.Input
                      required
                      type="password"
                      className="w-full pl-10 pr-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent"
                      placeholder="Contraseña"
                    />
                  </div>
                  <Clerk.FieldError className="text-rose-400 text-xs" />
                </Clerk.Field>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      {/*<label className="block text-sm font-medium text-gray-700">Age *</label>*/}
                      <select
                        required
                        value={age}
                        onChange={(e) => {
                          setAge(e.target.value);
                          updateSignUpData({
                            age: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          });
                        }}
                        className="cursor-pointer w-full px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent"
                      >
                        <option value="" className="text-gray-600">
                          Edad
                        </option>
                        {Array.from({ length: 83 }, (_, i) => 18 + i).map(
                          (ageOption) => (
                            <option
                              key={ageOption}
                              value={ageOption}
                              className="text-gray-600"
                            >
                              {ageOption}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="space-y-2">
                      {/*<label className="block text-sm font-medium text-gray-700">Gender *</label>*/}
                      <select
                        required
                        value={gender}
                        onChange={(e) => {
                          setGender(e.target.value);
                          updateSignUpData({ gender: e.target.value || null });
                        }}
                        className="cursor-pointer w-full px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent"
                      >
                        <option value="" className="text-gray-600">
                          Género
                        </option>
                        <option value="male" className="text-gray-600">
                          Masculino
                        </option>
                        <option value="female" className="text-gray-600">
                          Femenino
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* CAPTCHA container */}
              <div id="clerk-captcha" className="mt-6"></div>

              <div className="flex items-center justify-center gap-3 mt-6">
                <SignUp.Action
                  submit
                  className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full cursor-pointer transition-colors"
                >
                  Crear cuenta
                </SignUp.Action>
              </div>

              <div
                className="text-white text-sm my-6 underline cursor-pointer"
                onClick={() => {
                  navigateWithTable("/user");
                }}
              >
                Continuar como invitado
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
                onClick={() => navigateWithTable("/sign-in")}
              >
                Iniciar sesión
              </div>
            </SignUp.Step>

            <SignUp.Step name="continue">
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-medium text-white mb-2">
                  Completa tu perfil
                </h1>
                <p className="text-gray-600">Cuéntanos mas sobre ti</p>
              </div>

              <SignUp.Action
                submit
                className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full font-normal cursor-pointer transition-colors mt-6"
                onSubmit={handleContinueSubmit}
              >
                Continue
              </SignUp.Action>
            </SignUp.Step>

            <SignUp.Step name="verifications">
              <SignUp.Strategy name="phone_code">
                <div className="mb-6 text-center">
                  <h1 className="text-2xl font-medium text-white mb-2">
                    Revisa tus mensajes
                  </h1>
                  <p className="text-gray-200">
                    Hemos enviado un código de verificación a tu teléfono
                  </p>
                </div>

                <Clerk.Field name="code" className="space-y-2">
                  <Clerk.Input
                    placeholder="Código"
                    className="w-full px-3 py-2 border bg-white text-black border-[#d9d9d9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a8b9b] focus:border-transparent text-center tracking-widest"
                  />
                  <Clerk.FieldError className="text-rose-400 text-xs" />
                </Clerk.Field>

                <SignUp.Action
                  submit
                  className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full font-normal cursor-pointer transition-colors mt-6"
                >
                  Verificar teléfono
                </SignUp.Action>
              </SignUp.Strategy>

              <SignUp.Strategy name="email_code">
                <div className="mb-6 text-center">
                  <h1 className="text-2xl font-medium text-white mb-2">
                    Revisa tu email
                  </h1>
                  <p className="text-gray-200">
                    Hemos enviado un código de verficación a tu correo
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

                <SignUp.Action
                  submit
                  className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full font-normal cursor-pointer transition-colors mt-6"
                >
                  Verificar Email
                </SignUp.Action>

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
                      <p>• Revisa tu carpeta de spam/correo no deseado</p>
                      <p>• Verifica que la dirección de email sea correcta</p>
                      <p>• Espera de 2-3 minutos para recibir el código</p>
                      <p>
                        • Intenta reenviar el código usando el botón de arriba
                      </p>
                    </div>
                  </details>
                </div>
              </SignUp.Strategy>
            </SignUp.Step>
          </SignUp.Root>
        </div>
      </div>
    </div>
  );
}
