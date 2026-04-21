import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const households = await getCollection('households');
  const data = households
    .map((h) => ({
      number: h.data.number,
      slug: h.id,
      household_name: h.data.household_name,
      family: h.data.family,
      founder: h.data.founder,
      estimated_position: h.data.estimated_position,
      occupants_1861: h.data.occupants_1861,
      position: h.data.position,
      polygon: h.data.polygon,
    }))
    .sort((a, b) => a.number - b.number);
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};
