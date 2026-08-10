'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const models = require('../models');

async function importAloboVenues() {
  console.log('🚀 Starting Alobo Venues Import...');

  const jsonPath = path.join(__dirname, '../../../alobo_venues_134_san_2026-08-09.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON dataset file not found at:', jsonPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const venuesData = JSON.parse(rawData);

  console.log(`📦 Loaded ${venuesData.length} venues from JSON dataset.`);

  const defaultPasswordHash = await bcrypt.hash('OwnerPassword123!', 10);
  const transaction = await models.sequelize.transaction();

  try {
    let importedVenuesCount = 0;
    let importedCourtsCount = 0;
    let importedOwnersCount = 0;

    for (let i = 0; i < venuesData.length; i++) {
      const item = venuesData[i];
      const cleanSlug = (item.id || `venue_${i}`).replace(/[^a-zA-Z0-9_]/g, '_');
      
      // 1. Create a unique Owner for this Venue
      const ownerUserId = crypto.randomUUID();
      const ownerEmail = `owner_${cleanSlug}_${i}@sporthub.ai`;
      const ownerPhone = item.phone || `090${String(i).padStart(7, '0')}`;
      const ownerName = `Chủ sân ${item.venue}`;

      const owner = await models.User.create({
        user_id: ownerUserId,
        full_name: ownerName.substring(0, 100),
        email: ownerEmail.substring(0, 255),
        phone_number: ownerPhone.substring(0, 20),
        password_hash: defaultPasswordHash,
        primary_role: 'OWNER',
        account_status: 'ACTIVE',
        email_verified_at: new Date()
      }, { transaction });
      importedOwnersCount++;

      // 2. Create Venue
      const venueId = crypto.randomUUID();
      const venuePhone = item.phone || ownerPhone;
      const venueDesc = `Địa chỉ: ${item.address || 'Đang cập nhật'}. Hệ thống đặt lịch SportHubAI kết nối Alobo.`;

      const venue = await models.Venue.create({
        venue_id: venueId,
        owner_user_id: owner.user_id,
        venue_name: item.venue.substring(0, 255),
        contact_phone: venuePhone.substring(0, 20),
        venue_description: venueDesc,
        operating_status: 'APPROVED'
      }, { transaction });
      importedVenuesCount++;

      // 3. Create Branch
      const branchId = crypto.randomUUID();
      const branchName = item.branch || 'Cơ sở chính';
      const city = item.location?.city || 'Việt Nam';
      const lat = item.location?.latitude || 10.776889;
      const lng = item.location?.longitude || 106.700806;

      const branch = await models.Branch.create({
        branch_id: branchId,
        venue_id: venue.venue_id,
        branch_name: branchName.substring(0, 255),
        street_address: (item.address || 'Đang cập nhật').substring(0, 255),
        ward_district_city: city.substring(0, 255),
        geo_coordinates: JSON.stringify({ lat, lng }),
        branch_phone: venuePhone.substring(0, 20),
        branch_status: 'ACTIVE'
      }, { transaction });

      // 4. Create Courts
      const courtCount = item.court?.total || 4;
      const sportCategory = (item.sport_type && item.sport_type[0]) ? item.sport_type[0] : 'Pickleball';

      for (let c = 1; c <= courtCount; c++) {
        await models.Court.create({
          court_id: crypto.randomUUID(),
          branch_id: branch.branch_id,
          court_name: `Sân ${c}`,
          sport_category: sportCategory,
          court_status: 'ACTIVE',
          surface_features: 'Thảm tiêu chuẩn thi đấu'
        }, { transaction });
        importedCourtsCount++;
      }

      // 5. Create OperatingSchedule
      let openingTime = '06:00:00';
      let closingTime = '22:00:00';
      if (item.opening_hours && typeof item.opening_hours === 'string' && item.opening_hours.includes('–')) {
        const parts = item.opening_hours.split('–').map(p => p.trim());
        let parsedOpen = null;
        let parsedClose = null;
        
        if (parts[0]) {
          const match = parts[0].match(/(\d+):?(\d+)?/);
          if (match) {
            const h = parseInt(match[1], 10);
            const m = match[2] ? parseInt(match[2], 10) : 0;
            if (!isNaN(h) && h >= 0 && h < 24) {
              parsedOpen = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
            }
          }
        }
        
        if (parts[1]) {
          const match = parts[1].match(/(\d+):?(\d+)?/);
          if (match) {
            const h = parseInt(match[1], 10);
            const m = match[2] ? parseInt(match[2], 10) : 0;
            if (!isNaN(h) && h >= 0 && h <= 24) {
              const hFormatted = h === 24 ? 23 : h;
              const mFormatted = h === 24 ? 59 : m;
              parsedClose = `${String(hFormatted).padStart(2, '0')}:${String(mFormatted).padStart(2, '0')}:00`;
            }
          }
        }

        if (parsedOpen && parsedClose && parsedClose > parsedOpen) {
          openingTime = parsedOpen;
          closingTime = parsedClose;
        }
      }

      let basePrice = 80000;
      if (item.price?.range) {
        const match = item.price.range.match(/([\d,]+)/);
        if (match) {
          const parsed = parseInt(match[1].replace(/,/g, ''), 10);
          if (!isNaN(parsed) && parsed > 0) basePrice = parsed;
        }
      }

      await models.OperatingSchedule.create({
        schedule_id: crypto.randomUUID(),
        scope_target_type: 'VENUE',
        scope_target_id: venue.venue_id,
        day_scope: 'EVERYDAY',
        opening_time: openingTime,
        closing_time: closingTime,
        base_hourly_price: basePrice
      }, { transaction });

      // 6. Create VenueImages
      if (Array.isArray(item.images) && item.images.length > 0) {
        for (let imgIdx = 0; imgIdx < item.images.length; imgIdx++) {
          await models.VenueImage.create({
            image_id: crypto.randomUUID(),
            target_type: 'VENUE',
            target_id: venue.venue_id,
            image_url: item.images[imgIdx],
            display_order: imgIdx,
            is_primary: imgIdx === 0
          }, { transaction });
        }
      }
    }

    await transaction.commit();
    console.log('✅ SEEDING COMPLETED SUCCESSFULLY!');
    console.log(`🎉 Summary:`);
    console.log(`   - Owners Created: ${importedOwnersCount}`);
    console.log(`   - Venues Created: ${importedVenuesCount}`);
    console.log(`   - Courts Created: ${importedCourtsCount}`);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ SEEDING FAILED! Rolling back transaction...', error);
    process.exit(1);
  }
}

importAloboVenues().then(() => {
  process.exit(0);
});
