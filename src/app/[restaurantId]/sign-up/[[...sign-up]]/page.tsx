"use client";

import { useState, useEffect, useCallback } from "react";
import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import { useUser, useSignUp } from "@clerk/nextjs";
import { useUserData } from "@/context/userDataContext";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { Phone, User, ArrowLeft } from "lucide-react";
import { useNavigation } from "@/hooks/useNavigation";
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
  const [countryCode, setCountryCode] = useState("+52");
  const [phoneNumber, setPhoneNumber] = useState("");

  const { user, isSignedIn, isLoaded: userLoaded } = useUser();
  const { signUp, isLoaded } = useSignUp();
  const { updateSignUpData } = useUserData();
  const { navigateWithRestaurantId } = useNavigation();

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
    navigateWithRestaurantId("/payment-options");
  }, [navigateWithRestaurantId]);

  // Handle resend verification code
  const handleResendCode = useCallback(async () => {
    if (!signUp || resendCooldown > 0) return;

    try {
      console.log("🔄 Resending verification code...");
      await signUp.preparePhoneNumberVerification();

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

                <div className="space-y-1">
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
                    <Clerk.Field name="phoneNumber" className="flex-1">
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

              <div className="flex items-center justify-center gap-3 my-6">
                <SignUp.Action
                  submit
                  className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full cursor-pointer transition-colors"
                >
                  Crear cuenta
                </SignUp.Action>
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
                onClick={() => navigateWithRestaurantId("/sign-in")}
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
                  Verificar teléfono
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
                      <p>• Verifica que el número de teléfono sea correcto</p>
                      <p>• Espera de 1-2 minutos para recibir el SMS</p>
                      <p>• Revisa que tu teléfono tenga señal</p>
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
