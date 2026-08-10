'use strict';

const crypto = require('crypto');
const venueService = require('./venue.service');
const branchService = require('./branch.service');
const courtService = require('./court.service');

class ScheduleService {
  async _verifyScopeOwnership(ownerUserId, scopeTargetType, scopeTargetId, models, venueId = null, branchId = null) {
    if (scopeTargetType === 'VENUE') {
      await venueService.getVenueByIdForOwner(ownerUserId, scopeTargetId, models);
    } else if (scopeTargetType === 'BRANCH') {
      if (!venueId) {
        const error = new Error('venueId is required to verify BRANCH ownership');
        error.statusCode = 400;
        throw error;
      }
      await branchService.getBranchByIdForOwner(ownerUserId, venueId, scopeTargetId, models);
    } else if (scopeTargetType === 'COURT') {
      if (!venueId || !branchId) {
        const error = new Error('venueId and branchId are required to verify COURT ownership');
        error.statusCode = 400;
        throw error;
      }
      await courtService.getCourtByIdForOwner(ownerUserId, venueId, branchId, scopeTargetId, models);
    } else {
      const error = new Error('Invalid scope_target_type');
      error.statusCode = 400;
      throw error;
    }
  }

  async createSchedule(ownerUserId, scopeTargetType, scopeTargetId, data, models, transaction = null) {
    await this._verifyScopeOwnership(ownerUserId, scopeTargetType, scopeTargetId, models, data.venueId, data.branchId);

    const { day_scope, opening_time, closing_time, base_hourly_price, peak_price_rules } = data;
    const scheduleId = crypto.randomUUID();

    const schedule = await models.OperatingSchedule.create({
      schedule_id: scheduleId,
      scope_target_type: scopeTargetType,
      scope_target_id: scopeTargetId,
      day_scope,
      opening_time,
      closing_time,
      base_hourly_price,
      peak_price_rules
    }, { transaction });

    return schedule;
  }

  async getSchedulesByScope(scopeTargetType, scopeTargetId, models) {
    return models.OperatingSchedule.findAll({
      where: { scope_target_type: scopeTargetType, scope_target_id: scopeTargetId }
    });
  }

  async deleteSchedule(ownerUserId, scheduleId, data, models, transaction = null) {
    const schedule = await models.OperatingSchedule.findByPk(scheduleId);
    if (!schedule) {
      const error = new Error('Schedule not found');
      error.statusCode = 404;
      throw error;
    }

    await this._verifyScopeOwnership(ownerUserId, schedule.scope_target_type, schedule.scope_target_id, models, data.venueId, data.branchId);
    
    await schedule.destroy({ transaction });
    return { success: true, message: 'Schedule deleted successfully' };
  }
}

module.exports = new ScheduleService();
