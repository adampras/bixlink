/** Shared, lightweight onboarding rules; mirrored by bixgo_driver_application_valid. */
export function validDriverApplication(form: { full_name: string; phone: string; vehicle_model: string; plate: string }, safe: boolean): boolean {
  const name = form.full_name.trim().length;
  const phone = form.phone.replace(/\D/g, '').length;
  const model = form.vehicle_model.trim().length;
  const plate = form.plate.trim().length;
  return safe && name >= 2 && name <= 80 && phone >= 8 && phone <= 15 && model >= 2 && model <= 60 && plate >= 3 && plate <= 20;
}

export function tripNavigation(address: string, lat?: number | null, lng?: number | null): string {
  const coordinates = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates ? `${lat},${lng}` : address)}&travelmode=driving`;
}

export function chatCanSend(status: string): boolean { return status === 'assigned' || status === 'in_transit'; }

export function shouldAlertNewOrders(primed: boolean, online: boolean, freshCount: number): boolean {
  return primed && online && freshCount > 0;
}