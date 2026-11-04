import { TabId } from '../components/layout/TopNavbar';
import { ContentRowDef } from '../views/DestacadosView';
import { VodItem } from '../types/vod';
import { HistoryItem } from '../types/history';

export interface TabRowsData {
  historyItems: HistoryItem[];
  featuredItems: VodItem[];
  movieItems: VodItem[];
  seriesItems: VodItem[];
  kidsItems: VodItem[];
  animeItems: VodItem[];
  catalogRows: Record<string, VodItem[]>;
}

/** Hero carousel items for a VOD tab */
export function heroItemsForTab(selectedTab: TabId, data: TabRowsData): VodItem[] {
  const { featuredItems, movieItems, seriesItems, kidsItems, animeItems } = data;
  if (selectedTab === 'peliculas') return movieItems.slice(0, 8);
  if (selectedTab === 'series') return seriesItems.slice(0, 8);
  if (selectedTab === 'kids') return kidsItems.slice(0, 8);
  if (selectedTab === 'anime') return animeItems.slice(0, 8);
  return featuredItems.slice(0, 8);
}

/** Rows shown for a VOD tab (Apple TV+ hierarchy) */
export function buildTabRows(selectedTab: TabId, data: TabRowsData): ContentRowDef[] {
  const { historyItems, featuredItems, movieItems, seriesItems, kidsItems, animeItems, catalogRows } = data;
  const list: ContentRowDef[] = [];

  if (selectedTab === 'destacados') {
    if (historyItems && historyItems.length > 0) {
      list.push({ id: 'history', title: 'Seguir viendo', type: 'history', items: historyItems });
    }
    if (seriesItems && seriesItems.length > 0) {
      list.push({
        id: 'top_series',
        title: 'Top 10: series en Xuper TV',
        type: 'vod',
        isRanked: true,
        items: seriesItems.slice(0, 10)
      });
    }
    if (movieItems && movieItems.length > 0) {
      list.push({
        id: 'top_movies',
        title: 'Top 10: películas en Xuper TV',
        type: 'vod',
        isRanked: true,
        items: movieItems.slice(0, 10)
      });
    }

    // Netflix Row
    const netflixItems = catalogRows['Netflix Series'] || catalogRows['Netflix Movie'];
    if (netflixItems && netflixItems.length > 0) {
      list.push({
        id: 'netflix_row',
        title: 'Netflix: Lo más visto',
        subtitle: 'Series y producciones exclusivas',
        type: 'vod',
        items: netflixItems
      });
    }

    if (seriesItems && seriesItems.length > 3) {
      list.push({
        id: 'featured_collection',
        title: 'Contra todo pronóstico',
        type: 'vod',
        isWide: true,
        items: seriesItems.slice(1, 13)
      });
    }

    if (movieItems && movieItems.length > 5) {
      list.push({
        id: 'must_watch',
        title: 'Éxitos imperdibles en Xuper TV',
        type: 'vod',
        items: movieItems.slice(10, 26)
      });
    }

    // HBO Row
    const hboItems = catalogRows['HBO Series'] || catalogRows['HBO Movie'];
    if (hboItems && hboItems.length > 0) {
      list.push({
        id: 'hbo_row',
        title: 'HBO: Éxitos aclamados',
        subtitle: 'Dramas y contenidos de prestigio',
        type: 'vod',
        items: hboItems
      });
    }

    // Disney+ Row
    const disneyItems = catalogRows['Disney Movie'] || catalogRows['Disney Series'];
    if (disneyItems && disneyItems.length > 0) {
      list.push({
        id: 'disney_row',
        title: 'Disney+: Magia y Aventura',
        type: 'vod',
        items: disneyItems
      });
    }

    // Trailers Row
    const trailerItems = catalogRows['Tráiler'];
    if (trailerItems && trailerItems.length > 0) {
      list.push({
        id: 'trailers_row',
        title: 'Avances y Tráilers Exclusivos',
        type: 'vod',
        isWide: true,
        items: trailerItems
      });
    }

    if (featuredItems && featuredItems.length > 0) {
      list.push({
        id: 'new_releases',
        title: 'Últimos estrenos en Xuper TV',
        type: 'vod',
        items: featuredItems.slice(0, 16)
      });
    }
  } else if (selectedTab === 'peliculas') {
    if (movieItems && movieItems.length > 0) {
      list.push({
        id: 'top_movies',
        title: 'Top 10: películas en Xuper TV',
        type: 'vod',
        isRanked: true,
        items: movieItems.slice(0, 10)
      });

      const netflixMovies = catalogRows['Netflix Movie'];
      if (netflixMovies && netflixMovies.length > 0) {
        list.push({
          id: 'netflix_movies',
          title: 'Netflix: Películas Destacadas',
          type: 'vod',
          items: netflixMovies
        });
      }

      const hboMovies = catalogRows['HBO Movie'];
      if (hboMovies && hboMovies.length > 0) {
        list.push({
          id: 'hbo_movies',
          title: 'HBO: Cine Seleccionado',
          type: 'vod',
          items: hboMovies
        });
      }

      const disneyMovies = catalogRows['Disney Movie'];
      if (disneyMovies && disneyMovies.length > 0) {
        list.push({
          id: 'disney_movies',
          title: 'Disney+: Grandes Películas',
          type: 'vod',
          items: disneyMovies
        });
      }

      const primeMovies = catalogRows['Prime Video Movie'] || catalogRows['Paramount + Movie'];
      if (primeMovies && primeMovies.length > 0) {
        list.push({
          id: 'prime_movies',
          title: 'Prime Video & Paramount+',
          type: 'vod',
          items: primeMovies
        });
      }

      list.push({
        id: 'movie_collection',
        title: 'Cine Seleccionado',
        type: 'vod',
        isWide: true,
        items: movieItems.slice(2, 10)
      });

      list.push({
        id: 'action_movies',
        title: 'Películas de Acción y Aventura',
        type: 'vod',
        items: movieItems.slice(5, 20)
      });

      const horrorItems = catalogRows['Horror'] || catalogRows['Se acerca Halloween'];
      if (horrorItems && horrorItems.length > 0) {
        list.push({
          id: 'horror_movies',
          title: 'Terror, Suspenso y Halloween',
          type: 'vod',
          items: horrorItems
        });
      }
    }
  } else if (selectedTab === 'series') {
    if (seriesItems && seriesItems.length > 0) {
      list.push({
        id: 'top_series',
        title: 'Top 10: series en Xuper TV',
        type: 'vod',
        isRanked: true,
        items: seriesItems.slice(0, 10)
      });

      const netflixSeries = catalogRows['Netflix Series'];
      if (netflixSeries && netflixSeries.length > 0) {
        list.push({
          id: 'netflix_series',
          title: 'Netflix: Series Originales',
          type: 'vod',
          items: netflixSeries
        });
      }

      const hboSeries = catalogRows['HBO Series'];
      if (hboSeries && hboSeries.length > 0) {
        list.push({
          id: 'hbo_series',
          title: 'HBO: Series Exclusivas',
          type: 'vod',
          items: hboSeries
        });
      }

      const disneySeries = catalogRows['Disney Series'];
      if (disneySeries && disneySeries.length > 0) {
        list.push({
          id: 'disney_series',
          title: 'Disney+: Series y Aventuras',
          type: 'vod',
          items: disneySeries
        });
      }

      const emmySeries = catalogRows['78.ª edición de los premios Primetime Emmy'];
      if (emmySeries && emmySeries.length > 0) {
        list.push({
          id: 'emmy_series',
          title: 'Series Premiadas en los Emmy',
          type: 'vod',
          items: emmySeries
        });
      }

      const telenovelas = catalogRows['Telenovelas'] || catalogRows['Serie Turquía'];
      if (telenovelas && telenovelas.length > 0) {
        list.push({
          id: 'telenovelas',
          title: 'Telenovelas y Series Internacionales',
          type: 'vod',
          items: telenovelas
        });
      }

      list.push({
        id: 'series_collection',
        title: 'Contra todo pronóstico',
        type: 'vod',
        isWide: true,
        items: seriesItems.slice(0, 10)
      });
    }
  } else if (selectedTab === 'kids') {
    const items = kidsItems.length > 0 ? kidsItems : movieItems.slice(0, 15);
    list.push({
      id: 'kids_top',
      title: 'Películas Infantiles y Familiares',
      type: 'vod',
      items: items.slice(0, 10)
    });

    const mickey = catalogRows['La aventura de Mickey'];
    if (mickey && mickey.length > 0) {
      list.push({
        id: 'mickey_aventuras',
        title: 'La aventura de Mickey y sus amigos',
        type: 'vod',
        items: mickey
      });
    }

    const marvelKids = catalogRows['Colección de Marvel'] || catalogRows['Los héroes atacan'];
    if (marvelKids && marvelKids.length > 0) {
      list.push({
        id: 'marvel_kids',
        title: 'Superhéroes y Marvel Kids',
        type: 'vod',
        items: marvelKids
      });
    }

    list.push({
      id: 'kids_magic',
      title: 'Aventuras Mágicas',
      type: 'vod',
      isWide: true,
      items: items.slice(2, 10)
    });

    const ninosFelices = catalogRows['Niños Felices'];
    if (ninosFelices && ninosFelices.length > 0) {
      list.push({
        id: 'ninos_felices',
        title: 'Niños Felices y Preescolar',
        type: 'vod',
        items: ninosFelices
      });
    }
  } else if (selectedTab === 'anime') {
    const items = animeItems.length > 0 ? animeItems : seriesItems.slice(0, 15);
    list.push({
      id: 'anime_top',
      title: 'Top 10: Anime en Xuper TV',
      type: 'vod',
      isRanked: true,
      items: items.slice(0, 10)
    });

    const dragonBall = catalogRows['Dragon Ball Collection'];
    if (dragonBall && dragonBall.length > 0) {
      list.push({
        id: 'dragon_ball',
        title: 'Dragon Ball: Colección Completa',
        type: 'vod',
        items: dragonBall
      });
    }

    const animeClasico = catalogRows['Anime Clásico'];
    if (animeClasico && animeClasico.length > 0) {
      list.push({
        id: 'anime_clasico',
        title: 'Anime Clásico y de Culto',
        type: 'vod',
        items: animeClasico
      });
    }

    const animeAsiatico = catalogRows['Anime Asiático'];
    if (animeAsiatico && animeAsiatico.length > 0) {
      list.push({
        id: 'anime_asiatico',
        title: 'Anime Asiático y Shonen',
        type: 'vod',
        items: animeAsiatico
      });
    }

    list.push({
      id: 'anime_collection',
      title: 'Colección Anime Exclusiva',
      type: 'vod',
      isWide: true,
      items: items.slice(2, 10)
    });
  } else if (selectedTab === 'historial') {
    if (historyItems && historyItems.length > 0) {
      list.push({ id: 'history', title: 'Seguir viendo', type: 'history', items: historyItems });
    }
    if (movieItems && movieItems.length > 0) {
      list.push({
        id: 'history_recommended',
        title: 'Recomendados para ti',
        type: 'vod',
        items: movieItems.slice(0, 12)
      });
    }
  }

  return list;
}
