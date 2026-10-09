import cities from "./cities.json";
import states from "./states.json";
export { states };
export const municipalities = cities;
const byId = new Map(cities.map((city) => [city.id, city]));
export function municipality(id: string) {
  return byId.get(id);
}
export { normalizePlace } from "./text";
export function deliveryRegion(state: string, cityId: string) {
  const city = municipality(cityId);
  if (!city || city.state !== state)
    throw new Error("Selecione uma cidade válida do estado escolhido.");
  return {
    deliveryState: state,
    deliveryCityId: city.id,
    deliveryCity: city.name,
  };
}
