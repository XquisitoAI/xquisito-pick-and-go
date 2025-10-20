export interface OpeningHours {
  [key: string]: {
    is_closed: boolean;
    open_time: string;
    close_time: string;
  };
}

export function isRestaurantOpen(
  openingHours: OpeningHours | null | undefined
): boolean {
  if (!openingHours) {
    return true;
  }

  const now = new Date();
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const currentDay = dayNames[now.getDay()];

  const todayHours = openingHours[currentDay];

  if (!todayHours) {
    return true;
  }

  if (todayHours.is_closed) {
    return false;
  }

  // Hora actual
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Hora de apertura
  const [openHour, openMinute] = todayHours.open_time.split(":").map(Number);
  const openTimeInMinutes = openHour * 60 + openMinute;

  // Hora de cierre
  const [closeHour, closeMinute] = todayHours.close_time.split(":").map(Number);
  const closeTimeInMinutes = closeHour * 60 + closeMinute;

  // Validar si esta abierto actualmente
  return (
    currentTimeInMinutes >= openTimeInMinutes &&
    currentTimeInMinutes < closeTimeInMinutes
  );
}

// A que hora abren?
export function getNextOpeningTime(
  openingHours: OpeningHours | null | undefined
): string {
  if (!openingHours) {
    return "";
  }

  const now = new Date();
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayNamesSpanish = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];
  const currentDay = now.getDay();

  // Validar si ya esta abierto hoy
  const todayHours = openingHours[dayNames[currentDay]];
  if (todayHours && !todayHours.is_closed) {
    const [openHour, openMinute] = todayHours.open_time.split(":").map(Number);
    const openTimeInMinutes = openHour * 60 + openMinute;
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentTimeInMinutes < openTimeInMinutes) {
      return `Abre hoy a las ${todayHours.open_time}`;
    }
  }

  // Validar los proximos 7 dias
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDay + i) % 7;
    const nextDayName = dayNames[nextDayIndex];
    const nextDayHours = openingHours[nextDayName];

    if (nextDayHours && !nextDayHours.is_closed) {
      const dayLabel = i === 1 ? "mañana" : dayNamesSpanish[nextDayIndex];
      return `Abre ${dayLabel} a las ${nextDayHours.open_time}`;
    }
  }

  return "Actualmente cerrado";
}
