import apiClient from './apiClient';

/**
 * Fetch featured venues from backend API.
 * Safely unwrap paginated object response { total, page, limit, data: [] } or flat array.
 * Throws explicit error on malformed backend response payload to avoid silent fake empty states.
 */
export const getFeaturedVenues = async (limit = 4) => {
  try {
    const response = await apiClient.get('/venues', {
      params: { limit }
    });
    const resData = response.data?.data;
    if (Array.isArray(resData)) {
      return resData;
    }
    if (resData && Array.isArray(resData.data)) {
      return resData.data;
    }
    const error = new Error('MALFORMED_VENUE_RESPONSE: Backend response payload does not contain a valid venue array.');
    error.isMalformed = true;
    throw error;
  } catch (error) {
    console.error('Error fetching venues:', error);
    throw error;
  }
};

/**
 * Fetch single venue details by ID from backend API.
 */
export const getVenueById = async (id) => {
  try {
    const response = await apiClient.get(`/venues/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching venue details:', error);
    throw error;
  }
};

/**
 * Fetch venue images by venue ID from backend API.
 */
export const getVenueImages = async (venueId) => {
  try {
    const response = await apiClient.get(`/images/VENUE/${venueId}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching venue images:', error);
    return [];
  }
};
