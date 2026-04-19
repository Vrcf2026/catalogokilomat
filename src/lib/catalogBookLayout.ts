const A4_RATIO = 210 / 297;

interface ViewportSize {
  w: number;
  h: number;
}

export interface CatalogBookLayout {
  width: number;
  height: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  singlePage: boolean;
}

export function getCatalogBookLayout({ w, h }: ViewportSize): CatalogBookLayout {
  const isMobile = w < 600;
  const isTablet = w >= 600 && w <= 1100;
  const isPortraitViewport = h >= w;
  const singlePage = (isMobile || isTablet) && isPortraitViewport;

  // Minimize padding in single-page/kiosk mode to maximize screen usage
  const horizontalPadding = singlePage ? 8 : 48;
  const verticalPadding = singlePage ? 8 : 40;
  const availableWidth = Math.max(w - horizontalPadding, 220);
  const availableHeight = Math.max(h - verticalPadding, 320);

  const maxPageWidthFromHeight = Math.floor(availableHeight * A4_RATIO);
  const maxPageWidthFromWidth = Math.floor(singlePage ? availableWidth : availableWidth / 2);
  const pageWidth = Math.max(Math.min(maxPageWidthFromHeight, maxPageWidthFromWidth), 220);
  const pageHeight = Math.floor(pageWidth / A4_RATIO);

  return {
    width: pageWidth,
    height: pageHeight,
    minWidth: pageWidth,
    maxWidth: pageWidth,
    minHeight: pageHeight,
    maxHeight: pageHeight,
    singlePage,
  };
}
