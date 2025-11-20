"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  User,
  Mail,
  Camera,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Phone,
  X,
  LogOut,
} from "lucide-react";

export default function ProfileTab() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState("");

  useEffect(() => {
    const loadUserData = async () => {
      if (!user || !isLoaded) return;

      try {
        setIsLoadingData(true);

        // Actualizar clerk
        setFirstName(user.firstName || "");
        setLastName(user.lastName || "");
        setPhone(user.phoneNumbers?.[0]?.phoneNumber || "");
        setAge((user.unsafeMetadata?.age as number) || null);
        setGender((user.unsafeMetadata?.gender as string) || "");

        // Traer la info de backend mas actualizada
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/${user.id}`
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.user) {
            // Actualizar datos a backend
            setAge(result.user.age || null);
            setGender(result.user.gender || "");
            setPhone(
              result.user.phone || user.phoneNumbers?.[0]?.phoneNumber || ""
            );
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadUserData();
  }, [user, isLoaded]);

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsUpdating(true);
    try {
      // Actualizar datos de clerk
      await user.update({
        firstName: firstName,
        lastName: lastName,
        unsafeMetadata: {
          ...user.unsafeMetadata,
          age: age,
          gender: gender,
        },
      });

      // Actualizar datos a base de datos
      const userData = {
        clerkUserId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        firstName: firstName,
        lastName: lastName,
        age: age,
        gender: gender,
        phone: phone,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (result.success) {
        await user.reload();

        setFirstName(firstName);
        setLastName(lastName);
        setAge(age);
        setGender(gender);
        setPhone(phone);

        alert("Perfil actualizado correctamente");
      } else {
        throw new Error("Error al actualizar en el backend");
      }
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
      alert("Error al actualizar el perfil");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    setIsUpdating(true);

    try {
      await user.setProfileImage({ file });
      alert("Foto actualizada correctamente");
    } catch (error) {
      console.error("Error al actualizar la foto:", error);
      alert("Error al actualizar la foto");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Por favor completa todos los campos de contraseña");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Las contraseñas nuevas no coinciden");
      return;
    }

    if (newPassword.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (!user.passwordEnabled) {
        alert(
          "No puedes cambiar la contraseña porque tu cuenta fue creada con un proveedor social (Google, Facebook, etc.)"
        );
        setIsUpdatingPassword(false);
        return;
      }

      try {
        const emailAddress = user.primaryEmailAddress?.emailAddress;

        if (!emailAddress) {
          alert("No se pudo verificar tu email. Por favor intenta nuevamente.");
          return;
        }

        await fetch("/api/verify-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: emailAddress,
            password: currentPassword,
          }),
        });
      } catch (verifyError) {
        console.log("Re-authentication attempt:", verifyError);
      }

      // Actualizar password
      await user.updatePassword({
        currentPassword: currentPassword,
        newPassword: newPassword,
        signOutOfOtherSessions: false,
      });

      alert("Contraseña actualizada correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordModalOpen(false);
    } catch (error: any) {
      console.error("Error al actualizar la contraseña:", error);

      // Error messages
      if (error.errors && error.errors[0]?.message) {
        const errorMessage = error.errors[0].message;
        const errorCode = error.errors[0]?.code;

        if (
          errorMessage.includes("verification") ||
          errorCode === "form_password_incorrect"
        ) {
          alert(
            "La contraseña actual es incorrecta. Por favor verifica e intenta nuevamente."
          );
        } else if (
          errorMessage.includes("current_password_invalid") ||
          errorMessage.includes("incorrect")
        ) {
          alert(
            "La contraseña actual es incorrecta. Por favor verifica e intenta nuevamente."
          );
        } else if (errorMessage.includes("password_pwned")) {
          alert(
            "Esta contraseña ha sido encontrada en filtraciones de datos y no es segura. Por favor elige otra contraseña."
          );
        } else if (errorMessage.includes("password_too_common")) {
          alert(
            "Esta contraseña es muy común. Por favor elige una contraseña más segura."
          );
        } else {
          alert(errorMessage);
        }
      } else if (error.message) {
        alert(error.message);
      } else {
        alert(
          "Error al actualizar la contraseña. Verifica tu contraseña actual e intenta nuevamente."
        );
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!isLoaded || !user || isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Profile Image */}
      <div className="flex flex-col items-center">
        <div className="relative group mb-4">
          <div className="size-28 rounded-full bg-gray-200 overflow-hidden border-2 border-teal-600">
            <img
              src={user.imageUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <label
            htmlFor="profile-image"
            className="absolute bottom-0 right-0 bg-teal-600 text-white p-2 rounded-full cursor-pointer hover:bg-teal-700 transition-colors"
          >
            <Camera className="size-4" />
            <input
              id="profile-image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUpdating}
            />
          </label>
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2 mb-4">
        <label className="gap-1.5 flex items-center text-sm text-gray-700">
          <Mail className="size-3.5" />
          Correo electrónico
        </label>
        <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
          {user.primaryEmailAddress?.emailAddress}
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        {/* Nombre */}
        <div className="space-y-2 flex-1">
          <label className="gap-1.5 flex items-center text-sm text-gray-700">
            <User className="size-3.5" />
            Nombre
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Tu nombre"
            className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-teal-500 focus:border-transparent"
            disabled={isUpdating}
          />
        </div>

        {/* Apellido */}
        <div className="space-y-2 flex-1">
          <label className="gap-1.5 flex items-center text-sm text-gray-700">
            <User className="size-3.5" />
            Apellido
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Tu apellido"
            className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-teal-500 focus:border-transparent"
            disabled={isUpdating}
          />
        </div>
      </div>

      {/* Telefono */}
      <div className="space-y-2 mb-4">
        <label className="gap-1.5 flex items-center text-sm text-gray-700">
          <Phone className="size-3.5" />
          Telefono
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="123 456 7890"
          className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-teal-500 focus:border-transparent"
          disabled={isUpdating}
        />
      </div>

      <div className="flex gap-4 mb-6">
        {/* Edad */}
        <div className="space-y-2 flex-1">
          <label className="gap-1.5 flex items-center text-sm text-gray-700">
            Edad
          </label>
          <select
            value={age || ""}
            onChange={(e) =>
              setAge(e.target.value ? parseInt(e.target.value) : null)
            }
            className="cursor-pointer w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-teal-500 focus:border-transparent"
            disabled={isUpdating}
          >
            <option value="">Tu edad</option>
            {Array.from({ length: 83 }, (_, i) => 18 + i).map((ageOption) => (
              <option key={ageOption} value={ageOption}>
                {ageOption}
              </option>
            ))}
          </select>
        </div>

        {/* Genero */}
        <div className="space-y-2 flex-1">
          <label className="gap-1.5 flex items-center text-sm text-gray-700">
            Género
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="cursor-pointer w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-teal-500 focus:border-transparent"
            disabled={isUpdating}
          >
            <option value="">Tu género</option>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
          </select>
        </div>
      </div>

      {/* Password Change Link and Logout */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsPasswordModalOpen(true)}
          className="text-teal-600 hover:text-teal-700 font-medium text-sm flex items-center gap-2 cursor-pointer"
        >
          <Lock className="size-4" />
          Cambiar contraseña
        </button>
        <button
          onClick={() => signOut()}
          className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </button>
      </div>

      {/* Update Button */}
      <button
        onClick={handleUpdateProfile}
        disabled={isUpdating}
        className="mt-6 bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full cursor-pointer transition-colors disabled:bg-stone-600 disabled:cursor-not-allowed"
      >
        {isUpdating ? (
          <div className="flex items-center justify-center gap-1">
            <Loader2 className="size-5 animate-spin" />
            Actualizando...
          </div>
        ) : (
          "Guardar cambios"
        )}
      </button>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: 99999 }}
        >
          {/* Fondo */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsPasswordModalOpen(false)}
          ></div>

          <div className="relative bg-white rounded-t-4xl w-full mx-4 p-6">
            {/* Close Button */}
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="size-5" />
            </button>

            {/* Modal Title */}
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              Cambiar contraseña
            </h3>

            {/* Current Password */}
            <div className="space-y-2 mb-4">
              <label className="gap-1.5 flex items-center text-sm text-gray-700">
                <Lock className="size-3.5" />
                Contraseña actual
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña actual"
                  className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-teal-500 focus:border-transparent"
                  disabled={isUpdatingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2 mb-4">
              <label className="gap-1.5 flex items-center text-sm text-gray-700">
                <Lock className="size-3.5" />
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ingresa tu nueva contraseña"
                  className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-teal-500 focus:border-transparent"
                  disabled={isUpdatingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 -translate-y-1">
                Debe tener al menos 8 caracteres
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="gap-1.5 flex items-center text-sm text-gray-700">
                <Lock className="size-3.5" />
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma tu nueva contraseña"
                  className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-teal-500 focus:border-transparent"
                  disabled={isUpdatingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Update Password Button */}
            <button
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword}
              className="mt-6 bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full cursor-pointer transition-colors disabled:bg-stone-600 disabled:cursor-not-allowed"
            >
              {isUpdatingPassword ? (
                <div className="flex items-center justify-center gap-1">
                  <Loader2 className="size-5 animate-spin" />
                  Actualizando contraseña...
                </div>
              ) : (
                "Cambiar contraseña"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
