import { LiveChannel } from '../types/channel';

// Reliable public HLS test stream with permissive CORS (works cleanly in local desktop browser)
const TEST_HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

export const MOCK_CHANNELS_BY_CATEGORY: Record<string, LiveChannel[]> = {
  // Colombia (76188)
  '76188': [
    {
      id: 'co-101',
      code: '101',
      name: 'Caracol Televisión HD',
      now: 'Noticias Caracol: Edición Central',
      next: 'Desafío Siglo XXI: Gran Final',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Colombia'
    },
    {
      id: 'co-102',
      code: '102',
      name: 'RCN Televisión HD',
      now: 'MasterChef Celebrity Colombia',
      next: 'Noticias RCN Prime',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Colombia'
    },
    {
      id: 'co-103',
      code: '103',
      name: 'Win Sports+ HD',
      now: 'Liga BetPlay Dimayor: En Vivo',
      next: 'La Polémica Central',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Colombia'
    },
    {
      id: 'co-104',
      code: '104',
      name: 'Canal 1 HD',
      now: 'Noticentro 1 CM&',
      next: 'Caso Cerrado Edición Estelar',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Colombia'
    },
    {
      id: 'co-105',
      code: '105',
      name: 'Señal Colombia',
      now: 'Ciclismo Internacional en Vivo',
      next: 'Documentales del Mundo',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Colombia'
    },
    {
      id: 'co-106',
      code: '106',
      name: 'Telemedellín',
      now: 'Noticias Telemedellín',
      next: 'Medellín es Deporte',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Colombia'
    },
    {
      id: 'co-107',
      code: '107',
      name: 'CityTV HD',
      now: 'CityNoticias del Mediodía',
      next: 'Arriba Bogotá',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Colombia'
    },
    {
      id: 'co-108',
      code: '108',
      name: 'Teleantioquia',
      now: 'Serenata en Directo',
      next: 'Consejo de Redacción',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Colombia'
    }
  ],

  // Deportes en Vivo (76206)
  '76206': [
    {
      id: 'dep-201',
      code: '201',
      name: 'ESPN HD',
      now: 'SportsCenter: Edición Especial',
      next: 'Fútbol 10 Central',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Deportes'
    },
    {
      id: 'dep-202',
      code: '202',
      name: 'ESPN 2 HD',
      now: 'UEFA Champions League: Resumen',
      next: 'ESPN F90',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Deportes'
    },
    {
      id: 'dep-203',
      code: '203',
      name: 'Fox Sports 1 HD',
      now: 'WWE SmackDown en Español',
      next: 'Debate Final',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Deportes'
    },
    {
      id: 'dep-204',
      code: '204',
      name: 'DSports HD',
      now: 'LaLiga EA Sports en Vivo',
      next: 'El Chiringuito Inside',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Deportes'
    },
    {
      id: 'dep-205',
      code: '205',
      name: 'TyC Sports HD',
      now: 'Superfútbol en Vivo',
      next: 'Paso a Paso',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Deportes'
    },
    {
      id: 'dep-206',
      code: '206',
      name: 'NBA TV HD',
      now: 'NBA Action & Highlights',
      next: 'Game Time Live',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Deportes'
    }
  ],

  // Cine & Series 24/7 (76205)
  '76205': [
    {
      id: 'cine-301',
      code: '301',
      name: 'HBO Signature HD',
      now: 'House of the Dragon T2: Ep 4',
      next: 'The Last of Us T1',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Cine & Series'
    },
    {
      id: 'cine-302',
      code: '302',
      name: 'Warner TV HD',
      now: 'The Big Bang Theory: Maratón',
      next: 'Friends: Clásicos',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Cine & Series'
    },
    {
      id: 'cine-303',
      code: '303',
      name: 'TNT HD',
      now: 'Batman: El caballero de la noche',
      next: 'Mad Max: Furia en el camino',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Cine & Series'
    },
    {
      id: 'cine-304',
      code: '304',
      name: 'Universal TV HD',
      now: 'Law & Order: SVU T24',
      next: 'Chicago P.D.',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Cine & Series'
    },
    {
      id: 'cine-305',
      code: '305',
      name: 'Cinemax HD',
      now: 'Misión Imposible: Repercusión',
      next: 'Gladiador',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'Cine & Series'
    }
  ],

  // España (76191)
  '76191': [
    {
      id: 'es-401',
      code: '401',
      name: 'La 1 HD (RTVE)',
      now: 'Telediario 2: En Directo',
      next: 'MasterChef España',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'España'
    },
    {
      id: 'es-402',
      code: '402',
      name: 'Antena 3 HD',
      now: 'El Hormiguero 3.0',
      next: 'La Ruleta de la Suerte',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'España'
    },
    {
      id: 'es-403',
      code: '403',
      name: 'Telecinco HD',
      now: 'Supervivientes: Tierra de Nadie',
      next: 'Informativos Telecinco',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'España'
    },
    {
      id: 'es-404',
      code: '404',
      name: 'Cuatro HD',
      now: 'First Dates',
      next: 'Callejeros Viajeros',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'España'
    },
    {
      id: 'es-405',
      code: '405',
      name: 'La Sexta HD',
      now: 'El Intermedio con Wyoming',
      next: 'laSexta Noticias 20H',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'España'
    }
  ],

  // México (76197)
  '76197': [
    {
      id: 'mx-501',
      code: '501',
      name: 'Las Estrellas HD',
      now: 'La Rosa de Guadalupe',
      next: 'Noticiero en Punto con Denise Maerker',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'México'
    },
    {
      id: 'mx-502',
      code: '502',
      name: 'Azteca 7 HD',
      now: 'Los Simpson: Maratón',
      next: 'Fútbol Azteca: Box de Gala',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'México'
    },
    {
      id: 'mx-503',
      code: '503',
      name: 'Azteca Uno HD',
      now: 'Exatlón México en Vivo',
      next: 'Hechos Noche con Javier Alatorre',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'México'
    },
    {
      id: 'mx-504',
      code: '504',
      name: 'Canal 5 HD',
      now: 'Me Caigo de Risa',
      next: 'Película 5: Transformers',
      time: 'EN VIVO',
      url: TEST_HLS,
      categoryName: 'México'
    }
  ]
};

export function getMockChannelsForCategory(categoryId: string | number): LiveChannel[] {
  const key = String(categoryId);
  if (MOCK_CHANNELS_BY_CATEGORY[key]) {
    return MOCK_CHANNELS_BY_CATEGORY[key];
  }
  // If 'Todos los canales' or unknown, combine top channels
  return [
    ...MOCK_CHANNELS_BY_CATEGORY['76188'].slice(0, 4),
    ...MOCK_CHANNELS_BY_CATEGORY['76206'].slice(0, 3),
    ...MOCK_CHANNELS_BY_CATEGORY['76205'].slice(0, 3)
  ];
}
