export const SERVICES = [
  {
    id: 'consultation',
    name: 'Wellness Consultation',
    price: 65,
    minutes: 45,
    image: '/images/service-consultation.jpg',
    alt: 'A relaxed, personal conversation in a welcoming space',
    description: 'A thoughtful conversation about your routines and goals. Together, we find a comfortable place to start.',
  },
  {
    id: 'facial',
    name: 'Facial Treatment',
    price: 95,
    minutes: 60,
    image: '/images/service-facial.jpg',
    alt: 'A client receiving a gentle facial treatment',
    description: 'Gentle, intentional skincare tailored to you. Leave with refreshed skin and a little more time for yourself.',
  },
  {
    id: 'massage',
    name: 'Therapeutic Massage',
    price: 110,
    minutes: 60,
    image: '/images/service-massage.jpg',
    alt: 'Therapist providing a relaxing back massage',
    description: 'A moment to soften and unwind. Your therapist adapts the pressure and focus to what feels right for you.',
  },
  {
    id: 'acupuncture',
    name: 'Acupuncture',
    price: 85,
    minutes: 50,
    image: '/images/service-acupuncture.jpg',
    alt: 'A quiet wellness moment surrounded by soft natural light',
    description: 'An individualized session in a peaceful setting, with time to talk through the process and settle in.',
  },
] as const;

export type Service = (typeof SERVICES)[number];
export type ServiceId = Service['id'];
export const SERVICE_IDS = SERVICES.map((s) => s.id) as [ServiceId, ...ServiceId[]];

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}
