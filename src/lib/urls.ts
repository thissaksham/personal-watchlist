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
 * Generates a JustWatch content URL with the format:
 * Movie: https://www.justwatch.com/in/movie/{slugified-title}
 * Show:  https://www.justwatch.com/in/tv-show/{slugified-title}
 */
export const getJustWatchUrl = (media: TMDBMedia, type: 'movie' | 'tv'): string => {
    const title = media.title || media.name || 'unknown';
    const slug = slugify(title);
    const jwType = type === 'movie' ? 'movie' : 'tv-show';
    return `https://www.justwatch.com/in/${jwType}/${slug}`;
};

/**
 * Generates a TMDB content URL.
 */
export const getTMDBUrl = (id: number, type: 'movie' | 'tv'): string => {
    return `https://www.themoviedb.org/${type}/${id}`;
};

export const MOCTALE_ICON_BASE64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAAAAABXZoBIAAAAlElEQVR4AdXNIQzCMBCF4ee9QM/NYeYTNIIEj/dBIebxGlFv62vw6Pksp6smH1vbXEsuQcMn78/d4S+F+ER2lOWBDxPJGZsTVw4NR5Z6ZnKB6phF55lJu2jUVaHhNdKaUexpRRQDreXbWdEYaQSNnsZV44HFa9KXVciTAbgzGdGIW+uxGtMFtDqh9EhutakdVIdf9QajMfrxtri17gAAAABJRU5ErkJggg==`;

export const TMDB_ICON_BASE64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAXVBMVEVHcEwDJUEDJUEDJUEBID4AGjo0W11Vj4FEeHMAEjgdUWEQQFcxeYARcYxvrpQABDFuy7QAACQpobMTYXk1wtMgu9gMueNas6dXx8A9uME8j5IRf5yF0q4KqtMQj6/vlJLEAAAAA3RSTlMAiunizO7DAAABJklEQVR4AXyPB3aFMAwE+ZEWkA2u9Hb/Y8bwDOkZOvNWpSiK1xv9wturSPyisk45+pNXDv4RpX84JQMgEDMDTISTW3JZ1bXUopRuGg1qT4iz1JUprfNN04Soqev7fhiGLAmlseLGqYnzrGOWkXPP0ohcyUU9yWcgXYOr1FMti4JeTzTf0oKtkLUiniHwsN7yPe2m1KY4NcVs29X2ft13zVmaqhrVMk2TDmrWkuTRfuxpTHVJpeYgj3ySpqRxWsR2iuUqe69CLCKAtRaEBKc7M2Up9UnaMwKxjcJxjchSzLY556ZE8GE9gt/jPS1he2SHoH3vw77zj+Q8+9CuKamOFrknVSfLsjSENv1Ot/UZiAHBNTERntudfB8OgDeB4U2aeBM13uwAAGQvGWOOc06yAAAAAElFTkSuQmCC`;
export const JUSTWATCH_ICON_BASE64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAD2UlEQVR4AcSWU3skQRSGs/9hbbPHaIaj2Frbtm3btm3btm37Ms+3NdXpScec7EW7qs578J1qHwAl3EepSvV9y1RrsLt01frvyRXeOFLX3u22pdilAGWq1BtMPqZknuQ1kBS3TQrgplEbL04It20fd0joy/9z7PbJKucLRphxYhmH7q2NqFTbq1F475PVh2vrOdzbxuPhLhGX14vo2caMynW8A5E1wAaWAAgU4PFuCU/3+mHFBA4WToMqdYsB4HoqwKNdEo4uFdA43kDfr5sm4Nb2QPRqZ0Xl2l4EuLGRxeFFLJol6VGuRn3P+7VTRLw+YsObo3bc2BaEbm04VKjpBYC4CC3KV/cYTgOYSgAO2/D2qANvjznx4WQILmxwoEodhhQrU3QAp1ewGNXdiLpa9aJyCpQIvCEQSyf4wcLq0LcjSdf+cPTrLFGQwtfARpaq4OYWAcO7mVGLkRfdMF3Aq8NBWDFRBCfqPOP7EYCv56Lw63IcnhyKRq8OEkkNU7gaUIrw8R5f3N4moWNzE+KjjBAlXabx/ToJ+HY+Cj8vxeH3lQT8uZqIRwdiYOb0hQHgPTLcPluAzabD+H4sxvRhUUujSTd+QGc5AgrA44Mx6N5WgiAZcGhFGCLCLPkDuLmZNKLtAnbMYREZmubFmsmyCh7ttWFEDw41GzAyQBcZ4PGhSPTpKKFiLfl9kM2Ev9eSSESScHhlGEJc5rwBzB1qRnSYOtQKgFyEigoe73dhEDEeEWpC7w5Cpm5pIwDEuAJBj1XTnLkDzBhkRphLm+m9qg9QgFdHgjFxoC/CQkwk5LzHc+UIcgNckwGUY+u8kDyoYJNchJunW+Fy6NQypH3g+UE7ZgwVwRhkyP6d5BQ82B9Jc680J5sqBSfWhiMmwpqPItxO9oKdIlXBxuk8fP10mDWMp4fOpM2kAnUR3tsbjY4tRUi+RhxfHY74aGs+VbApnQoIjB+6tDQhLsoAUdLmKMNfl+Opx08OxcJSUBne2szTFNwmjWhsbwvqaZl0KVg6ToSVV0AUFURSgBdHYzCgq5/SEQsGcGENh/G9TWigZzIUYWorPmInHdGJxeP8YCKtuD/pA08PhWFwd19UrVsErTghUqfsgpn2gjcqGX48FYKLm1yoXo9RS7DwALc3szi4kEWTeAPKVk97v35q2mZ0e4cNPduxaukVHcCtTRzuphbh4SUCkmMN9P3G6SIxHIA+HayoovbYGwBqGT7b548lYzlaeMXyS3aTqoCnu+HFtSK6tTJ57e/437A2y+e0gJrl5v/zkwyBiYu2zfIB75gMeNdswDunA949BwAxarAPAl+M+AAAAABJRU5ErkJggg==`;
