import { type TMDBMedia } from './tmdb';

/**
 * Generates a URL-friendly slug from a title string.
 * Lowercases and replaces special characters/spaces with hyphens.
 */
export const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w-]+/g, '')        // Remove all non-word chars
        .replace(/--+/g, '-')           // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};

/**
 * Generates a Moctale content URL with the format:
 * https://www.moctale.in/content/{slugified-title}-{year}
 */
export const getMoctaleUrl = (media: TMDBMedia): string => {
    const title = media.title || media.name || 'unknown';
    const year = (media.release_date || media.first_air_date)?.substring(0, 4) || '2024';
    const slug = slugify(title);
    return `https://www.moctale.in/content/${slug}-${year}`;
};

/**
 * Generates a TMDB content URL.
 */
export const getTMDBUrl = (id: number, type: 'movie' | 'tv'): string => {
    return `https://www.themoviedb.org/${type}/${id}`;
};

export const MOCTALE_ICON_BASE64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAAAAABXZoBIAAAAlElEQVR4AdXNIQzCMBCF4ee9QM/NYeYTNIIEj/dBIebxGlFv62vw6Pksp6smH1vbXEsuQcMn78/d4S+F+ER2lOWBDxPJGZsTVw4NR5Z6ZnKB6phF55lJu2jUVaHhNdKaUexpRRQDreXbWdEYaQSNnsZV44HFa9KXVciTAbgzGdGIW+uxGtMFtDqh9EhutakdVIdf9QajMfrxtri17gAAAABJRU5ErkJggg==`;

export const TMDB_ICON_BASE64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAXVBMVEVHcEwDJUEDJUEDJUEBID4AGjo0W11Vj4FEeHMAEjgdUWEQQFcxeYARcYxvrpQABDFuy7QAACQpobMTYXk1wtMgu9gMueNas6dXx8A9uME8j5IRf5yF0q4KqtMQj6/vlJLEAAAAA3RSTlMAiunizO7DAAABJklEQVR4AXyPB3aFMAwE+ZEWkA2u9Hb/Y8bwDOkZOvNWpSiK1xv9wturSPyisk45+pNXDv4RpX84JQMgEDMDTISTW3JZ1bXUopRuGg1qT4iz1JUprfNN04Soqev7fhiGLAmlseLGqYnzrGOWkXPP0ohcyUU9yWcgXYOr1FMti4JeTzTf0oKtkLUiniHwsN7yPe2m1KY4NcVs29X2ft13zVmaqhrVMk2TDmrWkuTRfuxpTHVJpeYgj3ySpqRxWsR2iuUqe69CLCKAtRaEBKc7M2Up9UnaMwKxjcJxjchSzLY556ZE8GE9gt/jPS1he2SHoH3vw77zj+Q8+9CuKamOFrknVSfLsjSENv1Ot/UZiAHBNTERntudfB8OgDeB4U2aeBM13uwAAGQvGWOOc06yAAAAAElFTkSuQmCC`;
