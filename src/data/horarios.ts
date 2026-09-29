export const horarios: string[] = [];

for (let minutos = 8 * 60; minutos <= 18 * 60; minutos += 5) {
  const hora = Math.floor(minutos / 60)
    .toString()
    .padStart(2, "0");

  const minuto = (minutos % 60).toString().padStart(2, "0");

  horarios.push(`${hora}:${minuto}`);
}
