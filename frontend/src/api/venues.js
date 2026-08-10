import apiClient from './apiClient';

export const getFeaturedVenues = async (limit = 4) => {
  try {
    const response = await apiClient.get('/venues', {
      params: { limit }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching venues:', error);
    throw error;
  }
};

export const getVenueById = async (id) => {
  try {
    const response = await apiClient.get(`/venues/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching venue details:', error);
    throw error;
  }
};

export const getVenueImages = async (venueId) => {
  try {
    const response = await apiClient.get(`/images/VENUE/${venueId}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching venue images:', error);
    return [];
  }
};
