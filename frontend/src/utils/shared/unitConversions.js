export function metersPerSecondToKmh(value) {
  return Number(value) * 3.6;
}

export function accelerationToForce(value, bodyMassKg) {
  return scaleByMass(value, bodyMassKg);
}

export function scaleByMass(value, bodyMassKg) {
  return Number(value) * Number(bodyMassKg);
}
