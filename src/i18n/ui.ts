export const languages = {
  en: 'English',
  es: 'Español',
} as const;

export const defaultLang = 'en';

export const ui = {
  en: {
    navHome: 'Home',
    navAbout: 'About',
    navPortfolio: 'Portfolio',
    navContact: 'Contact',
    heroTitle: 'We create visual content with strategy, creativity, and AI',
    heroSubtitle: 'Audiovisual production, creative direction, and digital experiences for real brands.',
    contactButton: 'Let’s talk',
    brandsTitle: 'Brands that have trusted us',
    brandLogoAlt: 'Brand Logo',
    switchToSpanish: 'Ver en español',
  },
  es: {
    navHome: 'Inicio',
    navAbout: 'Nosotros',
    navPortfolio: 'Portafolio',
    navContact: 'Contacto',
    heroTitle: 'Creamos contenido visual con estrategia, creatividad e IA',
    heroSubtitle: 'Producción audiovisual, dirección creativa y experiencias digitales para marcas reales.',
    contactButton: 'Hablemos',
    brandsTitle: 'Marcas que han confiado en nosotros',
    brandLogoAlt: 'Logo de marca',
    switchToSpanish: 'See in English',
  },
} as const;

export type Lang = keyof typeof ui;
export type TranslationKey = keyof typeof ui.en;

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang === 'es') return 'es';
  return 'en';
}

export function useTranslations(lang: Lang) {
  return function t(key: TranslationKey) {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}