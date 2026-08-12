'use strict';

const { Op } = require('sequelize');

class VenueSearchService {
  async searchVenues(queryParams, models) {
    const { 
      keyword, 
      sport, 
      min_price, 
      max_price, 
      lat, 
      lng, 
      radius, 
      rating, // 07.04 PASS WITH NON-BLOCKING GAP (Awaiting Review Model)
      page = 1, 
      limit = 20 
    } = queryParams;

    const offset = (page - 1) * limit;

    // Base conditions for Venues
    const venueWhere = {
      operating_status: 'APPROVED' // Only public approved venues
    };

    if (keyword) {
      venueWhere[Op.or] = [
        { venue_name: { [Op.like]: `%${keyword}%` } },
        { venue_description: { [Op.like]: `%${keyword}%` } }
      ];
    }

    // Branch condition
    const branchWhere = {
      branch_status: 'ACTIVE'
    };

    // 07.05 & 07.07 Location / Nearby filter
    let orderClause = [['created_at', 'DESC']];
    if (lat || lng || radius) {
      if (!lat || !lng || !radius) {
        const error = new Error('lat, lng, and radius must all be provided together');
        error.statusCode = 400;
        throw error;
      }
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      const parsedRadius = parseFloat(radius);
      
      if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        const error = new Error('Invalid latitude (-90 to 90)');
        error.statusCode = 400;
        throw error;
      }
      if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        const error = new Error('Invalid longitude (-180 to 180)');
        error.statusCode = 400;
        throw error;
      }
      if (isNaN(parsedRadius) || parsedRadius <= 0) {
        const error = new Error('Invalid radius (> 0)');
        error.statusCode = 400;
        throw error;
      }

      const haversineQuery = `
        6371 * acos(
          cos(radians(${parsedLat})) * 
          cos(radians(JSON_EXTRACT(geo_coordinates, '$.lat'))) * 
          cos(radians(JSON_EXTRACT(geo_coordinates, '$.lng')) - radians(${parsedLng})) + 
          sin(radians(${parsedLat})) * 
          sin(radians(JSON_EXTRACT(geo_coordinates, '$.lat')))
        )
      `;
      branchWhere[Op.and] = models.sequelize.where(
        models.sequelize.literal(haversineQuery),
        { [Op.lte]: parsedRadius }
      );
      // Update sorting to distance ASC
      orderClause = [[models.sequelize.literal(haversineQuery), 'ASC']];
    }

    // Court Condition (07.02 Sport Filter)
    const courtWhere = {
      court_status: 'ACTIVE'
    };
    let includeCourt = false;
    
    if (sport) {
      courtWhere.sport_category = sport;
      includeCourt = true;
    }

    // OperatingSchedule Condition (07.03 Price Filter)
    const scheduleWhere = {};
    let includeSchedule = false;

    if (min_price || max_price) {
      includeSchedule = true;
      scheduleWhere.base_hourly_price = {};
      
      let parsedMin, parsedMax;
      
      if (min_price) {
        parsedMin = parseFloat(min_price);
        if (isNaN(parsedMin) || parsedMin < 0) {
          const error = new Error('Invalid min_price');
          error.statusCode = 400;
          throw error;
        }
        scheduleWhere.base_hourly_price[Op.gte] = parsedMin;
      }

      if (max_price) {
        parsedMax = parseFloat(max_price);
        if (isNaN(parsedMax) || parsedMax < 0) {
          const error = new Error('Invalid max_price');
          error.statusCode = 400;
          throw error;
        }
        if (parsedMin !== undefined && parsedMax < parsedMin) {
          const error = new Error('max_price cannot be less than min_price');
          error.statusCode = 400;
          throw error;
        }
        scheduleWhere.base_hourly_price[Op.lte] = parsedMax;
      }
    }

    // Build Includes
    const include = [
      {
        model: models.Branch,
        as: 'branches',
        where: branchWhere,
        required: true, // INNER JOIN to enforce location matches
        include: []
      }
    ];

    if (includeCourt) {
      include[0].include.push({
        model: models.Court,
        as: 'courts',
        where: courtWhere,
        required: true
      });
    }

    // 07.03 Price Hierarchy Resolution
    if (includeSchedule) {
      const matchingSchedules = await models.OperatingSchedule.findAll({
        where: scheduleWhere,
        attributes: ['scope_target_type', 'scope_target_id']
      });

      const venueTargetIds = matchingSchedules.filter(s => s.scope_target_type === 'VENUE').map(s => s.scope_target_id);
      const branchTargetIds = matchingSchedules.filter(s => s.scope_target_type === 'BRANCH').map(s => s.scope_target_id);
      const courtTargetIds = matchingSchedules.filter(s => s.scope_target_type === 'COURT').map(s => s.scope_target_id);

      const resolvedVenueIds = new Set(venueTargetIds);

      if (branchTargetIds.length > 0) {
        const branches = await models.Branch.findAll({
          where: { branch_id: { [Op.in]: branchTargetIds } },
          attributes: ['venue_id']
        });
        branches.forEach(b => resolvedVenueIds.add(b.venue_id));
      }

      if (courtTargetIds.length > 0) {
        const courts = await models.Court.findAll({
          where: { court_id: { [Op.in]: courtTargetIds } },
          include: [{ model: models.Branch, as: 'branch', attributes: ['venue_id'] }]
        });
        courts.forEach(c => resolvedVenueIds.add(c.branch.venue_id));
      }

      if (resolvedVenueIds.size > 0) {
        venueWhere.venue_id = {
          [Op.in]: Array.from(resolvedVenueIds)
        };
      } else {
        // If no matching schedules, return empty early
        return { total: 0, page: parseInt(page), limit: parseInt(limit), data: [] };
      }
    }

    // Final Query
    const { rows, count } = await models.Venue.findAndCountAll({
      where: venueWhere,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true, // Prevents duplicate counts due to joins
      order: orderClause
    });

    return {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      data: rows
    };
  }

  async getVenueDetails(venueId, models) {
    const venue = await models.Venue.findOne({
      where: {
        venue_id: venueId,
        operating_status: 'APPROVED'
      },
      include: [
        {
          model: models.Branch,
          as: 'branches',
          where: { branch_status: 'ACTIVE' },
          required: false,
          include: [
            {
              model: models.Court,
              as: 'courts',
              where: { court_status: 'ACTIVE' },
              required: false
            }
          ]
        },
        {
          model: models.Facility,
          as: 'facilities',
          required: false
        }
      ]
    });

    return venue;
  }
}

module.exports = new VenueSearchService();
