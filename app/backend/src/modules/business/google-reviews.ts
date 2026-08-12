import type { FastifyPluginAsync } from 'fastify';
import { env } from '../../config/env.js';
import { ok } from '../../utils/responses.js';

const GOOGLE_PLACE_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'rating',
  'userRatingCount',
  'googleMapsUri',
  'googleMapsLinks',
  'reviews',
].join(',');

interface GoogleLocalizedText {
  text?: string;
  languageCode?: string;
}

interface GoogleAuthorAttribution {
  displayName?: string;
  uri?: string;
  photoUri?: string;
}

interface GoogleReview {
  name?: string;
  relativePublishTimeDescription?: string;
  text?: GoogleLocalizedText;
  originalText?: GoogleLocalizedText;
  rating?: number;
  authorAttribution?: GoogleAuthorAttribution;
  publishTime?: string;
  googleMapsUri?: string;
}

interface GooglePlaceResponse {
  id?: string;
  displayName?: GoogleLocalizedText;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  googleMapsLinks?: {
    placeUri?: string;
    reviewsUri?: string;
    writeAReviewUri?: string;
  };
  reviews?: GoogleReview[];
}

interface CachedReviews {
  expiresAt: number;
  data: ReturnType<typeof mapGooglePlace>;
}

let cache: CachedReviews | null = null;

const mapGooglePlace = (place: GooglePlaceResponse) => ({
  configured: true,
  placeId: place.id ?? env.GOOGLE_PLACE_ID,
  displayName: place.displayName?.text ?? 'Wahab Mobiles',
  formattedAddress: place.formattedAddress,
  rating: typeof place.rating === 'number' ? place.rating : null,
  userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : 0,
  googleMapsUri: place.googleMapsLinks?.reviewsUri ?? place.googleMapsUri ?? place.googleMapsLinks?.placeUri ?? null,
  reviews: (place.reviews ?? []).map((review) => ({
    id: review.name ?? `${review.authorAttribution?.displayName ?? 'review'}-${review.publishTime ?? ''}`,
    authorName: review.authorAttribution?.displayName ?? 'Google reviewer',
    authorUri: review.authorAttribution?.uri ?? null,
    authorPhotoUri: review.authorAttribution?.photoUri ?? null,
    rating: typeof review.rating === 'number' ? review.rating : null,
    text: review.text?.text ?? review.originalText?.text ?? '',
    relativePublishTimeDescription: review.relativePublishTimeDescription ?? null,
    publishTime: review.publishTime ?? null,
    googleMapsUri: review.googleMapsUri ?? place.googleMapsLinks?.reviewsUri ?? place.googleMapsUri ?? null,
  })),
  attribution: {
    label: 'Reviews from Google',
    googleMapsUri: place.googleMapsLinks?.reviewsUri ?? place.googleMapsUri ?? null,
  },
});

export const googleReviewsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/google-reviews', async (_request, reply) => {
    if (!env.GOOGLE_MAPS_API_KEY || !env.GOOGLE_PLACE_ID) {
      return ok(reply, {
        configured: false,
        placeId: env.GOOGLE_PLACE_ID ?? null,
        rating: null,
        userRatingCount: 0,
        googleMapsUri: null,
        reviews: [],
      });
    }

    const now = Date.now();
    if (cache && cache.expiresAt > now) {
      return ok(reply, cache.data);
    }

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(env.GOOGLE_PLACE_ID)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': GOOGLE_PLACE_FIELDS,
          },
        },
      );

      if (!response.ok) {
        app.log.warn({ status: response.status }, 'Google Places reviews request failed');
        return ok(reply, {
          configured: true,
          placeId: env.GOOGLE_PLACE_ID,
          rating: null,
          userRatingCount: 0,
          googleMapsUri: null,
          reviews: [],
        });
      }

      const data = mapGooglePlace(await response.json() as GooglePlaceResponse);
      cache = {
        data,
        expiresAt: now + env.GOOGLE_REVIEWS_CACHE_SECONDS * 1000,
      };
      return ok(reply, data);
    } catch (error) {
      app.log.warn({ error }, 'Google Places reviews request failed');
      return ok(reply, {
        configured: true,
        placeId: env.GOOGLE_PLACE_ID,
        rating: null,
        userRatingCount: 0,
        googleMapsUri: null,
        reviews: [],
      });
    }
  });
};
