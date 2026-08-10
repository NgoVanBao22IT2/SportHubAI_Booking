'use strict';

const crypto = require('crypto');

class VenueService {
  async createVenue(ownerUserId, data, models, transaction = null) {
    const { venue_name, contact_phone, venue_description } = data;

    const venueId = crypto.randomUUID();

    const venue = await models.Venue.create({
      venue_id: venueId,
      owner_user_id: ownerUserId,
      venue_name,
      contact_phone,
      venue_description,
      operating_status: 'PENDING'
    }, { transaction });

    return venue;
  }

  async getVenuesByOwner(ownerUserId, models) {
    return models.Venue.findAll({
      where: { owner_user_id: ownerUserId },
      order: [['created_at', 'DESC']]
    });
  }

  async getVenueByIdForOwner(ownerUserId, venueId, models) {
    const venue = await models.Venue.findOne({
      where: { venue_id: venueId, owner_user_id: ownerUserId },
      include: [
        { model: models.Facility, as: 'facilities' }
      ]
    });

    if (!venue) {
      const error = new Error('Venue not found or access denied');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    return venue;
  }

  async updateVenue(ownerUserId, venueId, data, models, transaction = null) {
    const venue = await this.getVenueByIdForOwner(ownerUserId, venueId, models);

    const { venue_name, contact_phone, venue_description } = data;

    await venue.update({
      venue_name: venue_name !== undefined ? venue_name : venue.venue_name,
      contact_phone: contact_phone !== undefined ? contact_phone : venue.contact_phone,
      venue_description: venue_description !== undefined ? venue_description : venue.venue_description
    }, { transaction });

    return venue;
  }

  async deleteVenue(ownerUserId, venueId, models, transaction = null) {
    const venue = await this.getVenueByIdForOwner(ownerUserId, venueId, models);
    await venue.destroy({ transaction });
    return { success: true, message: 'Venue deleted successfully' };
  }
}

module.exports = new VenueService();
