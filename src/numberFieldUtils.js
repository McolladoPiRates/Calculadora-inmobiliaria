export function clampWithError(n, min, max) {
  let value = n;
  let err = "";
  if (Number.isFinite(n)) {
    if (max !== undefined && n > max) {
      value = max;
      err = `El valor no puede ser mayor que ${max}`;
    } else if (min !== undefined && n < min) {
      value = min;
      err = `El valor no puede ser menor que ${min}`;
    }
  }
  return { value, err };
}

