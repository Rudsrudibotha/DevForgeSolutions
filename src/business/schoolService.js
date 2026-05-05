// Business Layer - School service logic
// This service owns school tenant validation and access rules.

const SchoolRepository = require('../data/schoolRepository');

class SchoolService {
  constructor() {
    this.schoolRepository = new SchoolRepository();
    this.allowedStatuses = ['Active', 'Suspended', 'Cancelled'];
    this.currencies = {
      ZAR: { name: 'South African Rand', symbol: 'R' },
      USD: { name: 'US Dollar', symbol: '$' },
      EUR: { name: 'Euro', symbol: '€' },
      GBP: { name: 'British Pound', symbol: '£' },
      JPY: { name: 'Japanese Yen', symbol: '¥' },
      CNY: { name: 'Chinese Yuan', symbol: '¥' },
      INR: { name: 'Indian Rupee', symbol: '₹' },
      AUD: { name: 'Australian Dollar', symbol: 'A$' },
      CAD: { name: 'Canadian Dollar', symbol: 'C$' },
      CHF: { name: 'Swiss Franc', symbol: 'CHF' },
      NZD: { name: 'New Zealand Dollar', symbol: 'NZ$' },
      SGD: { name: 'Singapore Dollar', symbol: 'S$' },
      HKD: { name: 'Hong Kong Dollar', symbol: 'HK$' },
      AED: { name: 'UAE Dirham', symbol: 'د.إ' },
      SAR: { name: 'Saudi Riyal', symbol: 'ر.س' },
      BRL: { name: 'Brazilian Real', symbol: 'R$' },
      MXN: { name: 'Mexican Peso', symbol: '$' },
      SEK: { name: 'Swedish Krona', symbol: 'kr' },
      NOK: { name: 'Norwegian Krone', symbol: 'kr' },
      DKK: { name: 'Danish Krone', symbol: 'kr' },
      PLN: { name: 'Polish Zloty', symbol: 'zł' },
      TRY: { name: 'Turkish Lira', symbol: '₺' }
    };
  }

  // Admins see every school; school users see only their linked school.
  async getAllSchools(currentUser) {
    if (!currentUser || currentUser.Role !== 'admin') {
      if (!currentUser || !currentUser.SchoolID) {
        return [];
      }

      const school = await this.schoolRepository.getSchoolById(currentUser.SchoolID);
      return school ? [school] : [];
    }

    return await this.schoolRepository.getAllSchools();
  }

  // Get school by ID with tenant access enforcement when a user context is supplied.
  async getSchoolById(id, currentUser) {
    this.validateId(id, 'School ID');

    if (currentUser && currentUser.Role !== 'admin' && currentUser.SchoolID !== id) {
      throw new Error('You can only access your own school');
    }

    const school = await this.schoolRepository.getSchoolById(id);

    if (!school) {
      throw new Error('School not found');
    }

    return school;
  }

  async isSchoolNameRegistered(schoolName) {
    const cleanedSchoolName = this.requiredString(schoolName, 'School name', 255);
    const school = await this.schoolRepository.getSchoolByNormalizedName(cleanedSchoolName);

    return Boolean(school);
  }

  // Create a new school tenant. Uses normalized name check to prevent duplicates.
  async createSchool(schoolData) {
    const payload = this.buildSchoolPayload(schoolData);
    const existingSchool = await this.schoolRepository.getSchoolByNormalizedName(payload.schoolName);

    if (existingSchool) {
      const error = new Error('A school with this name already exists.');
      error.statusCode = 409;
      throw error;
    }

    try {
      return await this.schoolRepository.createSchool(payload);
    } catch (err) {
      if (err.number === 2601 || err.number === 2627 || (err.message && err.message.includes('UX_Schools_NormalizedSchoolName'))) {
        const error = new Error('A school with this name already exists.');
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }
  }

  // Update school details.
  async updateSchool(id, schoolData, currentUser) {
    this.validateId(id, 'School ID');

    if (currentUser && currentUser.Role !== 'admin' && currentUser.SchoolID !== id) {
      throw new Error('You can only update your own school');
    }

    const existingSchool = await this.getSchoolById(id);
    const payload = this.buildSchoolPayload(schoolData, existingSchool, {
      allowSubscriptionStatus: !currentUser || currentUser.Role === 'admin'
    });
    const schoolNameChanged = payload.schoolName.toLowerCase() !== existingSchool.SchoolName.toLowerCase();

    if (schoolNameChanged) {
      const duplicateSchool = await this.schoolRepository.getSchoolByNormalizedNameExcludingId(payload.schoolName, id);

      if (duplicateSchool) {
        const error = new Error('A school with this name already exists.');
        error.statusCode = 409;
        throw error;
      }
    }

    try {
      return await this.schoolRepository.updateSchool(id, payload);
    } catch (err) {
      if (err.number === 2601 || err.number === 2627 || (err.message && err.message.includes('UX_Schools_NormalizedSchoolName'))) {
        const error = new Error('A school with this name already exists.');
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }
  }

  // Delete a school after confirming it exists.
  async deleteSchool(id) {
    this.validateId(id, 'School ID');
    await this.getSchoolById(id);

    return await this.schoolRepository.deleteSchool(id);
  }

  // Suspend a school subscription.
  async suspendSchool(id) {
    this.validateId(id, 'School ID');

    const success = await this.schoolRepository.suspendSchool(id);

    if (!success) {
      throw new Error('School not found');
    }

    return { message: 'School suspended successfully' };
  }

  // Activate a school subscription.
  async activateSchool(id) {
    this.validateId(id, 'School ID');

    const success = await this.schoolRepository.activateSchool(id);

    if (!success) {
      throw new Error('School not found');
    }

    return { message: 'School activated successfully' };
  }

  validateId(id, label) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${label} must be a positive integer`);
    }
  }

  buildSchoolPayload(schoolData, existingSchool = {}, options = {}) {
    const source = schoolData || {};
    const schoolName = this.requiredString(
      source.schoolName ?? existingSchool.SchoolName,
      'School name',
      255
    );

    const subscriptionStatus = options.allowSubscriptionStatus === false
      ? existingSchool.SubscriptionStatus || 'Active'
      : this.subscriptionStatus(source.subscriptionStatus ?? existingSchool.SubscriptionStatus ?? 'Active');
    const currency = this.currency(source.currencyCode ?? existingSchool.CurrencyCode ?? 'ZAR');

    return {
      schoolName,
      address: this.optionalString(source.address ?? existingSchool.Address, 'Address', 500),
      logoUrl: this.optionalString(source.logoUrl ?? existingSchool.LogoUrl, 'Logo', 2500000),
      contactPerson: this.optionalString(source.contactPerson ?? existingSchool.ContactPerson, 'Contact person', 255),
      contactEmail: this.optionalString(source.contactEmail ?? existingSchool.ContactEmail, 'Contact email', 255),
      contactPhone: this.optionalString(source.contactPhone ?? existingSchool.ContactPhone, 'Contact phone', 50),
      registrationNumber: this.optionalString(source.registrationNumber ?? existingSchool.RegistrationNumber, 'Registration number', 100),
      website: this.optionalString(source.website ?? existingSchool.Website, 'Website', 255),
      currencyCode: currency.code,
      currencySymbol: currency.symbol,
      defaultMonthlyFee: this.optionalDecimal(source.defaultMonthlyFee ?? existingSchool.DefaultMonthlyFee, 'Default monthly fee'),
      paymentInstructions: this.optionalString(source.paymentInstructions ?? existingSchool.PaymentInstructions, 'Payment instructions', 2000),
      subscriptionStatus
    };
  }

  requiredString(value, label, maxLength) {
    const cleaned = this.optionalString(value, label, maxLength);

    if (!cleaned) {
      throw new Error(`${label} is required`);
    }

    return cleaned;
  }

  optionalString(value, label, maxLength) {
    if (value === undefined || value === null) {
      return null;
    }

    const cleaned = String(value).trim();

    if (cleaned.length > maxLength) {
      throw new Error(`${label} must be ${maxLength} characters or less`);
    }

    return cleaned || null;
  }

  optionalDecimal(value, label) {
    if (value === undefined || value === null || value === '') {
      return 0.00;
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0) {
      throw new Error(`${label} must be a non-negative number`);
    }

    return Number(parsed.toFixed(2));
  }

  subscriptionStatus(value) {
    if (!this.allowedStatuses.includes(value)) {
      throw new Error('Subscription status is invalid');
    }

    return value;
  }

  currency(value) {
    const code = String(value || '').trim().toUpperCase();
    const currency = this.currencies[code];
    const symbolOverrides = {
      EUR: 'EUR',
      GBP: 'GBP',
      JPY: 'JPY',
      CNY: 'CNY',
      INR: 'INR',
      AED: 'AED',
      SAR: 'SAR',
      PLN: 'PLN',
      TRY: 'TRY'
    };

    if (!currency) {
      throw new Error('Currency is invalid');
    }

    return {
      code,
      symbol: symbolOverrides[code] || currency.symbol
    };
  }
}

module.exports = SchoolService;
